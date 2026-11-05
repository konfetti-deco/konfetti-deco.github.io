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
    fpin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/></svg>',
  };
  const COLNAME = { '#FF4D4F': 'красный', '#FFD43B': 'жёлтый', '#FFFFFF': 'белый', '#40C057': 'зелёный', '#4DABF7': 'синий' };
  const st = { open: null, sel: null, tool: '', col: G.MARK_COLS[0], v: null, drag: null, tps: {}, pinch: null, pend: null, lastW: 0, lastH: 0, repaint: 0 };
  function L() { if (!Array.isArray(S.photos)) S.photos = []; return S.photos; }
  function cur() { return L().find((p) => p.id === st.open) || null; }
  function mark(id) { const ph = cur(); return ph ? ph.marks.find((m) => m.id === id) || null : null; }
  function unit() { return (S.plan && S.plan.unit) || 'm'; }
  function uLab() { return G.UNIT[unit()].ru; }
  function fl(mm) { return G.fmtLen(mm, unit()); }
  function fs(mm) { let s = fl(mm); if (s.indexOf(',') >= 0) s = s.replace(/0+$/, '').replace(/,$/, ''); return s; }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const n1 = (v) => Math.round(v * 10) / 10;
  function label(t) { UI.nextLabel = 'Фото: ' + t; commit(); }
  function validate() { if (st.open && !cur()) { st.open = null; st.sel = null; } if (st.sel && !mark(st.sel)) st.sel = null; }
  function src(ph) { const im = IMG[ph.im]; return im ? im.src : ''; }
  function markName(m) { return m.t === 'dim' ? 'Размер' + (m.v > 0 ? ' ' + fs(m.v) : ' без числа') : m.t === 'text' ? 'Заметка' + (m.text ? ': ' + m.text : '') : 'Стрелка' + (m.text ? ': ' + m.text : ''); }
  function pinOf(id) { return S.plan && S.plan.items.find((it) => it.kind === 'photo' && it.photo === id) || null; }
  function pinWhere(pin) {
    if (!pin || !S.plan) return '';
    let best = null; S.plan.rooms.forEach((r) => { const g = G.roomGeom(r); for (let i = 0; i < g.n; i++) { const d = G.distSeg([pin.x, pin.y], g.pts[i], g.pts[(i + 1) % g.n]).d; if (!best || d < best.d) best = { d, r, i }; } });
    return best ? (best.r.name || 'помещение') + ', у стены ' + G.wallName(best.r, best.i) : 'на плане';
  }

  /* ---------- view ---------- */
  function host() { return document.getElementById('photohost'); }
  function svg() { return document.getElementById('fsvg'); }
  function fit() {
    const h = host(), ph = cur(); if (!h || !ph) return; const W = h.clientWidth, H = h.clientHeight; if (W < 50 || H < 50) return;
    const s = Math.min((W - 24) / ph.w, (H - 24) / ph.h);
    st.v = { s, x: -(W / s - ph.w) / 2, y: -(H / s - ph.h) / 2 }; st.lastW = W; st.lastH = H;
  }
  function ensureView() { const h = host(); if (!h) return; if (!st.v || (!st.v.user && (Math.abs(h.clientWidth - st.lastW) > 2 || Math.abs(h.clientHeight - st.lastH) > 2))) fit(); }
  function applyView() { const g = document.getElementById('fvp'); if (g && st.v) g.setAttribute('transform', 'matrix(' + st.v.s + ' 0 0 ' + st.v.s + ' ' + (-st.v.x * st.v.s) + ' ' + (-st.v.y * st.v.s) + ')'); const z = document.getElementById('fzlbl'); if (z && st.v) z.textContent = Math.round(st.v.s * 100) + ' %'; }
  function toImg(ev) { const r = svg().getBoundingClientRect(); return [(ev.clientX - r.left) / st.v.s + st.v.x, (ev.clientY - r.top) / st.v.s + st.v.y]; }
  function zoomAt(f, px, py) { const v = st.v, mx = px / v.s + v.x, my = py / v.s + v.y, s = G.clamp(v.s * f, 0.05, 12); st.v = { s, x: mx - px / s, y: my - py / s, user: true }; applyView(); clearTimeout(st.repaint); st.repaint = setTimeout(paint, 120); }
  function zoomBy(f) { const h = host(); if (!h || !st.v) return; zoomAt(f, h.clientWidth / 2, h.clientHeight / 2); }

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
      for (const q of [a, b]) h += '<line class="fhalo" x1="' + n1(q[0] - nx * t) + '" y1="' + n1(q[1] - ny * t) + '" x2="' + n1(q[0] + nx * t) + '" y2="' + n1(q[1] + ny * t) + '"/><line class="fl" stroke="' + c + '" x1="' + n1(q[0] - nx * t) + '" y1="' + n1(q[1] - ny * t) + '" x2="' + n1(q[0] + nx * t) + '" y2="' + n1(q[1] + ny * t) + '"/>';
      const lab = m.v > 0 ? fl(m.v) + ' ' + uLab() : '? ' + uLab();
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
    if (!ph) { if (gal) { gal.hidden = false; const g = gallery(); if (gal._h !== g) { gal.innerHTML = g; gal._h = g; } } if (ed) ed.hidden = true; banner(); return; }
    if (gal) gal.hidden = true; if (ed) ed.hidden = false;
    ensureView(); if (!st.v) return;
    const img = document.getElementById('fimg'), sr = src(ph);
    if (img && img._src !== sr + ph.w) { img.setAttribute('href', sr); img.setAttribute('width', ph.w); img.setAttribute('height', ph.h); img._src = sr + ph.w; }
    let mk = '', hnd = '';
    ph.marks.forEach((m) => { mk += markSvg(m, m.id === st.sel); });
    const m = mark(st.sel), s = st.v.s;
    if (m) for (const k of m.t === 'text' ? [] : ['a', 'b']) { const q = m[k]; hnd += '<circle class="fhd" cx="' + n1(q[0]) + '" cy="' + n1(q[1]) + '" r="' + n1(7 / s) + '"/><circle class="fhh" data-r="h|' + m.id + '|' + k + '" cx="' + n1(q[0]) + '" cy="' + n1(q[1]) + '" r="' + n1(20 / s) + '"/>'; }
    if (st.pend) hnd += '<circle class="fpd" cx="' + n1(st.pend[0]) + '" cy="' + n1(st.pend[1]) + '" r="' + n1(6 / s) + '"/>';
    if (st.drag && st.drag.mode === 'new' && st.drag.b) { const d = st.drag; mk += markSvg({ id: '_', t: st.tool, a: d.a, b: d.b, v: null, col: st.col }, true); }
    const set = (id, x) => { const n = document.getElementById(id); if (n && n._h !== x) { n.innerHTML = x; n._h = x; } };
    set('fmarks', mk); set('fhnd', hnd); applyView(); banner();
    const wsm = document.getElementById('wsm'); if (wsm) wsm.classList.toggle('fhand', st.tool === 'hand');
  }
  function banner() {
    const b = document.getElementById('fbanner'); if (!b) return;
    let t = '';
    if (cur() && (st.tool === 'dim' || st.tool === 'arrow')) t = '<span>' + (st.pend ? 'Коснитесь второй точки' : (st.tool === 'dim' ? 'Размер' : 'Стрелка') + ': проведите пальцем от точки к точке (или два касания)') + '</span><button type="button" class="btn sm" data-fact="tool" data-v="">Готово</button>';
    else if (cur() && st.tool === 'text') t = '<span>Коснитесь места для заметки</span><button type="button" class="btn sm" data-fact="tool" data-v="">Готово</button>';
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
    if (st.tool === 'dim' || st.tool === 'arrow') { d.mode = 'new'; d.a = clampPt(st.pend || p); d.b = null; if (!st.pend) loupe(ev, d.a); return true; }
    if (st.tool === 'text') { d.mode = 'newtext'; return true; }
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
    if (d.mode === 'new') { d.b = clampPt(p); loupe(ev, d.b); paint(); return true; }
    if (d.mode === 'end') { const m = mark(d.ref[1]); Object.assign(m, JSON.parse(d.snap)); m[d.k] = clampPt(p); loupe(ev, m[d.k]); paint(); return true; }
    if (d.mode === 'move') { const m = mark(d.ref[1]); Object.assign(m, JSON.parse(d.snap)); const o = [p[0] - d.p0[0], p[1] - d.p0[1]]; m.a = clampPt([m.a[0] + o[0], m.a[1] + o[1]]); if (m.b) m.b = clampPt([m.b[0] + o[0], m.b[1] + o[1]]); paint(); return true; }
    return true;
  }
  function up(ev, cancel) {
    if (UI.mode !== 'photo') return false;
    const had = !!st.tps[ev.pointerId]; delete st.tps[ev.pointerId];
    if (st.pinch) { if (Object.keys(st.tps).length < 2) { st.pinch = null; paint(); } return true; }
    const d = st.drag; if (!d || ev.pointerId !== d.pid) return had;
    st.drag = null; loupe(null);
    if (cancel) { if (d.snap) { const o = JSON.parse(d.snap), m = mark(o.id); if (m) Object.assign(m, o); } paint(); return true; }
    const p = clampPt(toImg(ev)), ph = cur();
    if (d.mode === 'new') {
      const b = d.moved ? d.b : (st.pend ? p : null);
      if (!b) { st.pend = d.a; paint(); return true; }   // first of two taps
      st.pend = null;
      if (Math.hypot(b[0] - d.a[0], b[1] - d.a[1]) * st.v.s < 12) { paint(); return true; }
      const m = { id: G.uid(), t: st.tool, a: d.a, b, col: st.col }; if (m.t === 'dim') m.v = null; else m.text = '';
      ph.marks.push(m); st.sel = m.id; label(st.tool === 'dim' ? 'размер' : 'стрелка'); focusVal(); return true;
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
  function openPhoto(id) { st.open = id; st.sel = null; st.pend = null; st.v = null; st.tool = ''; }
  function upload(input) {
    const files = Array.prototype.slice.call(input.files || []); input.value = ''; if (!files.length) return;
    toast('Загружаю фото…');
    let done = 0, last = null; const n0 = L().length;
    const next = () => {
      const f = files.shift(); if (!f) { if (last) { openPhoto(last); label(done === 1 ? 'добавлено фото' : 'добавлено фото: ' + done); if (IO._imgFull) toast('Память браузера заполнена: фото может не сохраниться на этом устройстве. Сохраните проект в облако или файлом.'); } else render(); return; }
      if (!/^image\//.test(f.type)) { next(); return; }
      const fr = new FileReader();
      fr.onload = () => { const im = new Image(); im.onload = () => { const r = encodeImage(im, 'image/jpeg'); if (r) { const id = newImgId(); IMG[id] = r; IO.saveImg(id); const ph = { id: G.uid(), im: id, w: r.w, h: r.h, name: (f.name || '').replace(/\.[a-z0-9]+$/i, '').slice(0, 60) || 'Фото ' + (n0 + done + 1), marks: [] }; if (/^(img|image|photo|dsc|pxl)[_\- ]?\d/i.test(ph.name)) ph.name = 'Фото ' + (n0 + done + 1); L().push(ph); last = ph.id; done++; } next(); }; im.onerror = next; im.src = fr.result; };
      fr.onerror = next; fr.readAsDataURL(f);
    };
    next();
  }
  function exportPng() {
    const ph = cur(); if (!ph || !IMG[ph.im]) return;
    const K = 2, cv = document.createElement('canvas'); cv.width = ph.w * K; cv.height = ph.h * K; const c = cv.getContext('2d'), im = new Image();
    im.onload = () => {
      c.drawImage(im, 0, 0, cv.width, cv.height); c.lineCap = 'round'; c.lineJoin = 'round';
      const pill = (x, y, str, px, fg, bg) => { c.font = '700 ' + px + 'px system-ui, sans-serif'; const w = c.measureText(str).width + px * 0.9, h = px * 1.55; c.fillStyle = bg; c.beginPath(); if (c.roundRect) c.roundRect(x - w / 2, y - h / 2, w, h, h / 2); else c.rect(x - w / 2, y - h / 2, w, h); c.fill(); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(str, x, y + px * 0.04); };
      const line = (a, b, col, wd) => { c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = wd + 3 * K; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.strokeStyle = col; c.lineWidth = wd; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); };
      const px = Math.max(14, Math.round(Math.max(ph.w, ph.h) / 55)) * K;
      ph.marks.forEach((m) => {
        const a = [m.a[0] * K, m.a[1] * K], dark = m.col === '#FFFFFF' || m.col === '#FFD43B' ? '#111' : '#fff';
        if (m.t === 'text') { pill(a[0], a[1], m.text || 'заметка', px, dark, m.col); return; }
        const b = [m.b[0] * K, m.b[1] * K], dx = b[0] - a[0], dy = b[1] - a[1], Lp = Math.hypot(dx, dy) || 1, ux = dx / Lp, uy = dy / Lp, nx = -uy, ny = ux, t = px * 0.6, wd = Math.max(2, px / 7);
        line(a, b, m.col, wd);
        if (m.t === 'dim') { for (const q of [a, b]) line([q[0] - nx * t, q[1] - ny * t], [q[0] + nx * t, q[1] + ny * t], m.col, wd); pill((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, m.v > 0 ? fl(m.v) + ' ' + uLab() : '? ' + uLab(), px, m.v > 0 ? dark : '#fff', m.v > 0 ? m.col : '#C92A2A'); }
        else { const k = px * 1.1, w = px * 0.5; c.fillStyle = m.col; c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(b[0] - ux * k + nx * w, b[1] - uy * k + ny * w); c.lineTo(b[0] - ux * k - nx * w, b[1] - uy * k - ny * w); c.closePath(); c.fill(); if (m.text) pill(a[0] - ux * px * 1.3, a[1] - uy * px * 1.3, m.text, px, dark, m.col); }
      });
      IO.canvasBlob(cv).then((bl) => IO.save((ph.name || 'Фото').replace(/[\\/:*?"<>|]+/g, '_') + ' — размеры.png', bl, 'img'));
    };
    im.src = IMG[ph.im].src;
  }
  function act(name, a) {
    const v = a && a.dataset ? a.dataset.v : undefined, ph = cur(), m = mark(st.sel);
    switch (name) {
      case 'open': openPhoto(v); render(); requestAnimationFrame(() => { fit(); paint(); }); return;
      case 'gallery': st.open = null; st.sel = null; st.pend = null; st.tool = ''; render(); return;
      case 'tool': st.tool = v || ''; st.pend = null; if (!cur() && st.tool && st.tool !== 'hand') { toast('Сначала откройте фото.'); st.tool = ''; } render(); return;
      case 'col': st.col = v; if (m) { m.col = v; label('цвет: ' + (COLNAME[v] || v)); } else render(); return;
      case 'clear': st.sel = null; render(); return;
      case 'sel': st.sel = v; render(); return;
      case 'openmark': { const q = String(v).split('|'); openPhoto(q[0]); st.sel = q[1]; render(); requestAnimationFrame(() => { fit(); paint(); }); return; }
      case 'm-del': if (ph && m) { ph.marks = ph.marks.filter((x) => x.id !== m.id); st.sel = null; label('удалено: ' + markName(m).toLowerCase()); } return;
      case 'p-del': if (ph) { const i = L().indexOf(ph); L().splice(i, 1); if (S.plan) S.plan.items = S.plan.items.filter((it) => !(it.kind === 'photo' && it.photo === ph.id)); st.open = null; st.sel = null; label('фото удалено'); } return;
      case 'png': exportPng(); return;
      case 'pin': if (ph) { const ex = pinOf(ph.id); PL.setMode('plan'); if (ex) { PL.st.sel = { t: 'item', i: ex.id }; render(); toast('Фото уже отмечено на плане — тяните отметку, кружок поворачивает направление съёмки.'); } else { PL.st.layer = 'floor'; PL.st.tool = 'pin:' + ph.id; render(); } } return;
      case 'unpin': if (ph && S.plan) { S.plan.items = S.plan.items.filter((it) => !(it.kind === 'photo' && it.photo === ph.id)); label('отметка на плане убрана'); } return;
      case 'zin': zoomBy(1.4); return;
      case 'zout': zoomBy(1 / 1.4); return;
      case 'zfit': st.v = null; fit(); paint(); return;
      case 'unit': if (S.plan) { S.plan.unit = v; label('единицы: ' + G.UNIT[v].ru); } return;
    }
  }
  function bind(path, raw) {
    const ph = cur(), m = mark(st.sel);
    switch (path) {
      case 'p.name': if (ph) { ph.name = String(raw).trim().slice(0, 80) || 'Фото'; label('название'); } return;
      case 'm.v': if (m) { if (String(raw).trim() === '') { m.v = null; label('размер без числа'); return; } const v = G.parseLen(raw, unit()); if (v === null || v <= 0) { toast('Не число: «' + raw + '». Размер в ' + uLab() + ', можно сумму: 2,35+1,12.'); render(); return; } m.v = v; label('размер ' + fl(v)); } return;
      case 'm.text': if (m) { m.text = String(raw).trim().slice(0, 200); label(m.t === 'text' ? 'заметка' : 'подпись стрелки'); } return;
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
      tb('data-fact="tool" data-v="dim"', ICO.fdim, 'Размер: от точки к точке (D)', st.tool === 'dim') + tb('data-fact="tool" data-v="text"', ICO.ftext, 'Заметка (T)', st.tool === 'text') + tb('data-fact="tool" data-v="arrow"', ICO.farrow, 'Стрелка (A)', st.tool === 'arrow') + '<hr>' +
      '<div class="fcols">' + G.MARK_COLS.map((c) => '<button type="button" class="fcol" data-fact="col" data-v="' + c + '" style="--c:' + c + '" aria-pressed="' + (st.col === c) + '" title="Цвет: ' + COLNAME[c] + '" aria-label="Цвет: ' + COLNAME[c] + '"></button>').join('') + '</div>';
  }
  const fld = (bind, lab, val, o) => { o = o || {}; return '<label class="fld' + (o.cls ? ' ' + o.cls : '') + '"><span class="fl">' + lab + '</span><input type="text"' + (o.num ? ' inputmode="decimal"' : '') + ' autocomplete="off" data-fbind="' + bind + '"' + (o.id ? ' id="' + o.id + '"' : '') + ' value="' + esc(val == null ? '' : val) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '></label>'; };
  const btn = (act, t, o) => { o = o || {}; return '<button type="button" class="btn sm' + (o.cls ? ' ' + o.cls : '') + '" data-fact="' + act + '"' + (o.v != null ? ' data-v="' + o.v + '"' : '') + '>' + t + '</button>'; };
  const grp = (t, h) => V.group(t, h);
  const cols = (curc) => '<div class="fcols wide full">' + G.MARK_COLS.map((c) => '<button type="button" class="fcol" data-fact="col" data-v="' + c + '" style="--c:' + c + '" aria-pressed="' + (curc === c) + '" title="' + COLNAME[c] + '" aria-label="Цвет: ' + COLNAME[c] + '"></button>').join('') + '</div>';
  function vInsp() {
    U.inDock = true;
    try {
      const ph = cur();
      if (!ph) {
        const list = L(), bad = G.photoChecks(list).filter((q) => q.t === 'nonum').length;
        return '<div class="phead"><h3>Фото</h3></div>' + grp('Фото проекта', (list.length ? '<div class="plist full">' + list.map((p) => '<button type="button" class="prow" data-fact="open" data-v="' + p.id + '"><span>' + esc(p.name) + '</span><span class="muted small">' + p.marks.length + ' отм.' + (pinOf(p.id) ? ' · на плане' : '') + '</span></button>').join('') + '</div>' : '<p class="muted small full">Фото пока нет. Добавьте их карточкой «Добавить фото» или снимите камерой.</p>') +
          (bad ? '<p class="pst warn full">Размеров без числа: ' + bad + ' — откройте фото и впишите.</p>' : '') +
          '<p class="muted small full">Фото хранятся в проекте: сохраняются, переносятся файлом и синхронизируются вместе с ним. Перед сохранением фото уменьшается до 1280 точек по длинной стороне — для разметки этого хватает.</p>');
      }
      const m = mark(st.sel);
      if (m) {
        const nm = m.t === 'dim' ? 'Размер' : m.t === 'text' ? 'Заметка' : 'Стрелка';
        return '<div class="phead"><h3>' + nm + ' — ' + esc(ph.name) + '</h3></div>' + (m.t === 'dim' && !(m.v > 0) ? '<p class="pst warn">Впишите размер, который вы намерили. Без числа линия остаётся «?» и попадает в проверки.</p>' : '') +
          grp(nm, (m.t === 'dim' ? fld('m.v', 'Размер, ' + uLab(), m.v > 0 ? fl(m.v) : '', { id: 'pf-val', num: true, cls: 'plen', ph: 'впишите замер' }) : fld('m.text', m.t === 'text' ? 'Текст заметки' : 'Подпись у стрелки', m.text, { id: 'pf-val', cls: 'full', ph: m.t === 'text' ? 'например: розетка, крюк, 2 шт.' : 'необязательно' })) +
            '<div class="fld full"><span class="fl">Цвет</span>' + cols(m.col) + '</div>' +
            '<p class="muted small full">' + (m.t === 'text' ? 'Заметку можно перетащить пальцем.' : 'Концы тянутся за кружки — над пальцем появится лупа для точной точки. Линию целиком тоже можно тянуть.') + (m.t === 'dim' ? ' Число — ваш замер: по фото размер не вычисляется (перспектива искажает).' : '') + '</p>') +
          '<div class="pacts">' + btn('m-del', 'Удалить', { cls: 'dng' }) + btn('clear', 'Готово') + '</div>';
      }
      const pin = pinOf(ph.id), dims = ph.marks.filter((x) => x.t === 'dim'), bad = dims.filter((x) => !(x.v > 0)).length;
      return '<div class="phead"><h3>' + esc(ph.name) + '</h3></div>' + (bad ? '<p class="pst warn">Размеров без числа: ' + bad + '.</p>' : '') +
        grp('Фото', fld('p.name', 'Название', ph.name, { cls: 'full', ph: 'например: стена у сцены' }) + '<div class="kv2 full"><span>Размеров</span><b>' + dims.length + '</b><span>Заметок и стрелок</span><b>' + (ph.marks.length - dims.length) + '</b><span>Снимок</span><b>' + ph.w + ' × ' + ph.h + '</b></div>') +
        grp('Место на плане', (pin ? '<p class="small full">Отмечено: ' + esc(pinWhere(pin)) + '.</p><div class="pacts full">' + btn('pin', 'Показать на плане') + btn('unpin', 'Убрать отметку', { cls: 'dng' }) + '</div>' : '<p class="muted small full">Отметьте, откуда снято: на плане появится значок камеры с направлением съёмки, по касанию он открывает это фото.</p><div class="pacts full">' + btn('pin', 'Отметить на плане', { cls: 'pnext' }) + '</div>')) +
        grp('Разметка', '<p class="muted small full">Инструменты слева: «Размер» — проведите от точки к точке и впишите замер; «Заметка»; «Стрелка». Цвет выбирается внизу панели. Два пальца — масштаб.</p>') +
        '<div class="pacts">' + btn('png', 'Скачать фото с размерами') + btn('p-del', 'Удалить фото', { cls: 'dng' }) + '</div>';
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
    if (m) return '<span class="onm">' + esc(m.t === 'dim' ? 'Размер' : m.t === 'text' ? 'Заметка' : 'Стрелка') + '</span><span class="sep"></span>' + (m.t === 'dim' ? '<label class="nf" title="Размер, ' + uLab() + '"><b>' + uLab() + '</b><input type="text" inputmode="decimal" autocomplete="off" data-fbind="m.v" value="' + (m.v > 0 ? fl(m.v) : '') + '" placeholder="?"></label>' : '<label class="nf wide" title="Текст"><b>Т</b><input type="text" autocomplete="off" data-fbind="m.text" value="' + esc(m.text || '') + '"></label>') + '<span class="sp"></span>' + ib('m-del', 'del', 'Удалить (Del)', 'dng') + ib('clear', 'x', 'Снять выделение (Esc)');
    return '<span class="onm">' + esc(ph.name) + '</span><span class="sep"></span><span class="ohint">' + ph.marks.length + ' отметок · «Размер» слева: проведите от точки к точке</span><span class="sp"></span>' + ib('gallery', 'x', 'К списку фото (Esc)');
  }
  function vStatbar() {
    const pc = G.photoChecks(L()), ph = cur();
    return (ph ? '<span class="zm"><button type="button" class="ib s" data-fact="zout" title="Отдалить" aria-label="Отдалить">' + U.ico.zout + '</button><button type="button" class="zl" id="fzlbl" data-fact="zfit" title="Вписать фото">' + (st.v ? Math.round(st.v.s * 100) + ' %' : '') + '</button><button type="button" class="ib s" data-fact="zin" title="Приблизить" aria-label="Приблизить">' + U.ico.zin + '</button><button type="button" class="ib s" data-fact="zfit" title="Вписать фото" aria-label="Вписать фото">' + U.ico.fit + '</button></span>' : '') +
      '<span>фото ' + L().length + '</span>' + (ph ? '<span>' + esc(ph.name) + ': отметок ' + ph.marks.length + '</span>' : '') +
      (L().length ? '<button type="button" class="sck" data-act="dopen" data-id="checks"><i class="cdot ' + (pc.length ? 'warn' : 'ok') + '"></i>' + (pc.length ? 'без числа: ' + pc.length : 'все размеры с числами') + '</button>' : '') + '<span class="sp"></span><span>единицы: ' + uLab() + '</span>';
  }
  const SKEL = '<div id="fgal" class="fgal"></div><div id="fed" class="fed" hidden><svg id="fsvg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Фото с разметкой"><g id="fvp"><image id="fimg" preserveAspectRatio="none" x="0" y="0"/><g id="fmarks"></g><g id="fhnd"></g></g></svg></div>' +
    '<div id="floupe" class="floupe" hidden></div><div id="fbanner" class="pbanner" hidden></div>';
  function init() {
    document.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('resize', () => { if (UI.mode === 'photo') { if (st.v && !st.v.user) st.v = null; paint(); } });
  }
  return { st, paint, down, move, up, act, bind, key, upload, init, vTools, vInsp, vLayers, vChecks, vSettings, vOptbar, vStatbar, SKEL, openPhoto, exportPng, pinOf, ICO };
})();

/* the photo mode's panels take the place of the others in «Фото» mode */
(function () {
  const wrap = (obj, key, alt) => { const o = obj[key]; obj[key] = function () { return UI.mode === 'photo' ? alt() : o.apply(this, arguments); }; };
  V.con.skel = V.con.skel.replace('<div class="fly" id="fly"', '<div class="photohost" id="photohost" data-sec="photo"></div><div class="fly" id="fly"');
  V.con.secs.photo = function () { return PF.SKEL; };
  wrap(V.con.secs, 'tools', PF.vTools);
  wrap(V.con.secs, 'pal', function () { return ''; });
  wrap(V.con.secs, 'insp', PF.vInsp);
  wrap(V.con.secs, 'layers', PF.vLayers);
  wrap(V.con.secs, 'checks', PF.vChecks);
  wrap(V.con.secs, 'scene', PF.vSettings);
  wrap(V, 'optbar', PF.vOptbar);
  wrap(V, 'statbar', PF.vStatbar);
  const dt = V.con.secs.dtabs; V.con.secs.dtabs = function () { const h = dt(); if (UI.mode !== 'photo') return h; const n = PG.photoChecks(S.photos || []).length;
    return h.replace(/>(Сцена|План)<\/button>/, '>Фото</button>').replace(/<i class="cdot [a-z]+"/, '<i class="cdot ' + (n ? 'warn' : 'ok') + '"'); };
})();
