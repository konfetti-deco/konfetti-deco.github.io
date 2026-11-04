/* ===== plancore.js — the floor plan's geometry and model, without the page: rooms from measured walls.
   Ported from the measuring app «Обмер» (solveLens, quadDirs, roomGeom and the room edits) and extended with
   shape edits (split a wall, niche or protrusion, remove a corner) and hall objects. Runs in Node for the tests.
   Units: millimetres; directions in degrees, 0 = right, 90 = down (screen axes). ===== */
var PG = (function () {
  'use strict';
  const DEG = Math.PI / 180;
  const TOL_OK = 20, TOL_WARN = 60;   // mm: closing error of a fully measured outline — fine / suspicious / a measuring error
  const uid = () => Math.random().toString(36).slice(2, 10);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hyp = (x, y) => Math.sqrt(x * x + y * y);

  /* ---------- numbers and units ---------- */
  function nf(v, d) {
    const k = Math.pow(10, d);
    let s = (Math.round(v * k) / k).toFixed(d);
    if (/^-0[.,]?0*$/.test(s)) s = s.slice(1);
    return s.replace('.', ',').replace('-', '−');
  }
  const UNIT = { mm: { k: 1, d: 0, ru: 'мм' }, cm: { k: 10, d: 1, ru: 'см' }, m: { k: 1000, d: 3, ru: 'м' } };
  function fmtLen(mm, unit) { const u = UNIT[unit] || UNIT.m; return nf(mm / u.k, u.d); }
  function parseNum(str) {
    const s = String(str).trim().replace(/\s/g, '').replace(',', '.');
    if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return null;
    const v = parseFloat(s);
    return isFinite(v) ? v : null;
  }
  /* «2,35+1,12» → the sum: a wall measured in two shots */
  function parseSum(str) {
    const parts = String(str).split('+');
    let sum = 0;
    for (const p of parts) { const v = parseNum(p); if (v === null) return null; sum += v; }
    return sum;
  }
  function parseLen(str, unit) { const v = parseSum(str); return v === null ? null : Math.round(v * (UNIT[unit] || UNIT.m).k); }

  /* ---------- geometry ---------- */
  function unitVec(dir) {
    const a = dir * DEG; let c = Math.cos(a), s = Math.sin(a);
    if (Math.abs(c) < 1e-12) c = 0;
    if (Math.abs(s) < 1e-12) s = 0;
    if (Math.abs(Math.abs(c) - 1) < 1e-12) c = Math.sign(c);
    if (Math.abs(Math.abs(s) - 1) < 1e-12) s = Math.sign(s);
    return [c, s];
  }
  function normDeg(a) { a = a % 360; if (a > 180) a -= 360; if (a <= -180) a += 360; return a; }
  function signedArea(pts) {
    let s = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; }
    return s / 2;
  }
  const cross3 = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  function segIntersect(a, b, c, d) {
    const d1 = cross3(c, d, a), d2 = cross3(c, d, b), d3 = cross3(a, b, c), d4 = cross3(a, b, d), e = 1e-6;
    return ((d1 > e && d2 < -e) || (d1 < -e && d2 > e)) && ((d3 > e && d4 < -e) || (d3 < -e && d4 > e));
  }
  function selfIntersects(pts) {
    const n = pts.length;
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (segIntersect(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) return true;
    }
    return false;
  }
  /* an independent area check: ear clipping */
  function triArea(pts, S) {
    const idx = pts.map((_, i) => i); let sum = 0, guard = 0;
    const inTri = (p, a, b, c) => cross3(a, b, p) * S >= -1e-9 && cross3(b, c, p) * S >= -1e-9 && cross3(c, a, p) * S >= -1e-9;
    while (idx.length > 3 && guard++ < 20000) {
      let cut = false;
      for (let k = 0; k < idx.length; k++) {
        const m = idx.length, i0 = idx[(k + m - 1) % m], i1 = idx[k], i2 = idx[(k + 1) % m];
        const a = pts[i0], b = pts[i1], c = pts[i2], cr = cross3(a, b, c) * S;
        if (Math.abs(cr) <= 1e-9) { idx.splice(k, 1); cut = true; break; }
        if (cr < 0) continue;
        let blocked = false;
        for (const q of idx) {
          if (q === i0 || q === i1 || q === i2) continue;
          const p = pts[q];
          if ((p[0] === a[0] && p[1] === a[1]) || (p[0] === b[0] && p[1] === b[1]) || (p[0] === c[0] && p[1] === c[1])) continue;
          if (inTri(p, a, b, c)) { blocked = true; break; }
        }
        if (blocked) continue;
        sum += cr / 2; idx.splice(k, 1); cut = true; break;
      }
      if (!cut) return null;
    }
    if (idx.length === 3) sum += cross3(pts[idx[0]], pts[idx[1]], pts[idx[2]]) * S / 2;
    return sum;
  }
  function pointInPoly(p, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }
  function distSeg(p, a, b) {
    const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy;
    let t = l2 ? ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / l2 : 0;
    t = clamp(t, 0, 1);
    return { d: hyp(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy), t };
  }
  function bboxOf(pts) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  }
  /* the point inside the outline farthest from the walls — for the room's name */
  function labelPoint(pts) {
    const bb = bboxOf(pts);
    const score = (p) => {
      if (!pointInPoly(p, pts)) return -1;
      let m = Infinity;
      for (let i = 0; i < pts.length; i++) m = Math.min(m, distSeg(p, pts[i], pts[(i + 1) % pts.length]).d);
      return m;
    };
    let best = [bb.x0 + bb.w / 2, bb.y0 + bb.h / 2], bs = score(best);
    const scan = (cx, cy, w, h, N) => {
      for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
        const p = [cx - w / 2 + w * i / N, cy - h / 2 + h * j / N], s = score(p);
        if (s > bs + 1e-6) { bs = s; best = p; }
      }
    };
    scan(bb.x0 + bb.w / 2, bb.y0 + bb.h / 2, bb.w, bb.h, 14);
    scan(best[0], best[1], bb.w / 7, bb.h / 7, 6);
    return best;
  }
  /* the name stays in the middle until an object covers it; then a free place is searched */
  function labelAvoid(g, hw, hh, boxes) {
    const hit = (c) => boxes.some((b) => c[0] + hw > b.x0 && c[0] - hw < b.x1 && c[1] + hh > b.y0 && c[1] - hh < b.y1);
    if (!boxes.length || !hit(g.center)) return g.center;
    const pts = g.pts, bb = bboxOf(pts), N = 16;
    let best = null, bs = -1;
    for (let i = 1; i < N; i++) for (let j = 1; j < N; j++) {
      const c = [bb.x0 + bb.w * i / N, bb.y0 + bb.h * j / N];
      if (hit(c)) continue;
      if (![[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].every((d) => pointInPoly([c[0] + d[0], c[1] + d[1]], pts))) continue;
      let m = Infinity;
      for (let k = 0; k < pts.length; k++) m = Math.min(m, distSeg(c, pts[k], pts[(k + 1) % pts.length]).d);
      for (const b of boxes) { const dx = Math.max(b.x0 - c[0], 0, c[0] - b.x1), dy = Math.max(b.y0 - c[1], 0, c[1] - b.y1); m = Math.min(m, hyp(dx, dy) + Math.min(hw, hh)); }
      if (m > bs) { bs = m; best = c; }
    }
    return best || g.center;
  }

  /* Unmeasured walls are fitted so that the outline closes (the smallest change to the sketch).
     Measured walls are never changed. */
  function solveLens(walls, dirs) {
    const n = walls.length;
    const L = walls.map((w) => Math.max(1, +w.len || 1));
    const fixed = walls.map((w) => !!w.m);
    let clamped = false;
    for (let pass = 0; pass <= n; pass++) {
      const free = [];
      let rx = 0, ry = 0, a11 = 0, a12 = 0, a22 = 0;
      for (let i = 0; i < n; i++) {
        const u = unitVec(dirs[i]);
        rx -= L[i] * u[0]; ry -= L[i] * u[1];
        if (!fixed[i]) { free.push([i, u]); a11 += u[0] * u[0]; a12 += u[0] * u[1]; a22 += u[1] * u[1]; }
      }
      if (!free.length) break;
      const det = a11 * a22 - a12 * a12, tr = a11 + a22;
      let yx, yy;
      if (det > 1e-9 * tr * tr) { yx = (a22 * rx - a12 * ry) / det; yy = (-a12 * rx + a11 * ry) / det; }
      else { yx = (a11 * rx + a12 * ry) / (tr * tr); yy = (a12 * rx + a22 * ry) / (tr * tr); }
      let again = false;
      for (const [i, u] of free) {
        const v = L[i] + u[0] * yx + u[1] * yy;
        if (v < 1) { L[i] = 1; fixed[i] = true; clamped = true; again = true; } else L[i] = v;
      }
      if (!again) break;
    }
    return { L, clamped };
  }

  /* a quadrilateral from four sides and the diagonal A–C: the angles are computed, not assumed */
  function quadDirs(L, dirs, p) {
    const a = L[0], b = L[1], c = L[2], d = L[3];
    if (!(p > 0) || p >= a + b || p <= Math.abs(a - b) || p >= c + d || p <= Math.abs(c - d)) return { ok: false };
    const u0 = unitVec(dirs[0]), u1 = unitVec(dirs[1]);
    const s = (u0[0] * u1[1] - u0[1] * u1[0]) >= 0 ? 1 : -1;
    const beta = Math.acos(clamp((a * a + b * b - p * p) / (2 * a * b), -1, 1)) / DEG;
    const d1 = dirs[0] + s * (180 - beta);
    const v1 = unitVec(d1);
    const C = [a * u0[0] + b * v1[0], a * u0[1] + b * v1[1]];
    const dirAC = Math.atan2(C[1], C[0]) / DEG;
    const al = Math.acos(clamp((p * p + d * d - c * c) / (2 * p * d), -1, 1)) / DEG;
    const dirAD = dirAC + s * al;
    const vd = unitVec(dirAD), D = [d * vd[0], d * vd[1]];
    const d2 = Math.atan2(D[1] - C[1], D[0] - C[0]) / DEG;
    return { ok: true, dirs: [dirs[0], d1, d2, dirAD + 180].map(normDeg) };
  }

  function roomGeom(room) {
    const W = room.walls, n = W.length;
    let dirs = W.map((w) => +w.dir || 0);
    const allM = W.every((w) => w.m);
    const diag = { p: (room.diag && room.diag.p) || null, q: (room.diag && room.diag.q) || null, used: false, bad: false, pCalc: null, qCalc: null, qDelta: null };
    if (n === 4 && diag.p && allM) {
      const r = quadDirs(W.map((w) => w.len), dirs, diag.p);
      if (r.ok) { dirs = r.dirs; diag.used = true; } else diag.bad = true;
    }
    const sol = solveLens(W, dirs), L = sol.L;
    const raw = [[room.x, room.y]], cum = [0];
    let Pf = 0;
    for (let i = 0; i < n; i++) {
      const u = unitVec(dirs[i]);
      raw.push([raw[i][0] + L[i] * u[0], raw[i][1] + L[i] * u[1]]);
      Pf += L[i]; cum.push(Pf);
    }
    const gx = raw[n][0] - raw[0][0], gy = raw[n][1] - raw[0][1], gap = hyp(gx, gy);
    const pts = [];
    for (let i = 0; i < n; i++) pts.push([raw[i][0] - gx * cum[i] / Pf, raw[i][1] - gy * cum[i] / Pf]);
    const sa = signedArea(pts), S = sa >= 0 ? 1 : -1, area = Math.abs(sa);
    const selfX = n < 3 || selfIntersects(pts);
    const areaTri = selfX ? null : triArea(pts, S);
    const lens = L.map((v) => Math.round(v));
    const P = lens.reduce((a, b) => a + b, 0);
    const interior = dirs.map((d, i) => 180 - S * normDeg(d - dirs[(i + n - 1) % n]));
    if (n === 4) {
      diag.pCalc = hyp(pts[2][0] - pts[0][0], pts[2][1] - pts[0][1]);
      diag.qCalc = hyp(pts[3][0] - pts[1][0], pts[3][1] - pts[1][1]);
      if (diag.q) diag.qDelta = diag.q - diag.qCalc;
    }
    let status, reason = '';
    if (selfX) { status = 'bad'; reason = 'self'; }
    else if (diag.bad) { status = 'bad'; reason = 'diag'; }
    else if (!allM) { status = gap > 1.5 ? 'bad' : 'partial'; reason = gap > 1.5 ? 'open' : 'partial'; }
    else {
      const dev = diag.used && diag.qDelta !== null ? Math.abs(diag.qDelta) : gap;
      status = dev <= TOL_OK ? 'ok' : dev <= TOL_WARN ? 'warn' : 'bad';
      reason = diag.used ? 'diag-check' : 'gap';
    }
    return {
      n, dirs, L, lens, P, measured: W.map((w) => !!w.m), allM, unmeasured: W.filter((w) => !w.m).length,
      raw, pts, gap, gapVec: [gx, gy], area, areaTri, S, selfX, interior, diag, status, reason, clamped: sol.clamped,
      center: labelPoint(pts), bbox: bboxOf(raw),
    };
  }
  /* outward normal of wall i */
  function outward(g, i) { const u = unitVec(g.dirs[i]); return [g.S * u[1], -g.S * u[0]]; }
  function cornerName(i) { const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; return A[i % 26] + (i >= 26 ? Math.floor(i / 26) : ''); }
  function wallName(room, i) { return cornerName(i) + '–' + cornerName((i + 1) % room.walls.length); }
  /* the free stretches of a wall between its openings: the wall's size label goes into the longest one, so it never
     lands on a door or a window */
  function wallFree(wall, L) {
    const ops = (wall.ops || []).map((o) => [clamp(o.off, 0, L), clamp(o.off + o.w, 0, L)]).sort((a, b) => a[0] - b[0]);
    const out = []; let cur = 0;
    for (const [a, b] of ops) { if (a > cur) out.push([cur, a]); cur = Math.max(cur, b); }
    if (L > cur) out.push([cur, L]);
    return out;
  }
  function wallLabelAt(wall, L) {
    const fr = wallFree(wall, L);
    if (!fr.length) return { t: L / 2, room: 0 };
    let best = fr[0];
    for (const f of fr) if (f[1] - f[0] > best[1] - best[0]) best = f;
    return { t: (best[0] + best[1]) / 2, room: best[1] - best[0] };
  }

  /* ---------- model ---------- */
  const SHAPES = {
    rect: (w, h) => [[w, 0], [h, 90], [w, 180], [h, 270]],
    L: (w, h) => [[w, 0], [Math.round(h * 0.55), 90], [Math.round(w * 0.45), 180], [h - Math.round(h * 0.55), 90], [w - Math.round(w * 0.45), 180], [h, 270]],
    U: (w, h) => { const a = Math.round(w / 3), b = w - 2 * a, d = Math.round(h * 0.45); return [[w, 0], [h, 90], [a, 180], [d, 270], [b, 180], [d, 90], [a, 180], [h, 270]]; },
  };
  function makeRoom(name, x, y, segs, h) {
    return { id: uid(), name: name || '', x: Math.round(x), y: Math.round(y), h: h || null, diag: { p: null, q: null }, walls: segs.map((s) => ({ id: uid(), len: Math.round(s[0]), dir: normDeg(s[1]), m: !!s[2], ops: [] })) };
  }
  /* a room from a sketch: corner points tapped on the plan; all walls are estimates (≈) until measured */
  function roomFromPoints(name, pts, h) {
    const segs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      segs.push([hyp(b[0] - a[0], b[1] - a[1]), Math.atan2(b[1] - a[1], b[0] - a[0]) / DEG, false]);
    }
    return makeRoom(name, pts[0][0], pts[0][1], segs, h);
  }
  /* door and window presets: one tap */
  const OPENINGS = {
    door:   { label: 'Дверь 90',              type: 'door',   w: 900,  h: 2100, leaves: 1 },
    door2:  { label: 'Двустворчатая 160',     type: 'door',   w: 1600, h: 2100, leaves: 2 },
    exit:   { label: 'Аварийный выход 120',   type: 'door',   w: 1200, h: 2100, leaves: 2, exit: true, out: true },
    open:   { label: 'Проём без двери 120',   type: 'open',   w: 1200, h: 2100 },
    win:    { label: 'Окно 120',              type: 'window', w: 1200, h: 1400, sill: 900 },
    win2:   { label: 'Окно 180',              type: 'window', w: 1800, h: 1400, sill: 900 },
    pano:   { label: 'Панорамное окно 240',   type: 'window', w: 2400, h: 2400, sill: 0 },
  };
  function addOpening(wall, kind, wallLen, at) {
    const pr = OPENINGS[kind] || OPENINGS.door;
    const w = Math.min(pr.w, Math.max(300, wallLen - 100));
    const off = at == null ? (wallLen - w) / 2 : at - w / 2;
    const o = { id: uid(), kind, type: pr.type, w, h: pr.h, off: Math.round(clamp(off, 0, Math.max(0, wallLen - w))), sill: pr.sill || 0, flip: false, leaves: pr.leaves || 1, exit: !!pr.exit, out: !!pr.out };
    wall.ops.push(o);
    return o;
  }
  function clampOpening(o, wallLen) {
    o.w = clamp(Math.round(o.w), 100, Math.max(100, Math.round(wallLen)));
    o.off = clamp(Math.round(o.off), 0, Math.max(0, Math.round(wallLen) - o.w));
    o.h = Math.max(100, Math.round(o.h));
    o.sill = Math.max(0, Math.round(o.sill || 0));
  }
  function rotateRoom(room, deg) {
    const g = roomGeom(room), bb = g.bbox, cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
    const a = deg * DEG, dx = room.x - cx, dy = room.y - cy;
    room.x = Math.round(cx + dx * Math.cos(a) - dy * Math.sin(a));
    room.y = Math.round(cy + dx * Math.sin(a) + dy * Math.cos(a));
    room.walls.forEach((w) => { w.dir = normDeg(w.dir + deg); });
  }
  function mirrorRoom(room) {
    const g = roomGeom(room), cx = (g.bbox.x0 + g.bbox.x1) / 2;
    room.x = Math.round(2 * cx - room.x);
    room.walls.forEach((w) => { w.dir = normDeg(180 - w.dir); (w.ops || []).forEach((o) => { o.flip = !o.flip; }); });
  }
  /* set the interior angle at corner i (i ≥ 1): the rest of the outline turns */
  function setInterior(room, i, angle) {
    const g = roomGeom(room);
    if (i < 1 || i >= g.n || !(angle > 0 && angle < 360)) return false;
    const want = g.S * (180 - angle), have = normDeg(room.walls[i].dir - room.walls[i - 1].dir);
    const delta = want - have;
    for (let k = i; k < g.n; k++) room.walls[k].dir = normDeg(room.walls[k].dir + delta);
    return true;
  }
  /* split wall i at distance t from its start: two walls in the same direction; openings go to the part they sit on */
  function splitWall(room, i, t) {
    const g = roomGeom(room), w = room.walls[i], L = g.L[i];
    t = Math.round(t);
    if (!(t >= 50 && t <= L - 50)) return false;
    /* a measured wall stays measured: its two parts add up to the measured length exactly */
    const a = { id: uid(), len: t, dir: w.dir, m: w.m, ops: [] }, b = { id: uid(), len: w.m ? w.len - t : Math.max(1, Math.round(L - t)), dir: w.dir, m: w.m, ops: [] };
    if (b.len < 50) return false;
    (w.ops || []).forEach((o) => {
      if (o.off + o.w <= t) a.ops.push(o);
      else if (o.off >= t) { o.off -= t; b.ops.push(o); }
      else if (o.off + o.w / 2 < t) { o.off = Math.max(0, Math.min(o.off, t - o.w)); a.ops.push(o); }
      else { o.off = Math.max(0, o.off - t); b.ops.push(o); }
    });
    room.walls.splice(i, 1, a, b);
    if (room.walls.length !== 4) room.diag = { p: null, q: null };
    return true;
  }
  /* a niche (recess out of the room) or a protrusion (into the room) on wall i: off from the wall's start, width w, depth d.
     The wall becomes five walls; the lengths entered are measured if the wall was measured. Openings that fall into the
     jog are removed and counted. */
  function insertJog(room, i, off, w, d, into) {
    const g = roomGeom(room), wall = room.walls[i], L = wall.m ? wall.len : Math.round(g.L[i]);
    off = Math.round(off); w = Math.round(w); d = Math.round(d);
    if (!(off >= 0 && w >= 50 && d >= 10 && off + w <= L)) return { ok: false };
    const sgn = into ? 1 : -1, dir = wall.dir, side = normDeg(dir + sgn * g.S * 90), back = normDeg(side + 180), m = wall.m;
    const segs = [];
    if (off > 0) segs.push({ len: off, dir, m });
    segs.push({ len: d, dir: side, m: true }, { len: w, dir, m: true }, { len: d, dir: back, m: true });
    if (L - off - w > 0) segs.push({ len: L - off - w, dir, m });
    const nw = segs.map((s) => ({ id: uid(), len: s.len, dir: s.dir, m: s.m, ops: [] }));
    let dropped = 0;
    (wall.ops || []).forEach((o) => {
      if (o.off + o.w <= off && off > 0) nw[0].ops.push(o);
      else if (o.off >= off + w && L - off - w > 0) { o.off -= off + w; nw[nw.length - 1].ops.push(o); }
      else dropped++;
    });
    room.walls.splice(i, 1, ...nw);
    room.diag = { p: null, q: null };
    return { ok: true, dropped, added: nw.length - 1 };
  }
  /* remove corner i (between wall i−1 and wall i): one straight wall replaces the two; it is an estimate until measured */
  function deleteCorner(room, i) {
    const n = room.walls.length;
    if (n <= 3) return { ok: false };
    const g = roomGeom(room), ip = (i + n - 1) % n, A = g.pts[ip], B = g.pts[(i + 1) % n];
    const len = hyp(B[0] - A[0], B[1] - A[1]);
    if (len < 10) return { ok: false };
    const keep = room.walls[ip].ops || [], dropped = (room.walls[i].ops || []).length;
    const nw = { id: uid(), len: Math.round(len), dir: normDeg(Math.atan2(B[1] - A[1], B[0] - A[0]) / DEG), m: false, ops: keep };
    keep.forEach((o) => clampOpening(o, len));
    if (i === 0) { room.walls.splice(n - 1, 1); room.walls.splice(0, 1, nw); room.x = Math.round(A[0]); room.y = Math.round(A[1]); }
    else room.walls.splice(ip, 2, nw);
    if (room.walls.length !== 4) room.diag = { p: null, q: null };
    return { ok: true, dropped };
  }
  /* corner i lies at the end of wall i−1 */
  function cornerPoint(g, i) { return g.pts[i % g.n]; }

  /* ---------- objects on the plan (step 1: columns) ---------- */
  function itemCorners(it) {
    const a = (it.rot || 0) * DEG, c = Math.cos(a), s = Math.sin(a), hw = it.w / 2, hd = (it.d || it.w) / 2;
    return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, y]) => [it.x + x * c - y * s, it.y + x * s + y * c]);
  }
  function isRound(it) { return it.shape === 'round'; }
  function itemBBox(it) {
    if (isRound(it)) { const r = it.w / 2; return { x0: it.x - r, y0: it.y - r, x1: it.x + r, y1: it.y + r, w: it.w, h: it.w }; }
    return bboxOf(itemCorners(it));
  }
  function hitItem(it, p, tol) {
    if (isRound(it)) return hyp(p[0] - it.x, p[1] - it.y) <= it.w / 2 + tol;
    const a = -(it.rot || 0) * DEG, dx = p[0] - it.x, dy = p[1] - it.y;
    const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
    return Math.abs(lx) <= it.w / 2 + tol && Math.abs(ly) <= (it.d || it.w) / 2 + tol;
  }
  /* clearances from an object to the nearest walls on four sides */
  function itemClearances(it, geoms) {
    const a = (it.rot || 0) * DEG, ax = [Math.cos(a), Math.sin(a)], ay = [-Math.sin(a), Math.cos(a)];
    const hw = it.w / 2, hd = isRound(it) ? it.w / 2 : (it.d || it.w) / 2;
    const rays = [[ax, hw], [[-ax[0], -ax[1]], hw], [ay, hd], [[-ay[0], -ay[1]], hd]];
    const out = [];
    for (const [d, off] of rays) {
      const o = [it.x + d[0] * off, it.y + d[1] * off];
      let best = Infinity;
      for (const g of geoms) for (let i = 0; i < g.n; i++) {
        const p = g.pts[i], q = g.pts[(i + 1) % g.n], ex = q[0] - p[0], ey = q[1] - p[1];
        const den = d[0] * ey - d[1] * ex;
        if (Math.abs(den) < 1e-9) continue;
        const t = ((p[0] - o[0]) * ey - (p[1] - o[1]) * ex) / den;
        const u = ((p[0] - o[0]) * d[1] - (p[1] - o[1]) * d[0]) / den;
        if (t >= -0.5 && u >= -1e-6 && u <= 1 + 1e-6 && t < best) best = t;
      }
      if (isFinite(best) && best < 60000) out.push({ from: o, to: [o[0] + d[0] * best, o[1] + d[1] * best], dist: Math.max(0, Math.round(best)) });
    }
    return out;
  }
  function planBBox(p, geoms) {
    const pts = [];
    (geoms || p.rooms.map(roomGeom)).forEach((g) => g.raw.forEach((q) => pts.push(q)));
    p.items.forEach((it) => { const b = itemBBox(it); pts.push([b.x0, b.y0], [b.x1, b.y1]); });
    return pts.length ? bboxOf(pts) : null;
  }

  /* ---------- editing by dragging: corners and walls ----------
     The outline is rebuilt from its corner points; only the walls whose ends moved get a new length and direction.
     A measured wall that is dragged keeps the «точный» mark with the dragged length; an estimate stays an estimate. */
  function bake(room) {
    const g = roomGeom(room);
    if (g.diag.used || room.diag.p || room.diag.q) { room.walls.forEach((w, i) => { w.dir = normDeg(g.dirs[i]); }); room.diag = { p: null, q: null }; }
    room.walls.forEach((w, i) => { if (!w.m) w.len = Math.max(1, Math.round(g.L[i])); });
    return roomGeom(room);
  }
  function rawPts(room) { return roomGeom(room).raw.map((q) => q.slice()); }
  function fromRaw(room, R, changed) {
    const n = room.walls.length;
    for (const j of changed) {
      const a = R[j], b = R[j + 1], w = room.walls[j], L = hyp(b[0] - a[0], b[1] - a[1]);
      if (L < 1) continue;
      w.len = Math.max(1, Math.round(L)); w.dir = normDeg(Math.atan2(b[1] - a[1], b[0] - a[0]) / DEG);
      (w.ops || []).forEach((o) => clampOpening(o, w.len));
    }
    room.x = Math.round(R[0][0]); room.y = Math.round(R[0][1]);
    return n;
  }
  /* move corner k to point Q (room already baked) */
  function moveCorner(room, k, Q) {
    const n = room.walls.length, R = rawPts(room), gap = [R[n][0] - R[0][0], R[n][1] - R[0][1]];
    R[k] = Q.slice(); if (k === 0) R[n] = [Q[0] + gap[0], Q[1] + gap[1]];
    fromRaw(room, R, [(k + n - 1) % n, k]);
  }
  function lineX(p, u, q, v) {   // intersection of p+t·u and q+s·v
    const den = u[0] * v[1] - u[1] * v[0];
    if (Math.abs(den) < 1e-9) return null;
    const t = ((q[0] - p[0]) * v[1] - (q[1] - p[1]) * v[0]) / den;
    return [p[0] + u[0] * t, p[1] + u[1] * t];
  }
  /* shift wall i by d mm along its outward normal: the neighbours keep their directions, so the room grows or shrinks */
  function moveWall(room, i, d) {
    const g = roomGeom(room), n = g.n, R = g.raw.map((q) => q.slice()), gap = [R[n][0] - R[0][0], R[n][1] - R[0][1]];
    const nO = outward(g, i), u = unitVec(g.dirs[i]), ip = (i + n - 1) % n, inx = (i + 1) % n;
    const A = [R[i][0] + nO[0] * d, R[i][1] + nO[1] * d], B = [R[i + 1][0] + nO[0] * d, R[i + 1][1] + nO[1] * d];
    const up = unitVec(g.dirs[ip]), un = unitVec(g.dirs[inx]);
    const prevStart = R[ip === n - 1 && i === 0 ? n - 1 : ip], nextEnd = R[i + 2 <= n ? i + 2 : (i + 2) % n];
    const Vi = lineX(prevStart, up, A, u) || A, Vj = lineX(nextEnd, un, B, u) || B;
    const set = (k, Q) => { R[k] = Q; if (k === 0) R[n] = [Q[0] + gap[0], Q[1] + gap[1]]; if (k === n) R[0] = [Q[0] - gap[0], Q[1] - gap[1]]; };
    set(i, Vi); set(i + 1, Vj);
    fromRaw(room, R, [ip, i, inx]);
  }
  /* corner snapping while dragging: line up with the neighbouring corners (keeps right angles) */
  function snapCorner(room, k, Q, tol) {
    const g = roomGeom(room), n = g.n, a = g.raw[(k + n - 1) % n], b = g.raw[k + 1 > n ? 1 : k + 1];
    const q = [Math.round(Q[0] / 10) * 10, Math.round(Q[1] / 10) * 10];
    for (const p of [a, b]) { if (Math.abs(q[0] - p[0]) < tol) q[0] = p[0]; if (Math.abs(q[1] - p[1]) < tol) q[1] = p[1]; }
    return q;
  }

  /* ---------- hall objects: tables with chairs, zones ---------- */
  const CHAIR = { w: 450, d: 450, gap: 260 };   // chair size; its centre this far from the table's edge
  const CAT = {
    t_r120: { g: 'tables', label: 'Круглый стол Ø120', kind: 'table', shape: 'round', w: 1200, seats: 8 },
    t_r150: { g: 'tables', label: 'Круглый стол Ø150', kind: 'table', shape: 'round', w: 1500, seats: 10 },
    t_r180: { g: 'tables', label: 'Круглый стол Ø180', kind: 'table', shape: 'round', w: 1800, seats: 12 },
    t_q180: { g: 'tables', label: 'Прямоугольный 180×80', kind: 'table', shape: 'rect', w: 1800, d: 800, sides: [3, 3, 0, 0] },
    t_q220: { g: 'tables', label: 'Прямоугольный 220×80', kind: 'table', shape: 'rect', w: 2200, d: 800, sides: [4, 4, 0, 0] },
    t_ov:   { g: 'tables', label: 'Овальный 200×100', kind: 'table', shape: 'oval', w: 2000, d: 1000, seats: 8 },
    t_imp:  { g: 'tables', label: 'Империал 6,6×1,6 м', kind: 'table', shape: 'rect', w: 6600, d: 1600, sides: [11, 11, 1, 1] },
    t_c60:  { g: 'tables', label: 'Коктейльный Ø60', kind: 'table', shape: 'round', w: 600, seats: 0, stand: true },
    t_c80:  { g: 'tables', label: 'Коктейльный Ø80', kind: 'table', shape: 'round', w: 800, seats: 0, stand: true },
    z_stage:  { g: 'zones', label: 'Сцена 6×3 м', kind: 'zone', sub: 'stage', shape: 'rect', w: 6000, d: 3000 },
    z_podium: { g: 'zones', label: 'Подиум 2×1 м', kind: 'zone', sub: 'stage', shape: 'rect', w: 2000, d: 1000 },
    z_dance:  { g: 'zones', label: 'Танцпол 5×5 м', kind: 'zone', sub: 'dance', shape: 'rect', w: 5000, d: 5000 },
    z_bar:    { g: 'zones', label: 'Бар 3×0,7 м', kind: 'zone', sub: 'furn', shape: 'rect', w: 3000, d: 700 },
    z_dj:     { g: 'zones', label: 'DJ 1,8×0,8 м', kind: 'zone', sub: 'furn', shape: 'rect', w: 1800, d: 800 },
    z_buffet: { g: 'zones', label: 'Фуршет 2,4×0,8 м', kind: 'zone', sub: 'furn', shape: 'rect', w: 2400, d: 800 },
    z_photo:  { g: 'zones', label: 'Фотозона 3×0,6 м', kind: 'zone', sub: 'photo', shape: 'rect', w: 3000, d: 600 },
    z_screen: { g: 'zones', label: 'Экран 3 м', kind: 'zone', sub: 'furn', shape: 'rect', w: 3000, d: 200 },
    z_cake:   { g: 'zones', label: 'Стол для торта Ø80', kind: 'zone', sub: 'furn', shape: 'round', w: 800 },
    z_gift:   { g: 'zones', label: 'Стол для подарков 1,2×0,6', kind: 'zone', sub: 'furn', shape: 'rect', w: 1200, d: 600 },
    z_lounge: { g: 'zones', label: 'Диван, лаунж 2×0,9 м', kind: 'zone', sub: 'furn', shape: 'rect', w: 2000, d: 900 },
  };
  function makeItem(ref, x, y) {
    const c = CAT[ref]; if (!c) return null;
    const it = { id: uid(), kind: c.kind, ref, shape: c.shape, x: Math.round(x), y: Math.round(y), w: c.w, d: c.d || c.w, rot: 0, name: '' };
    if (c.kind === 'table') { if (c.shape === 'rect') it.sides = c.sides.slice(); else it.seats = c.seats; if (c.stand) it.stand = true; }
    return it;
  }
  function itemLabel(it) {
    if (it.kind === 'column') return isRound(it) ? 'Колонна' : 'Колонна';
    if (it.name) return it.name;
    const c = CAT[it.ref]; return c ? c.label.replace(/ [\dØ][\d,×Ø .м]*$/, '').replace(/ Ø$/, '') : 'Объект';
  }
  function seatCount(it) {
    if (it.kind !== 'table' || it.stand) return 0;
    if (it.shape === 'rect') return (it.sides || [0, 0, 0, 0]).reduce((a, b) => a + (+b || 0), 0);
    return Math.max(0, Math.round(+it.seats || 0));
  }
  /* chair centres in the table's own axes, with the angle each chair faces away from the table */
  function chairsLocal(it) {
    const out = [], gap = CHAIR.gap;
    if (it.kind !== 'table' || it.stand) return out;
    if (it.shape === 'round' || it.shape === 'oval') {
      const n = seatCount(it), a = it.w / 2 + gap, b = (it.shape === 'round' ? it.w : it.d) / 2 + gap;
      for (let k = 0; k < n; k++) { const t = (-90 + 360 * k / n) * DEG, x = a * Math.cos(t), y = b * Math.sin(t); out.push({ x, y, a: Math.atan2(y / (b * b), x / (a * a)) / DEG + 90 }); }
      return out;
    }
    const s = it.sides || [0, 0, 0, 0], hw = it.w / 2, hd = it.d / 2;
    const side = (k, L, f) => { for (let j = 0; j < k; j++) f(-L / 2 + L * (j + 0.5) / k); };
    side(+s[0] || 0, it.w, (t) => out.push({ x: t, y: -hd - gap, a: 0 }));
    side(+s[1] || 0, it.w, (t) => out.push({ x: t, y: hd + gap, a: 180 }));
    side(+s[2] || 0, it.d, (t) => out.push({ x: -hw - gap, y: t, a: -90 }));
    side(+s[3] || 0, it.d, (t) => out.push({ x: hw + gap, y: t, a: 90 }));
    return out;
  }
  function toWorld(it, x, y) { const a = (it.rot || 0) * DEG, c = Math.cos(a), s = Math.sin(a); return [it.x + x * c - y * s, it.y + x * s + y * c]; }
  function ellipsePts(it, N) { const out = [], a = it.w / 2, b = (it.shape === 'round' ? it.w : it.d) / 2; for (let k = 0; k < N; k++) { const t = 2 * Math.PI * k / N; out.push(toWorld(it, a * Math.cos(t), b * Math.sin(t))); } return out; }
  /* the object's footprint as world polygons: the table or zone, then each chair */
  function footprint(it) {
    const polys = [];
    if (it.shape === 'round' || it.shape === 'oval') polys.push(ellipsePts(it, 20)); else polys.push(itemCorners(it));
    chairsLocal(it).forEach((c) => {
      const a = c.a * DEG, ca = Math.cos(a), sa = Math.sin(a), hw = CHAIR.w / 2, hd = CHAIR.d / 2;
      polys.push([[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, y]) => toWorld(it, c.x + x * ca - y * sa, c.y + x * sa + y * ca)));
    });
    return polys;
  }
  function polyBB(polys) { const all = []; polys.forEach((p) => p.forEach((q) => all.push(q))); return bboxOf(all); }
  function polysTouch(A, B) {
    for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++) if (segIntersect(A[i], A[(i + 1) % A.length], B[j], B[(j + 1) % B.length])) return true;
    return pointInPoly(A[0], B) || pointInPoly(B[0], A);
  }
  /* the swing of a door as a polygon (a quarter disc per leaf) */
  function doorSwings(room, g) {
    const out = [];
    room.walls.forEach((w, i) => (w.ops || []).forEach((op) => {
      if (op.type !== 'door') return;
      const A = g.pts[i], u = unitVec(g.dirs[i]), L = g.L[i], nO = outward(g, i), sw = op.out ? nO : [-nO[0], -nO[1]];
      const t0 = clamp(op.off, 0, L), t1 = clamp(op.off + op.w, 0, L), P0 = [A[0] + u[0] * t0, A[1] + u[1] * t0], P1 = [A[0] + u[0] * t1, A[1] + u[1] * t1];
      const leaves = op.leaves === 2 ? [[P0, P1, (t1 - t0) / 2], [P1, P0, (t1 - t0) / 2]] : [[op.flip ? P1 : P0, op.flip ? P0 : P1, t1 - t0]];
      leaves.forEach(([h, o, r]) => {
        const a0 = Math.atan2(o[1] - h[1], o[0] - h[0]), a1 = Math.atan2(sw[1], sw[0]); let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        const poly = [h]; for (let k = 0; k <= 8; k++) { const an = a0 + da * k / 8; poly.push([h[0] + Math.cos(an) * r, h[1] + Math.sin(an) * r]); }
        out.push({ poly, op, room, wall: i });
      });
    }));
    return out;
  }
  /* what is in the way: an object crossing a wall, standing outside the rooms, in a door's swing, or on another object */
  function conflicts(p, geoms) {
    geoms = geoms || p.rooms.map(roomGeom);
    const out = [], fps = p.items.map((it) => { const f = footprint(it); return { it, f, bb: polyBB(f) }; });
    const swings = []; p.rooms.forEach((r, ri) => doorSwings(r, geoms[ri]).forEach((s) => { s.bb = bboxOf(s.poly); swings.push(s); }));
    const overlapBB = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    fps.forEach((F) => {
      const inside = geoms.some((g) => pointInPoly([F.it.x, F.it.y], g.pts));
      if (!inside && geoms.length) { out.push({ t: 'outside', a: F.it.id }); return; }
      let wall = false;
      geoms.forEach((g) => { if (wall) return; for (const poly of F.f) { for (let k = 0; k < g.n && !wall; k++) { const a = g.pts[k], b = g.pts[(k + 1) % g.n]; for (let j = 0; j < poly.length; j++) if (segIntersect(poly[j], poly[(j + 1) % poly.length], a, b)) { wall = true; break; } } if (wall) break; } });
      if (wall) out.push({ t: 'wall', a: F.it.id });
      for (const s of swings) if (overlapBB(F.bb, s.bb) && F.f.some((poly) => polysTouch(poly, s.poly))) { out.push({ t: 'door', a: F.it.id, op: s.op.id }); break; }
    });
    for (let i = 0; i < fps.length; i++) for (let j = i + 1; j < fps.length; j++) {
      const A = fps[i], B = fps[j]; if (!overlapBB(A.bb, B.bb)) continue;
      if (A.it.sub === 'dance' || B.it.sub === 'dance') continue;
      const za = CAT[A.it.ref], zb = CAT[B.it.ref]; if ((za && za.sub === 'dance') || (zb && zb.sub === 'dance')) continue;   // a dance floor may be marked under things
      if (A.f.some((pa) => B.f.some((pb) => polysTouch(pa, pb)))) out.push({ t: 'item', a: A.it.id, b: B.it.id });
    }
    return out;
  }
  /* edge-to-edge distance between two objects (0 when they touch) */
  function polyDist(A, B) {
    if (polysTouch(A, B)) return 0;
    let m = Infinity;
    for (const p of A) for (let j = 0; j < B.length; j++) m = Math.min(m, distSeg(p, B[j], B[(j + 1) % B.length]).d);
    for (const p of B) for (let j = 0; j < A.length; j++) m = Math.min(m, distSeg(p, A[j], A[(j + 1) % A.length]).d);
    return m;
  }
  function nearestItems(p, it, k) {
    const F = footprint(it)[0], out = [];
    p.items.forEach((o) => { if (o.id === it.id) return; const G2 = footprint(o)[0]; out.push({ id: o.id, d: polyDist(F, G2) }); });
    return out.sort((a, b) => a.d - b.d).slice(0, k || 2);
  }
  function totals(p) {
    let tables = 0, seats = 0, stand = 0;
    p.items.forEach((it) => { if (it.kind !== 'table') return; if (it.stand) stand++; else { tables++; seats += seatCount(it); } });
    return { tables, seats, stand };
  }
  /* table numbers: the next free one */
  function nextNum(p) { let m = 0; p.items.forEach((it) => { if (it.kind === 'table' && !it.stand && +it.num > m) m = +it.num; }); return m + 1; }

  /* ---------- the plan as a whole ---------- */
  function newPlan() { return { v: 1, unit: 'm', h: 3000, rooms: [], items: [] }; }
  function normalize(p) {
    const o = Object.assign(newPlan(), p && typeof p === 'object' ? p : {});
    if (!UNIT[o.unit]) o.unit = 'm';
    o.h = clamp(Math.round(+o.h || 3000), 1800, 20000);
    o.rooms = (Array.isArray(o.rooms) ? o.rooms : []).filter((r) => r && Array.isArray(r.walls) && r.walls.length >= 3).map((r) => {
      r.id = r.id || uid(); r.name = String(r.name || '').slice(0, 60); r.x = +r.x || 0; r.y = +r.y || 0; r.h = r.h ? clamp(Math.round(+r.h), 1800, 20000) : null;
      r.diag = r.diag && typeof r.diag === 'object' ? { p: +r.diag.p || null, q: +r.diag.q || null } : { p: null, q: null };
      r.walls.forEach((w) => { w.id = w.id || uid(); w.len = Math.max(1, Math.round(+w.len || 1)); w.dir = normDeg(+w.dir || 0); w.m = !!w.m; w.ops = (Array.isArray(w.ops) ? w.ops : []).filter((x) => x && x.type); w.ops.forEach((x) => { x.id = x.id || uid(); clampOpening(x, w.len); }); });
      return r;
    });
    o.items = (Array.isArray(o.items) ? o.items : []).filter((it) => it && it.kind && isFinite(+it.x) && isFinite(+it.y) && +it.w > 0).map((it) => {
      it.id = it.id || uid(); it.x = +it.x; it.y = +it.y; it.w = clamp(Math.round(+it.w), 50, 60000); it.d = clamp(Math.round(+it.d || it.w), 50, 60000); it.rot = normDeg(+it.rot || 0);
      if (it.kind === 'table') { if (it.shape === 'rect') it.sides = [0, 1, 2, 3].map((k) => clamp(Math.round(+(it.sides || [])[k] || 0), 0, 60)); else it.seats = clamp(Math.round(+it.seats || 0), 0, 40); if (it.num != null) it.num = Math.max(1, Math.round(+it.num) || 1); }
      it.name = String(it.name || '').slice(0, 60);
      return it; });
    return o;
  }
  function summary(p) {
    const gs = p.rooms.map(roomGeom);
    let area = 0, P = 0; const cnt = { ok: 0, warn: 0, bad: 0, partial: 0 };
    gs.forEach((g) => { area += g.area; P += g.P; cnt[g.status]++; });
    return { geoms: gs, area, P, cnt, rooms: p.rooms.length };
  }
  /* room names in one tap */
  const NAMES = ['Банкетный зал', 'Зал', 'Холл', 'Фойе', 'Терраса', 'Веранда', 'Гардероб', 'Коридор', 'Кухня', 'Сцена'];

  return {
    DEG, TOL_OK, TOL_WARN, UNIT, uid, clamp, hyp, nf, fmtLen, parseNum, parseSum, parseLen,
    unitVec, normDeg, signedArea, selfIntersects, triArea, pointInPoly, distSeg, bboxOf, labelPoint, labelAvoid,
    solveLens, quadDirs, roomGeom, outward, cornerName, wallName, wallFree, wallLabelAt, cornerPoint,
    SHAPES, makeRoom, roomFromPoints, OPENINGS, addOpening, clampOpening, rotateRoom, mirrorRoom, setInterior,
    splitWall, insertJog, deleteCorner, itemCorners, isRound, itemBBox, hitItem, itemClearances, planBBox,
    newPlan, normalize, summary, NAMES,
    bake, moveCorner, moveWall, snapCorner, CHAIR, CAT, makeItem, itemLabel, seatCount, chairsLocal, toWorld, footprint, polysTouch, doorSwings, conflicts, polyDist, nearestItems, totals, nextNum,
  };
})();
if (typeof module !== 'undefined') module.exports = PG;
