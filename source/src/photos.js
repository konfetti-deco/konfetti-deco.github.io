/* ===== photos.js — the «Фото» mode: photos of the hall with size lines, notes and arrows; a photo can be pinned to
   its place on the plan. Photos live in S.photos (pictures in IMG, like the scene's pictures), so they are saved,
   transferred and synced with the project. Coordinates of marks are in the photo's own pixels. ===== */
var PF = (function () {
  'use strict';
  const G = PG;
  const ICO = {
    fdim: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 16L20 8"/><path d="M3 13l2 5M19 5l2 5"/><path d="M11 9.5l1.6 3"/></svg>',
    ftext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="3"/><path d="M8 10h8M8 14h5"/></svg>',
    farrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19L19 5"/><path d="M10 5h9v9"/></svg>',
    fgal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>',
    fpoly: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 18l2-12 11 3 1 10z"/><circle cx="5" cy="18" r="1.6" fill="currentColor"/><circle cx="7" cy="6" r="1.6" fill="currentColor"/><circle cx="18" cy="9" r="1.6" fill="currentColor"/><circle cx="19" cy="19" r="1.6" fill="currentColor"/></svg>',
    ffit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="M4 7l14-3 2 15-16 1z"/><path d="M9 16v-5l3-3 3 3v5"/></svg>',
    fpin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/></svg>',
  };
  const COLNAME = { '#FF4D4F': 'красный', '#FFD43B': 'жёлтый', '#FFFFFF': 'белый', '#40C057': 'зелёный', '#4DABF7': 'синий' };
  const st = { refEdit: 'w', f2: null, poly: null, kpOpen: null, cutFor: '', lay: null, pim: null, pick: {}, open: null, sel: null, tool: '', col: G.MARK_COLS[0], v: null, drag: null, tps: {}, pinch: null, pend: null, lastW: 0, lastH: 0, repaint: 0 };
  function L() { if (!Array.isArray(S.photos)) S.photos = []; return S.photos; }
  function cur() { return L().find((p) => p.id === st.open) || null; }
  function mark(id) { const ph = cur(); return ph ? ph.marks.find((m) => m.id === id) || null : null; }
  function unit() { return (S.plan && S.plan.unit) || 'm'; }
  function uLab() { return G.UNIT[unit()].ru; }
  function fl(mm) { return G.fmtLen(mm, unit()); }
  function fs(mm) { let s = fl(mm); if (s.indexOf(',') >= 0) s = s.replace(/0+$/, '').replace(/,$/, ''); return s; }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const n1 = (v) => Math.round(v * 10) / 10;
  /* figures: size lines meeting at their ends */
  /* «В план»: which wall this size goes to */
  function wallList() { const out = []; (S.plan ? S.plan.rooms : []).forEach((r, ri) => { const g = G.roomGeom(r); r.walls.forEach((w, i) => out.push({ rid: r.id, wid: w.id, r, i, w, L: g.lens[i], room: r.name || 'Помещение ' + (ri + 1) })); }); return out; }
  function wallPick(m, ph) {
    const list = wallList(); if (!list.length) return null;
    const has = (rid, wid) => list.find((x) => x.rid === rid && x.wid === wid);
    if (st.pick[m.id] && has.apply(null, st.pick[m.id].split('|'))) return has.apply(null, st.pick[m.id].split('|'));
    if (m.wid && has(m.rid, m.wid)) return has(m.rid, m.wid);
    const pin = pinOf(ph.id), seen = pin && G.wallSeen(S.plan, pin); if (seen && has(seen.rid, seen.wid)) return has(seen.rid, seen.wid);
    return list[0];
  }
  function toPlanHtml(m, ph) {
    const list = wallList();
    if (!list.length) return grp('В план', '<p class="small full">На плане пока нет помещений — нарисуйте зал в режиме «План», и замер можно будет передать в стену.</p><div class="pacts full"><button type="button" class="btn sm" data-pact="mode" data-v="plan">Открыть план</button></div>');
    const cur0 = wallPick(m, ph), pin = pinOf(ph.id), seen = pin && G.wallSeen(S.plan, pin), linked = m.wid && list.find((x) => x.rid === m.rid && x.wid === m.wid);
    const opt = (x) => '<option value="' + x.rid + '|' + x.wid + '"' + (cur0 && x.rid === cur0.rid && x.wid === cur0.wid ? ' selected' : '') + '>' + esc(x.room) + ' · ' + G.wallName(x.r, x.i) + ' · ' + (x.w.m ? '' : '≈') + fl(x.L) + (seen && seen.wid === x.wid ? ' — сюда смотрит камера' : '') + '</option>';
    let st0 = '';
    if (linked) { const same = linked.w.m && linked.w.len === m.v; st0 = '<div class="pchip ' + (same ? 'ok' : 'warn') + ' full"><i class="cdot ' + (same ? 'ok' : 'warn') + '"></i><span>' + (same ? 'в плане: ' + G.wallName(linked.r, linked.i) + ' = ' + fl(m.v) : 'в плане ' + G.wallName(linked.r, linked.i) + ' = ' + (linked.w.m ? '' : '≈') + fl(linked.L) + ', на фото ' + (m.v > 0 ? fl(m.v) : '?')) + '</span></div>'; }
    return grp('В план', st0 + '<label class="fld full"><span class="fl">Стена</span><span class="dsel"><select data-fbind="m.wpick" aria-label="Стена плана">' + list.map(opt).join('') + '</select></span></label>' +
      '<div class="pacts full"><button type="button" class="btn sm pnext" data-fact="send"' + (m.v > 0 ? '' : ' disabled') + '>' + (linked && linked.wid === cur0.wid ? 'Обновить стену' : 'Передать замер в стену') + '</button>' + (linked ? '<button type="button" class="btn sm" data-fact="showwall">Показать на плане</button>' : '') + '</div>' +
      '<p class="muted small full">Стена станет «точной» с длиной этого размера; остальные стены подстроятся, если они примерные. ' + (pin ? 'По камере на плане предложена стена, в которую она смотрит.' : 'Отметьте фото на плане — тогда стена подставится сама.') + '</p>');
  }
  /* ---------- the scene tried on the photo: the scene picture warped onto four corners ---------- */
  let cut = null;   // {cv, wmm, hmm, id} — the current scene, cut out
  function fitOn(ph) { return !!(ph && ph.fit && ph.fit.on); }
  function refreshCut(force) {
    const k = UI.hi + '|' + S.els.length; if (!force && st.cutFor === k) return Promise.resolve(cut); st.cutFor = k;
    return IO.sceneCut().then((r) => { const was = cut; cut = r; if (r !== was) paint(); return r; }).catch(() => { cut = null; return null; });
  }
  /* each cell of a grid over the scene is two triangles; each triangle is an affine piece of the projective map, clipped a hair wider so no seams show */
  function warp(c, im, q, K, N) {
    const H = G.sq2quad(q), sw = im.width, sh = im.height, P0 = [];
    N = N || 16;
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const p = H(i / N, j / N); P0.push([p[0] * K, p[1] * K]); }
    const at = (i, j) => P0[j * (N + 1) + i], sp = (i, j) => [i / N * sw, j / N * sh];
    const tri = (s, d) => {
      const A = G.triAffine(s, d); if (!A) return;
      const cx = (d[0][0] + d[1][0] + d[2][0]) / 3, cy = (d[0][1] + d[1][1] + d[2][1]) / 3, g = d.map((p) => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * 0.8, p[1] + dy / l * 0.8]; });
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.beginPath(); c.moveTo(g[0][0], g[0][1]); c.lineTo(g[1][0], g[1][1]); c.lineTo(g[2][0], g[2][1]); c.closePath(); c.clip();
      c.setTransform(A[0], A[1], A[2], A[3], A[4], A[5]); c.drawImage(im, 0, 0); c.restore();
    };
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { tri([sp(i, j), sp(i + 1, j), sp(i + 1, j + 1)], [at(i, j), at(i + 1, j), at(i + 1, j + 1)]); tri([sp(i, j), sp(i + 1, j + 1), sp(i, j + 1)], [at(i, j), at(i + 1, j + 1), at(i, j + 1)]); }
  }
  /* the warped scene at photo resolution (up to ×2), redone only when the corners or the scene change */
  function layer(ph) {
    if (!cut || !fitOn(ph)) return null;
    const N = st.drag && /^q/.test(st.drag.mode) ? 10 : 16, key = cut.id + '|' + ph.id + '|' + ph.w + '|' + N + '|' + ph.fit.q.join(';');
    if (st.lay && st.lay.key === key) return st.lay;
    const LS = Math.min(2, 2400 / Math.max(ph.w, ph.h)), cv = (st.lay && st.lay.cv) || document.createElement('canvas');
    cv.width = Math.round(ph.w * LS); cv.height = Math.round(ph.h * LS);
    warp(cv.getContext('2d'), cut.cv, ph.fit.q, LS, N);
    st.lay = { key, cv }; return st.lay;
  }
  function photoImg(ph) {
    const sr = src(ph); if (!sr) return null;
    if (!st.pim || st.pim.src !== sr) { const im = new Image(); st.pim = { src: sr, im, ok: false }; im.onload = () => { if (st.pim && st.pim.im === im) { st.pim.ok = true; drawFit(); } }; im.src = sr; }
    return st.pim.ok ? st.pim.im : null;
  }
  /* with a try-on the photo and the scene are drawn on a canvas under the marks; without it the plain photo image stays */
  function drawFit() {
    const cvs = document.getElementById('fcv'), img = document.getElementById('fimg'), ph = cur(), h = host(); if (!cvs || !h) return;
    const L0 = st.v && layer(ph), pim = L0 && photoImg(ph), on = !!(L0 && pim);
    if (img) img.style.visibility = on ? 'hidden' : '';
    if (!on) { if (!cvs.hidden) { cvs.hidden = true; cvs.width = 1; cvs.height = 1; } return; }
    cvs.hidden = false;
    const dpr = Math.min(2, window.devicePixelRatio || 1), hz = hsize(), W = Math.round(hz.w * dpr), H = Math.round(hz.h * dpr);
    if (cvs.width !== W || cvs.height !== H) { cvs.width = W; cvs.height = H; }
    const c = cvs.getContext('2d'), s = st.v.s * dpr; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    c.setTransform(s, 0, 0, s, -st.v.x * s, -st.v.y * s); c.imageSmoothingQuality = 'high';
    c.drawImage(pim, 0, 0, ph.w, ph.h); c.globalAlpha = ph.fit.op; c.drawImage(L0.cv, 0, 0, ph.w, ph.h); c.globalAlpha = 1;
  }
  function fitStart(ph) {
    return refreshCut(true).then((r) => {
      if (!r) { st.tool = ''; render(); toast('Сцена пуста — соберите фотозону в режиме «Сцена», и её можно будет примерить на фото.'); return; }
      if (!ph.fit) { const f = G.fitQuad(ph, r.wmm, r.hmm); ph.fit = { q: f.q, op: 1, on: true }; label('примерка сцены'); toast(f.scaled ? 'Размер сцены — по вашему замеру на фото. Тяните углы к месту, где она будет стоять.' : 'Тяните углы к месту, где будет стоять фотозона: нижние — на пол.'); }
      else if (!ph.fit.on) { ph.fit.on = true; label('примерка показана'); }
      else render();
    });
  }
  /* back to a straight rectangle on the same bottom edge, with the scene's own proportions */
  function fitRect(ph) {
    const q = ph.fit.q, w = Math.hypot(q[2][0] - q[3][0], q[2][1] - q[3][1]), r = cut && cut.wmm > 0 ? cut.hmm / cut.wmm : 0.75, cx = (q[2][0] + q[3][0]) / 2, by = (q[2][1] + q[3][1]) / 2, h = w * r, R = (v) => Math.round(v * 10) / 10;
    return [[R(cx - w / 2), R(by - h)], [R(cx + w / 2), R(by - h)], [R(cx + w / 2), R(by)], [R(cx - w / 2), R(by)]];
  }
  function fitHtml(ph) {
    const f = ph.fit, ops = [1, 0.8, 0.6, 0.4];
    if (!f) return '';
    const sz = cut ? fs(cut.wmm) + ' × ' + fs(cut.hmm) + ' ' + uLab() : '';
    return grp('Примерка сцены', (cut ? '' : '<div class="pchip warn full"><i class="cdot warn"></i><span>Сцена пуста — примерять нечего</span></div>') +
      '<div class="fld full"><span class="fl">Видимость, %</span><span class="seg" role="group" aria-label="Насколько видна сцена, процентов">' + ops.map((o) => '<button type="button" data-fact="fit-op" data-v="' + o + '" aria-pressed="' + (Math.abs(f.op - o) < 0.01) + '">' + Math.round(o * 100) + '</button>').join('') + '</span></div>' +
      (sz ? '<div class="kv2 full"><span>Сцена</span><b>' + sz + '</b></div>' : '') +
      '<div class="pacts full">' + (st.tool === 'fit' ? btn('tool', 'Готово', { v: '', cls: 'pnext' }) : btn('tool', 'Двигать углы', { v: 'fit', cls: 'pnext' })) + btn('fit-on', f.on ? 'Скрыть' : 'Показать') + btn('fit-floor', 'По 2 точкам пола') + btn('fit-rect', 'Выпрямить') + btn('fit-reset', 'Заново') + btn('fit-del', 'Убрать', { cls: 'dng' }) + '</div>' +
      '<p class="muted small full">Тяните четыре угла: нижние — на пол там, где будет стоять фотозона, верхние — на нужную высоту. Сцена искажается в перспективе, как на фото. Внутри рамки — сдвиг целиком. Картинка берётся из режима «Сцена»: поменяете там — примерка обновится. «Выпрямить» — снова прямоугольник на том же месте, «Заново» — исходный размер' + (ph.marks.some((m) => m.t === 'dim' && m.v > 0) ? ' по вашему самому длинному замеру' : '') + '.</p>');
  }
  function figTol(ph) { return G.figTol(ph); }
  function figures(ph) { return ph ? G.photoFigures(ph.marks, figTol(ph)) : []; }
  function fArea(a) {
    if (!(a > 0)) return '—';
    const m2 = a / 1e6, cm2 = a / 100;
    if (unit() === 'cm') return G.nf(cm2, 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' см² (' + G.nf(m2, 3) + ' м²)';
    return m2 < 0.01 ? G.nf(cm2, 0) + ' см²' : G.nf(m2, m2 < 10 ? 3 : 2) + ' м²';
  }
  function figHtml(f, i) {
    const fa = fArea(f.area), m = fa.match(/^(.*) \((.*)\)$/), S0 = f.area > 0 ? (f.exact ? '' : '≈') + (m ? m[1] + '<small>' + m[2] + '</small>' : fa) : '—';
    const help = 'Периметр — сумма сторон' + (f.diag ? ' (диагональ не входит)' : '') + '. Площадь ' + (f.exact ? 'точная: ' + f.how + '.' : f.how === 'при прямых углах' ? 'посчитана при прямых углах — по одним сторонам форму не определить. Проведите размер-диагональ между противоположными углами и впишите её замер: площадь станет точной.' : f.how + '.');
    return '<div class="fig full"><div class="figh"><b>Фигура ' + (i + 1) + '</b><span class="muted small">' + f.n + ' стор.' + (f.diag ? ' + диагональ' : '') + '</span>' + U.help(help) + '</div>' +
      (f.known ? '<div class="kv2"><span>Периметр</span><b>' + fl(f.P) + ' ' + uLab() + '</b><span>Площадь</span><b>' + S0 + '</b></div>' + (f.area > 0 && !f.exact ? '<span class="figtag">при прямых углах</span>' : f.exact ? '<span class="figtag ok">точно</span>' : '') : '<p class="muted small">Впишите все размеры фигуры — тогда будут периметр и площадь.</p>') +
      (f.warn ? '<div class="pchip warn"><i class="cdot warn"></i><span>' + esc(f.warn) + '</span>' + U.help(esc(f.warn)) + '</div>' : '') + '</div>';
  }
  /* a new or dragged end sticks to the nearest end of another size line */
  function snapEnd(q, own) {
    const ph = cur(), lim = 16 / st.v.s; let best = null;
    ph.marks.forEach((m) => { if (m.id === own || m.t !== 'dim') return; for (const e of [m.a, m.b]) { const d = Math.hypot(e[0] - q[0], e[1] - q[1]); if (d < lim && (!best || d < best.d)) best = { d, e }; } });
    return best ? best.e.slice() : q;
  }
  function label(t) { UI.nextLabel = 'Фото: ' + t; commit(); }
  function clampX(ph, x) { return Math.round(Math.max(0, Math.min(ph.w, x)) * 10) / 10; }
  function clampY(ph, y) { return Math.round(Math.max(0, Math.min(ph.h, y)) * 10) / 10; }
  function fclip() { if (UI.fclip) return UI.fclip; try { const t = localStorage.getItem('fotozona.fclip.v1'); if (t) return (UI.fclip = JSON.parse(t)); } catch (e) {} return null; }
  function validate() { if (st.open && !cur()) { st.open = null; st.sel = null; } if (st.sel && !mark(st.sel)) st.sel = null; }
  function src(ph) { const im = IMG[ph.im]; return im ? im.src : ''; }
  /* a size without a number: its length on the plane of the reference (null when there is no full reference) */
  function estOf(m, ph) { ph = ph || cur(); return ph && ph.ref && m && m.t === 'dim' ? G.refLen(ph.ref, m.a, m.b) : null; }
  function refStart(ph) {
    if (!ph.ref) { const w = ph.w * 0.16, h = ph.h * 0.42, cx = ph.w / 2, cy = ph.h / 2, R0 = (v) => Math.round(v * 10) / 10; ph.ref = { q: [[R0(cx - w / 2), R0(cy - h / 2)], [R0(cx + w / 2), R0(cy - h / 2)], [R0(cx + w / 2), R0(cy + h / 2)], [R0(cx - w / 2), R0(cy + h / 2)]], w: null, h: null }; st.refEdit = 'w'; label('эталон'); toast('Поставьте 4 угла на предмет известного размера — дверь, плитку, стол — и впишите его ширину и высоту.'); }
    else render();
  }
  function refHtml(ph) {
    const r = ph.ref; if (!r && st.tool !== 'ref') return grp('Измерить по эталону', '<p class="muted small full">Отметьте на фото предмет известного размера: дверь, плитку, стол. Тогда размеры в той же плоскости (та же стена или пол) посчитаются сами — без рулетки.</p><div class="pacts full">' + btn('tool', 'Задать эталон', { v: 'ref', cls: 'pnext' }) + '</div>');
    if (!r) return '';
    const e = st.refEdit === 'h' ? 'h' : 'w', ok = r.w > 0 && r.h > 0;
    const PRE = [['Дверь', 900, 2100], ['Двойная дверь', 1400, 2100], ['Плитка 60', 600, 600], ['Лист A4', 210, 297]];
    return grp('Эталон', '<div class="seg full" role="group" aria-label="Что вписываю">' + [['w', 'Ширина'], ['h', 'Высота']].map((q) => '<button type="button" data-fact="ref-edit" data-v="' + q[0] + '" aria-pressed="' + (e === q[0]) + '">' + q[1] + ': ' + (r[q[0]] > 0 ? fl(r[q[0]]) : '?') + '</button>').join('') + '</div>' +
      KP.html({ id: 'pf-ref', bind: 'data-fbind="r.' + e + '"', act: 'data-fact', label: e === 'w' ? 'Ширина эталона' : 'Высота эталона', val: r[e] > 0 ? fl(r[e]) : '', ph: '?', unit: unit(), unitLab: uLab(), after: 'refnext', cls: r[e] > 0 ? '' : 'bad' }) +
      '<div class="pacts full">' + PRE.map((x) => '<button type="button" class="btn sm" data-fact="ref-pre" data-v="' + x[1] + '|' + x[2] + '">' + x[0] + ' ' + G.nf(x[1] / 1000, 2) + '×' + G.nf(x[2] / 1000, 2) + '</button>').join('') + '</div>' +
      (ok ? '<div class="pchip ok full"><i class="cdot ok"></i><span>Размеры без числа теперь показывают «≈» — по эталону</span></div>' : '<div class="pchip warn full"><i class="cdot warn"></i><span>Впишите ширину и высоту эталона</span></div>') +
      '<div class="pacts full">' + (st.tool === 'ref' ? btn('tool', 'Готово', { v: '', cls: 'pnext' }) : btn('tool', 'Двигать углы', { v: 'ref' })) + btn('ref-del', 'Убрать эталон', { cls: 'dng' }) + '</div>' +
      '<p class="muted small full">Углы — по порядку: левый верхний, правый верхний, правый нижний, левый нижний (как у прямоугольника на фото). Точно меряется только то, что лежит в той же плоскости, что и эталон: на той же стене или на полу. Число по эталону помечается «≈»; ваш замер рулеткой точнее.</p>');
  }
  function polySides(m) { const ph = cur(); return ph && m && m.poly ? ph.marks.filter((x) => x.poly === m.poly) : []; }
  function nextSide(m) { const L = polySides(m), i = L.indexOf(m); for (let k = 1; k < L.length; k++) { const q = L[(i + k) % L.length]; if (!(q.v > 0)) return q; } return null; }
  function closePoly() {
    const ph = cur(), pts = st.poly || []; if (!ph || pts.length < 3) { toast('Нужно хотя бы 3 угла.'); return; }
    const cid = 'c' + G.uid(), made = pts.map((a, i) => ({ id: G.uid(), t: 'dim', a: a.slice(), b: pts[(i + 1) % pts.length].slice(), v: null, col: st.col, poly: cid }));
    made.forEach((m) => ph.marks.push(m)); st.poly = null; st.tool = ''; st.sel = made[0].id; st.kpOpen = null;
    label('контур: ' + made.length + ' сторон' + (made.length < 5 ? 'ы' : '')); focusVal();
  }
  function markName(m) { return m.t === 'dim' ? (m.text || 'Размер') + (m.v > 0 ? ' ' + fs(m.v) : ' без числа') : m.t === 'text' ? 'Заметка' + (m.text ? ': ' + m.text : '') : 'Стрелка' + (m.text ? ': ' + m.text : ''); }
  function pinOf(id) { return S.plan && S.plan.items.find((it) => it.kind === 'photo' && it.photo === id) || null; }
  function pinWhere(pin) {
    if (!pin || !S.plan) return '';
    let best = null; S.plan.rooms.forEach((r) => { const g = G.roomGeom(r); for (let i = 0; i < g.n; i++) { const d = G.distSeg([pin.x, pin.y], g.pts[i], g.pts[(i + 1) % g.n]).d; if (!best || d < best.d) best = { d, r, i }; } });
    return best ? (best.r.name || 'помещение') + ', у стены ' + G.wallName(best.r, best.i) : 'на плане';
  }

  /* ---------- view ---------- */
  function host() { return document.getElementById('photohost'); }
  const MODE = 'photo';
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
  function svg() { return document.getElementById('fsvg'); }
  function fit() {
    const h = host(), ph = cur(); if (!h || !ph) return; const hz = hsize(), W = hz.w, H = hz.h; if (W < 50 || H < 50) return;
    const s = Math.min((W - 24) / ph.w, (H - 24) / ph.h);
    st.v = { s, x: -(W / s - ph.w) / 2, y: -(H / s - ph.h) / 2 }; st.lastW = W; st.lastH = H;
  }
  function ensureView() { const h = host(); if (!h) return; const z = hsize(); if (!st.v || (!st.v.user && (Math.abs(z.w - st.lastW) > 2 || Math.abs(z.h - st.lastH) > 2))) fit(); }
  function applyView() { const g = document.getElementById('fvp'); if (g && st.v) g.setAttribute('transform', 'matrix(' + st.v.s + ' 0 0 ' + st.v.s + ' ' + (-st.v.x * st.v.s) + ' ' + (-st.v.y * st.v.s) + ')'); const z = document.getElementById('fzlbl'); if (z && st.v) z.textContent = Math.round(st.v.s * 100) + ' %'; drawFit(); }
  function toImg(ev) { const r = svg().getBoundingClientRect(); return [(ev.clientX - r.left) / st.v.s + st.v.x, (ev.clientY - r.top) / st.v.s + st.v.y]; }
  function zoomAt(f, px, py) { const v = st.v, mx = px / v.s + v.x, my = py / v.s + v.y, s = G.clamp(v.s * f, 0.05, 12); st.v = { s, x: mx - px / s, y: my - py / s, user: true }; applyView(); clearTimeout(st.repaint); st.repaint = setTimeout(paint, 120); }
  function zoomBy(f) { const h = host(); if (!h || !st.v) return; const z = hsize(); zoomAt(f, z.w / 2, z.h / 2); }

  /* ---------- painting ---------- */
  function txt(x, y, str, px, col, bg, sel) {
    const s = st.v.s, fz = px / s, w = (String(str).length * px * 0.6 + 12) / s, h = (px + 9) / s;
    return '<rect class="fpill' + (sel ? ' on' : '') + '" x="' + n1(x - w / 2) + '" y="' + n1(y - h / 2) + '" width="' + n1(w) + '" height="' + n1(h) + '" rx="' + n1(h / 2) + '" fill="' + bg + '"/>' +
      '<text x="' + n1(x) + '" y="' + n1(y) + '" font-size="' + n1(fz) + '" fill="' + col + '" text-anchor="middle" dominant-baseline="central">' + esc(str) + '</text>';
  }
  function markSvg(m, on) {
    const s = st.v.s, c = m.col, dark = c === '#FFFFFF' || c === '#FFD43B' ? '#111' : '#fff';
    let h = '<g class="fm' + (on ? ' on' : '') + '" data-r="m|' + m.id + '">';
    if (m.t === 'text') { h += txt(m.a[0], m.a[1], m.text || 'заметка', 14, dark, c, on) + '<circle class="fhit" cx="' + n1(m.a[0]) + '" cy="' + n1(m.a[1]) + '" r="' + n1(18 / s) + '"/>'; return h + '</g>'; }
    const a = m.a, b = m.b, dx = b[0] - a[0], dy = b[1] - a[1], Lp = Math.hypot(dx, dy) || 1, ux = dx / Lp, uy = dy / Lp, nx = -uy, ny = ux, t = 9 / s;
    h += '<line class="fhalo" x1="' + n1(a[0]) + '" y1="' + n1(a[1]) + '" x2="' + n1(b[0]) + '" y2="' + n1(b[1]) + '"/><line class="fl" stroke="' + c + '" x1="' + n1(a[0]) + '" y1="' + n1(a[1]) + '" x2="' + n1(b[0]) + '" y2="' + n1(b[1]) + '"/>';
    if (m.t === 'dim') {
      const k = 15 / s, w = 3.6 / s;   // thin sharp arrows pointing at the two ends
      for (const [q, dir] of [[a, -1], [b, 1]]) { const bx = q[0] - ux * dir * k, by = q[1] - uy * dir * k; h += '<polygon class="fah" fill="' + c + '" points="' + n1(q[0]) + ',' + n1(q[1]) + ' ' + n1(bx + nx * w) + ',' + n1(by + ny * w) + ' ' + n1(bx - nx * w) + ',' + n1(by - ny * w) + '"/>'; }
      const es = !(m.v > 0) ? estOf(m) : null, lab = (m.text ? m.text + ' · ' : '') + (m.v > 0 ? (m.est ? '≈' : '') + fl(m.v) + ' ' + uLab() : es ? '≈' + fl(es) + ' ' + uLab() : '? ' + uLab());
      h += txt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, lab, 14, m.v > 0 ? dark : '#fff', m.v > 0 ? c : '#C92A2A', on);
    } else {
      const k = 16 / s, w = 7 / s, p1 = [b[0] - ux * k + nx * w, b[1] - uy * k + ny * w], p2 = [b[0] - ux * k - nx * w, b[1] - uy * k - ny * w];
      h += '<polygon class="fah" fill="' + c + '" points="' + n1(b[0]) + ',' + n1(b[1]) + ' ' + n1(p1[0]) + ',' + n1(p1[1]) + ' ' + n1(p2[0]) + ',' + n1(p2[1]) + '"/>';
      if (m.text) h += txt(a[0] - ux * 18 / s, a[1] - uy * 18 / s, m.text, 13, dark, c, on);
    }
    h += '<line class="fhit" x1="' + n1(a[0]) + '" y1="' + n1(a[1]) + '" x2="' + n1(b[0]) + '" y2="' + n1(b[1]) + '"/>';
    return h + '</g>';
  }
  function gallery() {
    const list = L();
    return '<div class="fgal-in"><div class="fgal-h"><b>Фото зала</b><span>' + (list.length ? list.length + ' шт. · коснитесь, чтобы открыть и разметить' : 'Снимите стены, углы, места для декора — и подпишите размеры прямо на фото.') + '</span></div><div class="fgrid">' +
      list.map((ph) => { const n = ph.marks.filter((m) => m.t === 'dim').length, bad = ph.marks.filter((m) => m.t === 'dim' && !(m.v > 0)).length, pin = pinOf(ph.id), sr = src(ph);
        return '<button type="button" class="fcard" data-fact="open" data-v="' + ph.id + '">' + (sr ? '<img alt="" src="' + sr + '">' : '<span class="fnoimg">фото ещё загружается</span>') + '<b>' + esc(ph.name) + '</b><small>' + (n ? 'размеров ' + n : 'без размеров') + (bad ? ' · без числа ' + bad : '') + (pin ? ' · на плане' : '') + '</small></button>'; }).join('') +
      '<label class="fcard fadd"><span class="fplus">+</span><b>Добавить фото</b><small>из галереи, можно несколько</small><input type="file" accept="image/*" multiple data-fup="1" aria-label="Добавить фото"></label>' +
      '<label class="fcard fadd"><span class="fplus">📷</span><b>Снять камерой</b><small>откроет камеру планшета</small><input type="file" accept="image/*" capture="environment" data-fup="1" aria-label="Снять камерой"></label></div></div>';
  }
  function paint() {
    const h = host(); if (!h || UI.mode !== 'photo') return;
    validate();
    const gal = document.getElementById('fgal'), ed = document.getElementById('fed'), ph = cur();
    if (!ph) { drawFit(); if (gal) { gal.hidden = false; const g = gallery(); if (gal._h !== g) { gal.innerHTML = g; gal._h = g; } } if (ed) ed.hidden = true; banner(); return; }
    if (gal) gal.hidden = true; if (ed) ed.hidden = false;
    ensureView(); if (!st.v) return;
    const img = document.getElementById('fimg'), sr = src(ph);
    if (img && img._src !== sr + ph.w) { img.setAttribute('href', sr); img.setAttribute('width', ph.w); img.setAttribute('height', ph.h); img._src = sr + ph.w; }
    let mk = '', hnd = '';
    ph.marks.forEach((m) => { mk += markSvg(m, m.id === st.sel); });
    figures(ph).forEach((f) => { if (f.area > 0) mk += txt(f.c[0], f.c[1], 'S ' + (f.exact ? '' : '≈') + fArea(f.area).replace(/ \(.*\)$/, ''), 13, '#111', 'rgba(255,255,255,.92)', false); });
    const m = mark(st.sel), s = st.v.s;
    if (m) for (const k of m.t === 'text' ? [] : ['a', 'b']) { const q = m[k]; hnd += '<circle class="fhd" cx="' + n1(q[0]) + '" cy="' + n1(q[1]) + '" r="' + n1(7 / s) + '"/><circle class="fhh" data-r="h|' + m.id + '|' + k + '" cx="' + n1(q[0]) + '" cy="' + n1(q[1]) + '" r="' + n1(20 / s) + '"/>'; }
    if (st.pend) hnd += '<circle class="fpd" cx="' + n1(st.pend[0]) + '" cy="' + n1(st.pend[1]) + '" r="' + n1(6 / s) + '"/>';
    if (st.drag && st.drag.mode === 'new' && st.drag.b) { const d = st.drag; mk += markSvg({ id: '_', t: st.tool, a: d.a, b: d.b, v: null, col: st.col }, true); }
    if (ph.ref) { const q = ph.ref.q, pts = q.map((p) => n1(p[0]) + ',' + n1(p[1])).join(' '), top = [(q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2];
      mk = '<polygon class="frf" points="' + pts + '"' + (st.tool === 'ref' ? ' data-r="em"' : '') + '/>' + txt(top[0], top[1] + 18 / s, 'эталон ' + (ph.ref.w > 0 ? G.nf(ph.ref.w / 1000, 2) : '?') + ' × ' + (ph.ref.h > 0 ? G.nf(ph.ref.h / 1000, 2) : '?'), 12, '#062A33', '#7FDCF0', false) + mk;
      if (st.tool === 'ref') hnd += q.map((p, i) => '<circle class="fhd frh" cx="' + n1(p[0]) + '" cy="' + n1(p[1]) + '" r="' + n1(8 / s) + '"/><circle class="fhh" data-r="e|' + i + '" cx="' + n1(p[0]) + '" cy="' + n1(p[1]) + '" r="' + n1(22 / s) + '"/>').join(''); }
    if (st.tool === 'poly' && st.poly && st.poly.length) { const P2 = st.poly; hnd += '<polyline class="fpl" points="' + P2.map((q) => n1(q[0]) + ',' + n1(q[1])).join(' ') + '"/>' + P2.map((q, i) => '<circle class="fpp' + (i === 0 ? ' first' : '') + '" cx="' + n1(q[0]) + '" cy="' + n1(q[1]) + '" r="' + n1((i === 0 ? 9 : 6) / s) + '"/>').join(''); }
    if (fitOn(ph)) { refreshCut(); if (st.tool === 'fit') { const q = ph.fit.q, pts = q.map((p) => n1(p[0]) + ',' + n1(p[1])).join(' ');
      hnd += '<polygon class="ffq" data-r="qm" points="' + pts + '"/>' + q.map((p, i) => '<circle class="fhd fqd" cx="' + n1(p[0]) + '" cy="' + n1(p[1]) + '" r="' + n1(8 / s) + '"/><circle class="fhh" data-r="q|' + i + '" cx="' + n1(p[0]) + '" cy="' + n1(p[1]) + '" r="' + n1(22 / s) + '"/>').join(''); } }
    const set = (id, x) => { const n = document.getElementById(id); if (n && n._h !== x) { n.innerHTML = x; n._h = x; } };
    set('fmarks', mk); set('fhnd', hnd); applyView(); banner();
    const wsm = document.getElementById('wsm'); if (wsm) wsm.classList.toggle('fhand', st.tool === 'hand');
  }
  function banner() {
    const b = document.getElementById('fbanner'); if (!b) return;
    let t = '';
    if (cur() && (st.tool === 'dim' || st.tool === 'arrow')) t = '<span>' + (st.pend ? 'Вторая точка' : (st.tool === 'dim' ? 'Размер' : 'Стрелка') + ': от точки к точке') + '</span>' + U.help('Проведите пальцем от одной точки до другой — над пальцем будет лупа. Или коснитесь двух точек по очереди.') + '<button type="button" class="btn sm" data-fact="tool" data-v="">Отмена</button>';
    else if (cur() && st.tool === 'fit') t = '<span>Примерка: тяните углы</span>' + U.help('Нижние углы — на пол, где будет стоять фотозона, верхние — на её высоту. Внутри рамки — сдвиг целиком.') + '<button type="button" class="btn sm" data-fact="tool" data-v="">Готово</button>';
    else if (cur() && st.tool === 'ref') t = '<span>Эталон: поставьте 4 угла на предмет известного размера</span>' + U.help('Например, на дверь: левый верхний, правый верхний, правый нижний, левый нижний угол. Справа впишите его ширину и высоту — или выберите готовый размер.') + '<button type="button" class="btn sm" data-fact="tool" data-v="">Готово</button>';
    else if (cur() && st.tool === 'fit2') t = '<span>' + (st.f2 && st.f2.length ? 'Теперь правый край на полу' : 'Коснитесь пола там, где будет левый край фотозоны') + '</span><button type="button" class="btn sm" data-fact="tool" data-v="fit">Отмена</button>';
    else if (cur() && st.tool === 'poly') t = '<span>Контур: коснитесь углов по очереди' + (st.poly && st.poly.length ? ' · углов ' + st.poly.length : '') + '</span>' + U.help('Каждая сторона станет размером. Замкните — коснитесь первого угла или «Замкнуть»; затем впишите длины сторон по очереди, и справа появятся периметр и площадь.') + (st.poly && st.poly.length ? '<button type="button" class="btn sm" data-fact="poly-back">Убрать угол</button>' : '') + (st.poly && st.poly.length >= 3 ? '<button type="button" class="btn sm pri" data-fact="poly-close">Замкнуть</button>' : '') + '<button type="button" class="btn sm" data-fact="tool" data-v="">Отмена</button>';
    else if (cur() && st.tool === 'text') t = '<span>Коснитесь места для заметки</span><button type="button" class="btn sm" data-fact="tool" data-v="">Отмена</button>';
    b.hidden = !t; if (b._h !== t) { b.innerHTML = t; b._h = t; }
  }
  /* the magnifier: a circle above the finger showing the photo under it, enlarged */
  function loupe(ev, q) {
    const l = document.getElementById('floupe'), ph = cur(); if (!l || !ph) return;
    if (!ev) { l.hidden = true; return; }
    const r = host().getBoundingClientRect(), Z = Math.max(2.5, st.v.s * 2.5), R = 64;
    if (l._src !== ph.im) { l.style.backgroundImage = 'url("' + src(ph) + '")'; l._src = ph.im; }
    l.style.backgroundSize = n1(ph.w * Z) + 'px ' + n1(ph.h * Z) + 'px';
    l.style.backgroundPosition = n1(R - q[0] * Z) + 'px ' + n1(R - q[1] * Z) + 'px';
    let x = ev.clientX - r.left - R, y = ev.clientY - r.top - R * 2 - 34; if (y < 4) y = ev.clientY - r.top + 40;
    l.style.left = n1(x) + 'px'; l.style.top = n1(y) + 'px'; l.hidden = false;
  }

  /* ---------- pointer ---------- */
  function within(ev) { return UI.mode === 'photo' && UI.tab === 'con' && cur() && ev.target && ev.target.closest && !!ev.target.closest('#fsvg'); }
  const clampPt = (q) => { const ph = cur(); return [G.clamp(Math.round(q[0]), 0, ph.w), G.clamp(Math.round(q[1]), 0, ph.h)]; };
  function down(ev) {
    if (!within(ev)) return false;
    ev.preventDefault();
    st.tps[ev.pointerId] = [ev.clientX, ev.clientY];
    const ids = Object.keys(st.tps);
    if (ids.length === 2) { const a = st.tps[ids[0]], b = st.tps[ids[1]], r = svg().getBoundingClientRect(); st.drag = null; loupe(null); st.pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), cx: (a[0] + b[0]) / 2 - r.left, cy: (a[1] + b[1]) / 2 - r.top, v: Object.assign({}, st.v) }; return true; }
    try { svg().setPointerCapture(ev.pointerId); } catch (e) {}
    const p = toImg(ev), n = ev.target.closest('[data-r]'), ref = n ? n.dataset.r.split('|') : null, hand = st.tool === 'hand' || UI.spaceHand || ev.button === 1;
    const d = st.drag = { pid: ev.pointerId, x0: ev.clientX, y0: ev.clientY, p0: p, moved: false, mode: 'pan', v0: Object.assign({}, st.v), ref };
    if (hand) return true;
    if (st.tool === 'poly') { d.mode = 'poly'; return true; }
    if (st.tool === 'dim' || st.tool === 'arrow') { d.mode = 'new'; d.a = st.pend || (st.tool === 'dim' ? snapEnd(clampPt(p), null) : clampPt(p)); d.b = null; if (!st.pend) loupe(ev, d.a); return true; }
    if (st.tool === 'text') { d.mode = 'newtext'; return true; }
    if (st.tool === 'ref' && ref && (ref[0] === 'e' || ref[0] === 'em') && cur().ref) { d.mode = ref[0] === 'e' ? 'ec' : 'em'; d.k = +ref[1]; d.rsnap = JSON.stringify(cur().ref); if (d.mode === 'ec') loupe(ev, cur().ref.q[d.k]); return true; }
    if (st.tool === 'fit2') { d.mode = 'fit2'; return true; }
    if (st.tool === 'fit' && ref && (ref[0] === 'q' || ref[0] === 'qm') && cur().fit) { d.mode = ref[0] === 'q' ? 'qc' : 'qm'; d.k = +ref[1]; d.fsnap = JSON.stringify(cur().fit); if (d.mode === 'qc') loupe(ev, cur().fit.q[d.k]); return true; }
    if (ref && ref[0] === 'h') { d.mode = 'end'; d.k = ref[2]; d.snap = JSON.stringify(mark(ref[1])); loupe(ev, mark(ref[1])[d.k]); return true; }
    if (ref && ref[0] === 'm') { d.mode = 'move'; d.snap = JSON.stringify(mark(ref[1])); return true; }
    return true;
  }
  function move(ev) {
    if (UI.mode !== 'photo') return false;
    if (st.tps[ev.pointerId]) st.tps[ev.pointerId] = [ev.clientX, ev.clientY];
    if (st.pinch) { const ids = Object.keys(st.tps); if (ids.length < 2) return true; const a = st.tps[ids[0]], b = st.tps[ids[1]], r = svg().getBoundingClientRect(), dd = Math.hypot(a[0] - b[0], a[1] - b[1]), cx = (a[0] + b[0]) / 2 - r.left, cy = (a[1] + b[1]) / 2 - r.top, v = st.pinch.v, mx = st.pinch.cx / v.s + v.x, my = st.pinch.cy / v.s + v.y, s = G.clamp(v.s * dd / st.pinch.d, 0.05, 12); st.v = { s, x: mx - cx / s, y: my - cy / s, user: true }; applyView(); return true; }
    const d = st.drag; if (!d || ev.pointerId !== d.pid) return !!d;
    const dx = ev.clientX - d.x0, dy = ev.clientY - d.y0;
    if (!d.moved && Math.hypot(dx, dy) < 5) return true;
    d.moved = true;
    const p = toImg(ev);
    if (d.mode === 'pan') { st.v = { s: d.v0.s, x: d.v0.x - dx / d.v0.s, y: d.v0.y - dy / d.v0.s, user: true }; applyView(); return true; }
    if (d.mode === 'new') { d.b = st.tool === 'dim' && !ev.shiftKey ? snapEnd(clampPt(p), null) : clampPt(p); loupe(ev, d.b); paint(); return true; }
    if (d.mode === 'end') { const m = mark(d.ref[1]); Object.assign(m, JSON.parse(d.snap)); m[d.k] = m.t === 'dim' && !ev.shiftKey ? snapEnd(clampPt(p), m.id) : clampPt(p); loupe(ev, m[d.k]); paint(); return true; }
    if (d.mode === 'ec' || d.mode === 'em') {
      const ph = cur(), o = JSON.parse(d.rsnap), lim = (v, a) => G.clamp(Math.round(v * 10) / 10, 0, a);
      const q = d.mode === 'ec' ? o.q.map((x, i) => i === d.k ? [lim(p[0], ph.w), lim(p[1], ph.h)] : x) : o.q.map((x) => [lim(x[0] + p[0] - d.p0[0], ph.w), lim(x[1] + p[1] - d.p0[1], ph.h)]);
      if (G.quadOk(q, 8 / st.v.s)) ph.ref.q = q; if (d.mode === 'ec') loupe(ev, ph.ref.q[d.k]); paint(); return true;
    }
    if (d.mode === 'qc' || d.mode === 'qm') {
      const ph = cur(), o = JSON.parse(d.fsnap), lim = (v, a) => G.clamp(Math.round(v * 10) / 10, -a * 0.5, a * 1.5);
      const q = d.mode === 'qc' ? o.q.map((x, i) => i === d.k ? [lim(p[0], ph.w), lim(p[1], ph.h)] : x) : o.q.map((x) => [lim(x[0] + p[0] - d.p0[0], ph.w), lim(x[1] + p[1] - d.p0[1], ph.h)]);
      if (G.quadOk(q, 10 / st.v.s)) ph.fit.q = q; if (d.mode === 'qc') loupe(ev, ph.fit.q[d.k]); paint(); return true;
    }
    if (d.mode === 'move') { const m = mark(d.ref[1]); Object.assign(m, JSON.parse(d.snap)); const o = [p[0] - d.p0[0], p[1] - d.p0[1]]; m.a = clampPt([m.a[0] + o[0], m.a[1] + o[1]]); if (m.b) m.b = clampPt([m.b[0] + o[0], m.b[1] + o[1]]); paint(); return true; }
    return true;
  }
  function up(ev, cancel) {
    if (UI.mode !== 'photo') return false;
    const had = !!st.tps[ev.pointerId]; delete st.tps[ev.pointerId];
    if (st.pinch) { if (Object.keys(st.tps).length < 2) { st.pinch = null; paint(); } return true; }
    const d = st.drag; if (!d || ev.pointerId !== d.pid) return had;
    st.drag = null; loupe(null);
    if (cancel && d.fsnap) { cur().fit = JSON.parse(d.fsnap); paint(); return true; }
    if (cancel && d.rsnap) { cur().ref = JSON.parse(d.rsnap); paint(); return true; }
    if (d.mode === 'ec' || d.mode === 'em') { if (d.moved) label(d.mode === 'ec' ? 'эталон: угол' : 'эталон: сдвиг'); else paint(); return true; }
    if (d.mode === 'fit2') {   // two points on the floor: the scene stands on them, its height from its own proportions
      if (d.moved) { paint(); return true; }
      const ph = cur(), q0 = clampPt(toImg(ev)); st.f2 = (st.f2 || []).concat([q0]);
      if (st.f2.length < 2) { paint(); banner(); return true; }
      let [a, b] = st.f2; if (a[0] > b[0]) [a, b] = [b, a]; st.f2 = null;
      const r = cut && cut.wmm > 0 ? cut.hmm / cut.wmm : 0.75, Lp = Math.hypot(b[0] - a[0], b[1] - a[1]), hgt = Lp * r, R0 = (v) => Math.round(v * 10) / 10;
      const q = [[R0(a[0]), R0(a[1] - hgt)], [R0(b[0]), R0(b[1] - hgt)], [R0(b[0]), R0(b[1])], [R0(a[0]), R0(a[1])]];
      if (G.quadOk(q)) { ph.fit = ph.fit || { op: 1, on: true }; ph.fit.q = q; ph.fit.on = true; ph.fit.op = ph.fit.op || 1; st.tool = 'fit'; label('примерка по линии пола'); } else { st.tool = 'fit'; toast('Точки слишком близко — коснитесь левого и правого края на полу.'); render(); }
      return true;
    }
    if (d.mode === 'qc' || d.mode === 'qm') { if (d.moved) label(d.mode === 'qc' ? 'примерка: угол' : 'примерка: сдвиг'); else paint(); return true; }
    if (cancel) { if (d.snap) { const o = JSON.parse(d.snap), m = mark(o.id); if (m) Object.assign(m, o); } paint(); return true; }
    const p = clampPt(toImg(ev)), ph = cur();
    if (d.mode === 'new') {
      const b = d.moved ? d.b : (st.pend ? (st.tool === 'dim' ? snapEnd(p, null) : p) : null);
      if (!b) { st.pend = d.a; paint(); return true; }   // first of two taps
      st.pend = null;
      if (Math.hypot(b[0] - d.a[0], b[1] - d.a[1]) * st.v.s < 12) { paint(); return true; }
      const m = { id: G.uid(), t: st.tool, a: d.a, b, col: st.col }; if (m.t === 'dim') m.v = null; else m.text = '';
      ph.marks.push(m); st.sel = m.id; const tl = st.tool; st.tool = ''; label(tl === 'dim' ? 'размер' : 'стрелка'); return true;
    }
    if (d.mode === 'poly') {
      if (d.moved) { paint(); return true; }
      const q = snapEnd(p, null), pts = st.poly = st.poly || [];
      if (pts.length >= 3 && Math.hypot(q[0] - pts[0][0], q[1] - pts[0][1]) * st.v.s < 18) { closePoly(); return true; }   // back on the first corner: closed
      pts.push(q); paint(); banner(); return true;
    }
    if (d.mode === 'newtext') { if (d.moved) { paint(); return true; } const m = { id: G.uid(), t: 'text', a: p, col: st.col, text: '' }; ph.marks.push(m); st.sel = m.id; st.tool = ''; label('заметка'); focusVal(); return true; }
    if (d.mode === 'end' || d.mode === 'move') { if (d.moved) label(d.mode === 'end' ? 'точка размера' : 'перемещение'); else { st.sel = d.ref[1]; render(); } return true; }
    if (d.mode === 'pan') { if (!d.moved) { if (d.ref && d.ref[0] === 'm') st.sel = d.ref[1]; else st.sel = null; render(); } else paint(); return true; }
    return true;
  }
  function focusVal() { setTimeout(() => { const n = document.getElementById('pf-val'); if (n) { n.focus(); try { n.select(); } catch (e) {} } }, 40); }
  function wheel(ev) {
    if (!within(ev)) return; ev.preventDefault();
    const r = svg().getBoundingClientRect();
    if (ev.ctrlKey || ev.metaKey || Math.abs(ev.deltaY) >= 40 || ev.deltaMode) zoomAt(Math.exp(-ev.deltaY * (ev.ctrlKey ? 0.01 : 0.0022)), ev.clientX - r.left, ev.clientY - r.top);
    else { st.v = { s: st.v.s, x: st.v.x + ev.deltaX / st.v.s, y: st.v.y + ev.deltaY / st.v.s, user: true }; applyView(); }
  }

  /* ---------- actions ---------- */
  function openPhoto(id) { st.lay = null; st.open = id; st.sel = null; st.pend = null; st.v = null; st.tool = ''; }
  function upload(input) {
    const files = Array.prototype.slice.call(input.files || []); input.value = ''; if (!files.length) return;
    toast('Загружаю фото…');
    let done = 0, last = null; const n0 = L().length;
    const next = () => {
      const f = files.shift(); if (!f) { if (last) { openPhoto(last); label(done === 1 ? 'добавлено фото' : 'добавлено фото: ' + done); if (IO._imgFull) toast('Память браузера заполнена: фото может не сохраниться на этом устройстве. Сохраните проект в облако или файлом.'); } else render(); return; }
      if (!/^image\//.test(f.type)) { next(); return; }
      const fr = new FileReader();
      fr.onload = () => { const im = new Image(); im.onload = () => { const r = encodeImage(im, 'image/jpeg'); if (r) { const id = newImgId(); IMG[id] = r; IO.saveImg(id); const ph = { id: G.uid(), im: id, w: r.w, h: r.h, name: (f.name || '').replace(/\.[a-z0-9]+$/i, '').slice(0, 60) || 'Фото ' + (n0 + done + 1), marks: [] }; if (/^(img|image|photo|dsc|pxl|screenshot)[_\- ]?\d/i.test(ph.name) || /^[\d_\- .]{6,}$/.test(ph.name) || (ph.name.replace(/\D/g, '').length >= 8)) ph.name = 'Фото ' + (n0 + done + 1); L().push(ph); last = ph.id; done++; } next(); }; im.onerror = next; im.src = fr.result; };
      fr.onerror = next; fr.readAsDataURL(f);
    };
    next();
  }
  function exportPng(ph) {
    const ph0 = ph && ph.id ? ph : cur(); if (!ph0 || !IMG[ph0.im]) { if (ph0) toast('Снимок не загружен на этом устройстве.'); return; }
    if (fitOn(ph0)) { refreshCut(true).then(() => exportPng2(ph0)); return; }
    exportPng2(ph0);
  }
  function exportPng2(ph) {
    photoCanvas(ph, 2).then((cv) => IO.canvasBlob(cv)).then((bl) => IO.save((ph.name || 'Фото').replace(/[\\/:*?"<>|]+/g, '_') + (fitOn(ph) && cut ? ' — с фотозоной.png' : ' — размеры.png'), bl, 'img')).catch(() => toast('Не получилось собрать картинку.'));
  }
  /* the photo with its marks (and the tried-on scene) drawn at K × the stored size */
  function photoCanvas(ph, K) { return new Promise((res, rej) => {
    if (!IMG[ph.im]) { rej(new Error('img')); return; }
    const cv = document.createElement('canvas'); cv.width = ph.w * K; cv.height = ph.h * K; const c = cv.getContext('2d'), im = new Image();
    im.onload = () => {
      c.drawImage(im, 0, 0, cv.width, cv.height);
      if (fitOn(ph) && cut) { const t = document.createElement('canvas'); t.width = cv.width; t.height = cv.height; warp(t.getContext('2d'), cut.cv, ph.fit.q, K, 24); c.globalAlpha = ph.fit.op; c.drawImage(t, 0, 0); c.globalAlpha = 1; }
      c.lineCap = 'round'; c.lineJoin = 'round';
      const pill = (x, y, str, px, fg, bg) => { c.font = '700 ' + px + 'px system-ui, sans-serif'; const w = c.measureText(str).width + px * 0.9, h = px * 1.55; x = Math.max(w / 2 + 2, Math.min(cv.width - w / 2 - 2, x)); y = Math.max(h / 2 + 2, Math.min(cv.height - h / 2 - 2, y));   /* a label near the edge stays whole */ c.fillStyle = bg; c.beginPath(); if (c.roundRect) c.roundRect(x - w / 2, y - h / 2, w, h, h / 2); else c.rect(x - w / 2, y - h / 2, w, h); c.fill(); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(str, x, y + px * 0.04); };
      const line = (a, b, col, wd) => { c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = wd + 3 * K; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.strokeStyle = col; c.lineWidth = wd; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); };
      const px = Math.max(14, Math.round(Math.max(ph.w, ph.h) / 55)) * K;
      ph.marks.forEach((m) => {
        const a = [m.a[0] * K, m.a[1] * K], dark = m.col === '#FFFFFF' || m.col === '#FFD43B' ? '#111' : '#fff';
        if (m.t === 'text') { pill(a[0], a[1], m.text || 'заметка', px, dark, m.col); return; }
        const b = [m.b[0] * K, m.b[1] * K], dx = b[0] - a[0], dy = b[1] - a[1], Lp = Math.hypot(dx, dy) || 1, ux = dx / Lp, uy = dy / Lp, nx = -uy, ny = ux, t = px * 0.6, wd = Math.max(2, px / 7);
        line(a, b, m.col, wd);
        const head = (q, dir, k, w) => { const bx = q[0] - ux * dir * k, by = q[1] - uy * dir * k; c.fillStyle = m.col; c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = K; c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(bx + nx * w, by + ny * w); c.lineTo(bx - nx * w, by - ny * w); c.closePath(); c.stroke(); c.fill(); };
        if (m.t === 'dim') { void t; head(a, -1, px * 1.05, px * 0.26); head(b, 1, px * 1.05, px * 0.26); pill((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (m.text ? m.text + ' · ' : '') + (m.v > 0 ? (m.est ? '≈' : '') + fl(m.v) + ' ' + uLab() : estOf(m, ph) ? '≈' + fl(estOf(m, ph)) + ' ' + uLab() : '? ' + uLab()), px, m.v > 0 ? dark : '#fff', m.v > 0 ? m.col : '#C92A2A'); }
        else { const k = px * 1.1, w = px * 0.5; c.fillStyle = m.col; c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(b[0] - ux * k + nx * w, b[1] - uy * k + ny * w); c.lineTo(b[0] - ux * k - nx * w, b[1] - uy * k - ny * w); c.closePath(); c.fill(); if (m.text) pill(a[0] - ux * px * 1.3, a[1] - uy * px * 1.3, m.text, px, dark, m.col); }
      });
      figures(ph).forEach((f) => { if (f.area > 0) pill(f.c[0] * K, f.c[1] * K, 'S ' + (f.exact ? '' : '≈') + fArea(f.area).replace(/ \(.*\)$/, '') + ' · P ' + fl(f.P) + ' ' + uLab(), px * 0.9, '#111', 'rgba(255,255,255,.93)'); });
      res(cv);
    };
    im.onerror = rej; im.src = IMG[ph.im].src;
  }); }
  function act(name, a) {
    const v = a && a.dataset ? a.dataset.v : undefined, ph = cur(), m = mark(st.sel);
    switch (name) {
      case 'open': openPhoto(v); render(); requestAnimationFrame(() => { fit(); paint(); }); return;
      case 'gallery': st.open = null; st.sel = null; st.pend = null; st.tool = ''; render(); return;
      case 'tool': st.tool = v || ''; st.pend = null; st.poly = null; st.f2 = null; if (st.tool === 'ref' && ph) { st.sel = null; refStart(ph); return; } if (!cur() && st.tool && st.tool !== 'hand') { toast('Сначала откройте фото.'); st.tool = ''; } if (st.tool === 'fit' && ph) { st.sel = null; fitStart(ph); return; } render(); return;
      case 'fit-op': if (ph && ph.fit) { ph.fit.op = G.clamp(+v || 1, 0.2, 1); label('примерка: видно ' + Math.round(ph.fit.op * 100) + ' %'); } return;
      case 'fit-on': if (ph && ph.fit) { ph.fit.on = !ph.fit.on; if (!ph.fit.on && st.tool === 'fit') st.tool = ''; label(ph.fit.on ? 'примерка показана' : 'примерка скрыта'); } return;
      case 'fit-rect': if (ph && ph.fit) { const q = fitRect(ph); if (G.quadOk(q)) { ph.fit.q = q; label('примерка выпрямлена'); } } return;
      case 'fit-reset': if (ph && ph.fit && cut) { ph.fit.q = G.fitQuad(ph, cut.wmm, cut.hmm).q; label('примерка заново'); } return;
      case 'fit-del': if (ph && ph.fit) { delete ph.fit; if (st.tool === 'fit') st.tool = ''; label('примерка убрана'); } return;
      case 'colfly': UI.fly = !UI.fly; render(); return;
      case 'col': st.col = v; UI.fly = false; if (m) { m.col = v; label('цвет: ' + (COLNAME[v] || v)); } else render(); return;
      case 'clear': st.sel = null; render(); return;
      case 'sel': st.sel = v; st.kpOpen = null; render(); return;
      case 'est-take': if (m) { const e = estOf(m, ph); if (e) { m.v = Math.round(e); m.est = true; label('размер по эталону ≈' + fl(m.v)); } } return;
      case 'ref-edit': st.refEdit = v === 'h' ? 'h' : 'w'; render(); return;
      case 'refnext': if (ph && ph.ref) { if (st.refEdit !== 'h' && !(ph.ref.h > 0)) { st.refEdit = 'h'; render(); setTimeout(() => { const n = document.getElementById('pf-ref'); if (n) n.focus(); }, 40); } else render(); } return;
      case 'ref-pre': if (ph && ph.ref) { const [w, h] = String(v).split('|').map(Number); ph.ref.w = w; ph.ref.h = h; label('эталон ' + fl(w) + ' × ' + fl(h)); } return;
      case 'ref-del': if (ph && ph.ref) { delete ph.ref; if (st.tool === 'ref') st.tool = ''; label('эталон убран'); } return;
      case 'fit-floor': if (ph) { refreshCut(true).then((r) => { if (!r) { toast('Сцена пуста — соберите фотозону в режиме «Сцена».'); return; } st.tool = 'fit2'; st.f2 = null; render(); }); } return;
      case 'poly-close': closePoly(); return;
      case 'poly-back': if (st.poly) { st.poly.pop(); paint(); banner(); } return;
      case 'mnext': { const nx = m && nextSide(m); st.sel = nx ? nx.id : null; st.kpOpen = null; render(); if (nx) focusVal(); return; }
      case 'send': { const w = m && wallPick(m, ph); if (!w || !(m.v > 0)) return; if (G.sendToWall(S.plan, m, w.rid, w.wid)) { label('замер ' + fl(m.v) + ' → стена ' + G.wallName(w.r, w.i)); toast('Стена ' + G.wallName(w.r, w.i) + ' в плане = ' + fl(m.v) + ' ' + uLab() + '.'); } return; }
      case 'showwall': if (m && m.wid) { PL.setMode('plan'); PL.st.layer = 'floor'; PL.st.sel = { t: 'wall', r: m.rid, w: m.wid }; render(); } return;
      case 'openmark': { const q = String(v).split('|'); openPhoto(q[0]); st.sel = q[1]; render(); requestAnimationFrame(() => { fit(); paint(); }); return; }
      case 'm-dup': if (ph && m) { const c = JSON.parse(JSON.stringify(m)), d = Math.round(Math.max(ph.w, ph.h) * 0.03); c.id = G.uid(); delete c.poly; delete c.rid; delete c.wid;
          const mv = (q) => [clampX(ph, q[0] + d), clampY(ph, q[1] + d)]; c.a = mv(c.a); if (c.b) c.b = mv(c.b); ph.marks.push(c); st.sel = c.id; label('копия: ' + markName(m).toLowerCase()); } return;
      case 'clip-copy': if (ph && m) { const o = { mark: JSON.parse(JSON.stringify(m)), w: ph.w, h: ph.h, ph: ph.id }; UI.fclip = o; try { localStorage.setItem('fotozona.fclip.v1', JSON.stringify(o)); } catch (e) {} toast('Скопировано: ' + markName(m).toLowerCase() + '. «Вставить» — на это или другое фото.'); render(); } return;
      case 'clip-paste': { const o = fclip(); if (!o) { toast('Буфер пуст — сначала «Копировать».'); return; } if (!ph) { toast('Откройте фото, куда вставить.'); return; }
        const k = ph.w / (o.w || ph.w), d = o.ph === ph.id ? Math.round(Math.max(ph.w, ph.h) * 0.03) : 0, c = JSON.parse(JSON.stringify(o.mark)); c.id = G.uid(); delete c.poly; delete c.rid; delete c.wid;
        const mv = (q) => [clampX(ph, q[0] * k + d), clampY(ph, q[1] * k + d)]; c.a = mv(c.a); if (c.b) c.b = mv(c.b); ph.marks.push(c); st.sel = c.id; label('вставка: ' + markName(c).toLowerCase()); return; }
      case 'm-del': if (ph && m) { ph.marks = ph.marks.filter((x) => x.id !== m.id); st.sel = null; label('удалено: ' + markName(m).toLowerCase()); } return;
      case 'p-del': if (ph) { const i = L().indexOf(ph); L().splice(i, 1); if (S.plan) S.plan.items = S.plan.items.filter((it) => !(it.kind === 'photo' && it.photo === ph.id)); st.open = null; st.sel = null; label('фото удалено'); } return;
      case 'png': exportPng(); return;
      case 'pin': if (ph) { const ex = pinOf(ph.id); PL.setMode('plan'); if (ex) { PL.st.sel = { t: 'item', i: ex.id }; render(); toast('Фото уже отмечено на плане — тяните отметку, кружок поворачивает направление съёмки.'); } else { PL.st.layer = 'floor'; PL.st.tool = 'pin:' + ph.id; render(); } } return;
      case 'unpin': if (ph && S.plan) { S.plan.items = S.plan.items.filter((it) => !(it.kind === 'photo' && it.photo === ph.id)); label('отметка на плане убрана'); } return;
      case 'zin': zoomBy(1.4); return;
      case 'zout': zoomBy(1 / 1.4); return;
      case 'zfit': st.v = null; fit(); paint(); return;
      case 'unit': if (!S.plan) S.plan = G.newPlan(); S.plan.unit = v; label('единицы: ' + G.UNIT[v].ru); return;
    }
  }
  function bind(path, raw) {
    const ph = cur(), m = mark(st.sel);
    switch (path) {
      case 'p.name': if (ph) { ph.name = String(raw).trim().slice(0, 80) || 'Фото'; label('название'); } return;
      case 'm.v': if (m) { if (String(raw).trim() === '') { m.v = null; label('размер без числа'); return; } const v = G.parseLen(raw, unit()); if (v === null || v <= 0) { toast('Не число: «' + raw + '». Размер в ' + uLab() + ', можно сумму: 2,35+1,12.'); render(); return; } m.v = v; delete m.est; label('размер ' + fl(v)); } return;
      case 'r.w': case 'r.h': if (ph && ph.ref) { const v = G.parseLen(raw, unit()); if (v === null || v <= 0) { toast('Не число: «' + raw + '».'); render(); return; } ph.ref[path.slice(2)] = v; label('эталон: ' + (path === 'r.w' ? 'ширина ' : 'высота ') + fl(v)); } return;
      case 'm.wpick': if (m) { st.pick[m.id] = String(raw); render(); } return;
      case 'm.text': if (m) { m.text = String(raw).trim().slice(0, m.t === 'dim' ? 60 : 200); if (m.t === 'dim' && !m.text) delete m.text; label(m.t === 'text' ? 'заметка' : m.t === 'dim' ? 'название размера' : 'подпись стрелки'); } return;
    }
  }
  function key(ev, typing) {
    const k = ev.key;
    if (typing) { if (k === 'Enter' && ev.target && ev.target.id === 'pf-val') { ev.preventDefault(); ev.target.blur(); return true; } return false; }
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
    if (k === 'Escape') { if (st.pend) { st.pend = null; paint(); return true; } if (st.tool) { st.tool = ''; render(); return true; } if (st.sel) { st.sel = null; render(); return true; } if (st.open) { act('gallery'); return true; } return false; }
    if ((k === 'Delete' || k === 'Backspace') && st.sel) { ev.preventDefault(); act('m-del'); return true; }
    if (k === '+' || k === '=') { zoomBy(1.4); return true; } if (k === '-' || k === '_') { zoomBy(1 / 1.4); return true; } if (k === '0') { act('zfit'); return true; }
    const kk = k.toLowerCase();
    if (kk === 'd' || kk === 'в') { act('tool', { dataset: { v: 'dim' } }); return true; }
    if (kk === 't' || kk === 'е') { act('tool', { dataset: { v: 'text' } }); return true; }
    if (kk === 'a' || kk === 'ф') { act('tool', { dataset: { v: 'arrow' } }); return true; }
    if (kk === 'h' || kk === 'р') { act('tool', { dataset: { v: st.tool === 'hand' ? '' : 'hand' } }); return true; }
    if (kk === 'v' || kk === 'м') { act('tool', { dataset: { v: '' } }); return true; }
    return false;
  }

  /* ---------- panels ---------- */
  const tb = (attrs, ico, title, on) => '<button type="button" class="tb" ' + attrs + ' aria-pressed="' + !!on + '" title="' + title + '" aria-label="' + title + '">' + ico + '</button>';
  function vTools() {
    const has = !!cur();
    return tb('data-fact="gallery"', ICO.fgal, 'Все фото', !has) + '<hr>' + tb('data-fact="tool" data-v=""', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 8-6 1.6L10 19z"/></svg>', 'Выбор (V)', has && !st.tool) + tb('data-fact="tool" data-v="hand"', U.ico.hand, 'Рука (H)', st.tool === 'hand') + '<hr>' +
      tb('data-fact="tool" data-v="dim"', ICO.fdim, 'Размер: от точки к точке (D)', st.tool === 'dim') + tb('data-fact="tool" data-v="text"', ICO.ftext, 'Заметка (T)', st.tool === 'text') + tb('data-fact="tool" data-v="arrow"', ICO.farrow, 'Стрелка (A)', st.tool === 'arrow') + tb('data-fact="tool" data-v="poly"', ICO.fpoly, 'Контур: углы по очереди — стороны станут размерами, посчитаются P и S', st.tool === 'poly') + '<hr>' + tb('data-fact="tool" data-v="fit"', ICO.ffit, 'Примерить сцену на фото', st.tool === 'fit') + '<hr>' +
      '<button type="button" class="tb hasfly" data-fact="colfly" data-tool="fcol" aria-pressed="' + !!UI.fly + '" title="Цвет разметки: ' + COLNAME[st.col] + '" aria-label="Цвет разметки"><i class="fswb" style="--c:' + st.col + '"></i><i class="tri" aria-hidden="true"></i></button>';
  }
  const fld = (bind, lab, val, o) => { o = o || {}; return '<label class="fld' + (o.cls ? ' ' + o.cls : '') + '"><span class="fl">' + lab + '</span><input type="text"' + (o.num ? ' inputmode="decimal"' : '') + ' autocomplete="off" data-fbind="' + bind + '"' + (o.id ? ' id="' + o.id + '"' : '') + ' value="' + esc(val == null ? '' : val) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '></label>'; };
  const btn = (act, t, o) => { o = o || {}; return '<button type="button" class="btn sm' + (o.cls ? ' ' + o.cls : '') + '" data-fact="' + act + '"' + (o.v != null ? ' data-v="' + o.v + '"' : '') + '>' + t + '</button>'; };
  const grp = (t, h) => V.group(t, h);
  const cols = (curc) => '<span class="seg fsws" role="group" aria-label="Цвет">' + G.MARK_COLS.map((c) => '<button type="button" data-fact="col" data-v="' + c + '" aria-pressed="' + (curc === c) + '" title="' + COLNAME[c] + '" aria-label="Цвет: ' + COLNAME[c] + '"><i class="fsw" style="--c:' + c + '"></i></button>').join('') + '</span>';
  function vFly() { return '<div class="fh"><b>Цвет разметки</b><small>для новых отметок и выбранной</small><button type="button" class="fx" data-fact="colfly" aria-label="Закрыть">' + U.ico.x + '</button></div><div class="flist">' + G.MARK_COLS.map((c) => '<button type="button" class="frow pfrow fcrow' + (st.col === c ? ' on' : '') + '" data-fact="col" data-v="' + c + '"><i class="fsw" style="--c:' + c + '"></i><span class="pfn">' + COLNAME[c] + '</span></button>').join('') + '</div>'; }
  function placeFly() { const f = document.getElementById('fly'); if (!f || !UI.fly) return; const t = document.querySelector('.tools [data-fact=colfly]'), c = document.getElementById('canvas'); if (!t || !c) return; f.style.setProperty('--ft', Math.max(4, Math.min(t.getBoundingClientRect().top - c.getBoundingClientRect().top - 4, c.clientHeight - f.offsetHeight - 8)) + 'px'); }
  function vInsp() {
    U.inDock = true;
    try {
      const ph = cur();
      if (!ph) {
        const list = L(), bad = G.photoChecks(list).filter((q) => q.t === 'nonum').length;
        return '<div class="phead"><h3>Фото</h3></div>' + grp('Фото проекта', (list.length ? '<div class="plist full">' + list.map((p) => '<button type="button" class="prow" data-fact="open" data-v="' + p.id + '"><span>' + esc(p.name) + '</span><span class="muted small">' + p.marks.length + ' отм.' + (pinOf(p.id) ? ' · на плане' : '') + '</span></button>').join('') + '</div>' : '<p class="muted small full">Фото пока нет. Добавьте их карточкой «Добавить фото» или снимите камерой.</p>') +
          (bad ? '<div class="pchip warn full"><i class="cdot warn"></i><span>без числа: ' + bad + '</span></div>' : '') +
          '<div class="pacts full"><button type="button" class="btn sm" data-act="report-pdf">Отчёт обмера PDF</button></div><p class="muted small full">Отчёт: план с длинами стен, все фото с размерами, площади — одним PDF. Фото хранятся в проекте: сохраняются, переносятся файлом и синхронизируются вместе с ним. Перед сохранением фото уменьшается до 1280 точек по длинной стороне — для разметки этого хватает.</p>');
      }
      const m = mark(st.sel);
      if (m) {
        const nm = m.t === 'dim' ? 'Размер' : m.t === 'text' ? 'Заметка' : 'Стрелка';
        return '<div class="phead"><h3>' + nm + '</h3></div>' +
          grp(nm, (m.t === 'dim' ? KP.html({ id: 'pf-val', bind: 'data-fbind="m.v"', act: 'data-fact', label: 'Размер', val: m.v > 0 ? fl(m.v) : '', ph: '?', unit: unit(), unitLab: uLab(), after: m.poly && nextSide(m) ? 'mnext' : 'mdone', cls: m.v > 0 ? '' : 'bad', folded: m.v > 0 && st.kpOpen !== m.id, mid: m.id, help: 'Впишите размер, который вы намерили рулеткой. Пока числа нет, на фото стоит «?», и размер попадает в проверки. Можно суммой двух замеров: 2+0,8. ✓ — сохранить.' }) : fld('m.text', m.t === 'text' ? 'Текст заметки' : 'Подпись у стрелки', m.text, { id: 'pf-val', cls: 'full', ph: m.t === 'text' ? 'например: розетка, крюк, 2 шт.' : 'необязательно' })) +
            (m.t === 'dim' && !(m.v > 0) && estOf(m, ph) ? '<div class="pchip ok full"><i class="cdot ok"></i><span>По эталону ≈ ' + fl(estOf(m, ph)) + ' ' + uLab() + '</span>' + btn('est-take', 'Принять') + '</div>' : '') + (m.t === 'dim' && m.est ? '<div class="pchip warn full"><i class="cdot warn"></i><span>Число взято по эталону (≈). Впишите замер рулеткой — будет точнее.</span></div>' : '') +
            (m.t === 'dim' ? fld('m.text', 'Название', m.text || '', { cls: 'full', ph: 'например: ширина сцены' }) + (m.poly ? '<p class="small full">Сторона ' + (polySides(m).indexOf(m) + 1) + ' из ' + polySides(m).length + ' контура' + (nextSide(m) ? ' — после ✓ откроется следующая без числа' : '') + '.</p>' : '') : '') +
            '<div class="fld full"><span class="fl">Цвет</span>' + cols(m.col) + '</div>' + (m.t === 'dim' ? toPlanHtml(m, ph) : '') + (function () { const fs2 = figures(ph), k = fs2.findIndex((f) => f.ids.indexOf(m.id) >= 0 || f.diag === m.id); return k >= 0 ? figHtml(fs2[k], k) : ''; })() +
            '<p class="muted small full">' + (m.t === 'text' ? 'Заметку можно перетащить пальцем.' : 'Концы тянутся за кружки — над пальцем появится лупа для точной точки. Линию целиком тоже можно тянуть.') + (m.t === 'dim' ? ' Число — ваш замер: по фото размер не вычисляется (перспектива искажает).' : '') + '</p>') +
          '<div class="pacts">' + btn('m-del', 'Удалить', { cls: 'dng' }) + btn('clear', 'Готово') + '</div>';
      }
      const pin = pinOf(ph.id), dims = ph.marks.filter((x) => x.t === 'dim'), bad = dims.filter((x) => !(x.v > 0)).length;
      return '<div class="phead"><h3>' + esc(ph.name) + '</h3></div>' + (bad ? '<div class="pchip warn"><i class="cdot warn"></i><span>без числа: ' + bad + '</span>' + U.help('У этих размеров не вписан замер — на фото они стоят как «?». Коснитесь линии и впишите число.') + '</div>' : '') +
        grp('Фото', fld('p.name', 'Название', ph.name, { cls: 'full', ph: 'например: стена у сцены' }) + '<div class="kv2 full"><span>Размеров</span><b>' + dims.length + '</b><span>Заметок и стрелок</span><b>' + (ph.marks.length - dims.length) + '</b><span>Снимок</span><b>' + ph.w + ' × ' + ph.h + '</b></div>') +
        refHtml(ph) + fitHtml(ph) + (!ph.fit ? grp('Примерка сцены', '<p class="muted small full">Покажите клиенту фотозону прямо на фото зала: сцена из режима «Сцена» ставится на снимок и подгоняется по четырём углам в перспективе.</p><div class="pacts full">' + btn('tool', 'Примерить сцену', { v: 'fit', cls: 'pnext' }) + '</div>') : '') +
        (figures(ph).length ? grp('Площадь и периметр', figures(ph).map(figHtml).join('')) : '') +
        grp('Место на плане', (pin ? '<p class="small full">Отмечено: ' + esc(pinWhere(pin)) + '.</p><div class="pacts full">' + btn('pin', 'Показать на плане') + btn('unpin', 'Убрать отметку', { cls: 'dng' }) + '</div>' : '<p class="muted small full">Отметьте, откуда снято: на плане появится значок камеры с направлением съёмки, по касанию он открывает это фото.</p><div class="pacts full">' + btn('pin', 'Отметить на плане', { cls: 'pnext' }) + '</div>')) +
        grp('Разметка', '<p class="muted small full">Инструменты слева: «Размер» — проведите от точки к точке и впишите замер; «Заметка»; «Стрелка». Цвет выбирается внизу панели. Два пальца — масштаб.</p>') +
        '<div class="pacts">' + btn('png', fitOn(ph) ? 'Скачать фото с фотозоной' : 'Скачать фото с размерами') + '<button type="button" class="btn sm" data-act="report-pdf">Отчёт обмера PDF</button>' + btn('p-del', 'Удалить фото', { cls: 'dng' }) + '</div>';
    } finally { U.inDock = false; }
  }
  function vLayers() {
    const ph = cur();
    if (!ph) return L().length ? '<div class="plist lyrp">' + L().map((p) => '<button type="button" class="prow" data-fact="open" data-v="' + p.id + '"><span>▣ ' + esc(p.name) + '</span><b>' + p.marks.length + '</b></button>').join('') + '</div>' : '<p class="muted small pad">Фото пока нет.</p>';
    if (!ph.marks.length) return '<p class="muted small pad">На этом фото пока нет разметки.</p>';
    return '<div class="plist lyrp">' + ph.marks.map((m) => '<button type="button" class="prow' + (m.id === st.sel ? ' on' : '') + '" data-fact="sel" data-v="' + m.id + '"><i class="cdot" style="background:' + m.col + '"></i><span>' + esc(markName(m)) + '</span>' + (m.t === 'dim' && !(m.v > 0) ? '<b class="est">?</b>' : '') + '</button>').join('') + '</div>';
  }
  function vChecks() {
    const pc = G.photoChecks(L()); if (!L().length) return '<p class="muted small pad">Проверки появятся, когда будут фото.</p>';
    if (!pc.length) return '<p class="muted small pad">У всех размеров на фото вписаны числа.</p>';
    return '<div class="plist">' + pc.map((q) => { const ph = L().find((p) => p.id === q.photo); return '<button type="button" class="prow chk" data-fact="openmark" data-v="' + q.photo + '|' + q.mark + '"><i class="cdot warn"></i><span><b>' + esc(ph.name) + '.</b> ' + (q.t === 'nonum' ? 'Размер без числа.' : 'Пустая заметка.') + '</span></button>'; }).join('') + '</div>';
  }
  function vSettings() { U.inDock = true; try { return '<div class="pad"><div class="fld"><span class="fl">Единицы</span><span class="seg" role="group">' + [['m', 'м'], ['cm', 'см'], ['mm', 'мм']].map((x) => '<button type="button" data-fact="unit" data-v="' + x[0] + '" aria-pressed="' + (unit() === x[0]) + '">' + x[1] + '</button>').join('') + '</span></div><p class="muted small">Единицы общие с планом.</p></div>'; } finally { U.inDock = false; } }
  function vOptbar() {
    const ph = cur(), m = mark(st.sel), ib = (a, ico, t, cls) => '<button type="button" class="ib s' + (cls ? ' ' + cls : '') + '" data-fact="' + a + '" title="' + t + '" aria-label="' + t + '">' + U.ico[ico] + '</button>';
    if (!ph) return '<span class="ohint">Фото: добавьте снимки зала и подпишите на них размеры</span>';
    if (st.tool === 'fit' && ph.fit) return '<span class="onm">Примерка сцены</span><span class="sep"></span><span class="ohint">тяните углы; внутри рамки — сдвиг</span><span class="sp"></span>' + ib('tool', 'x', 'Готово (Esc)');
    if (m) return '<span class="onm">' + esc(m.t === 'dim' ? 'Размер' : m.t === 'text' ? 'Заметка' : 'Стрелка') + '</span><span class="sep"></span>' + (m.t === 'dim' ? '<span class="ohint"><b>' + (m.v > 0 ? fl(m.v) + ' ' + uLab() : '? — впишите справа') + '</b></span>' : '<label class="nf wide" title="Текст"><b>Т</b><input type="text" autocomplete="off" data-fbind="m.text" value="' + esc(m.text || '') + '"></label>') + '<span class="sp"></span>' + ib('m-del', 'del', 'Удалить (Del)', 'dng') + ib('clear', 'x', 'Снять выделение (Esc)');
    return '<span class="onm">' + esc(ph.name) + '</span><span class="sep"></span><span class="ohint">' + ph.marks.length + ' отметок · «Размер» слева: проведите от точки к точке</span><span class="sp"></span>' + ib('gallery', 'x', 'К списку фото (Esc)');
  }
  function vStatbar() {
    const pc = G.photoChecks(L()), ph = cur();
    return (ph ? '<span class="zm"><button type="button" class="ib s" data-fact="zout" title="Отдалить" aria-label="Отдалить">' + U.ico.zout + '</button><button type="button" class="zl" id="fzlbl" data-fact="zfit" title="Вписать фото">' + (st.v ? Math.round(st.v.s * 100) + ' %' : '') + '</button><button type="button" class="ib s" data-fact="zin" title="Приблизить" aria-label="Приблизить">' + U.ico.zin + '</button><button type="button" class="ib s" data-fact="zfit" title="Вписать фото" aria-label="Вписать фото">' + U.ico.fit + '</button></span>' : '') +
      '<span>фото ' + L().length + '</span>' + (ph ? '<span>' + esc(ph.name) + ': отметок ' + ph.marks.length + '</span>' : '') + (function () { const f = figures(ph).filter((q) => q.known); return f.length ? '<span><b>P ' + fl(f[0].P) + ' ' + uLab() + (f[0].area > 0 ? ' · S ' + (f[0].exact ? '' : '≈') + fArea(f[0].area).replace(/ \(.*\)$/, '') : '') + '</b>' + (f.length > 1 ? ' · фигур ' + f.length : '') + '</span>' : ''; })() +
      (L().length ? '<button type="button" class="sck" data-act="dopen" data-id="checks"><i class="cdot ' + (pc.length ? 'warn' : 'ok') + '"></i>' + (pc.length ? 'без числа: ' + pc.length : 'все размеры с числами') + '</button>' : '') + '<span class="sp"></span><span>единицы: ' + uLab() + '</span>';
  }
  const SKEL = '<div id="fgal" class="fgal"></div><div id="fed" class="fed" hidden><canvas id="fcv" class="fcv" hidden></canvas><svg id="fsvg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Фото с разметкой"><g id="fvp"><image id="fimg" preserveAspectRatio="none" x="0" y="0"/><g id="fmarks"></g><g id="fhnd"></g></g></svg></div>' +
    '<div id="floupe" class="floupe" hidden></div><div id="fbanner" class="pbanner" hidden></div>';
  function init() {
    document.addEventListener('wheel', wheel, { passive: false });
    document.addEventListener('contextmenu', (e) => { if (e.target && e.target.closest && e.target.closest('#photohost,#planhost,#stagewrap')) e.preventDefault(); });   // no «copy / download image» on a long press
    window.addEventListener('resize', () => { if (UI.mode === 'photo') { if (st.v && !st.v.user) st.v = null; paint(); } });
  }
  return { canPaste: () => !!fclip(), cur, mark: (id) => mark(id), st, validate, vFly, placeFly, paint, down, move, up, act, bind, key, upload, init, vTools, vInsp, vLayers, vChecks, vSettings, vOptbar, vStatbar, SKEL, openPhoto, exportPng, pinOf, ICO, refreshCut, layer, drawFit, cut: () => cut, photoCanvas, fitOn };
})();

/* the photo mode's panels take the place of the others in «Фото» mode */
(function () {
  const wrap = (obj, key, alt) => { const o = obj[key]; obj[key] = function () { return UI.mode === 'photo' ? alt() : o.apply(this, arguments); }; };
  V.con.skel = V.con.skel.replace('<div class="fly" id="fly"', '<div class="photohost" id="photohost" data-sec="photo"></div><div class="fly" id="fly"');
  V.con.secs.photo = function () { return PF.SKEL; };
  wrap(V.con.secs, 'tools', PF.vTools);
  wrap(V.con.secs, 'pal', PF.vFly);
  wrap(V.con.secs, 'insp', PF.vInsp);
  wrap(V.con.secs, 'layers', PF.vLayers);
  wrap(V.con.secs, 'checks', PF.vChecks);
  wrap(V.con.secs, 'scene', PF.vSettings);
  wrap(V, 'optbar', PF.vOptbar);
  wrap(V, 'statbar', PF.vStatbar);
  const dt = V.con.secs.dtabs; V.con.secs.dtabs = function () { const h = dt(); if (UI.mode !== 'photo') return h; const n = PG.photoChecks(S.photos || []).length;
    return h.replace(/>(Сцена|План)<\/button>/, '>Фото</button>').replace(/<i class="cdot [a-z]+"/, '<i class="cdot ' + (n ? 'warn' : 'ok') + '"'); };
})();
