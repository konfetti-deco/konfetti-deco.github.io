/* ===== plan.js — the «План» mode: the floor plan on screen, touch editing, and its panels.
   The plan lives in S.plan (so it is saved, synced and undone together with the scenes); the geometry is PG (plancore.js).
   Drawing is in millimetres inside one SVG group; panning and pinching move that group without rebuilding it,
   a full repaint follows when the gesture ends. ===== */
/* ===== the number pad in the side panel: a size is typed without the system keyboard. The readout is an input with
   inputmode="none" (no on-screen keyboard; a real keyboard still types into it); ✓ sends the same «change» as Enter. ===== */
var KP = (function () {
  'use strict';
  const KEYS = [['7'], ['8'], ['9'], ['bs', '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="M9 5h11v14H9l-6-7z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/></svg>', 'fn'], ['4'], ['5'], ['6'], ['+', '+', 'fn'], ['1'], ['2'], ['3'], ['C', 'C', 'fn'], [',', ','], ['0'], ['ok', '✓', 'ok']];
  function html(o) {   // o: {id, bind:'data-pbind="w.len"', act:'data-pact'|'data-fact', label, val, unit, ph, after, help, cls}
    const units = [['m', 'м'], ['cm', 'см'], ['mm', 'мм']];
    return '<div class="kp full' + (o.cls ? ' ' + o.cls : '') + '"><div class="kpr"><span class="kpl">' + o.label + (o.help ? U.help(o.help) : '') + '</span><input id="' + o.id + '" class="kpv" type="text" inputmode="none" autocomplete="off" spellcheck="false" ' + o.bind + ' data-fresh="1" value="' + String(o.val == null ? '' : o.val).replace(/"/g, '&quot;') + '" placeholder="' + (o.ph || '—') + '"><span class="kpun">' + o.unitLab + '</span></div>' +
      '<div class="kpu" role="group" aria-label="Единицы">' + units.map((u) => '<button type="button" ' + o.act + '="unit" data-v="' + u[0] + '" aria-pressed="' + (o.unit === u[0]) + '">' + u[1] + '</button>').join('') + '</div>' +
      '<div class="kpk">' + KEYS.map((k) => '<button type="button" class="kk' + (k[2] ? ' ' + k[2] : '') + '" data-kp="' + k[0] + '" data-for="' + o.id + '"' + (o.after ? ' data-after="' + o.after + '"' : '') + ' aria-label="' + (k[0] === 'bs' ? 'Стереть' : k[0] === 'ok' ? 'Готово' : k[0] === 'C' ? 'Очистить' : k[0]) + '">' + (k[1] || k[0]) + '</button>').join('') + '</div></div>';
  }
  function key(btn) {
    const inp = document.getElementById(btn.dataset.for); if (!inp) return;
    const k = btn.dataset.kp, fresh = inp.dataset.fresh === '1';
    let b = fresh ? '' : inp.value;
    if (k === 'ok') { inp.dispatchEvent(new Event('change', { bubbles: true })); const af = btn.dataset.after; if (af) setTimeout(() => { if (af === 'wnext') PL.act('w-step', { dataset: { v: '1' } }); else if (af === 'mdone' && window.PF) PF.act('clear'); }, 0); return; }
    if (k === 'C') b = '';
    else if (k === 'bs') b = fresh ? '' : b.slice(0, -1);
    else if (k === ',') { const last = b.split('+').pop(); if (last.indexOf(',') >= 0) return; b += last === '' ? '0,' : ','; }
    else if (k === '+') { if (!b || /[+,]$/.test(b)) return; b += '+'; }
    else { if (b.length >= 16) return; b += k; }
    inp.value = b; inp.dataset.fresh = '0';
  }
  return { html, key };
})();

var PL = (function () {
  'use strict';
  const G = PG;
  const ICO = {
    psel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 8-6 1.6L10 19z"/></svg>',
    proom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 4h16v10h-7v6H4z"/><path d="M4 4l3 3M20 4l-3 3" stroke-width="1.2"/></svg>',
    pdoor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 20h4M17 20h4"/><path d="M7 20V8"/><path d="M7 8a12 12 0 0 1 10 12" stroke-dasharray="2 2.4"/></svg>',
    pcol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="12" r="4"/><rect x="14" y="8" width="7" height="8" rx="1"/></svg>',
    pruler: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 16L16 3l5 5L8 21z"/><path d="M7 12l2 2M10 9l2 2M13 6l2 2" stroke-linecap="round"/></svg>',
    ptable: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="4" r="1.6"/><circle cx="12" cy="20" r="1.6"/><circle cx="4" cy="12" r="1.6"/><circle cx="20" cy="12" r="1.6"/><circle cx="6.3" cy="6.3" r="1.4"/><circle cx="17.7" cy="17.7" r="1.4"/></svg>',
    pceil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 5h18"/><path d="M6 5v3M12 5v6M18 5v3"/><path d="M4 20h16" stroke-dasharray="2 3"/></svg>',
    prig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M2 6h20v4H2z"/><path d="M2 10l4-4 4 4 4-4 4 4 4-4"/><path d="M12 10v6" stroke-linecap="round"/><circle cx="12" cy="18" r="2"/></svg>',
    plight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3v4"/><path d="M7 7h10l-2 6H9z" stroke-linejoin="round"/><path d="M8 16l-2 3M12 16v4M16 16l2 3"/></svg>',
    pcdeco: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 4h18" stroke-linecap="round"/><path d="M8 4v3M16 4v5"/><circle cx="8" cy="10" r="3"/><circle cx="16" cy="12" r="3"/><circle cx="12" cy="15" r="3"/></svg>',
    pzone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="4" width="18" height="7" rx="1"/><path d="M6 15h12M8 19h8" stroke-linecap="round"/></svg>',
  };
  const TOOLS = [['room', 'proom', 'Помещение', 'прямоугольник, Г, П, по углам'], ['open', 'pdoor', 'Двери и окна', 'дверь, двустворчатая, выход, окна'], ['tables', 'ptable', 'Столы и стулья', 'круглые, прямоугольные, империал, П, Т, коктейльные'], ['zones', 'pzone', 'Сцена и зоны', 'сцена, танцпол, бар, DJ, фуршет, фотозона'], ['col', 'pcol', 'Колонна', 'круглая, квадратная']];
  const TOOLS_TOP = [['ceil', 'pceil', 'Потолок', 'зоны разной высоты'], ['rig', 'prig', 'Подвес', 'точки подвеса, балки, фермы'], ['light', 'plight', 'Свет', 'прожектор, люстра, гирлянда'], ['cdeco', 'pcdeco', 'Декор под потолком', 'облако шаров, ткань, композиция']];
  const FLY = {
    room: [['rect', 'Прямоугольный зал', '12 × 8 м, потом впишите замеры'], ['L', 'Г-образный зал', '12 × 9 м'], ['U', 'П-образный зал', '15 × 10 м'], ['draw', 'Нарисовать по углам', 'коснитесь углов по порядку']],
    open: Object.keys(G.OPENINGS).map((k) => [k, G.OPENINGS[k].label, G.OPENINGS[k].type === 'window' ? 'окно' : G.OPENINGS[k].type === 'open' ? 'без полотна' : 'с полотном']),
    col: [['round', 'Колонна круглая Ø400', 'размер меняется в свойствах'], ['rect', 'Колонна квадратная 400×400', 'размер меняется в свойствах']],
    tables: Object.keys(G.CAT).filter((k) => G.CAT[k].g === 'tables').map((k) => [k, G.CAT[k].label, G.CAT[k].stand ? 'стоячий, без стульев' : G.seatCount(G.makeItem(k, 0, 0)) + ' мест, можно изменить']).concat([['P', 'П-образный стол', '3 стола 220×80, стулья снаружи'], ['T', 'Т-образный стол', '3 стола 220×80']]),
    ceil: [['u_ceil', G.CAT.u_ceil.label, 'высота потолка внутри зоны — в свойствах']],
    rig: ['u_hook', 'u_beam', 'u_truss'].map((k) => [k, G.CAT[k].label, 'высота и нагрузка — в свойствах']),
    light: ['u_spot', 'u_chand', 'u_glin'].map((k) => [k, G.CAT[k].label, 'высота — от потолка, можно изменить']),
    cdeco: ['u_cloud', 'u_drape', 'u_hang'].map((k) => [k, G.CAT[k].label, 'низ — от потолка, можно изменить']),
    zones: Object.keys(G.CAT).filter((k) => G.CAT[k].g === 'zones').map((k) => [k, G.CAT[k].label, 'размер меняется пальцем или в свойствах']),
  };

  /* ---------- state that is not saved: view, selection, tool ---------- */
  const st = { v: null, sel: null, tool: null, draw: null, ruler: null, jog: { off: null, w: 1200, d: 400 }, grid: { rows: 2, cols: 3, sx: null, sy: null }, layer: 'floor', tc: null, placed: 0, cf: null, lastTap: null, split: null, drag: null, tps: {}, pinch: null, repaint: 0, lastW: 0, lastH: 0 };
  function P() { if (!S.plan) S.plan = G.newPlan(); return S.plan; }
  function unit() { return P().unit || 'm'; }
  function uLab() { return G.UNIT[unit()].ru; }
  function fl(mm) { return G.fmtLen(mm, unit()); }
  /* a short form for heights and sizes: no trailing zeros */
  function fs(mm) { let s = fl(mm); if (s.indexOf(',') >= 0) s = s.replace(/0+$/, '').replace(/,$/, ''); return s; }
  function m2(a) { return G.nf(a / 1e6, 2); }
  function room(id) { return P().rooms.find((r) => r.id === id) || null; }
  function item(id) { return P().items.find((r) => r.id === id) || null; }
  function wallIx(r, wid) { return r ? r.walls.findIndex((w) => w.id === wid) : -1; }
  function selRoom() { return st.sel && st.sel.r ? room(st.sel.r) : null; }
  function validate() {
    const s = st.sel; if (!s) return;
    if (s.t === 'item') { if (!item(s.i)) st.sel = null; return; }
    if (s.t === 'guide') { if (!(P().guides || []).some((g) => g.id === s.g)) st.sel = null; return; }
    const r = room(s.r); if (!r) { st.sel = null; return; }
    if (s.t === 'wall' || s.t === 'op') { const i = wallIx(r, s.w); if (i < 0) { st.sel = { t: 'room', r: r.id }; return; }
      if (s.t === 'op' && !(r.walls[i].ops || []).some((o) => o.id === s.o)) st.sel = { t: 'wall', r: r.id, w: s.w }; }
    if (s.t === 'corner' && !(s.c >= 0 && s.c < r.walls.length)) st.sel = { t: 'room', r: r.id };
  }
  function label(txt) { UI.nextLabel = 'План: ' + txt; commit(); }

  /* ---------- view ---------- */
  function host() { return document.getElementById('planhost'); }
  const MODE = 'plan';
  /* the size of the drawing area, kept by a ResizeObserver: reading clientWidth right after the panel was rebuilt
     forced the browser to lay out the whole page in the middle of every redraw */
  const HS = { w: 0, h: 0, el: null, ro: null };
  function hsize() {
    const h = host(); if (!h) return { w: 0, h: 0 };
    if (HS.el !== h && window.ResizeObserver) {
      if (HS.ro) HS.ro.disconnect(); HS.el = h; HS.w = 0; HS.h = 0;
      HS.ro = new ResizeObserver((es) => { const r = es[es.length - 1].contentRect, w = Math.round(r.width), hh = Math.round(r.height), moved = Math.abs(w - HS.w) > 2 || Math.abs(hh - HS.h) > 2; HS.w = w; HS.h = hh; if (moved && w > 0 && UI.mode === MODE) paint(); });
      HS.ro.observe(h);
    }
    return HS.w > 0 && HS.h > 0 ? { w: HS.w, h: HS.h } : { w: h.clientWidth, h: h.clientHeight };
  }
  function svg() { return document.getElementById('plan'); }
  function fit(force) {
    const h = host(); if (!h) return; const hz = hsize(), W = hz.w, H = hz.h; if (W < 50 || H < 50) return;
    const bb = G.planBBox(P()) || { x0: -1000, y0: -1000, x1: 15000, y1: 10000, w: 16000, h: 11000 };
    const mx = Math.max(bb.w * 0.12, 1200), my = Math.max(bb.h * 0.12, 1200), bw = bb.w + 2 * mx, bh = bb.h + 2 * my;
    const s = G.clamp(Math.min(W / bw, H / bh), 0.004, 1.2);
    st.v = { s, x: bb.x0 - mx - (W / s - bw) / 2, y: bb.y0 - my - (H / s - bh) / 2 };
    st.lastW = W; st.lastH = H;
  }
  function ensureView() { const h = host(); if (!h) return; const z = hsize(); if (!st.v || (z.w && (Math.abs(z.w - st.lastW) > 2 || Math.abs(z.h - st.lastH) > 2) && !st.v.user)) fit(); }
  function applyView() { const g = document.getElementById('pvp'); if (g && st.v) g.setAttribute('transform', 'matrix(' + st.v.s + ' 0 0 ' + st.v.s + ' ' + (-st.v.x * st.v.s) + ' ' + (-st.v.y * st.v.s) + ')'); const ru = document.getElementById('prul'); if (ru && st.v) { const h = rulersSvg(); if (ru._h !== h) { ru.innerHTML = h; ru._h = h; } } const z = document.getElementById('pzlbl'); if (z) z.textContent = zoomText(); }
  function zoomText() { if (!st.v) return ''; const px = st.v.s * 1000; return px >= 10 ? '1 м = ' + Math.round(px) + ' пикс.' : '1 м = ' + px.toFixed(1) + ' пикс.'; }
  function toMM(ev) { const r = svg().getBoundingClientRect(); return [(ev.clientX - r.left) / st.v.s + st.v.x, (ev.clientY - r.top) / st.v.s + st.v.y]; }
  function zoomAt(f, px, py) { const v = st.v, mx = px / v.s + v.x, my = py / v.s + v.y, s = G.clamp(v.s * f, 0.004, 1.2); st.v = { s, x: mx - px / s, y: my - py / s, user: true }; applyView(); laterRepaint(); }
  function zoomBy(f) { const h = host(); if (!h || !st.v) return; const z = hsize(); zoomAt(f, z.w / 2, z.h / 2); }
  function laterRepaint() { clearTimeout(st.repaint); st.repaint = setTimeout(() => { paint(); }, 140); }

  /* ---------- painting ---------- */
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const n1 = (v) => Math.round(v * 10) / 10;
  const pts = (a) => a.map((q) => n1(q[0]) + ',' + n1(q[1])).join(' ');
  function upright(deg) { let r = G.normDeg(deg); if (r >= 90) r -= 180; else if (r < -90) r += 180; return r; }
  function text(x, y, str, px, cls, rot, anchor) {
    const s = st.v.s, fz = px / s;
    return '<text class="' + cls + '" x="' + n1(x) + '" y="' + n1(y) + '" font-size="' + n1(fz) + '" stroke-width="' + n1(3.2 / s) + '" text-anchor="' + (anchor || 'middle') + '" dominant-baseline="central"' + (rot ? ' transform="rotate(' + n1(rot) + ' ' + n1(x) + ' ' + n1(y) + ')"' : '') + '>' + esc(str) + '</text>';
  }
  function gridSvg() {
    const z = hsize(), v = st.v, W = z.w / v.s, H = z.h / v.s;
    const steps = [100, 250, 500, 1000, 2000, 5000, 10000, 20000];
    let minor = steps.find((q) => q * v.s >= 14) || 20000; const major = minor >= 1000 ? minor * 5 : 1000;
    const x0 = Math.floor((v.x - W) / minor) * minor, x1 = v.x + 2 * W, y0 = Math.floor((v.y - H) / minor) * minor, y1 = v.y + 2 * H;
    let a = '', b = '';
    if ((x1 - x0) / minor > 600 || (y1 - y0) / minor > 600) return '';
    for (let x = x0; x <= x1; x += minor) { const l = '<line x1="' + x + '" y1="' + y0 + '" x2="' + x + '" y2="' + y1 + '"/>'; if (Math.round(x) % major === 0) b += l; else a += l; }
    for (let y = y0; y <= y1; y += minor) { const l = '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '"/>'; if (Math.round(y) % major === 0) b += l; else a += l; }
    let c = ''; const sn = P().snap || 0;
    if (sn > 0 && sn * v.s >= 6) { const o = G.gridOrigin(P()), gx0 = G.snapGrid(v.x - W, o[0], sn), gy0 = G.snapGrid(v.y - H, o[1], sn);
      if ((x1 - gx0) / sn < 600 && (y1 - gy0) / sn < 600) { for (let x = gx0; x <= x1; x += sn) c += '<line x1="' + x + '" y1="' + y0 + '" x2="' + x + '" y2="' + y1 + '"/>'; for (let y = gy0; y <= y1; y += sn) c += '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '"/>'; } }
    return '<g class="pg1">' + (sn ? '' : a) + '</g><g class="pg2">' + (sn ? '' : b) + '</g>' + (c ? '<g class="pg3">' + c + '</g>' : '');
  }
  /* ---------- rulers along the top and left edge (as in Photoshop): distances from corner A; guides are pulled out of them ---------- */
  const RW = 22;
  function rulersOn() { return P().rulers !== false; }
  function rulerStep() { const steps = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]; return steps.find((q) => q * st.v.s >= 64) || 50000; }
  function rulerLab(mm) { const k = G.UNIT[unit()].k, st0 = rulerStep() / k; return G.nf(mm / k, st0 >= 1 ? 0 : st0 >= 0.1 ? 1 : 2); }
  function rulersSvg() {
    if (!rulersOn() || !st.v) return '';
    const z = hsize(), v = st.v, W = z.w, H = z.h; if (!(W > 0)) return '';
    const o = G.gridOrigin(P()), major = rulerStep(), minor = major / (String(major)[0] === '2' ? 4 : 5);
    const isMaj = (m, o0) => Math.abs((m - o0) / major - Math.round((m - o0) / major)) < 1e-6;
    let tk = '', lx = '', ly = '';
    const xa = o[0] + Math.floor((v.x - o[0]) / minor) * minor, xb = v.x + W / v.s;
    for (let m = xa; m <= xb; m += minor) { const X = (m - v.x) * v.s; if (X < RW) continue; const M = isMaj(m, o[0]); tk += 'M' + n1(X) + ' ' + RW + 'v-' + (M ? 10 : 4); if (M) lx += '<text x="' + n1(X + 3) + '" y="11">' + rulerLab(m - o[0]) + '</text>'; }
    const ya = o[1] + Math.floor((v.y - o[1]) / minor) * minor, yb = v.y + H / v.s;
    for (let m = ya; m <= yb; m += minor) { const Y = (m - v.y) * v.s; if (Y < RW) continue; const M = isMaj(m, o[1]); tk += 'M' + RW + ' ' + n1(Y) + 'h-' + (M ? 10 : 4); if (M) ly += '<text x="11" y="' + n1(Y - 3) + '" transform="rotate(-90 11 ' + n1(Y - 3) + ')">' + rulerLab(m - o[1]) + '</text>'; }
    let mk = '';
    (P().guides || []).forEach((g) => { const on = st.sel && st.sel.t === 'guide' && st.sel.g === g.id;
      if (g.vert) { const X = (g.at - v.x) * v.s; if (X >= RW && X <= W) mk += '<path class="prgm' + (on ? ' on' : '') + '" data-r="G|' + g.id + '" d="M' + n1(X - 7) + ' 2h14l-7 18z"/>'; }
      else { const Y = (g.at - v.y) * v.s; if (Y >= RW && Y <= H) mk += '<path class="prgm' + (on ? ' on' : '') + '" data-r="G|' + g.id + '" d="M2 ' + n1(Y - 7) + 'v14l18 -7z"/>'; } });
    return '<rect class="prb" data-r="R|x" x="' + RW + '" y="0" width="' + n1(W - RW) + '" height="' + RW + '"/><rect class="prb" data-r="R|y" x="0" y="' + RW + '" width="' + RW + '" height="' + n1(H - RW) + '"/>' +
      '<path class="prt" d="' + tk + '"/><g class="prl">' + lx + ly + '</g>' + mk +
      '<rect class="prb prc" data-r="R|c" x="0" y="0" width="' + RW + '" height="' + RW + '"/><text class="prl prcu" x="11" y="15">' + G.UNIT[unit()].ru + '</text>';
  }
  /* guides across the whole plan: drawn above everything, grabbed only where no object is (their hit lines lie under the objects) */
  function guidesSvg(hitOnly) {
    if (!rulersOn() || !st.v) return '';
    const z = hsize(), v = st.v, W = z.w / v.s, H = z.h / v.s; let h = '';
    (P().guides || []).forEach((g) => { const on = st.sel && st.sel.t === 'guide' && st.sel.g === g.id;
      const a = g.vert ? [g.at, v.y - H, g.at, v.y + 2 * H] : [v.x - W, g.at, v.x + 2 * W, g.at];
      h += '<line class="' + (hitOnly ? 'pglh' : 'pgl' + (on ? ' on' : '')) + '"' + (hitOnly ? ' data-r="G|' + g.id + '"' : '') + ' x1="' + n1(a[0]) + '" y1="' + n1(a[1]) + '" x2="' + n1(a[2]) + '" y2="' + n1(a[3]) + '"/>'; });
    return h;
  }
  /* a guide being pulled snaps to object edges and centres and to room corners, otherwise to 10 mm */
  function snapGuide(val, vert) {
    const tol = 9 / st.v.s, c = [], p = P();
    p.items.forEach((it) => { if (it.kind === 'photo') return; const b = G.itemBBox(it); if (vert) c.push(b.x0, it.x, b.x1); else c.push(b.y0, it.y, b.y1); });
    p.rooms.forEach((r) => G.roomGeom(r).raw.forEach((q) => c.push(vert ? q[0] : q[1])));
    let best = null; c.forEach((x) => { const d = Math.abs(x - val); if (d <= tol && (best === null || d < Math.abs(best - val))) best = x; });
    return best !== null ? Math.round(best) : Math.round(val / 10) * 10;
  }
  function opSvg(A, u, nO, op, L, cls) {
    const nI = [-nO[0], -nO[1]], s = st.v.s, j = 9 / s, t0 = G.clamp(op.off, 0, L), t1 = G.clamp(op.off + op.w, 0, L);
    const at = (t) => [A[0] + u[0] * t, A[1] + u[1] * t], P0 = at(t0), P1 = at(t1);
    let h = '';
    for (const q of [P0, P1]) h += '<line class="pj ' + cls + '" x1="' + n1(q[0] - nO[0] * j) + '" y1="' + n1(q[1] - nO[1] * j) + '" x2="' + n1(q[0] + nO[0] * j) + '" y2="' + n1(q[1] + nO[1] * j) + '"/>';
    if (op.type === 'door') {
      const sw = op.out ? nO : nI, leaves = op.leaves === 2 ? [[P0, P1, (t1 - t0) / 2], [P1, P0, (t1 - t0) / 2]] : [[op.flip ? P1 : P0, op.flip ? P0 : P1, t1 - t0]];
      for (const [hinge, other, r] of leaves) {
        const leaf = [hinge[0] + sw[0] * r, hinge[1] + sw[1] * r];
        h += '<line class="pdl ' + cls + '" x1="' + n1(hinge[0]) + '" y1="' + n1(hinge[1]) + '" x2="' + n1(leaf[0]) + '" y2="' + n1(leaf[1]) + '"/>';
        const a0 = Math.atan2(other[1] - hinge[1], other[0] - hinge[0]), a1 = Math.atan2(sw[1], sw[0]);
        let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        const arc = []; for (let k = 0; k <= 14; k++) { const an = a0 + da * k / 14; arc.push([hinge[0] + Math.cos(an) * r, hinge[1] + Math.sin(an) * r]); }
        h += '<polyline class="pda ' + cls + '" points="' + pts(arc) + '"/>';
      }
      if (op.exit) { const m = at((t0 + t1) / 2), side = op.out ? nI : nO, o = 14 / s; h += text(m[0] + side[0] * o, m[1] + side[1] * o, 'ВЫХОД', 10.5, 'pex', 0); }   // on the side away from the leaves
    } else if (op.type === 'window') {
      for (const k of [-1, 0, 1]) h += '<line class="pwn ' + cls + '" x1="' + n1(P0[0] + nO[0] * j * 0.7 * k) + '" y1="' + n1(P0[1] + nO[1] * j * 0.7 * k) + '" x2="' + n1(P1[0] + nO[0] * j * 0.7 * k) + '" y2="' + n1(P1[1] + nO[1] * j * 0.7 * k) + '"/>';
    } else {
      h += '<line class="pop ' + cls + '" x1="' + n1(P0[0]) + '" y1="' + n1(P0[1]) + '" x2="' + n1(P1[0]) + '" y2="' + n1(P1[1]) + '"/>';
    }
    return h;
  }
  /* objects are drawn in their own axes inside a group that is moved and turned; each keeps its own node */
  function topHtml(it, on, bad, s) {
    const c = G.CAT[it.ref] || {}, sub = c.sub || 'hang', h0 = G.topH(P(), it), back = -(it.rot || 0), hw = it.w / 2, hd = (it.shape === 'round' ? it.w : it.d) / 2;
    let h = '<g class="pig top ' + sub + (on ? ' on' : '') + (bad ? ' bad' : '') + '" data-r="i|' + it.id + '" data-k="' + it.id + '" transform="translate(' + n1(it.x) + ' ' + n1(it.y) + ') rotate(' + n1(it.rot || 0) + ')">';
    const ln = (x1, y1, x2, y2, cls) => '<line class="' + (cls || 'tdl') + '" x1="' + n1(x1) + '" y1="' + n1(y1) + '" x2="' + n1(x2) + '" y2="' + n1(y2) + '"/>';
    if (sub === 'ceil') h += '<rect class="pib" x="' + n1(-hw) + '" y="' + n1(-hd) + '" width="' + n1(it.w) + '" height="' + n1(it.d) + '"/>';
    else if (sub === 'hook') h += '<circle class="pib" r="' + n1(Math.max(hw, 6 / s)) + '"/>' + ln(-hw * 1.6, 0, hw * 1.6, 0) + ln(0, -hw * 1.6, 0, hw * 1.6);
    else if (sub === 'beam') h += '<rect class="pib" x="' + n1(-hw) + '" y="' + n1(-hd) + '" width="' + n1(it.w) + '" height="' + n1(it.d) + '"/>';
    else if (sub === 'truss') { h += '<rect class="pib" x="' + n1(-hw) + '" y="' + n1(-hd) + '" width="' + n1(it.w) + '" height="' + n1(it.d) + '"/>'; const k = Math.max(2, Math.round(it.w / (it.d * 1.2))); for (let j = 0; j < k; j++) { const x0 = -hw + it.w * j / k, x1 = -hw + it.w * (j + 1) / k; h += ln(x0, j % 2 ? hd : -hd, x1, j % 2 ? -hd : hd); } }
    else if (sub === 'spot') { h += '<circle class="pib" r="' + n1(hw) + '"/>'; for (let j = 0; j < 4; j++) { const a = j * Math.PI / 2 + Math.PI / 4; h += ln(Math.cos(a) * hw * 1.15, Math.sin(a) * hw * 1.15, Math.cos(a) * hw * 1.7, Math.sin(a) * hw * 1.7); } }
    else if (sub === 'chand') { h += '<circle class="pib" r="' + n1(hw) + '"/><circle class="tdl" r="' + n1(hw * 0.35) + '"/>'; for (let j = 0; j < 6; j++) { const a = j * Math.PI / 3; h += ln(Math.cos(a) * hw * 0.35, Math.sin(a) * hw * 0.35, Math.cos(a) * hw, Math.sin(a) * hw); } }
    else if (sub === 'gline') { h += ln(-hw, 0, hw, 0, 'pib'); const k = Math.max(3, Math.round(it.w / 400)); for (let j = 0; j <= k; j++) h += '<circle class="tdot" cx="' + n1(-hw + it.w * j / k) + '" cy="0" r="' + n1(Math.max(40, 2.5 / s)) + '"/>'; }
    else if (sub === 'cloud') { h += '<circle class="pib" r="' + n1(hw) + '"/>'; [[0, 0, .38], [.45, .1, .3], [-.42, .15, .3], [.1, .5, .28], [-.15, -.48, .3], [.4, -.38, .26], [-.48, -.3, .22]].forEach((q) => { h += '<circle class="tdl" cx="' + n1(q[0] * hw) + '" cy="' + n1(q[1] * hw) + '" r="' + n1(q[2] * hw) + '"/>'; }); }
    else if (sub === 'drape') { h += '<rect class="pib" x="' + n1(-hw) + '" y="' + n1(-hd) + '" width="' + n1(it.w) + '" height="' + n1(2 * hd) + '"/>'; let d = 'M' + n1(-hw) + ' 0'; const k = Math.max(2, Math.round(it.w / 1000)); for (let j = 0; j < k; j++) { const x0 = -hw + it.w * j / k, x1 = -hw + it.w * (j + 1) / k; d += ' Q' + n1((x0 + x1) / 2) + ' ' + n1(hd * 0.9) + ' ' + n1(x1) + ' 0'; } h += '<path class="tdl" d="' + d + '"/>'; }
    else { h += '<circle class="pib" r="' + n1(hw) + '"/>'; for (let j = 0; j < 4; j++) { const a = j * Math.PI / 4; h += ln(Math.cos(a) * hw * 0.8, Math.sin(a) * hw * 0.8, -Math.cos(a) * hw * 0.8, -Math.sin(a) * hw * 0.8); } }
    const big = Math.max(it.w, it.d) * s;
    if (big >= 16) {
      const lab = sub === 'ceil' ? 'потолок ' + fs(h0) : sub === 'hook' ? fs(h0) + (it.load ? ' · ' + it.load + ' кг' : '') : '↓' + fs(h0);
      h += text(0, sub === 'ceil' ? 0 : sub === 'gline' || sub === 'beam' || sub === 'truss' ? -(hd + 9 / s) : (sub === 'hook' ? -(Math.max(hw, 6 / s) + 9 / s) : 0), lab, sub === 'ceil' ? 11.5 : 10.5, 'ptl', back);
    }
    return h + '</g>';
  }
  function pinHtml(it, on, s) {
    const ph = (S.photos || []).find((x) => x.id === it.photo), r = 10 / s, L0 = 70 / s, t = Math.tan(28 * G.DEG) * L0;
    return '<g class="pig ppin' + (on ? ' on' : '') + '" data-r="i|' + it.id + '" data-k="' + it.id + '" transform="translate(' + n1(it.x) + ' ' + n1(it.y) + ') rotate(' + n1(it.rot || 0) + ')">' +
      '<polygon class="pcone" points="0,0 ' + n1(-t) + ',' + n1(-L0) + ' ' + n1(t) + ',' + n1(-L0) + '"/><circle class="pib" r="' + n1(r) + '"/>' +
      '<rect class="pcam" x="' + n1(-r * 0.55) + '" y="' + n1(-r * 0.38) + '" width="' + n1(r * 1.1) + '" height="' + n1(r * 0.76) + '" rx="' + n1(r * 0.15) + '"/><circle class="pcam2" r="' + n1(r * 0.24) + '"/>' +
      (ph ? text(0, r + 11 / s, ph.name.length > 18 ? ph.name.slice(0, 17) + '…' : ph.name, 10, 'ppn', -(it.rot || 0)) : '') + '</g>';
  }
  function itemHtml(it, on, bad, s) {
    if (it.kind === 'photo') return pinHtml(it, on, s);
    if (it.top) return topHtml(it, on, bad, s);
    const c = G.CAT[it.ref] || {}, sub = it.kind === 'column' ? 'col' : it.kind === 'table' ? 'tab' : (c.sub || 'furn');
    let h = '<g class="pig ' + sub + (on ? ' on' : '') + (bad ? ' bad' : '') + '" data-r="i|' + it.id + '" data-k="' + it.id + '" transform="translate(' + n1(it.x) + ' ' + n1(it.y) + ') rotate(' + n1(it.rot || 0) + ')">';
    G.chairsLocal(it).forEach((q) => { h += '<rect class="pch" x="-225" y="-225" width="450" height="450" rx="90" transform="translate(' + n1(q.x) + ' ' + n1(q.y) + ') rotate(' + n1(q.a) + ')"/><line class="pchb" x1="-190" y1="200" x2="190" y2="200" transform="translate(' + n1(q.x) + ' ' + n1(q.y) + ') rotate(' + n1(q.a) + ')"/>'; });
    if (it.shape === 'round') h += '<circle class="pib" r="' + n1(it.w / 2) + '"/>';
    else if (it.shape === 'oval') h += '<ellipse class="pib" rx="' + n1(it.w / 2) + '" ry="' + n1(it.d / 2) + '"/>';
    else h += '<rect class="pib" x="' + n1(-it.w / 2) + '" y="' + n1(-it.d / 2) + '" width="' + n1(it.w) + '" height="' + n1(it.d) + '" rx="' + (sub === 'tab' ? 30 : 10) + '"/>';
    const small = Math.min(it.w, it.d) * s, back = -(it.rot || 0);
    if (it.kind === 'table' && !it.stand && small >= 22) {
      h += text(0, -(small >= 40 ? 6 : 0) / s, (it.num != null ? it.num : ''), 13, 'ptn', back);
      if (small >= 40) h += text(0, 9 / s, G.seatCount(it) + ' м.', 9.5, 'pts', back);
    } else if (it.kind === 'zone' && small >= 14) {
      const lab = G.itemLabel(it), fit = Math.max(3, Math.floor(Math.max(it.w, it.d) * s / 7));
      h += text(0, 0, lab.length > fit ? lab.slice(0, fit - 1) + '…' : lab, 10.5, 'pzn', it.w >= it.d ? back : back + ((it.rot || 0) % 180 === 0 ? -90 : 0));
    }
    return h + '</g>';
  }
  const SVGNS = 'http://www.w3.org/2000/svg';
  function syncItems(list, boxId) {
    const box = document.getElementById(boxId || 'pitems'); if (!box) return;
    const have = {}; Array.prototype.forEach.call(box.children, (n) => { have[n.getAttribute('data-k')] = n; });
    const tmp = document.createElementNS(SVGNS, 'g'); let prev = null;
    list.forEach((q) => {
      let n = have[q.id]; delete have[q.id];
      if (!n || n._h !== q.html) { tmp.innerHTML = q.html; const m = tmp.firstElementChild; m._h = q.html; if (n) box.replaceChild(m, n); else box.insertBefore(m, prev ? prev.nextSibling : box.firstChild); n = m; }
      else if (n.previousSibling !== prev && !(prev === null && n === box.firstChild)) box.insertBefore(n, prev ? prev.nextSibling : box.firstChild);
      prev = n;
    });
    Object.keys(have).forEach((k) => have[k].remove());
  }
  /* what is in the way — computed when nothing is being dragged */
  /* the upper layer's checks: above the ceiling there, or too low over guests */
  function topChecks() {
    const p = P(); if (p.warn === false) return { list: [], ids: {} };
    if (st.drag && st.tc) return st.tc;
    const key = JSON.stringify([p.rooms, p.items, p.h, p.minClear]);
    if (st.tc && st.tc.key === key) return st.tc;
    const list = G.topChecks(p), ids = {}; list.forEach((q) => { ids[q.a] = 1; });
    st.tc = { key, list, ids }; return st.tc;
  }
  function conflicts() {
    const p = P(); if (p.warn === false) return { list: [], ids: {} };
    if (st.drag && st.cf) return st.cf;
    const key = JSON.stringify([p.rooms, p.items]);
    if (st.cf && st.cf.key === key) return st.cf;
    const list = G.conflicts(p), ids = {}; list.forEach((q) => { ids[q.a] = 1; if (q.b) ids[q.b] = 1; });
    st.cf = { key, list, ids }; return st.cf;
  }
  function closest(A, B) {   // nearest points of two polygons (edge to edge)
    let best = { d: Infinity };
    const run = (P1, P2, flip) => { for (const p of P1) for (let j = 0; j < P2.length; j++) { const a = P2[j], b = P2[(j + 1) % P2.length], r = G.distSeg(p, a, b); if (r.d < best.d) { const q = [a[0] + (b[0] - a[0]) * r.t, a[1] + (b[1] - a[1]) * r.t]; best = flip ? { d: r.d, a: q, b: p } : { d: r.d, a: p, b: q }; } } };
    run(A, B, false); run(B, A, true); return best;
  }
  function handle(cls, ref, x, y, r) { return '<circle class="' + cls + '" cx="' + n1(x) + '" cy="' + n1(y) + '" r="' + n1(r) + '"/><circle class="hh" data-r="' + ref + '" cx="' + n1(x) + '" cy="' + n1(y) + '" r="' + n1(r * 2.6) + '"/>'; }
  /* a handle in the middle of a side: a short bar along that side, changes only the length or only the width */
  function pill(ref, x, y, r, ang) { return '<rect class="phd phe" x="' + n1(x - r * 1.7) + '" y="' + n1(y - r * 0.75) + '" width="' + n1(r * 3.4) + '" height="' + n1(r * 1.5) + '" rx="' + n1(r * 0.7) + '" transform="rotate(' + n1(ang) + ' ' + n1(x) + ' ' + n1(y) + ')"/><circle class="hh" data-r="' + ref + '" cx="' + n1(x) + '" cy="' + n1(y) + '" r="' + n1(r * 3) + '"/>'; }
  function sq(cls, ref, x, y, r) { return '<rect class="' + cls + '" x="' + n1(x - r) + '" y="' + n1(y - r) + '" width="' + n1(2 * r) + '" height="' + n1(2 * r) + '" rx="' + n1(r * 0.3) + '"/><circle class="hh" data-r="' + ref + '" cx="' + n1(x) + '" cy="' + n1(y) + '" r="' + n1(r * 3) + '"/>'; }
  function paint() {
    const sv = svg(); if (!sv || UI.mode !== 'plan') return;
    if (!document.getElementById('pitems')) return;
    validate(); ensureView(); if (!st.v) return;
    const s = st.v.s, p = P(), sel = st.sel || {}, geoms = p.rooms.map(G.roomGeom), cf = conflicts();
    let fill = '', walls = '', labels = '', hit = '', over = '', hnd = '';
    const boxes = p.items.map(G.itemBBox);
    p.rooms.forEach((r, ri) => {
      const g = geoms[ri], n = g.n, rs = sel.r === r.id && sel.t !== 'item';
      fill += '<polygon class="prf' + (rs && sel.t === 'room' ? ' on' : rs ? ' half' : '') + '" data-r="r|' + r.id + '" points="' + pts(g.raw.slice(0, n)) + '"/>';
      if (g.gap > 0.75) walls += '<line class="pgap" x1="' + n1(g.raw[n][0]) + '" y1="' + n1(g.raw[n][1]) + '" x2="' + n1(g.raw[0][0]) + '" y2="' + n1(g.raw[0][1]) + '"/>';
      r.walls.forEach((w, i) => {
        const A = g.raw[i], u = G.unitVec(g.dirs[i]), L = g.L[i], nO = G.outward(g, i), ws = rs && sel.w === w.id && (sel.t === 'wall' || sel.t === 'op');
        const cls = ws && sel.t === 'wall' ? 'pw on' : w.m ? 'pw' : 'pw est', at = (t) => [A[0] + u[0] * t, A[1] + u[1] * t];
        let cur = 0;
        const seg = (t0, t1) => { if (t1 - t0 > 0.5) { const a = at(t0), b = at(t1); walls += '<line class="' + cls + '" x1="' + n1(a[0]) + '" y1="' + n1(a[1]) + '" x2="' + n1(b[0]) + '" y2="' + n1(b[1]) + '"/>'; } };
        (w.ops || []).slice().sort((a, b) => a.off - b.off).forEach((op) => {
          const t0 = G.clamp(op.off, 0, L), t1 = G.clamp(op.off + op.w, 0, L); seg(cur, t0); cur = Math.max(cur, t1);
          const os = ws && sel.t === 'op' && sel.o === op.id;
          walls += opSvg(A, u, nO, op, L, (os ? 'on' : '') + (op.exit ? ' exit' : ''));
          const a = at(t0), b = at(t1);
          hit += '<line class="ho" data-r="o|' + r.id + '|' + w.id + '|' + op.id + '" x1="' + n1(a[0]) + '" y1="' + n1(a[1]) + '" x2="' + n1(b[0]) + '" y2="' + n1(b[1]) + '"/>';
          if (os) { hnd += sq('phd op', 'e|' + r.id + '|' + w.id + '|' + op.id + '|0', a[0], a[1], 5.5 / s) + sq('phd op', 'e|' + r.id + '|' + w.id + '|' + op.id + '|1', b[0], b[1], 5.5 / s);
            labels += text((a[0] + b[0]) / 2 + nO[0] * 30 / s, (a[1] + b[1]) / 2 + nO[1] * 30 / s, fs(op.w), 11, 'pd on', upright(g.dirs[i])); }
        });
        seg(cur, L);
        const a = at(0), b = at(L);
        hit = '<line class="hw" data-r="w|' + r.id + '|' + w.id + '" x1="' + n1(a[0]) + '" y1="' + n1(a[1]) + '" x2="' + n1(b[0]) + '" y2="' + n1(b[1]) + '"/>' + hit;
        const lab = G.wallLabelAt(w, L);
        if (ws || L * s >= 46) {
          const m = at(lab.t), off = 15 / s;
          labels += text(m[0] - nO[0] * off, m[1] - nO[1] * off, (w.m ? '' : '≈') + fl(g.lens[i]), 11.5, ws && sel.t === 'wall' ? 'pd on' : w.m ? 'pd' : 'pd est', upright(g.dirs[i]));
        }
        /* a handle in the middle of the wall: pull it to move the wall */
        if (rs && L * s >= 34) { const m = at(lab.room > 0 ? lab.t : L / 2), q = 9.5 / s, e = 4 / s;
          hnd += '<rect class="phw' + (ws && sel.t === 'wall' ? ' on' : '') + '" x="' + n1(m[0] - q) + '" y="' + n1(m[1] - e) + '" width="' + n1(2 * q) + '" height="' + n1(2 * e) + '" rx="' + n1(e) + '" transform="rotate(' + n1(g.dirs[i] + 90) + ' ' + n1(m[0]) + ' ' + n1(m[1]) + ')"/><circle class="hh" data-r="m|' + r.id + '|' + w.id + '" cx="' + n1(m[0]) + '" cy="' + n1(m[1]) + '" r="' + n1(15 / s) + '"/>'; }
      });
      if (rs) {
        for (let i = 0; i < n; i++) {
          const a = G.outward(g, (i + n - 1) % n), b = G.outward(g, i); let bx = a[0] + b[0], by = a[1] + b[1]; const bl = G.hyp(bx, by) || 1; bx /= bl; by /= bl;
          const v = g.raw[i], cs = sel.t === 'corner' && sel.c === i;
          labels += text(v[0] + bx * 16 / s, v[1] + by * 16 / s, G.cornerName(i), 11, 'pc' + (cs ? ' on' : ''));
          hnd += handle('pcd' + (cs ? ' on' : ''), 'c|' + r.id + '|' + i, v[0], v[1], (cs ? 7 : 5.5) / s);
        }
      }
      const nm = r.name || ('Помещение ' + (ri + 1)), c = G.labelAvoid(g, Math.min(nm.length, 16) * 13 * 0.3 / s, 26 / s, boxes);
      if (Math.min(g.bbox.w, g.bbox.h * 3) * s > 60) {
        labels += text(c[0], c[1] - 9 / s, nm, 13.5, 'pn');
        labels += text(c[0], c[1] + 9 / s, (g.allM ? '' : '≈') + m2(g.area) + ' м²', 11.5, 'pa' + (g.status === 'bad' ? ' bad' : ''));
      }
    });
    const tc = topChecks(), mk = (it) => ({ id: it.id, html: itemHtml(it, sel.t === 'item' && sel.i === it.id, !!(cf.ids[it.id] || tc.ids[it.id]), s) });
    const list = p.items.filter((it) => !it.top).map(mk), listTop = p.showTop === false ? [] : p.items.filter((it) => it.top).map(mk);
    const it = sel.t === 'item' ? item(sel.i) : null;
    if (it) {
      G.itemClearances(it, geoms).forEach((q) => {
        if (q.dist <= 0) return; over += '<line class="pcl" x1="' + n1(q.from[0]) + '" y1="' + n1(q.from[1]) + '" x2="' + n1(q.to[0]) + '" y2="' + n1(q.to[1]) + '"/>';
        labels += text((q.from[0] + q.to[0]) / 2, (q.from[1] + q.to[1]) / 2, fl(q.dist), 11, 'pcl-t');
      });
      if (!st.drag || st.drag.mode !== 'item') {   // the two nearest objects, edge to edge (chairs included)
        const H = hullish(G.footprint(it)), bb = G.itemBBox(it), near = [];
        p.items.forEach((o) => { if (o.id === it.id || !!o.top !== !!it.top) return; const ob = G.itemBBox(o); if (ob.x0 > bb.x1 + 15000 || ob.x1 < bb.x0 - 15000 || ob.y0 > bb.y1 + 15000 || ob.y1 < bb.y0 - 15000) return; const cl = closest(H, hullish(G.footprint(o))); if (cl.d > 0.5) near.push(cl); });
        near.sort((a, b) => a.d - b.d).slice(0, 2).forEach((cl) => { over += '<line class="pnb" x1="' + n1(cl.a[0]) + '" y1="' + n1(cl.a[1]) + '" x2="' + n1(cl.b[0]) + '" y2="' + n1(cl.b[1]) + '"/>'; labels += text((cl.a[0] + cl.b[0]) / 2, (cl.a[1] + cl.b[1]) / 2, fl(cl.d), 11, 'pnb-t'); });
      }
      /* handles: size at the corners, a ring to turn */
      const hw = it.w / 2, hd = (it.shape === 'round' ? it.w : it.d) / 2, W = (x, y) => G.toWorld(it, x, y), r = 5.5 / s;
      if (it.lock) {}   // a locked object: no handles
      else if (it.kind === 'photo') { const t1 = W(0, -(10 / s) - 34 / s); hnd += handle('prh', 'q|' + it.id, t1[0], t1[1], 6 / s); }   // a photo pin: only its direction turns
      else if (it.kind === 'hook') {}   // a hanging point has no size
      else if (it.shape === 'round') { const q = W(hw, 0); hnd += sq('phd', 'z|' + it.id + '|r', q[0], q[1], r); }
      else { [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach((k, j) => { const q = W(k[0] * hw, k[1] * hd); hnd += sq('phd', 'z|' + it.id + '|' + j, q[0], q[1], r); });
        // sides: top, right, bottom, left — only when the side is long enough on screen for three handles
        [[0, -1, 0], [1, 0, 90], [0, 1, 0], [-1, 0, 90]].forEach((k, j) => { const along = (j % 2 ? 2 * hd : 2 * hw) * s; if (along < 36) return; const q = W(k[0] * hw, k[1] * hd); hnd += pill('z|' + it.id + '|e' + j, q[0], q[1], r, (it.rot || 0) + k[2]); });
        const t0 = W(0, -hd), t1 = W(0, -hd - 34 / s); hnd += '<line class="prl" x1="' + n1(t0[0]) + '" y1="' + n1(t0[1]) + '" x2="' + n1(t1[0]) + '" y2="' + n1(t1[1]) + '"/>' + handle('prh', 'q|' + it.id, t1[0], t1[1], 6 / s); }
    }
    /* the sketch being drawn and the ruler */
    if (st.draw && st.draw.pts.length) {
      const d = st.draw, all = d.pts.concat(d.hover ? [d.hover] : []);
      over += '<polyline class="pdr" points="' + pts(all) + '"/>';
      d.pts.forEach((q, k) => { over += '<circle class="pdp' + (k === 0 ? ' first' : '') + '" cx="' + n1(q[0]) + '" cy="' + n1(q[1]) + '" r="' + n1((k === 0 ? 8 : 5) / s) + '"/>'; });
      if (d.hover) { const a = d.pts[d.pts.length - 1], b = d.hover, L = G.hyp(b[0] - a[0], b[1] - a[1]); if (L > 1) labels += text((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 14 / s, '≈' + fl(L), 12, 'pd on', upright(Math.atan2(b[1] - a[1], b[0] - a[0]) / G.DEG)); }
    }
    if (st.ruler && st.ruler.b) {
      const a = st.ruler.a, b = st.ruler.b, L = G.hyp(b[0] - a[0], b[1] - a[1]);
      over += '<line class="pru" x1="' + n1(a[0]) + '" y1="' + n1(a[1]) + '" x2="' + n1(b[0]) + '" y2="' + n1(b[1]) + '"/>' + '<circle class="pdp" cx="' + n1(a[0]) + '" cy="' + n1(a[1]) + '" r="' + n1(4 / s) + '"/><circle class="pdp" cx="' + n1(b[0]) + '" cy="' + n1(b[1]) + '" r="' + n1(4 / s) + '"/>';
      labels += text((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 14 / s, fl(L) + ' ' + uLab(), 13, 'pru-t', upright(Math.atan2(b[1] - a[1], b[0] - a[0]) / G.DEG));
    }
    const set = (id, h) => { const n = document.getElementById(id); if (n && n._h !== h) { n.innerHTML = h; n._h = h; } };
    (st.drag && st.drag.mode === 'item' && st.guides || []).forEach((g) => { over += g.vert ? '<line class="pgd" x1="' + n1(g.at) + '" y1="' + n1(g.a) + '" x2="' + n1(g.at) + '" y2="' + n1(g.b) + '"/>' : '<line class="pgd" x1="' + n1(g.a) + '" y1="' + n1(g.at) + '" x2="' + n1(g.b) + '" y2="' + n1(g.at) + '"/>'; });
    over += guidesSvg(false);
    set('pgrid', gridSvg()); set('pbody', fill + walls + guidesSvg(true)); syncItems(list); syncItems(listTop, 'ptop'); sv.setAttribute('data-layer', st.layer); set('phit', hit); set('pover', over); set('plab', labels); set('phnd', hnd);
    applyView();
    const em = document.getElementById('pempty'); if (em) em.hidden = p.rooms.length > 0 || !!st.draw || p.items.length > 0;
    const bn = document.getElementById('pbanner'); if (bn) { const b = banner(); bn.hidden = !b; if (bn._h !== b) { bn.innerHTML = b; bn._h = b; } }
    const wsm = document.getElementById('wsm'); if (wsm) wsm.classList.toggle('phand', st.tool === 'hand');
  }
  /* a table with its chairs as one outline for distances: the bounding points of all its parts */
  function hullish(polys) {
    const all = []; polys.forEach((q) => q.forEach((x) => all.push(x)));
    if (all.length < 3) return all;
    all.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], hi = [];
    for (const q of all) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = all.length - 1; i >= 0; i--) { const q = all[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  }
  function banner() {
    if (st.draw) return '<span>' + (st.draw.pts.length < 3 ? 'Коснитесь углов зала по порядку' : 'Ещё угол — или коснитесь первой точки, чтобы замкнуть') + ' · ' + st.draw.pts.length + ' т.</span>' +
      (st.draw.pts.length ? '<button type="button" class="btn sm" data-pact="draw-back">Убрать точку</button>' : '') + (st.draw.pts.length >= 3 ? '<button type="button" class="btn sm pri" data-pact="draw-done">Готово</button>' : '') + '<button type="button" class="btn sm" data-pact="draw-cancel">Отмена</button>';
    if (st.tool && st.tool.indexOf('op:') === 0) return '<span>Коснитесь стены, куда поставить: ' + esc(G.OPENINGS[st.tool.slice(3)].label) + '</span><button type="button" class="btn sm" data-pact="ptool" data-v="">Отмена</button>';
    if (st.tool && st.tool.indexOf('col:') === 0) return '<span>Коснитесь места для колонны</span><button type="button" class="btn sm" data-pact="ptool" data-v="">Отмена</button>';
    if (st.tool && st.tool.indexOf('it:') === 0) { const c = G.CAT[st.tool.slice(3)]; return '<span>Коснитесь места, куда поставить: ' + esc(c.label) + '</span><button type="button" class="btn sm" data-pact="ptool" data-v="">Отмена</button>'; }
    if (st.tool && st.tool.indexOf('combo:') === 0) return '<span>Коснитесь места для ' + (st.tool.slice(6) === 'P' ? 'П' : 'Т') + '-образного стола</span><button type="button" class="btn sm" data-pact="ptool" data-v="">Отмена</button>';
    if (st.tool && st.tool.indexOf('pin:') === 0) { const ph = (S.photos || []).find((x) => x.id === st.tool.slice(4)); return '<span>Коснитесь места, откуда снято фото' + (ph ? ' «' + esc(ph.name) + '»' : '') + '</span><button type="button" class="btn sm" data-pact="ptool" data-v="">Отмена</button>'; }
    if (st.tool === 'ruler') return '<span>Линейка: тяните от точки к точке' + (st.ruler && st.ruler.b ? ' · ' + fl(G.hyp(st.ruler.b[0] - st.ruler.a[0], st.ruler.b[1] - st.ruler.a[1])) + ' ' + uLab() : '') + '</span><button type="button" class="btn sm" data-pact="ptool" data-v="">Готово</button>';
    return '';
  }
  /* ---------- pointer ---------- */
  function within(ev) { const sv = svg(); return UI.mode === 'plan' && UI.tab === 'con' && sv && ev.target && ev.target.closest && !!ev.target.closest('#plan'); }
  function refOf(ev) { const n = ev.target.closest && ev.target.closest('[data-r]'); return n ? n.dataset.r.split('|') : null; }
  /* snapping while sketching: angles to 15° steps, lengths to 50 mm; the first point to a 100 mm grid */
  function snapDraw(p, prev, free) {
    if (free) return p.map(Math.round);
    if (!prev) return [Math.round(p[0] / 100) * 100, Math.round(p[1] / 100) * 100];
    let dx = p[0] - prev[0], dy = p[1] - prev[1], L = G.hyp(dx, dy), a = Math.atan2(dy, dx) / G.DEG;
    const r15 = Math.round(a / 15) * 15; if (Math.abs(a - r15) < 7) a = r15;
    L = Math.max(50, Math.round(L / 50) * 50);
    const u = G.unitVec(a); return [Math.round(prev[0] + u[0] * L), Math.round(prev[1] + u[1] * L)];
  }
  function nearestWall(p, maxPx) {
    let best = null; const lim = maxPx / st.v.s;
    P().rooms.forEach((r) => { const g = G.roomGeom(r); for (let i = 0; i < g.n; i++) { const A = g.raw[i], B = g.raw[i + 1], d = G.distSeg(p, A, B); if (d.d <= lim && (!best || d.d < best.d)) best = { r, i, t: d.t * g.L[i], d: d.d, L: g.L[i] }; } });
    return best;
  }
  function down(ev) {
    if (!within(ev)) return false;
    ev.preventDefault();
    st.tps[ev.pointerId] = [ev.clientX, ev.clientY];
    const ids = Object.keys(st.tps);
    if (ids.length === 2) {   // two fingers: pinch and pan; a drag in progress is put back
      const a = st.tps[ids[0]], b = st.tps[ids[1]], r = svg().getBoundingClientRect();
      if (st.drag && st.drag.moved && st.drag.snap) restoreSnap(st.drag);
      st.drag = null; st.pinch = { d: G.hyp(a[0] - b[0], a[1] - b[1]), cx: (a[0] + b[0]) / 2 - r.left, cy: (a[1] + b[1]) / 2 - r.top, v: Object.assign({}, st.v) };
      return true;
    }
    try { svg().setPointerCapture(ev.pointerId); } catch (e) {}
    const p = toMM(ev), ref = refOf(ev), hand = st.tool === 'hand' || UI.spaceHand || ev.button === 1;
    const d = st.drag = { pid: ev.pointerId, x0: ev.clientX, y0: ev.clientY, p0: p, moved: false, mode: 'pan', v0: Object.assign({}, st.v), ref };
    if (hand) return true;
    if (st.draw) { d.mode = 'draw'; return true; }
    if (st.tool === 'ruler') { st.ruler = { a: snapPoint(p), b: null }; d.mode = 'ruler'; return true; }
    if (st.tool && /^(op|col|it|combo|pin):/.test(st.tool)) { d.mode = 'place'; return true; }
    if (!ref) return true;
    const t = ref[0], sel = st.sel || {};
    if (t === 'R') { if (ref[1] === 'c') { d.mode = 'tap'; return true; } d.mode = 'newguide'; d.vert = ref[1] === 'y'; return true; }
    if (t === 'G') { d.mode = 'guide'; d.gid = ref[1]; d.gsnap = JSON.stringify(P().guides); return true; }
    const geomStart = (r) => { G.bake(r); d.snap = JSON.stringify({ x: r.x, y: r.y, walls: r.walls, diag: r.diag }); d.room = r.id; };
    const lockedR = (t === 'r' || t === 'c' || t === 'm' || t === 'w') && room(ref[1]) && room(ref[1]).lock, lockedI = (t === 'i' || t === 'z' || t === 'q') && item(ref[1]) && item(ref[1]).lock;
    if (lockedR || lockedI) { d.mode = 'tap'; d.locked = true; return true; }
    if (t === 'r') { d.mode = 'room'; const r = room(ref[1]); d.o = { x: r.x, y: r.y }; }
    else if (t === 'i') { d.mode = 'item'; const it = item(ref[1]); d.o = { x: it.x, y: it.y }; d.isnap = JSON.stringify(it); }
    else if (t === 'c') { d.mode = 'corner'; const r = room(ref[1]); geomStart(r); const v = G.roomGeom(r).raw[+ref[2]]; d.o = { k: +ref[2], dx: v[0] - p[0], dy: v[1] - p[1] }; }
    else if (t === 'm' || (t === 'w' && sel.t === 'wall' && sel.w === ref[2])) { d.mode = 'wallmove'; const r = room(ref[1]); geomStart(r); const g = G.roomGeom(r), i = wallIx(r, ref[2]); d.o = { i, nO: G.outward(g, i), L: g.L[i] }; }
    else if (t === 'o') { d.mode = 'op'; const r = room(ref[1]), i = wallIx(r, ref[2]), op = r.walls[i].ops.find((o) => o.id === ref[3]); const g = G.roomGeom(r), u = G.unitVec(g.dirs[i]), A = g.raw[i]; d.o = { off: op.off, t0: (p[0] - A[0]) * u[0] + (p[1] - A[1]) * u[1] }; }
    else if (t === 'e') { d.mode = 'opend'; const r = room(ref[1]), i = wallIx(r, ref[2]), op = r.walls[i].ops.find((o) => o.id === ref[3]); d.o = { off: op.off, w: op.w, end: +ref[4] }; }
    else if (t === 'z') { d.mode = 'isize'; const it = item(ref[1]); d.isnap = JSON.stringify(it); }
    else if (t === 'q') { d.mode = 'irot'; const it = item(ref[1]); d.isnap = JSON.stringify(it); }
    else d.mode = 'tap';
    return true;
  }
  function restoreSnap(d) {
    if (d.snap) { const r = room(d.room); if (r) Object.assign(r, JSON.parse(d.snap)); }
    if (d.isnap) { const o = JSON.parse(d.isnap), it = item(o.id); if (it) Object.assign(it, o); }
  }
  function snapPoint(p) {   // the ruler sticks to corners
    let best = null, lim = 14 / st.v.s;
    P().rooms.forEach((r) => { G.roomGeom(r).raw.forEach((q) => { const d = G.hyp(q[0] - p[0], q[1] - p[1]); if (d < lim && (!best || d < best.d)) best = { q, d }; }); });
    return best ? best.q.slice() : p.map(Math.round);
  }
  const r10 = (v) => Math.round(v / 10) * 10;
  function move(ev) {
    if (UI.mode !== 'plan') return false;
    if (st.tps[ev.pointerId]) st.tps[ev.pointerId] = [ev.clientX, ev.clientY];
    if (st.pinch) {
      const ids = Object.keys(st.tps); if (ids.length < 2) return true;
      const a = st.tps[ids[0]], b = st.tps[ids[1]], r = svg().getBoundingClientRect(), d = G.hyp(a[0] - b[0], a[1] - b[1]), cx = (a[0] + b[0]) / 2 - r.left, cy = (a[1] + b[1]) / 2 - r.top;
      const v = st.pinch.v, mx = st.pinch.cx / v.s + v.x, my = st.pinch.cy / v.s + v.y, s = G.clamp(v.s * d / st.pinch.d, 0.004, 1.2);
      st.v = { s, x: mx - cx / s, y: my - cy / s, user: true }; applyView(); return true;
    }
    const d = st.drag;
    if (!d) { if (st.draw && within(ev)) { const p = toMM(ev); st.draw.hover = snapDraw(p, st.draw.pts[st.draw.pts.length - 1], ev.shiftKey); paint(); return true; } return false; }
    if (ev.pointerId !== d.pid) return true;
    const dx = ev.clientX - d.x0, dy = ev.clientY - d.y0;
    if (!d.moved && G.hyp(dx, dy) < 5) return true;
    d.moved = true;
    const p = toMM(ev), mm = [p[0] - d.p0[0], p[1] - d.p0[1]], s = st.v.s, free = ev.shiftKey;
    if (d.locked) { if (!d.lockTold) { d.lockTold = true; toast('Объект закреплён — откройте замок в «Слоях», чтобы двигать.'); } return true; }   // neither moves nor pans the view
    if (d.mode === 'pan' || d.mode === 'tap' || d.mode === 'place') { st.v = { s: d.v0.s, x: d.v0.x - dx / d.v0.s, y: d.v0.y - dy / d.v0.s, user: true }; d.mode = d.mode === 'tap' ? 'pan' : d.mode; applyView(); return true; }
    if (d.mode === 'draw') { st.draw.hover = snapDraw(p, st.draw.pts[st.draw.pts.length - 1], free); paint(); return true; }
    if (d.mode === 'ruler') { st.ruler.b = free ? p.map(Math.round) : snapPoint(p); paint(); return true; }
    if (d.mode === 'newguide' || d.mode === 'guide') {
      const pl = P(); let g = d.mode === 'guide' ? pl.guides.find((q) => q.id === d.gid) : d.g;
      if (!g) { if (d.mode === 'guide') return true; g = d.g = { id: G.uid(), vert: d.vert, at: 0 }; pl.guides.push(g); }
      const v0 = g.vert ? p[0] : p[1]; g.at = free ? Math.round(v0) : snapGuide(v0, g.vert);
      const o = G.gridOrigin(pl); tip((g.vert ? '↔ ' : '↕ ') + 'от угла A: ' + fl(g.at - o[g.vert ? 0 : 1]) + ' ' + uLab());
      st.sel = { t: 'guide', g: g.id }; paint(); return true;
    }
    if (d.mode === 'room') { const r = room(d.ref[1]); r.x = r10(d.o.x + mm[0]); r.y = r10(d.o.y + mm[1]); st.sel = { t: 'room', r: r.id }; paint(); return true; }
    if (d.mode === 'item') {
      const it = item(d.ref[1]), a = free ? { x: r10(d.o.x + mm[0]), y: r10(d.o.y + mm[1]), guides: [] } : G.alignSnap(P(), it, d.o.x + mm[0], d.o.y + mm[1], 9 / s, P().snap || 0, { objects: P().smart !== false, guides: rulersOn() ? P().guides : [] });
      it.x = a.x; it.y = a.y; st.guides = a.guides; st.sel = { t: 'item', i: it.id };
      const n = document.querySelector('#pitems [data-k="' + it.id + '"]'); if (n) n.setAttribute('transform', 'translate(' + n1(it.x) + ' ' + n1(it.y) + ') rotate(' + n1(it.rot || 0) + ')');
      paint(); return true;
    }
    if (d.mode === 'corner' || d.mode === 'wallmove') {
      const r = room(d.room); Object.assign(r, JSON.parse(d.snap));
      if (d.mode === 'corner') {
        let Q = [p[0] + d.o.dx, p[1] + d.o.dy]; Q = free ? Q.map(Math.round) : G.snapCorner(r, d.o.k, Q, 9 / s);
        G.moveCorner(r, d.o.k, Q); st.sel = { t: 'corner', r: r.id, c: d.o.k };
        const n = r.walls.length, a = r.walls[(d.o.k + n - 1) % n], b = r.walls[d.o.k]; tip(G.wallName(r, (d.o.k + n - 1) % n) + ' ' + fl(a.len) + ' · ' + G.wallName(r, d.o.k) + ' ' + fl(b.len));
      } else {
        const off = free ? Math.round(mm[0] * d.o.nO[0] + mm[1] * d.o.nO[1]) : r10(mm[0] * d.o.nO[0] + mm[1] * d.o.nO[1]);
        G.moveWall(r, d.o.i, off); st.sel = { t: 'wall', r: r.id, w: r.walls[d.o.i].id };
        const n = r.walls.length; tip((off >= 0 ? 'наружу ' : 'внутрь ') + fl(Math.abs(off)) + ' · ' + G.wallName(r, (d.o.i + n - 1) % n) + ' ' + fl(r.walls[(d.o.i + n - 1) % n].len) + ' · ' + G.wallName(r, (d.o.i + 1) % n) + ' ' + fl(r.walls[(d.o.i + 1) % n].len));
      }
      paint(); return true;
    }
    if (d.mode === 'op' || d.mode === 'opend') {
      const r = room(d.ref[1]), i = wallIx(r, d.ref[2]), w = r.walls[i], op = w.ops.find((o) => o.id === d.ref[3]), g = G.roomGeom(r), u = G.unitVec(g.dirs[i]), A = g.raw[i], L = g.L[i];
      const t = (p[0] - A[0]) * u[0] + (p[1] - A[1]) * u[1];
      if (d.mode === 'op') { op.off = r10(d.o.off + t - d.o.t0); G.clampOpening(op, L); }
      else if (d.o.end === 0) { const e = d.o.off + d.o.w, no = G.clamp(r10(t), 0, e - 300); op.off = no; op.w = e - no; }
      else { op.w = G.clamp(r10(t - d.o.off), 300, Math.round(L - d.o.off)); }
      st.sel = { t: 'op', r: r.id, w: w.id, o: op.id }; paint();
      tip((d.mode === 'opend' ? 'ширина ' + fs(op.w) + ' · ' : '') + 'от ' + G.cornerName(i) + ': ' + fl(op.off) + ' · до ' + G.cornerName((i + 1) % g.n) + ': ' + fl(L - op.off - op.w)); return true;
    }
    if (d.mode === 'isize' || d.mode === 'irot') {
      const it = item(d.ref[1]); Object.assign(it, JSON.parse(d.isnap));
      const a = -(it.rot || 0) * G.DEG, vx = p[0] - it.x, vy = p[1] - it.y, lx = vx * Math.cos(a) - vy * Math.sin(a), ly = vx * Math.sin(a) + vy * Math.cos(a);
      if (d.mode === 'isize') {
        if (it.shape === 'round') { it.w = G.clamp(r10(2 * G.hyp(vx, vy)), 100, 60000); it.d = it.w; tip('Ø ' + fs(it.w)); }
        else {
          /* the opposite corner or side stays where it was: a table against a wall keeps touching it */
          const h = String(d.ref[2] || ''), w0 = it.w, d0 = it.d, e = h[0] === 'e' ? +h.slice(1) : -1;
          const kx = e >= 0 ? [0, 1, 0, -1][e] : [-1, 1, 1, -1][+h], ky = e >= 0 ? [-1, 0, 1, 0][e] : [-1, -1, 1, 1][+h];
          let cx = 0, cy = 0;
          if (free) { if (kx) it.w = G.clamp(r10(2 * Math.abs(lx)), 100, 60000); if (ky) it.d = G.clamp(r10(2 * Math.abs(ly)), 100, 60000); }   // Shift: from the centre, both sides
          else {
            if (kx) { const fx = -kx * w0 / 2; it.w = G.clamp(r10(kx * (lx - fx)), 100, 60000); cx = fx + kx * it.w / 2; }
            if (ky) { const fy = -ky * d0 / 2; it.d = G.clamp(r10(ky * (ly - fy)), 100, 60000); cy = fy + ky * it.d / 2; }
            const c = G.toWorld(it, cx, cy); it.x = Math.round(c[0] * 10) / 10; it.y = Math.round(c[1] * 10) / 10;
          }
          tip(e >= 0 ? (kx ? (it.shape === 'oval' ? 'длина ' : 'ширина ') + fs(it.w) : (it.shape === 'oval' ? 'ширина ' : 'глубина ') + fs(it.d)) + ' ' + uLab() : fs(it.w) + ' × ' + fs(it.d) + ' ' + uLab());
        }
      } else { let ang = Math.atan2(vy, vx) / G.DEG + 90; if (!free) ang = Math.round(ang / 15) * 15; it.rot = G.normDeg(ang); tip('поворот ' + G.nf(it.rot, 0) + '°'); }
      st.sel = { t: 'item', i: it.id }; paint(); return true;
    }
    return true;
  }
  function tip(t) { const n = document.getElementById('ptip'); if (n) { n.textContent = t; n.hidden = !t; } }
  function up(ev, cancel) {
    if (UI.mode !== 'plan') return false;
    const had = !!st.tps[ev.pointerId]; delete st.tps[ev.pointerId];
    if (st.pinch) { if (Object.keys(st.tps).length < 2) { st.pinch = null; paint(); } return true; }
    const d = st.drag; if (!d || ev.pointerId !== d.pid) return had;
    st.drag = null; st.guides = null; tip('');
    if (d.mode === 'newguide' || d.mode === 'guide') {
      const pl = P(), g = pl.guides.find((q) => q.id === (d.mode === 'guide' ? d.gid : d.g && d.g.id)), r0 = svg().getBoundingClientRect();
      const onRuler = !!g && (g.vert ? ev.clientX - r0.left < RW : ev.clientY - r0.top < RW);
      if (cancel) { if (d.mode === 'guide') pl.guides = JSON.parse(d.gsnap); else if (g) pl.guides = pl.guides.filter((q) => q !== g); st.sel = null; paint(); return true; }
      if (!d.moved || !g) { if (d.mode === 'guide') { st.sel = { t: 'guide', g: d.gid }; render(); } return true; }
      if (onRuler) { pl.guides = pl.guides.filter((q) => q !== g); st.sel = null; if (d.mode === 'guide') label('направляющая убрана'); else render(); return true; }
      label(d.mode === 'guide' ? 'направляющая сдвинута' : 'направляющая'); return true;
    }
    if (cancel) { if (d.moved) restoreSnap(d); if (d.moved && (d.mode === 'room' || d.mode === 'item' || d.mode === 'op' || d.mode === 'opend')) restore(UI.hi); paint(); return true; }
    const p = toMM(ev);
    if (d.locked && d.moved) { paint(); return true; }
    if (d.mode === 'pan') { if (d.moved) paint(); else { if (st.sel) { st.sel = null; render(); } } return true; }
    if (d.mode === 'draw') {
      if (d.moved && !st.draw.hover) return true;
      const prev = st.draw.pts[st.draw.pts.length - 1], q = snapDraw(p, prev, ev.shiftKey), f = st.draw.pts[0];
      if (st.draw.pts.length >= 3 && G.hyp(p[0] - f[0], p[1] - f[1]) * st.v.s < 18) { finishDraw(); return true; }
      if (!prev || G.hyp(q[0] - prev[0], q[1] - prev[1]) >= 50) st.draw.pts.push(q);
      st.draw.hover = null; paint(); return true;
    }
    if (d.mode === 'ruler') { paint(); return true; }
    if (d.mode === 'place') { if (!d.moved) place(p); else paint(); return true; }
    if (d.moved) {
      const labs = { room: () => 'перемещение — ' + rname(room(d.ref[1])), item: () => 'перемещение — ' + G.itemLabel(item(d.ref[1])), op: () => 'проём сдвинут', opend: () => 'ширина проёма', corner: () => 'угол ' + G.cornerName(d.o.k) + ' перенесён', wallmove: () => 'стена сдвинута', isize: () => { const it = item(d.ref[1]); if (G.fitSeats(it)) toast('Стол стал меньше — лишние стулья убраны: плотнее 50 см на человека не сесть.'); return 'размер — ' + G.itemLabel(it); }, irot: () => 'поворот — ' + G.itemLabel(item(d.ref[1])) };
      if (labs[d.mode]) label(labs[d.mode]()); else paint();
      return true;
    }
    /* a tap selects; a second tap on the same wall adds a corner there */
    const ref = d.ref;
    if (!ref) { st.sel = null; render(); return true; }
    const t = ref[0], now = Date.now(), lt = st.lastTap;
    st.lastTap = { t: now, ref: ref.join('|'), x: ev.clientX, y: ev.clientY };
    if ((t === 'w' || t === 'm') && lt && now - lt.t < 420 && lt.ref === ref.join('|') && G.hyp(ev.clientX - lt.x, ev.clientY - lt.y) < 24) {
      const r = room(ref[1]), i = wallIx(r, ref[2]), g = G.roomGeom(r), u = G.unitVec(g.dirs[i]), A = g.raw[i], tt = r10((p[0] - A[0]) * u[0] + (p[1] - A[1]) * u[1]);
      if (G.splitWall(r, i, tt)) { st.sel = { t: 'corner', r: r.id, c: i + 1 }; st.lastTap = null; label('добавлен угол на стене'); toast('Новый угол ' + G.cornerName(i + 1) + ' — тяните его, чтобы изменить форму.'); return true; }
    }
    if (t === 'r') st.sel = { t: 'room', r: ref[1] };
    else if (t === 'w' || t === 'm') st.sel = { t: 'wall', r: ref[1], w: ref[2] };
    else if (t === 'o' || t === 'e') st.sel = { t: 'op', r: ref[1], w: ref[2], o: ref[3] };
    else if (t === 'c') st.sel = { t: 'corner', r: ref[1], c: +ref[2] };
    else if (t === 'i' || t === 'z' || t === 'q') st.sel = { t: 'item', i: ref[1] };
    st.split = null; render(); return true;
  }
  function addTable(it) { if (it.kind === 'table' && !it.stand) it.num = G.nextNum(P()); P().items.push(it); return it; }
  function combo(kind, p) {
    const T = (x, y, rot, sides) => { const it = G.makeItem('t_q220', x, y); it.rot = rot; it.sides = sides; return addTable(it); };
    const x = r10(p[0]), y = r10(p[1]); let out;
    if (kind === 'P') out = [T(x, y, 0, [4, 0, 0, 0]), T(x - 1100 + 400, y + 400 + 1100, 90, [0, 4, 0, 0]), T(x + 1100 - 400, y + 400 + 1100, 90, [4, 0, 0, 0])];
    else out = [T(x, y, 0, [4, 0, 0, 0]), T(x, y + 400 + 1100, 90, [4, 4, 0, 0]), T(x, y + 400 + 3300, 90, [4, 4, 0, 1])];
    return out;
  }
  /* ---------- a picked object appears at once in the middle of the view (a free spot, inside the room), selected; then it is dragged ---------- */
  function viewCenter() { if (!st.v) return null; const z = hsize(); return z.w > 0 ? [st.v.x + z.w / 2 / st.v.s, st.v.y + z.h / 2 / st.v.s] : null; }
  function dropPoint() {
    const c = viewCenter(), gs = P().rooms.map(G.roomGeom);
    if (!gs.length) { const bb = G.planBBox(P()); return c || (bb ? [(bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2] : [3000, 3000]); }
    if (c && gs.some((g) => G.pointInPoly(c, g.pts))) return c;
    const g = c ? gs.slice().sort((a, b) => G.hyp(a.center[0] - c[0], a.center[1] - c[1]) - G.hyp(b.center[0] - c[0], b.center[1] - c[1]))[0] : gs[0];
    return [g.center[0], g.center[1]];
  }
  function drop(tool) {
    ensureView(); if (!st.v) { st.tool = tool; render(); return; }
    st.placed = 0; st.draw = null; st.ruler = null;
    const c = dropPoint(); let q = c;
    if (tool.indexOf('it:') === 0) q = G.freeSpot(P(), G.makeItem(tool.slice(3), 0, 0), c[0], c[1]);
    else if (tool.indexOf('col:') === 0) q = G.freeSpot(P(), { id: '_', kind: 'column', shape: tool.slice(4), x: 0, y: 0, w: 400, d: 400, rot: 0 }, c[0], c[1]);
    else if (tool.indexOf('op:') === 0) {
      const nw = nearestWall(c, 1e9); if (!nw) { toast('Сначала добавьте помещение.'); render(); return; }
      const g = G.roomGeom(nw.r), A = g.raw[nw.i], u = G.unitVec(g.dirs[nw.i]); q = [A[0] + u[0] * nw.t, A[1] + u[1] * nw.t];
    }
    st.tool = tool; place(q, true); st.tool = null;
    if (st.sel && st.sel.t === 'item') { const it = item(st.sel.i); if (it && !!it.top !== (st.layer === 'top')) st.layer = it.top ? 'top' : 'floor'; }
    render();
  }
  function place(p, once) {
    const tool = st.tool;
    if (tool.indexOf('op:') === 0) {
      const nw = nearestWall(p, once ? 1e9 : 26); if (!nw) { toast('Коснитесь стены — проём ставится на стену.'); return; }
      const kind = tool.slice(3), w = nw.r.walls[nw.i];
      if (nw.L < 400) { toast('Стена слишком короткая для проёма.'); return; }
      const op = G.addOpening(w, kind, nw.L, nw.t); st.tool = null; st.sel = { t: 'op', r: nw.r.id, w: w.id, o: op.id };
      label(G.OPENINGS[kind].label + ' на стене ' + G.wallName(nw.r, nw.i));
    } else if (tool.indexOf('col:') === 0) {
      const shape = tool.slice(4), it = { id: G.uid(), kind: 'column', shape, x: r10(p[0]), y: r10(p[1]), w: 400, d: 400, rot: 0 };
      P().items.push(it); st.tool = null; st.sel = { t: 'item', i: it.id }; label('колонна');
    } else if (tool.indexOf('it:') === 0) {
      const it = addTable(G.makeItem(tool.slice(3), r10(p[0]), r10(p[1]))); st.placed = (st.placed || 0) + 1; st.sel = { t: 'item', i: it.id }; st.tool = null;   // one tap = one object, nothing to confirm
      if (it.kind === 'ceil') it.h = G.ceilingAt(P(), [it.x, it.y]);
      label(G.CAT[it.ref].label + (it.num != null ? ' №' + it.num : ''));   // the tool stays on: tap again for one more
    } else if (tool.indexOf('pin:') === 0) {
      const id = tool.slice(4), x = r10(p[0]), y = r10(p[1]); let rot = 0;
      const nw = nearestWall([x, y], 1e9); if (nw) { const g = G.roomGeom(nw.r), A = g.raw[nw.i], u = G.unitVec(g.dirs[nw.i]), q = [A[0] + u[0] * nw.t, A[1] + u[1] * nw.t]; rot = G.normDeg(Math.atan2(q[1] - y, q[0] - x) / G.DEG + 90); }   // looks at the nearest wall
      const it = { id: G.uid(), kind: 'photo', photo: id, x, y, w: 400, d: 400, rot: Math.round(rot) };
      P().items.push(it); st.tool = null; st.sel = { t: 'item', i: it.id }; label('фото отмечено на плане'); toast('Отметка поставлена. Кружок над камерой поворачивает направление съёмки.');
    } else if (tool.indexOf('combo:') === 0) {
      const out = combo(tool.slice(6), p); st.tool = null; st.sel = { t: 'item', i: out[0].id }; label((tool.slice(6) === 'P' ? 'П' : 'Т') + '-образный стол');
    }
  }
  function finishDraw() {
    const d = st.draw; if (!d || d.pts.length < 3) return;
    const r = G.roomFromPoints('', d.pts, null), g = G.roomGeom(r);
    if (g.selfX) { toast('Стены пересекаются — уберите последнюю точку и обойдите зал по порядку.'); return; }
    if (g.S < 0) { G.mirrorRoom(r); }   // keep one winding for all rooms: corners go clockwise on screen
    r.name = P().rooms.length ? '' : 'Банкетный зал';
    P().rooms.push(r); st.draw = null; st.sel = { t: 'wall', r: r.id, w: r.walls[0].id };
    label('помещение по углам'); toast('Помещение нарисовано. Теперь впишите замеры: стена ' + G.wallName(r, 0) + ' выбрана.');
  }
  function wheel(ev) {
    if (!within(ev)) return;
    ev.preventDefault();
    const r = svg().getBoundingClientRect();
    if (ev.ctrlKey || ev.metaKey || Math.abs(ev.deltaY) >= 40 || ev.deltaMode) zoomAt(Math.exp(-ev.deltaY * (ev.ctrlKey ? 0.01 : 0.0022)), ev.clientX - r.left, ev.clientY - r.top);
    else { st.v = { s: st.v.s, x: st.v.x + ev.deltaX / st.v.s, y: st.v.y + ev.deltaY / st.v.s, user: true }; applyView(); laterRepaint(); }
  }

  /* ---------- actions ---------- */
  function rname(r) { if (!r) return ''; return r.name || 'Помещение ' + (P().rooms.indexOf(r) + 1); }
  function newRoom(shape) {
    const bb = G.planBBox(P()), x = bb ? Math.round((bb.x1 + 2000) / 100) * 100 : 0, y = bb ? Math.round(bb.y0 / 100) * 100 : 0;
    const dims = { rect: [12000, 8000], L: [12000, 9000], U: [15000, 10000] }[shape];
    const r = G.makeRoom(P().rooms.length ? '' : 'Банкетный зал', x, y, G.SHAPES[shape](dims[0], dims[1]).map((s) => [s[0], s[1], false]), null);
    P().rooms.push(r); st.sel = { t: 'wall', r: r.id, w: r.walls[0].id }; st.v = null;
    label('новое помещение'); toast('Размеры примерные (≈). Впишите замер каждой стены — начните с ' + G.wallName(r, 0) + '.');
  }
  function act(name, a) {
    const v = a && a.dataset ? a.dataset.v : undefined;
    const r = selRoom(), s = st.sel || {};
    switch (name) {
      case 'mode': setMode(v); return;
      case 'ptool': st.placed = 0; st.tool = v || null; st.draw = null; st.ruler = null; UI.fly = false; if (v === 'hand' || v === 'ruler' || !v) {} render(); return;
      case 'layer': st.layer = v === 'top' ? 'top' : 'floor'; st.tool = null; UI.fly = false; if (st.sel && st.sel.t === 'item') { const it = item(st.sel.i); if (it && !!it.top !== (st.layer === 'top')) st.sel = null; } if (st.layer === 'top' && P().showTop === false) P().showTop = true; render(); return;
      case 'showtop': P().showTop = v === '1'; if (!P().showTop && st.layer === 'top') st.layer = 'floor'; label(P().showTop ? 'верхний слой показан' : 'верхний слой скрыт'); return;
      case 'pfly': UI.pgroup = v; UI.fly = !(UI.fly && UI.pgroup === v); render(); return;
      case 'fly-pick': {
        const g = a.dataset.g; UI.fly = false;
        if (g === 'room') { if (v === 'draw') { st.draw = { pts: [], hover: null }; st.tool = null; st.sel = null; render(); return; } newRoom(v); return; }
        if (g === 'open') {
          if ((s.t === 'wall' || s.t === 'op') && r) { const i = wallIx(r, s.w), L = G.roomGeom(r).L[i]; if (L < 400) { toast('Стена слишком короткая для проёма.'); return; } const op = G.addOpening(r.walls[i], v, L); st.sel = { t: 'op', r: r.id, w: r.walls[i].id, o: op.id }; label(G.OPENINGS[v].label + ' на стене ' + G.wallName(r, i)); return; }
          if (!P().rooms.length) { toast('Сначала добавьте помещение.'); render(); return; }
          st.tool = 'op:' + v; st.sel = null; render(); return;
        }
        if (g === 'col') { st.tool = 'col:' + v; render(); return; }
        if (g === 'tables' || g === 'zones' || g === 'ceil' || g === 'rig' || g === 'light' || g === 'cdeco') { st.placed = 0; st.tool = (v === 'P' || v === 'T') ? 'combo:' + v : 'it:' + v; render(); return; }
        return;
      }
      case 'draw-done': finishDraw(); return;
      case 'draw-back': if (st.draw) { st.draw.pts.pop(); paint(); } return;
      case 'draw-cancel': st.draw = null; render(); return;
      case 'zin': zoomBy(1.4); return;
      case 'zout': zoomBy(1 / 1.4); return;
      case 'zfit': st.v = null; fit(); paint(); return;
      case 'unit': P().unit = v; label('единицы: ' + G.UNIT[v].ru); return;
      case 'lyr-lock': { const [k, id] = String(v).split('|'), o = k === 'r' ? room(id) : item(id); if (!o) return; o.lock = !o.lock; if (!o.lock) delete o.lock; label((o.lock ? 'закреплено — ' : 'откреплено — ') + (k === 'r' ? rname(o) : G.itemLabel(o))); return; }
      case 'lyr-del': { const [k, id] = String(v).split('|');
        if (k === 'r') { const r = room(id); if (!r) return; P().rooms = P().rooms.filter((x) => x.id !== id); if (st.sel && st.sel.r === id) st.sel = null; label('удалено помещение — ' + rname(r)); return; }
        const it = item(id); if (!it) return; P().items = P().items.filter((x) => x.id !== id); if (st.sel && st.sel.i === id) st.sel = null; label('удалено — ' + G.itemLabel(it)); return; }
      case 'g-del': if (s.t === 'guide') { P().guides = P().guides.filter((q) => q.id !== s.g); st.sel = null; label('направляющая убрана'); } return;
      case 'g-clear': P().guides = []; if (s.t === 'guide') st.sel = null; label('все направляющие убраны'); return;
      case 'smart': P().smart = P().smart === false; label(P().smart ? 'притяжение к объектам включено' : 'притяжение к объектам выключено'); return;
      case 'rulers': P().rulers = P().rulers === false; label(P().rulers ? 'линейки и направляющие показаны' : 'линейки и направляющие скрыты'); return;
      case 'smart2': P().smart = v === '1'; label(P().smart ? 'притяжение к объектам включено' : 'притяжение к объектам выключено'); return;
      case 'rulers2': P().rulers = v === '1'; label(P().rulers ? 'линейки показаны' : 'линейки скрыты'); return;
      case 'snap': P().snap = +v || 0; label(P().snap ? 'сетка ' + G.nf(P().snap / 1000, P().snap % 1000 ? 1 : 0) + ' м' : 'сетка выключена'); return;
      case 'snapcyc': { const nx = { 0: 1000, 1000: 500, 500: 0 }[P().snap || 0]; P().snap = nx; label(nx ? 'сетка ' + G.nf(nx / 1000, nx % 1000 ? 1 : 0) + ' м' : 'сетка выключена'); return; }
      case 'sel': { const q = (a.dataset.sel || '').split('|'); if (q[0] === 'r') st.sel = { t: 'room', r: q[1] }; else if (q[0] === 'w') st.sel = { t: 'wall', r: q[1], w: q[2] }; else if (q[0] === 'o') st.sel = { t: 'op', r: q[1], w: q[2], o: q[3] }; else if (q[0] === 'i') st.sel = { t: 'item', i: q[1] }; else if (q[0] === 'c') st.sel = { t: 'corner', r: q[1], c: +q[2] }; st.split = null; render(); return; }
      case 'clear': st.sel = null; render(); return;
      case 'r-name': if (r) { r.name = v; label('название — ' + v); } return;
      case 'r-rot': if (r) { G.rotateRoom(r, 90); label('поворот на 90° — ' + rname(r)); } return;
      case 'r-mir': if (r) { G.mirrorRoom(r); label('отражение — ' + rname(r)); } return;
      case 'r-del': if (r) { P().rooms.splice(P().rooms.indexOf(r), 1); st.sel = null; label('удалено помещение'); } return;
      case 'w-step': if (r) { const i = wallIx(r, s.w), n = r.walls.length, j = (i + (+v) + n) % n; st.sel = { t: 'wall', r: r.id, w: r.walls[j].id }; st.split = null; render(); focusLen(); } return;
      case 'w-split': if (r) { const i = wallIx(r, s.w), L = G.roomGeom(r).L[i], t = st.split == null ? Math.round(L / 2) : st.split; if (G.splitWall(r, i, t)) { st.sel = { t: 'wall', r: r.id, w: r.walls[i].id }; st.split = null; label('стена разделена'); } else toast('Точка деления должна быть не ближе 5 см к углам.'); } return;
      case 'w-jog': if (r) { const i = wallIx(r, s.w), L = G.roomGeom(r).L[i], j = st.jog, off = j.off == null ? Math.round((L - j.w) / 2) : j.off;
        const res = G.insertJog(r, i, off, j.w, j.d, v === 'in');
        if (!res.ok) { toast('Не помещается: отступ + ширина должны быть не больше длины стены (' + fl(L) + ' ' + uLab() + ').'); return; }
        st.sel = { t: 'room', r: r.id }; st.jog.off = null; label(v === 'in' ? 'выступ' : 'ниша'); if (res.dropped) toast('Проёмов внутри ' + (v === 'in' ? 'выступа' : 'ниши') + ' убрано: ' + res.dropped + '.'); } return;
      case 'w-uncorner': case 'c-del': if (r) { const n = r.walls.length, ci = name === 'c-del' ? s.c : (wallIx(r, s.w) + 1) % n, nm = G.cornerName(ci), res = G.deleteCorner(r, ci);
        if (!res.ok) { toast(n <= 3 ? 'У помещения должно остаться хотя бы три угла.' : 'Этот угол не убрать.'); return; }
        const ni = ci === 0 ? 0 : ci - 1; st.sel = { t: 'wall', r: r.id, w: r.walls[Math.min(ni, r.walls.length - 1)].id }; label('убран угол ' + nm);
        toast('Новая стена примерная (≈) — впишите её замер.' + (res.dropped ? ' Проёмов убрано: ' + res.dropped + '.' : '')); } return;
      case 'op-add': if (r && (s.t === 'wall' || s.t === 'op')) { const i = wallIx(r, s.w), L = G.roomGeom(r).L[i]; if (L < 400) { toast('Стена слишком короткая для проёма.'); return; } const op = G.addOpening(r.walls[i], v, L); st.sel = { t: 'op', r: r.id, w: r.walls[i].id, o: op.id }; label(G.OPENINGS[v].label); } return;
      case 'op-del': if (r && s.t === 'op') { const w = r.walls[wallIx(r, s.w)]; w.ops = w.ops.filter((o) => o.id !== s.o); st.sel = { t: 'wall', r: r.id, w: w.id }; label('проём удалён'); } return;
      case 'op-set': if (r && s.t === 'op') { const op = curOp(); const k = a.dataset.k; if (k === 'leaves') op.leaves = +v; else if (k === 'out') op.out = v === '1'; else if (k === 'flip') op.flip = v === '1'; else if (k === 'exit') op.exit = v === '1'; label('проём: настройки'); } return;
      case 'it-del': if (s.t === 'item') { const it = item(s.i); P().items = P().items.filter((x) => x.id !== s.i); st.sel = null; label('удалено — ' + G.itemLabel(it)); } return;
      case 'it-dup': if (s.t === 'item') { const it = item(s.i), c = JSON.parse(JSON.stringify(it)), bb = G.bboxOf(hullish(G.footprint(it))); c.id = G.uid(); c.x = Math.round((it.x + bb.w + 600) / 10) * 10; if (c.kind === 'table' && !c.stand) c.num = G.nextNum(P()); P().items.push(c); st.sel = { t: 'item', i: c.id }; label('копия — ' + G.itemLabel(c)); } return;
      case 'it-rot90': if (s.t === 'item') { const it = item(s.i); it.rot = G.normDeg((it.rot || 0) + 90); label('поворот — ' + G.itemLabel(it)); } return;
      case 'it-seats': if (s.t === 'item') { const it = item(s.i), mx = G.seatLimits(it).max[0], want = (it.seats || 0) + (+v); if (want > mx) { toast(denseMsg(it, 0, mx)); render(); return; } it.seats = G.clamp(want, 0, mx); label('мест за столом: ' + it.seats); } return;
      case 'it-side': if (s.t === 'item') { const it = item(s.i), k = +a.dataset.k, mx = G.seatLimits(it).max[k]; it.sides = (it.sides || [0, 0, 0, 0]).slice(); const want = (it.sides[k] || 0) + (+v); if (want > mx) { toast(denseMsg(it, k, mx)); render(); return; } it.sides[k] = G.clamp(want, 0, mx); label('мест за столом: ' + G.seatCount(it)); } return;
      case 'it-grid': if (s.t === 'item') { const it = item(s.i), g2 = st.grid, bb = G.bboxOf(hullish(G.footprint(it))), sx = g2.sx || Math.ceil((bb.w + 1200) / 100) * 100, sy = g2.sy || Math.ceil((bb.h + 1200) / 100) * 100, a0 = (it.rot || 0) * G.DEG;
        let n = 0; for (let rr = 0; rr < g2.rows; rr++) for (let cc = 0; cc < g2.cols; cc++) { if (!rr && !cc) continue; const c = JSON.parse(JSON.stringify(it)); c.id = G.uid(); c.x = Math.round(it.x + cc * sx); c.y = Math.round(it.y + rr * sy); if (c.kind === 'table' && !c.stand) c.num = G.nextNum(P()); P().items.push(c); n++; }
        void a0; label('сетка ' + g2.rows + ' × ' + g2.cols); toast('Добавлено ' + n + ' шт. Всего мест: ' + G.totals(P()).seats + '.'); } return;
      case 'open-photo': PF.openPhoto(v); setMode('photo'); requestAnimationFrame(() => PF.act('zfit')); return;
      case 'warn': P().warn = v === '1'; label(v === '1' ? 'предупреждения включены' : 'предупреждения выключены'); return;
      case 'it-shape': if (s.t === 'item') { const it = item(s.i); it.shape = v; if (v === 'rect' && !it.d) it.d = it.w; label('колонна: форма'); } return;
    }
  }
  /* an opening's name follows what it is now, not the preset it was added from */
  function opName(o) {
    const base = o.type === 'window' ? (o.sill === 0 && o.w >= 2000 ? 'Панорамное окно' : 'Окно') : o.type === 'open' ? 'Проём без двери' : o.exit ? 'Аварийный выход' : o.leaves === 2 ? 'Двустворчатая дверь' : 'Дверь';
    return base + ' ' + G.nf(o.w / 10, 0);
  }
  function topName(it) { if (!it) return ''; return it.kind === 'table' && !it.stand && it.num != null ? 'Стол №' + it.num : G.itemLabel(it); }
  function curOp() { const r = selRoom(), s = st.sel; if (!r || !s || s.t !== 'op') return null; const w = r.walls[wallIx(r, s.w)]; return w && w.ops.find((o) => o.id === s.o); }
  function focusLen() { setTimeout(() => { const n = document.getElementById('pl-wlen'); if (n && window.matchMedia && matchMedia('(pointer:fine)').matches) { n.focus(); n.select(); } }, 30); }
  /* values typed into the plan's fields */
  function bind(path, raw, n) {
    const r = selRoom(), s = st.sel || {};
    const len = () => { const v = G.parseLen(raw, unit()); if (v === null || v <= 0) { toast('Не число: «' + raw + '». Длина в ' + uLab() + ', можно сумму: 2,35+1,12.'); render(); return null; } return v; };
    switch (path) {
      case 'g.at': { const g = (P().guides || []).find((q) => s.t === 'guide' && q.id === s.g); if (!g) return; const v = G.parseLen(raw, unit()); if (v === null) { toast('Не число: «' + raw + '».'); render(); return; } g.at = Math.round(G.gridOrigin(P())[g.vert ? 0 : 1] + v); label('направляющая: ' + fl(v) + ' от угла A'); return; }
      case 'p.h': { const v = len(); if (v === null) return; if (v < 1800 || v > 20000) { toast('Высота потолка — от 1,8 до 20 м.'); render(); return; } P().h = v; label('высота потолка по умолчанию'); return; }
      case 'r.name': if (r) { r.name = String(raw).trim().slice(0, 60); label('название'); } return;
      case 'r.h': if (r) { if (String(raw).trim() === '') { r.h = null; label('высота потолка'); return; } const v = len(); if (v === null) return; if (v < 1800 || v > 20000) { toast('Высота потолка — от 1,8 до 20 м.'); render(); return; } r.h = v; label('высота потолка — ' + rname(r)); } return;
      case 'r.dp': case 'r.dq': if (r) { const k = path === 'r.dp' ? 'p' : 'q'; if (String(raw).trim() === '') { r.diag[k] = null; label('диагональ убрана'); return; } const v = len(); if (v === null) return; r.diag[k] = v; label('диагональ ' + (k === 'p' ? 'A–C' : 'B–D')); } return;
      case 'w.len': if (r && s.t === 'wall') { const v = len(); if (v === null) return; const i = wallIx(r, s.w), w = r.walls[i]; if (v < 50) { toast('Стена короче 5 см — проверьте замер.'); render(); return; } w.len = v; w.m = true; (w.ops || []).forEach((o) => G.clampOpening(o, v)); label('замер ' + G.wallName(r, i) + ' = ' + fl(v)); } return;
      case 'w.m': if (r && s.t === 'wall') { const i = wallIx(r, s.w), w = r.walls[i]; if (n.checked && !w.m) w.len = Math.round(G.roomGeom(r).L[i]); w.m = !!n.checked; label(w.m ? 'стена отмечена измеренной' : 'стена — примерно'); } return;
      case 'w.split': { const v = len(); if (v === null) return; st.split = v; render(); return; }
      case 'jog.off': case 'jog.w': case 'jog.d': { if (path === 'jog.off' && String(raw).trim() === '') { st.jog.off = null; render(); return; } const v = len(); if (v === null) return; st.jog[path.slice(4)] = v; render(); return; }
      case 'c.ang': if (r && s.t === 'corner') { const a = parseFloat(String(raw).replace(',', '.')); if (!(a > 0 && a < 360)) { toast('Угол — от 0 до 360°.'); render(); return; } if (s.c === 0) { toast('Угол A получается из остальных — задайте углы B, C, …'); render(); return; } G.setInterior(r, s.c, a); label('угол ' + G.cornerName(s.c) + ' = ' + G.nf(a, 1) + '°'); } return;
      case 'op.w': case 'op.h': case 'op.off': case 'op.end': case 'op.sill': { const op = curOp(); if (!op) return; const v = path === 'op.sill' && String(raw).trim() === '0' ? 0 : len(); if (v === null) return;
        const i = wallIx(r, s.w), L = G.roomGeom(r).L[i];
        if (path === 'op.w') op.w = v; else if (path === 'op.h') op.h = v; else if (path === 'op.off') op.off = v; else if (path === 'op.end') op.off = L - op.w - v; else op.sill = v;
        G.clampOpening(op, L); label('проём: размеры'); return; }
      case 'it.w': case 'it.d': { const it = item(s.i); if (!it) return; const v = len(); if (v === null) return; it[path.slice(3)] = G.clamp(v, 50, 60000); if (it.shape === 'round') it.d = it.w; if (G.fitSeats(it)) toast('Стол стал меньше — лишние стулья убраны: плотнее 50 см на человека не сесть.'); label('размер — ' + G.itemLabel(it)); return; }
      case 'it.rot': { const it = item(s.i); if (!it) return; const a = parseFloat(String(raw).replace(',', '.')); if (!isFinite(a)) { render(); return; } it.rot = G.normDeg(a); label('поворот — ' + G.itemLabel(it)); return; }
      case 'it.h': { const it = item(s.i); if (!it) return; if (String(raw).trim() === '') { it.h = null; label('высота — от потолка'); return; } const v = len(); if (v === null) return; if (v < 100 || v > 30000) { toast('Высота — от 0,1 до 30 м.'); render(); return; } it.h = v; label('высота — ' + G.itemLabel(it)); return; }
      case 'it.sh': { const it = item(s.i); if (!it) return; const v = String(raw).trim() === '0' ? 0 : len(); if (v === null) return; it.h = G.clamp(v, 0, 3000); label('высота сцены'); return; }
      case 'it.load': { const it = item(s.i); if (!it) return; if (String(raw).trim() === '') { it.load = null; label('нагрузка'); return; } const v = parseFloat(String(raw).replace(',', '.')); if (!(v > 0 && v < 100000)) { toast('Нагрузка — число в килограммах.'); render(); return; } it.load = Math.round(v); label('нагрузка ' + it.load + ' кг'); return; }
      case 'p.minClear': { const v = len(); if (v === null) return; if (v < 1000 || v > 6000) { toast('От 1 до 6 м.'); render(); return; } P().minClear = v; label('минимум над гостями'); return; }
      case 'it.num': { const it = item(s.i); if (!it) return; const v = parseInt(raw, 10); if (String(raw).trim() === '') { delete it.num; label('номер стола убран'); return; } if (!(v >= 1 && v <= 999)) { toast('Номер стола — от 1 до 999.'); render(); return; }
        const dup = P().items.find((o) => o !== it && o.kind === 'table' && +o.num === v); it.num = v; label('номер стола ' + v); if (dup) toast('Номер ' + v + ' уже есть у другого стола — проверьте.'); return; }
      case 'it.name': { const it = item(s.i); if (!it) return; it.name = String(raw).trim().slice(0, 60); label('подпись'); return; }
      case 'it.seats': { const it = item(s.i); if (!it) return; const v = parseInt(raw, 10), mx = G.seatLimits(it).max[0]; if (!(v >= 0)) { toast('Мест — целое число от 0.'); render(); return; } if (v > mx) toast(denseMsg(it, 0, mx)); it.seats = Math.min(v, mx); label('мест за столом: ' + it.seats); return; }
      case 'it.side0': case 'it.side1': case 'it.side2': case 'it.side3': { const it = item(s.i); if (!it) return; const v = parseInt(raw, 10), k = +path.slice(-1), mx = G.seatLimits(it).max[k]; if (!(v >= 0)) { toast('Мест на стороне — целое число от 0.'); render(); return; } if (v > mx) toast(denseMsg(it, k, mx)); it.sides = (it.sides || [0, 0, 0, 0]).slice(); it.sides[k] = Math.min(v, mx); label('мест за столом: ' + G.seatCount(it)); return; }
      case 'grid.rows': case 'grid.cols': { const v = parseInt(raw, 10); if (!(v >= 1 && v <= 30)) { toast('От 1 до 30.'); render(); return; } st.grid[path.slice(5)] = v; render(); return; }
      case 'grid.sx': case 'grid.sy': { const v = len(); if (v === null) return; st.grid[path.slice(5)] = v; render(); return; }
    }
  }
  function key(ev, typing) {
    const k = ev.key;
    if (typing) {
      if (k === 'Enter' && ev.target && ev.target.id === 'pl-wlen') { ev.preventDefault(); const t = ev.target; t.blur(); setTimeout(() => act('w-step', { dataset: { v: '1' } }), 0); return true; }
      return false;
    }
    if ((ev.ctrlKey || ev.metaKey) && (k === 'd' || k === 'D' || k === 'в' || k === 'В') && st.sel && st.sel.t === 'item') { ev.preventDefault(); act('it-dup'); return true; }
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
    if (k === 'Escape') { if (st.draw) { st.draw = null; render(); return true; } if (st.tool) { st.tool = null; st.ruler = null; st.placed = 0; render(); return true; } if (st.sel) { st.sel = null; render(); return true; } return false; }
    if (k === 'Enter' && st.draw && st.draw.pts.length >= 3) { finishDraw(); return true; }
    if ((k === 'Backspace' || k === 'Delete') && st.draw) { st.draw.pts.pop(); paint(); return true; }
    if (k === 'Delete' || k === 'Backspace') { const s = st.sel; if (!s) return false; ev.preventDefault(); act(s.t === 'guide' ? 'g-del' : s.t === 'op' ? 'op-del' : s.t === 'item' ? 'it-del' : s.t === 'corner' ? 'c-del' : s.t === 'room' ? 'r-del' : '', null); return true; }
    if (k === '+' || k === '=') { zoomBy(1.4); return true; }
    if (k === '-' || k === '_') { zoomBy(1 / 1.4); return true; }
    if (k === '0') { act('zfit'); return true; }
    const kk = k.toLowerCase();
    if (kk === 'h' || kk === 'р') { act('ptool', { dataset: { v: st.tool === 'hand' ? '' : 'hand' } }); return true; }
    if (kk === 'v' || kk === 'м') { act('ptool', { dataset: { v: '' } }); return true; }
    if (kk === 'r' || kk === 'к') { act('ptool', { dataset: { v: 'ruler' } }); return true; }
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
    if (d && st.sel) { ev.preventDefault(); const q = ev.shiftKey ? 10 : 100, s = st.sel;
      if (s.t === 'room') { const r = room(s.r); r.x += d[0] * q; r.y += d[1] * q; label('перемещение — ' + rname(r)); }
      else if (s.t === 'item') { const it = item(s.i); it.x += d[0] * q; it.y += d[1] * q; label('перемещение — ' + G.itemLabel(it)); }
      return true; }
    return false;
  }
  function setMode(m) {
    m = m === 'plan' || m === 'photo' ? m : 'scene'; if (UI.mode === m) return;
    UI.mode = m; UI.fly = false; st.tool = null; st.draw = null; st.ruler = null; st.drag = null; st.tps = {}; st.pinch = null;
    try { wsSave(); } catch (e) {}
    render();
    if (m === 'plan') requestAnimationFrame(() => { if (!st.v || !st.v.user) fit(); paint(); });
    else if (m === 'photo') requestAnimationFrame(() => { PF.paint(); });
    else requestAnimationFrame(() => { fitStage(); zoomApply(); placeOv(); });
  }
  function placeFly() {
    const f = document.getElementById('fly'); if (!f || !UI.fly) return;
    const t = document.querySelector('.tools [data-ptool="' + UI.pgroup + '"]'), c = document.getElementById('canvas'); if (!t || !c) return;
    const top = Math.max(4, Math.min(t.getBoundingClientRect().top - c.getBoundingClientRect().top - 4, c.clientHeight - f.offsetHeight - 8)); f.style.setProperty('--ft', top + 'px');
  }
  function syncTop() {
    document.body.dataset.mode = UI.mode || 'scene';
    document.querySelectorAll('#modesw [data-pact=mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === (UI.mode || 'scene'))));
  }

  /* ---------- panels ---------- */
  const tb = (attrs, ico, title, on, fly) => '<button type="button" class="tb' + (fly ? ' hasfly' : '') + '" ' + attrs + ' aria-pressed="' + !!on + '" title="' + title + '" aria-label="' + title + '">' + ico + (fly ? '<i class="tri" aria-hidden="true"></i>' : '') + '</button>';
  function vTools() {
    let h = '<div class="plyr" role="group" aria-label="Слой плана"><button type="button" data-pact="layer" data-v="floor" aria-pressed="' + (st.layer === 'floor') + '" title="Пол: стены, двери, столы, зоны">Пол</button><button type="button" data-pact="layer" data-v="top" aria-pressed="' + (st.layer === 'top') + '" title="Верх: потолок, подвес, свет, декор под потолком">Верх</button></div>' +
      tb('data-pact="ptool" data-v=""', ICO.psel, 'Выбор и перемещение (V)', !st.tool && !st.draw) + tb('data-pact="ptool" data-v="hand"', U.ico.hand, 'Рука: двигать план (H)', st.tool === 'hand') + '<hr>';
    (st.layer === 'top' ? TOOLS_TOP : TOOLS).forEach((t) => { h += tb('data-pact="pfly" data-v="' + t[0] + '" data-ptool="' + t[0] + '" data-tool="p' + t[0] + '"', ICO[t[1]], t[2] + ': ' + t[3], UI.fly && UI.pgroup === t[0], true); });
    h += '<hr>' + tb('data-pact="ptool" data-v="ruler"', ICO.pruler, 'Линейка (R)', st.tool === 'ruler');
    return h;
  }
  function vFly() {
    const g = UI.pgroup || 'room', t = TOOLS.concat(TOOLS_TOP).find((x) => x[0] === g) || TOOLS[0];
    return '<div class="fh"><b>' + t[2] + '</b><small>' + t[3] + '</small><button type="button" class="fx" data-pact="pfly" data-v="' + g + '" aria-label="Закрыть">' + U.ico.x + '</button></div><div class="flist">' +
      FLY[g].map((x) => '<button type="button" class="frow pfrow" data-pact="fly-pick" data-g="' + g + '" data-v="' + x[0] + '"><span class="pfn">' + esc(x[1]) + '</span><small>' + esc(x[2]) + '</small></button>').join('') + '</div>';
  }
  const fld = (bind, labelTxt, val, o) => { o = o || {}; return '<label class="fld' + (o.cls ? ' ' + o.cls : '') + '"><span class="fl">' + labelTxt + '</span><input type="text" ' + (/\.name$/.test(bind) ? 'inputmode="text" autocapitalize="sentences" enterkeyhint="done" maxlength="60"' : 'inputmode="decimal" spellcheck="false"') + ' autocomplete="off" data-pbind="' + bind + '"' + (o.id ? ' id="' + o.id + '"' : '') + ' value="' + esc(val == null ? '' : val) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '></label>'; };
  const btn = (act, txt, o) => { o = o || {}; return '<button type="button" class="btn sm' + (o.cls ? ' ' + o.cls : '') + '" data-pact="' + act + '"' + (o.v != null ? ' data-v="' + o.v + '"' : '') + (o.k ? ' data-k="' + o.k + '"' : '') + (o.dis ? ' disabled' : '') + (o.t ? ' title="' + esc(o.t) + '"' : '') + '>' + txt + '</button>'; };
  const grp = (title, html) => V.group(title, html);
  const seg = (items, cur, act, k) => '<span class="seg" role="group">' + items.map((x) => '<button type="button" data-pact="' + act + '"' + (k ? ' data-k="' + k + '"' : '') + ' data-v="' + x[0] + '" aria-pressed="' + (String(cur) === String(x[0])) + '">' + x[1] + '</button>').join('') + '</span>';
  const stLine = (g) => {
    if (g.reason === 'self') return ['bad', 'Стены пересекаются — проверьте углы и замеры.'];
    if (g.reason === 'diag') return ['bad', 'Диагональ не сходится с длинами стен — такого четырёхугольника не бывает. Перемерьте.'];
    if (g.status === 'partial') return ['warn', 'Не измерено стен: ' + g.unmeasured + ' из ' + g.n + '. Размеры с ≈ подобраны, чтобы контур замкнулся.'];
    if (g.status === 'bad' && g.reason === 'open') return ['bad', 'Контур не замыкается (' + fl(g.gap) + ' ' + uLab() + '): измените углы или отметьте стену примерной.'];
    if (g.reason === 'diag-check') return [g.status, 'Проверка второй диагональю: расхождение ' + Math.round(Math.abs(g.diag.qDelta)) + ' мм' + (g.status === 'ok' ? ' — в норме.' : g.status === 'warn' ? ' — сомнительно, перемерьте.' : ' — ошибка замера.')];
    if (g.status === 'ok') return ['ok', 'Все стены измерены, контур сходится: невязка ' + Math.round(g.gap) + ' мм (норма до ' + G.TOL_OK + ').'];
    if (g.status === 'warn') return ['warn', 'Невязка ' + Math.round(g.gap) + ' мм — сомнительно (норма до ' + G.TOL_OK + '). Перемерьте или добавьте диагональ.'];
    return ['bad', 'Невязка ' + Math.round(g.gap) + ' мм — ошибка замера (больше ' + G.TOL_WARN + '). Перемерьте стены.'];
  };
  const note = (cls, t) => '<p class="pst ' + cls + '">' + esc(t) + '</p>';
  /* a status in one short line; the full explanation behind «?» */
  const chip = (cls, short, long) => '<div class="pchip ' + cls + '"><i class="cdot ' + (cls === 'partial' ? 'warn' : cls) + '"></i><span>' + esc(short) + '</span>' + (long ? U.help(esc(long)) : '') + '</div>';
  const stShort = (g) => g.reason === 'self' ? 'стены пересекаются' : g.reason === 'diag' ? 'диагональ не сходится' : g.status === 'partial' ? 'не измерено стен: ' + g.unmeasured + ' из ' + g.n : g.status === 'bad' && g.reason === 'open' ? 'контур не замыкается' :
    g.reason === 'diag-check' ? 'проверка диагональю: ' + Math.round(Math.abs(g.diag.qDelta)) + ' мм' : g.status === 'ok' ? 'контур сходится · ' + Math.round(g.gap) + ' мм' : g.status === 'warn' ? 'невязка ' + Math.round(g.gap) + ' мм — сомнительно' : 'невязка ' + Math.round(g.gap) + ' мм — ошибка замера';
  function vInsp() {
    const s = st.sel, p = P();
    U.inDock = true;
    try {
      if (!s) {
        const sm = G.summary(p);
        return '<div class="phead"><h3>План зала</h3></div>' +
          grp('Помещения', p.rooms.length ? '<div class="plist full">' + p.rooms.map((r, i) => { const g = sm.geoms[i]; return '<button type="button" class="prow" data-pact="sel" data-sel="r|' + r.id + '"><i class="cdot ' + (g.status === 'ok' ? 'ok' : g.status === 'warn' || g.status === 'partial' ? 'warn' : 'bad') + '"></i><span>' + esc(rname(r)) + '</span><b>' + (g.allM ? '' : '≈') + m2(g.area) + ' м²</b></button>'; }).join('') + '</div>' : '<p class="muted small full">Плана пока нет. Добавьте зал инструментом «Помещение» слева: прямоугольник, Г, П или по углам. Потом впишите замеры стен.</p>') +
          grp('Настройки плана', '<div class="fld full"><span class="fl">Единицы</span>' + seg([['m', 'м'], ['cm', 'см'], ['mm', 'мм']], p.unit, 'unit') + '</div>' + '<div class="fld full"><span class="fl">Сетка с привязкой</span>' + seg([['0', 'нет'], ['500', '0,5 м'], ['1000', '1 м']], String(p.snap || 0), 'snap') + '</div>' + fld('p.h', 'Потолок, ' + uLab(), fs(p.h), { cls: 'full' }) +
            '<p class="muted small full">Замер вписывается в единицах выше, можно суммой двух замеров: «2,35+1,12».</p>');
      }
      const r = selRoom();
      if (s.t === 'guide') {
        const g = P().guides.find((q) => q.id === s.g), o = G.gridOrigin(p), k = g.vert ? 0 : 1;
        return '<div class="phead"><h3>Направляющая ' + (g.vert ? 'вертикальная' : 'горизонтальная') + '</h3></div>' +
          grp('Положение', fld('g.at', 'От угла A, ' + uLab(), fs(g.at - o[k]), { cls: 'full' }) + '<p class="muted small full">Объекты притягиваются к направляющей центром или краем. Тяните её за линию или за треугольник на линейке; утащите обратно на линейку — уберётся.</p>') +
          '<div class="pacts">' + btn('g-del', 'Убрать направляющую', { cls: 'dng' }) + '</div>';
      }
      if (s.t === 'item' && item(s.i) && item(s.i).kind === 'photo') {
        const it = item(s.i), ph = (S.photos || []).find((x) => x.id === it.photo), sr = ph && IMG[ph.im] ? IMG[ph.im].src : '';
        return '<div class="phead"><h3>Фото на плане</h3></div>' + grp(ph ? ph.name : 'Фото', (sr ? '<img class="pthumb full" alt="" src="' + sr + '">' : '') + '<p class="muted small full">Камера показывает, откуда и куда снято. Тяните значок, кружок над ним поворачивает направление.</p>' +
          '<div class="pacts full"><button type="button" class="btn sm pnext" data-pact="open-photo" data-v="' + it.photo + '">Открыть фото</button>' + btn('it-del', 'Убрать отметку', { cls: 'dng' }) + '</div>');
      }
      if (s.t === 'item' && item(s.i) && item(s.i).top) {
        const it = item(s.i), c = G.CAT[it.ref] || {}, h0 = G.topH(p, it), ceil = G.ceilingAt(p, [it.x, it.y]), round = it.shape === 'round';
        const warn = topChecks().list.filter((q) => q.a === it.id).map((q) => q.t === 'above' ? 'Выше потолка: ' + fs(q.h) + ' при потолке ' + fs(q.ceil) + ' ' + uLab() + '.' : 'Низ на ' + fs(q.h) + ' ' + uLab() + ' над «' + topName(item(q.b)) + '»: остаётся ' + fs(q.clear) + ' ' + uLab() + ', меньше ' + fs(q.min) + '.');
        const auto = !(+it.h > 0), body = grp(c.label ? G.itemLabel(it) : 'Объект', fld('it.name', 'Подпись', it.name, { cls: 'full', ph: G.itemLabel(Object.assign({}, it, { name: '' })) }) +
          (it.kind === 'hook' ? '' : fld('it.w', (round ? 'Диаметр' : 'Длина') + ', ' + uLab(), fs(it.w)) + (round ? '' : fld('it.d', 'Ширина, ' + uLab(), fs(it.d)) + fld('it.rot', 'Поворот, °', G.nf(it.rot || 0, 0)))) +
          fld('it.h', (c.hl || 'Высота') + ', ' + uLab(), auto ? '' : fs(it.h), { cls: 'full', ph: 'авто: ' + fs(h0) + (it.kind === 'ceil' ? '' : ' (потолок ' + fs(ceil) + (c.dh ? ' − ' + fs(-c.dh) : '') + ')') }) +
          (it.kind === 'hook' || it.kind === 'truss' ? fld('it.load', 'Допустимая нагрузка, кг', it.load || '', { cls: 'full', ph: 'если знаете — от зала или по паспорту' }) : '') +
          '<p class="muted small full">' + (it.kind === 'ceil' ? 'Внутри этой зоны потолок такой высоты — по нему считаются подвес, свет и декор.' : 'Потолок здесь ' + fs(ceil) + ' ' + uLab() + '. ' + (auto ? 'Высота сейчас считается от потолка — впишите свою, если знаете точно.' : 'Высота вписана вручную; сотрите, чтобы считать от потолка.')) + '</p>');
        return '<div class="phead"><h3>' + esc(G.itemLabel(it)) + '</h3></div>' + (warn.length ? note('bad', warn.join(' ')) : '') + body +
          '<div class="pacts">' + btn('it-dup', 'Дублировать') + btn('it-del', 'Удалить', { cls: 'dng' }) + '</div>';
      }
      if (s.t === 'item') {
        const it = item(s.i), gs = p.rooms.map(G.roomGeom), cl = G.itemClearances(it, gs), cfl = conflicts().list.filter((q) => q.a === it.id || q.b === it.id);
        const isT = it.kind === 'table', isC = it.kind === 'column', round = it.shape === 'round';
        const head = isC ? 'Колонна' : isT ? (it.stand ? G.itemLabel(it) : 'Стол' + (it.num != null ? ' №' + it.num : '')) : G.itemLabel(it);
        const warn = cfl.map((q) => q.t === 'wall' ? 'Заходит на стену.' : q.t === 'outside' ? 'Стоит вне помещения.' : q.t === 'door' ? 'Стоит в зоне открывания двери.' : 'Пересекается с «' + G.itemLabel(item(q.a === it.id ? q.b : q.a) || {}) + '».');
        const G2 = st.grid, fp = G.itemBBox(it), ch = hullish(G.footprint(it)), cb = G.bboxOf(ch.length ? ch : [[fp.x0, fp.y0], [fp.x1, fp.y1]]);
        const sx = G2.sx || Math.ceil((cb.w + 1200) / 100) * 100, sy = G2.sy || Math.ceil((cb.h + 1200) / 100) * 100;
        let body = '';
        if (isC) body += grp('Форма и размер', '<div class="fld full"><span class="fl">Форма</span>' + seg([['round', 'круглая'], ['rect', 'квадратная / прямоугольная']], it.shape, 'it-shape') + '</div>' +
          fld('it.w', (round ? 'Диаметр' : 'Ширина') + ', ' + uLab(), fs(it.w)) + (round ? '' : fld('it.d', 'Глубина, ' + uLab(), fs(it.d || it.w)) + fld('it.rot', 'Поворот, °', G.nf(it.rot || 0, 1))));
        else {
          body += grp(isT ? 'Стол' : 'Объект', (isT && !it.stand ? fld('it.num', 'Номер стола', it.num != null ? it.num : '') : '') + fld('it.name', 'Подпись', it.name, { cls: isT && !it.stand ? '' : 'full', ph: G.itemLabel(Object.assign({}, it, { name: '' })) }) +
            fld('it.w', (round ? 'Диаметр' : it.shape === 'oval' ? 'Длина' : 'Ширина') + ', ' + uLab(), fs(it.w)) + (round ? '' : fld('it.d', (it.shape === 'oval' ? 'Ширина' : 'Глубина') + ', ' + uLab(), fs(it.d))) + fld('it.rot', 'Поворот, °', G.nf(it.rot || 0, 0)) + ((G.CAT[it.ref] || {}).sub === 'stage' ? fld('it.sh', 'Высота сцены, ' + uLab(), fs(+it.h || 0)) : '') +
            '<p class="muted small full">Размер — тянуть за квадратики по углам, поворот — за кружок сверху.</p>');
          if (isT && !it.stand) body += grp('Стулья — ' + G.seatCount(it) + ' мест', seatHtml(it));
          body += grp('Размножить сеткой', fld('grid.rows', 'Рядов', G2.rows) + fld('grid.cols', 'В ряду', G2.cols) + fld('grid.sx', 'Шаг вдоль ряда, ' + uLab(), fl(sx)) + fld('grid.sy', 'Шаг между рядами, ' + uLab(), fl(sy)) +
            '<p class="muted small full">Шаг — от центра до центра; сейчас он равен размеру со стульями + 1,2 м прохода. Получится ' + (G2.rows * G2.cols) + ' шт.' + (isT && !it.stand ? ', мест ' + G2.rows * G2.cols * G.seatCount(it) : '') + '.</p>' +
            '<div class="pacts full">' + btn('it-grid', 'Расставить ' + G2.rows + ' × ' + G2.cols) + '</div>');
        }
        body += grp('Расстояния', (cl.length ? '<div class="kvs full">' + cl.map((q) => '<span>до стены ' + fl(q.dist) + '</span>').join('') + '</div>' : '<p class="muted small full">Объект вне помещения.</p>') +
          '<p class="muted small full">На плане пунктиром — до стен и до двух ближайших объектов (со стульями).</p>');
        return '<div class="phead"><h3>' + esc(head) + '</h3></div>' + (warn.length ? note('bad', warn.join(' ')) : '') + body +
          '<div class="pacts">' + (isC ? '' : btn('it-rot90', 'Повернуть на 90°') + btn('it-dup', 'Дублировать')) + btn('it-del', 'Удалить', { cls: 'dng' }) + '</div>';
      }
      if (!r) return '';
      const g = G.roomGeom(r), [sc, stx] = stLine(g);
      if (s.t === 'room') {
        return '<div class="phead"><h3>' + esc(rname(r)) + '</h3></div>' + chip(sc, stShort(g), stx) +
          grp('Помещение', fld('r.name', 'Название', r.name, { cls: 'full', ph: 'Помещение ' + (p.rooms.indexOf(r) + 1) }) + '<div class="chips full">' + G.NAMES.map((nm) => '<button type="button" class="chip sm' + (r.name === nm ? ' on' : '') + '" data-pact="r-name" data-v="' + esc(nm) + '">' + nm + '</button>').join('') + '</div>' +
            fld('r.h', 'Высота потолка, ' + uLab(), r.h ? fs(r.h) : '', { cls: 'full', ph: fs(p.h) + ' — как по умолчанию' }) +
            '<div class="kv2 full"><span>Площадь</span><b>' + (g.allM ? '' : '≈') + m2(g.area) + ' м²</b><span>Периметр</span><b>' + (g.allM ? '' : '≈') + G.nf(g.P / 1000, 2) + ' м</b><span>Стен</span><b>' + g.n + (g.unmeasured ? ', не измерено ' + g.unmeasured : ', все измерены') + '</b></div>') +
          grp('Стены — коснитесь, чтобы вписать замер', '<div class="plist full">' + r.walls.map((w, i) => '<button type="button" class="prow" data-pact="sel" data-sel="w|' + r.id + '|' + w.id + '"><span class="tag">' + G.wallName(r, i) + '</span><span class="muted small">' + ((w.ops || []).length ? (w.ops.length + ' пр.') : '') + '</span><b class="' + (w.m ? '' : 'est') + '">' + (w.m ? '' : '≈') + fl(g.lens[i]) + '</b></button>').join('') + '</div>') +
          (g.n === 4 ? grp('Диагонали — для залов не под прямым углом', fld('r.dp', 'Диагональ A–C, ' + uLab(), r.diag.p ? fl(r.diag.p) : '', { ph: '≈' + fl(g.diag.pCalc) }) + fld('r.dq', 'Диагональ B–D, ' + uLab(), r.diag.q ? fl(r.diag.q) : '', { ph: '≈' + fl(g.diag.qCalc) }) +
            '<p class="muted small full">Первая диагональ задаёт углы точно (когда все четыре стены измерены), вторая — проверка замеров.</p>') : '') +
          '<div class="pacts">' + btn('r-rot', 'Повернуть на 90°') + btn('r-mir', 'Отразить') + btn('r-del', 'Удалить помещение', { cls: 'dng' }) + '</div>';
      }
      if (s.t === 'corner') {
        const i = s.c, n = g.n;
        return '<div class="phead"><h3>Угол ' + G.cornerName(i) + ' — ' + esc(rname(r)) + '</h3></div>' + chip(sc, stShort(g), stx) +
          grp('Угол', fld('c.ang', 'Внутренний угол, °', G.nf(g.interior[i], 1), { cls: i === 0 ? 'dis' : '' }) +
            '<p class="muted small full">' + (i === 0 ? 'Угол A получается из остальных углов. Задайте углы B, C, …' : 'Меняет направление стен после угла ' + G.cornerName(i) + '. Измерьте угол угломером или задайте диагональ (для четырёх стен).') + '</p>') +
          '<div class="pacts">' + btn('sel', '← Стена ' + G.wallName(r, (i + n - 1) % n), { v: '' }).replace('data-pact="sel"', 'data-pact="sel" data-sel="w|' + r.id + '|' + r.walls[(i + n - 1) % n].id + '"') + btn('c-del', 'Убрать угол ' + G.cornerName(i), { dis: n <= 3, t: 'Две стены станут одной прямой' }) + '</div>';
      }
      const i = wallIx(r, s.w), w = r.walls[i], L = g.L[i], n = g.n, nmW = G.wallName(r, i);
      if (s.t === 'op') {
        const op = curOp(), isDoor = op.type === 'door', end = L - op.off - op.w;
        return '<div class="phead"><h3>' + esc(opName(op).replace(/ \d+$/, '')) + ' — стена ' + nmW + '</h3></div>' +
          grp('Размер и место', fld('op.w', 'Ширина, ' + uLab(), fs(op.w)) + fld('op.h', 'Высота, ' + uLab(), fs(op.h)) + fld('op.off', 'От угла ' + G.cornerName(i) + ', ' + uLab(), fl(op.off)) + fld('op.end', 'До угла ' + G.cornerName((i + 1) % n) + ', ' + uLab(), fl(end)) +
            (op.type === 'window' ? fld('op.sill', 'Подоконник от пола, ' + uLab(), fs(op.sill || 0), { cls: 'full' }) : '') + '<p class="muted small full">Проём можно тянуть вдоль стены пальцем.</p>') +
          (isDoor ? grp('Дверь', '<div class="fld full"><span class="fl">Створок</span>' + seg([[1, 'одна'], [2, 'две']], op.leaves || 1, 'op-set', 'leaves') + '</div>' +
            '<div class="fld full"><span class="fl">Открывается</span>' + seg([['0', 'внутрь'], ['1', 'наружу']], op.out ? '1' : '0', 'op-set', 'out') + '</div>' +
            ((op.leaves || 1) === 1 ? '<div class="fld full"><span class="fl">Петли</span>' + seg([['0', 'у угла ' + G.cornerName(i)], ['1', 'у угла ' + G.cornerName((i + 1) % n)]], op.flip ? '1' : '0', 'op-set', 'flip') + '</div>' : '') +
            '<div class="fld full"><span class="fl">Аварийный выход</span>' + seg([['0', 'нет'], ['1', 'да — подписать «ВЫХОД»']], op.exit ? '1' : '0', 'op-set', 'exit') + '</div>') : '') +
          '<div class="pacts">' + btn('sel', '← Стена ' + nmW).replace('data-pact="sel"', 'data-pact="sel" data-sel="w|' + r.id + '|' + w.id + '"') + btn('op-del', 'Удалить проём', { cls: 'dng' }) + '</div>';
      }
      /* a wall */
      const j = st.jog, joff = j.off == null ? Math.round((L - j.w) / 2) : j.off, sp = st.split == null ? Math.round(L / 2) : st.split;
      return '<div class="phead"><h3>Стена ' + nmW + ' — ' + esc(rname(r)) + '</h3></div>' + chip(sc, stShort(g), stx) +
        grp('Замер', KP.html({ id: 'pl-wlen', bind: 'data-pbind="w.len"', act: 'data-pact', label: 'Длина ' + nmW, val: fl(w.m ? w.len : g.lens[i]), unit: unit(), unitLab: uLab(), after: 'wnext', cls: w.m ? '' : 'est' }) +
          '<label class="tog"><input type="checkbox" data-pbind="w.m"' + (w.m ? ' checked' : '') + '><span>Измерено</span></label>' +
          '<p class="muted small full">' + (w.m ? 'Длина измерена и не меняется при подгонке контура.' : 'Сейчас длина примерная (≈): впишите замер — стена станет измеренной.') + ' Enter — следующая стена.</p>' +
          '<div class="pacts full">' + btn('w-step', '← ' + G.wallName(r, (i + n - 1) % n), { v: -1 }) + btn('w-step', G.wallName(r, (i + 1) % n) + ' →', { v: 1, cls: 'pnext' }) + '</div>') +
        (function () { const src = []; (S.photos || []).forEach((ph) => ph.marks.forEach((mk) => { if (mk.wid === w.id && mk.rid === r.id) src.push({ ph, mk }); })); return src.length ? '<div class="pchip ' + (src.some((q) => q.mk.v === w.len && w.m) ? 'ok' : 'warn') + '"><i class="cdot ' + (src.some((q) => q.mk.v === w.len && w.m) ? 'ok' : 'warn') + '"></i><span>с фото «' + esc(src[0].ph.name) + '»: ' + fl(src[0].mk.v) + '</span><button type="button" class="btn sm" data-pact="open-photo" data-v="' + src[0].ph.id + '">Фото</button></div>' : ''; })() +
        grp('Двери и окна на стене', ((w.ops || []).length ? '<div class="plist full">' + w.ops.map((o) => '<button type="button" class="prow" data-pact="sel" data-sel="o|' + r.id + '|' + w.id + '|' + o.id + '"><span>' + esc(opName(o)) + '</span><span class="muted small">от ' + G.cornerName(i) + ' ' + fl(o.off) + '</span></button>').join('') + '</div>' : '') +
          '<div class="chips full">' + Object.keys(G.OPENINGS).map((k) => '<button type="button" class="chip sm" data-pact="op-add" data-v="' + k + '">+ ' + G.OPENINGS[k].label + '</button>').join('') + '</div>') +
        grp('Форма стены', fld('w.split', 'Разделить на расстоянии от ' + G.cornerName(i) + ', ' + uLab(), fl(sp), { cls: 'full' }) + '<div class="pacts">' + btn('w-split', 'Разделить стену', { t: 'Две стены по одной прямой — чтобы потом поставить угол или выступ' }) + '</div>' +
          fld('jog.off', 'Ниша или выступ: отступ от ' + G.cornerName(i) + ', ' + uLab(), fl(joff), { cls: 'full' }) + fld('jog.w', 'Ширина, ' + uLab(), fl(j.w)) + fld('jog.d', 'Глубина, ' + uLab(), fl(j.d)) +
          '<div class="pacts full">' + btn('w-jog', 'Ниша (наружу)', { v: 'out' }) + btn('w-jog', 'Выступ (внутрь)', { v: 'in' }) + btn('w-uncorner', 'Убрать угол ' + G.cornerName((i + 1) % n), { dis: n <= 3, t: 'Эта стена и следующая станут одной прямой' }) + '</div>' +
          '<p class="muted small full">Выступ подойдёт и для пилона у стены. Отдельно стоящую колонну ставьте инструментом «Колонна».</p>');
    } finally { U.inDock = false; }
  }
  function denseMsg(it, k, mx) { const L = G.edgeLens(it)[k]; return 'Плотнее не сядут: ' + (it.shape === 'rect' ? 'на стороне ' + fl(L) + ' ' + uLab() : 'вокруг стола ' + fl(L) + ' ' + uLab()) + ' — не больше ' + mx + ' (по 50 см на человека).'; }
  /* the chair rows: the densest seating is the limit; what normal, comfortable and free seating would give */
  function seatHtml(it) {
    const lim = G.seatLimits(it), T = lim.tot, over = it.shape === 'rect' ? (it.sides || []).some((v, k) => (+v || 0) > lim.max[k]) : (+it.seats || 0) > lim.max[0];
    const norms = '<div class="seatn full">' + G.SEAT.map((d) => '<span><b>' + T[d.id] + '</b> ' + d.ru + ' <small>' + d.w / 10 + ' см</small></span>').join('') + '</div>';
    const row = (nm, k, val, act, bind) => '<label class="fld"><span class="fl">' + nm + ' <small class="muted">до ' + lim.max[k] + '</small></span><span class="stp"><button type="button" class="sb" data-pact="' + act + '"' + (act === 'it-side' ? ' data-k="' + k + '"' : '') + ' data-v="-1" aria-label="Меньше"' + (val <= 0 ? ' disabled' : '') + '>−</button><input type="text" inputmode="numeric" data-pbind="' + bind + '" value="' + val + '"><button type="button" class="sb" data-pact="' + act + '"' + (act === 'it-side' ? ' data-k="' + k + '"' : '') + ' data-v="1" aria-label="Больше"' + (val >= lim.max[k] ? ' disabled' : '') + '>+</button></span></label>';
    return (over ? note('bad', 'Стульев больше, чем помещается даже при плотной посадке (50 см на человека). Уменьшите число или увеличьте стол.') : '') +
      (it.shape === 'rect' ? ['Сверху', 'Снизу', 'Слева', 'Справа'].map((nm, k) => row(nm, k, (it.sides || [])[k] || 0, 'it-side', 'it.side' + k)).join('') : row('Мест за столом', 0, it.seats || 0, 'it-seats', 'it.seats').replace('class="fld"', 'class="fld full"')) +
      '<p class="muted small full">Сколько людей поместится за таким столом: ширина места на человека вдоль края.' + (it.shape === 'rect' ? ' «Сверху» и «снизу» — длинные стороны (до поворота).' : '') + '</p>' + norms;
  }
  function rowBtns(k, id, lk, name) {
    return '<button type="button" class="ib s prlk" data-pact="lyr-lock" data-v="' + k + '|' + id + '" aria-pressed="' + !!lk + '" title="' + (lk ? 'Открепить' : 'Закрепить') + '" aria-label="' + (lk ? 'Открепить' : 'Закрепить') + ' «' + esc(name) + '»">' + U.ico[lk ? 'lock' : 'unlock'] + '</button>' +
      '<button type="button" class="ib s dng" data-pact="lyr-del" data-v="' + k + '|' + id + '" title="Удалить" aria-label="Удалить «' + esc(name) + '»">' + U.ico.del + '</button>';
  }
  function vLayers() {
    const p = P(); if (!p.rooms.length && !p.items.length) return '<p class="muted small pad">На плане пока ничего нет.</p>';
    const s = st.sel || {}, gs = p.rooms.map(G.roomGeom), cf = conflicts();
    let h = '<div class="plist lyrp">';
    p.rooms.forEach((r, ri) => {
      h += '<div class="prw' + (s.r === r.id && s.t === 'room' ? ' on' : '') + '"><button type="button" class="prow' + (s.r === r.id && s.t === 'room' ? ' on' : '') + '" data-pact="sel" data-sel="r|' + r.id + '"><span>▢ ' + esc(rname(r)) + '</span><b>' + (gs[ri].allM ? '' : '≈') + m2(gs[ri].area) + ' м²</b></button>' + rowBtns('r', r.id, r.lock, rname(r)) + '</div>';
      r.walls.forEach((w, i) => (w.ops || []).forEach((o) => { h += '<button type="button" class="prow sub' + (s.o === o.id ? ' on' : '') + '" data-pact="sel" data-sel="o|' + r.id + '|' + w.id + '|' + o.id + '"><span>' + esc(opName(o)) + '</span><span class="muted small">' + G.wallName(r, i) + '</span></button>'; }));
    });
    p.items.slice().sort((a, b) => (a.kind === 'table' ? 0 : 1) - (b.kind === 'table' ? 0 : 1) || (+a.num || 0) - (+b.num || 0)).forEach((it) => {
      const lab = it.kind === 'photo' ? '📷 ' + (((S.photos || []).find((x) => x.id === it.photo) || {}).name || 'Фото') : it.top ? '⤒ ' + G.itemLabel(it) + ' · ' + fs(G.topH(p, it)) : it.kind === 'column' ? (G.isRound(it) ? '● Колонна Ø' + fs(it.w) : '■ Колонна ' + fs(it.w) + '×' + fs(it.d || it.w)) : it.kind === 'table' ? (it.stand ? '◦ ' + G.itemLabel(it) : '◯ Стол ' + (it.num != null ? '№' + it.num + ' ' : '') + '· ' + G.itemLabel(it)) : '▭ ' + G.itemLabel(it);
      h += '<div class="prw' + (s.i === it.id ? ' on' : '') + '"><button type="button" class="prow' + (s.i === it.id ? ' on' : '') + '" data-pact="sel" data-sel="i|' + it.id + '">' + ((cf.ids[it.id] || topChecks().ids[it.id]) ? '<i class="cdot bad"></i>' : '') + '<span>' + esc(lab) + '</span>' + (it.kind === 'table' && !it.stand ? '<b>' + G.seatCount(it) + ' м.</b>' : '') + '</button>' + rowBtns('i', it.id, it.lock, lab) + '</div>';
    });
    return h + '</div>';
  }
  function vChecks() {
    const p = P(); if (!p.rooms.length && !p.items.length) return '<p class="muted small pad">Проверки появятся, когда на плане будет помещение.</p>';
    let h = '<div class="plist">' + p.rooms.map((r) => { const g = G.roomGeom(r), [c, t] = stLine(g); return '<button type="button" class="prow chk" data-pact="sel" data-sel="r|' + r.id + '"><i class="cdot ' + (c === 'ok' ? 'ok' : c === 'warn' ? 'warn' : 'bad') + '"></i><span><b>' + esc(rname(r)) + '.</b> ' + esc(t) + '</span></button>'; }).join('');
    const cf = conflicts().list, nm = (id) => { const it = item(id); return it ? (it.kind === 'table' && it.num != null && !it.stand ? 'Стол №' + it.num : G.itemLabel(it)) : ''; };
    cf.forEach((q) => { const t = q.t === 'wall' ? nm(q.a) + ' заходит на стену.' : q.t === 'outside' ? nm(q.a) + ' стоит вне помещения.' : q.t === 'door' ? nm(q.a) + ' — в зоне открывания двери.' : nm(q.a) + ' и ' + nm(q.b) + ' пересекаются.';
      h += '<button type="button" class="prow chk" data-pact="sel" data-sel="i|' + q.a + '"><i class="cdot bad"></i><span>' + esc(t) + '</span></button>'; });
    topChecks().list.forEach((q) => { const it = item(q.a), t = q.t === 'above' ? G.itemLabel(it) + ' выше потолка (' + fs(q.h) + ' при потолке ' + fs(q.ceil) + ' ' + uLab() + ').' : G.itemLabel(it) + ': низ ' + fs(q.h) + ' над «' + topName(item(q.b)) + '» — остаётся ' + fs(q.clear) + ', меньше ' + fs(q.min) + ' ' + uLab() + '.';
      h += '<button type="button" class="prow chk" data-pact="sel" data-sel="i|' + q.a + '"><i class="cdot bad"></i><span>' + esc(t) + '</span></button>'; });
    if (p.warn === false) h += '<p class="muted small pad">Предупреждения о столкновениях выключены в настройках плана.</p>';
    else if (p.items.length && !cf.length && !topChecks().list.length) h += '<p class="muted small pad">Объекты не заходят на стены, не стоят в дверях и не пересекаются; верхний слой не ниже ' + fs(p.minClear || 2200) + ' ' + uLab() + ' над гостями.</p>';
    return h + '</div>';
  }
  function vSettings() { const p = P(); U.inDock = true; try { return '<div class="pad">' + '<div class="fld"><span class="fl">Единицы</span>' + seg([['m', 'м'], ['cm', 'см'], ['mm', 'мм']], p.unit, 'unit') + '</div>' + fld('p.h', 'Потолок, ' + uLab(), fs(p.h)) +
    '<div class="fld"><span class="fl">Сетка с привязкой</span>' + seg([['0', 'нет'], ['500', '0,5 м'], ['1000', '1 м']], String(p.snap || 0), 'snap') + '</div>' +
    '<div class="fld"><span class="fl">К объектам</span>' + seg([['1', 'притягивать'], ['0', 'нет']], p.smart === false ? '0' : '1', 'smart2') + '</div>' +
    '<div class="fld"><span class="fl">Линейки</span>' + seg([['1', 'показаны'], ['0', 'скрыты']], p.rulers === false ? '0' : '1', 'rulers2') + '</div>' + ((p.guides || []).length ? '<div class="pacts">' + btn('g-clear', 'Убрать все направляющие (' + p.guides.length + ')') + '</div>' : '') +
    '<div class="fld"><span class="fl">Столкновения</span>' + seg([['1', 'да'], ['0', 'нет']], p.warn === false ? '0' : '1', 'warn') + '</div>' + fld('p.minClear', 'Мин. над гостями, ' + uLab(), fs(p.minClear || 2200)) +
    '<div class="fld"><span class="fl">Верхний слой</span>' + seg([['1', 'показан'], ['0', 'скрыт']], p.showTop === false ? '0' : '1', 'showtop') + '</div><p class="muted small">«Мин. над гостями» — ниже этой высоты декор и свет над столами, танцполом и сценой подсвечиваются. Цифра ваша: 2,2 м стоит по умолчанию.</p></div>'; } finally { U.inDock = false; } }
  function vOptbar() {
    const s = st.sel;
    if (st.draw) return '<span class="ohint">Рисование помещения: коснитесь углов по порядку</span>';
    if (s && s.t === 'guide') { const g = (P().guides || []).find((q) => q.id === s.g); return g ? '<span class="onm">Направляющая</span><span class="sep"></span><span class="ohint">от угла A: ' + fl(g.at - G.gridOrigin(P())[g.vert ? 0 : 1]) + ' ' + uLab() + ' · утащите на линейку, чтобы убрать</span><span class="sp"></span><button type="button" class="ib s dng" data-pact="g-del" title="Убрать направляющую" aria-label="Убрать направляющую">' + U.ico.del + '</button>' : ''; }
    if (!s) return '<span class="ohint">План: коснитесь помещения, стены, угла, проёма или стола · один палец по пустому месту двигает план, два — масштаб</span>';
    const r = selRoom(), ib = (act, ico, t, cls) => '<button type="button" class="ib s' + (cls ? ' ' + cls : '') + '" data-pact="' + act + '" title="' + t + '" aria-label="' + t + '">' + U.ico[ico] + '</button>';
    const of = (bind, lab, val, t) => '<label class="nf" title="' + t + '"><b>' + lab + '</b><input type="text" inputmode="decimal" autocomplete="off" data-pbind="' + bind + '" value="' + esc(val) + '"></label>';
    const x = ib('clear', 'x', 'Снять выделение (Esc)');
    if (s.t === 'item' && item(s.i) && item(s.i).kind === 'photo') { const it = item(s.i), ph = (S.photos || []).find((x) => x.id === it.photo); return '<span class="onm">📷 ' + esc(ph ? ph.name : 'Фото') + '</span><span class="sep"></span><span class="ohint">тяните значок; кружок — направление</span><span class="sp"></span><button type="button" class="btn sm" data-pact="open-photo" data-v="' + it.photo + '">Открыть фото</button>' + ib('it-del', 'del', 'Убрать отметку', 'dng') + x; }
    if (s.t === 'item' && item(s.i) && item(s.i).top) { const it = item(s.i), round = it.shape === 'round';
      return '<span class="onm">' + esc(G.itemLabel(it)) + '</span><span class="sep"></span>' + (it.kind === 'hook' ? '' : of('it.w', round ? 'Ø' : 'Д', fs(it.w), uLab())) + of('it.h', 'h', +it.h > 0 ? fs(it.h) : '', 'Высота, ' + uLab() + ' (пусто — от потолка: ' + fs(G.topH(P(), it)) + ')') + '<span class="ohint">' + (+it.h > 0 ? 'высота вручную' : 'от потолка: ' + fs(G.topH(P(), it))) + '</span><span class="sp"></span>' + ib('it-dup', 'copy', 'Дублировать (Ctrl+D)') + ib('it-del', 'del', 'Удалить (Del)', 'dng') + x; }
    if (s.t === 'item') { const it = item(s.i), round = it.shape === 'round';
      return '<span class="onm">' + esc(it.kind === 'table' && !it.stand && it.num != null ? 'Стол №' + it.num : G.itemLabel(it)) + '</span><span class="sep"></span>' + of('it.w', round ? 'Ø' : 'Ш', fs(it.w), (round ? 'Диаметр, ' : 'Ширина, ') + uLab()) + (round ? '' : of('it.d', 'Г', fs(it.d || it.w), 'Глубина, ' + uLab())) + (round && it.kind === 'column' ? '' : of('it.rot', '⟳', G.nf(it.rot || 0, 0), 'Поворот, °')) +
        (it.kind === 'table' && !it.stand ? '<span class="ohint">' + G.seatCount(it) + ' мест</span>' : '') + '<span class="sp"></span>' + (it.kind === 'column' ? '' : ib('it-dup', 'copy', 'Дублировать (Ctrl+D)')) + ib('it-del', 'del', 'Удалить (Del)', 'dng') + x; }
    if (!r) return '';
    const g = G.roomGeom(r);
    if (s.t === 'room') return '<span class="onm">' + esc(rname(r)) + '</span><span class="sep"></span><span class="ohint">' + (g.allM ? '' : '≈') + m2(g.area) + ' м² · периметр ' + G.nf(g.P / 1000, 2) + ' м · стен ' + g.n + ' · тяните точки на углах и стенах</span><span class="sp"></span>' + ib('r-rot', 'flip', 'Повернуть на 90°') + ib('r-del', 'del', 'Удалить помещение', 'dng') + x;
    if (s.t === 'corner') return '<span class="onm">Угол ' + G.cornerName(s.c) + '</span><span class="sep"></span>' + (s.c ? of('c.ang', '∠', G.nf(g.interior[s.c], 1), 'Внутренний угол, °') : '<span class="ohint">' + G.nf(g.interior[s.c], 1) + '°</span>') + '<span class="ohint">тяните точку, чтобы изменить форму</span><span class="sp"></span>' + ib('c-del', 'del', 'Убрать угол', 'dng') + x;
    const i = wallIx(r, s.w);
    if (s.t === 'op') { const op = curOp(); return '<span class="onm">' + esc(opName(op)) + '</span><span class="sep"></span>' + of('op.w', 'Ш', fs(op.w), 'Ширина, ' + uLab()) + of('op.off', 'от ' + G.cornerName(i), fl(op.off), 'От угла ' + G.cornerName(i) + ', ' + uLab()) + '<span class="ohint">края проёма тоже тянутся</span><span class="sp"></span>' + ib('op-del', 'del', 'Удалить проём', 'dng') + x; }
    return '<span class="onm">Стена ' + G.wallName(r, i) + '</span><span class="sep"></span>' + '<span class="ohint"><b>' + (r.walls[i].m ? '' : '≈') + fl(r.walls[i].m ? r.walls[i].len : g.lens[i]) + ' ' + uLab() + '</b></span>' + '<span class="ohint">' + (r.walls[i].m ? 'точно' : '≈ примерно') + ' · тяните точку на стене · двойное касание — новый угол</span><span class="sp"></span>' + x;
  }
  function vStatbar() {
    const sm = G.summary(P()), bad = sm.cnt.bad, warn = sm.cnt.warn + sm.cnt.partial, tt = G.totals(P()), cf = conflicts().list.length + topChecks().list.length;
    return '<span class="zm"><button type="button" class="ib s" data-pact="zout" title="Отдалить" aria-label="Отдалить">' + U.ico.zout + '</button><button type="button" class="zl" id="pzlbl" data-pact="zfit" title="Вписать план">' + zoomText() + '</button><button type="button" class="ib s" data-pact="zin" title="Приблизить" aria-label="Приблизить">' + U.ico.zin + '</button><button type="button" class="ib s" data-pact="zfit" title="Вписать план" aria-label="Вписать план">' + U.ico.fit + '</button></span>' +
      (sm.rooms ? '<span>площадь ' + (warn || bad ? '≈' : '') + m2(sm.area) + ' м²</span>' : '<span>помещений 0</span>') + (tt.tables || tt.stand ? '<span><b>столов ' + tt.tables + ' · мест ' + tt.seats + '</b>' + (tt.stand ? ' · коктейльных ' + tt.stand : '') + '</span>' : '') +
      (sm.rooms || P().items.length ? '<button type="button" class="sck" data-act="dopen" data-id="checks"><i class="cdot ' + (bad || cf ? 'bad' : warn ? 'warn' : 'ok') + '"></i>' + (cf ? 'замечаний: ' + cf : bad ? 'ошибки замеров: ' + bad : warn ? 'не всё измерено' : 'всё сходится') + '</button>' : '') + '<span class="sp"></span><button type="button" class="sck" data-pact="smart" title="Притягивать к центрам и краям других объектов" aria-pressed="' + (P().smart !== false) + '">к объектам</button><button type="button" class="sck" data-pact="rulers" title="Линейки и направляющие" aria-pressed="' + rulersOn() + '">линейки</button><button type="button" class="sck" data-pact="snapcyc" title="Сетка с привязкой: нет → 1 м → 0,5 м" aria-pressed="' + !!P().snap + '">' + (P().snap ? 'сетка ' + G.nf(P().snap / 1000, P().snap % 1000 ? 1 : 0) + ' м' : 'сетка: нет') + '</button><span>единицы: ' + uLab() + '</span>';
  }
  const SKEL = '<svg id="plan" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="План зала"><g id="pvp"><g id="pgrid"></g><g id="pbody"></g><g id="pitems"></g><g id="ptop"></g><g id="phit"></g><g id="pover"></g><g id="plab"></g><g id="phnd"></g></g><g id="prul"></g></svg>' +
    '<div id="pbanner" class="pbanner" hidden></div><div id="ptip" class="dragtip ptip" hidden></div>' +
    '<div id="pempty" class="pempty2" hidden><div><b>План зала пуст</b><span>Начните с формы зала, потом впишите замеры стен — как с лазерной рулетки.</span><div class="pacts">' +
    '<button type="button" class="btn sm pri" data-pact="fly-pick" data-g="room" data-v="rect">Прямоугольный зал</button><button type="button" class="btn sm" data-pact="fly-pick" data-g="room" data-v="L">Г-образный</button><button type="button" class="btn sm" data-pact="fly-pick" data-g="room" data-v="U">П-образный</button><button type="button" class="btn sm" data-pact="fly-pick" data-g="room" data-v="draw">Нарисовать по углам</button></div></div></div>';

  function init() {
    document.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('resize', () => { if (UI.mode === 'plan' && st.v && !st.v.user) { st.v = null; } if (UI.mode === 'plan') paint(); });
  }
  return { st, validate, drop, paint, down, move, up, act, bind, key, wheel, setMode, placeFly, syncTop, init, vTools, vFly, vInsp, vLayers, vChecks, vSettings, vOptbar, vStatbar, SKEL, fit };
})();

/* the plan's panels take the place of the scene's in «План» mode */
(function () {
  const wrap = (obj, key, alt) => { const o = obj[key]; obj[key] = function () { return UI.mode === 'plan' ? alt() : o.apply(this, arguments); }; };
  V.con.skel = V.con.skel.replace('<div class="fly" id="fly"', '<div class="planhost" id="planhost" data-sec="plan"></div><div class="fly" id="fly"');
  V.con.secs.plan = function () { return PL.SKEL; };
  wrap(V.con.secs, 'tools', PL.vTools);
  wrap(V.con.secs, 'pal', PL.vFly);
  wrap(V.con.secs, 'insp', PL.vInsp);
  wrap(V.con.secs, 'layers', PL.vLayers);
  wrap(V.con.secs, 'checks', PL.vChecks);
  wrap(V.con.secs, 'scene', PL.vSettings);
  wrap(V, 'optbar', PL.vOptbar);
  wrap(V, 'statbar', PL.vStatbar);
  /* the dock's last tab is the plan's settings; the checks dot follows the plan's measurements */
  const dt = V.con.secs.dtabs; V.con.secs.dtabs = function () { const h = dt(); if (UI.mode !== 'plan') return h;
    const sm = PG.summary(S.plan || PG.newPlan()), c = sm.cnt.bad ? 'bad' : (sm.cnt.warn + sm.cnt.partial) ? 'warn' : 'ok';
    return h.replace('>Сцена</button>', '>План</button>').replace(/<i class="cdot [a-z]+"/, '<i class="cdot ' + c + '"'); };
  const ds = V.con.secs.dstrip; V.con.secs.dstrip = function () { const h = ds(); return UI.mode === 'plan' ? h.replace(/title="Сцена" aria-label="Сцена"/, 'title="План: настройки" aria-label="План: настройки"') : h; };
})();
