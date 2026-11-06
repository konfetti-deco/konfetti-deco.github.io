/* ===== RP: the measurement report — plan, rooms and walls, every photo with its sizes — as a PDF of A4 pages.
   All numbers come from PG.reportData: the same functions the plan and the photo panels use. Text is drawn on canvas
   (Cyrillic needs no PDF font), each page goes into the PDF as a JPEG. ===== */
var RP = (function () {
  const G = PG, W = 1240, H = 1754, MX = 84, CW = W - 2 * MX, TOP = 96, BOT = 110;
  const disp = "'Cormorant Garamond', Georgia, serif", body = "'Onest', Arial, sans-serif", ink = '#1E2420', mu = '#69685E', brass = '#8F6D1F', em = '#1F4D3F', warn = '#B7791F', line = '#DDD3BF';
  function fl(mm, u) { return G.fmtLen(mm, u); }
  function uLab(u) { return G.UNIT[u].ru; }
  function m2(a) { return G.nf(a / 1e6, 2) + ' м²'; }   // as on screen: two decimals
  function today() { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); }
  const OPN = { door: 'дверь', window: 'окно', open: 'проём' };

  /* a flow of A4 pages: y runs down, need(h) starts a new page when the block does not fit */
  function Doc(k) {
    const pages = []; let c = null, y = 0;
    const d = {
      k, pages,
      page() { const cv = document.createElement('canvas'); cv.width = W * k; cv.height = H * k; c = cv.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.textBaseline = 'alphabetic'; pages.push(cv); y = TOP; return c; },
      need(h) { if (!c || y + h > H - BOT) { d.page(); return true; } return false; },
      get c() { return c; }, get y() { return y; }, set y(v) { y = v; },
    };
    return d;
  }
  function sp(c, v) { try { if ('letterSpacing' in c) c.letterSpacing = v; } catch (e) {} }
  function eyebrow(c, t, x, y, al) { c.font = '600 15px ' + body; c.fillStyle = brass; c.textAlign = al || 'left'; sp(c, '2px'); c.fillText(t.toUpperCase(), x, y); sp(c, '0px'); }
  function txt(c, t, x, y, font, col, al) { c.font = font; c.fillStyle = col || ink; c.textAlign = al || 'left'; c.fillText(t, x, y); }
  function fit(c, t, maxW) { let s = String(t); if (c.measureText(s).width <= maxW) return s; while (s.length > 1 && c.measureText(s + '…').width > maxW) s = s.slice(0, -1); return s + '…'; }
  function chip(c, x, y, label, val, col) {
    c.font = '400 16px ' + body; const lw = c.measureText(label).width; c.font = '600 22px ' + body; const vw = c.measureText(val).width, w = Math.max(lw, vw) + 36;
    c.fillStyle = '#F5F0E6'; c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, 70, 12); else c.rect(x, y, w, 70); c.fill();
    txt(c, label, x + 18, y + 26, '400 16px ' + body, mu); txt(c, val, x + 18, y + 56, '600 22px ' + body, col || ink); return w;
  }

  /* the plan drawn from its geometry: rooms, wall lengths, openings, tables and other items */
  function drawPlan(c, plan, R, x0, y0, bw, bh) {
    const gs = plan.rooms.map((r) => G.roomGeom(r)), pts = [];
    gs.forEach((g) => g.pts.forEach((p) => pts.push(p)));
    plan.items.forEach((it) => { if (it.kind === 'photo') return; G.footprint(it).forEach((poly) => poly.forEach((p) => pts.push(p))); });
    if (!pts.length) return;
    let a = Infinity, b = Infinity, cx = -Infinity, cy = -Infinity; pts.forEach((p) => { a = Math.min(a, p[0]); b = Math.min(b, p[1]); cx = Math.max(cx, p[0]); cy = Math.max(cy, p[1]); });
    const pad = 70, s = Math.min((bw - 2 * pad) / Math.max(1, cx - a), (bh - 2 * pad) / Math.max(1, cy - b)), ox = x0 + (bw - (cx - a) * s) / 2 - a * s, oy = y0 + (bh - (cy - b) * s) / 2 - b * s;
    const T = (p) => [ox + p[0] * s, oy + p[1] * s];
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    gs.forEach((g, ri) => {
      const r = plan.rooms[ri], P = g.pts.map(T);
      c.beginPath(); P.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fillStyle = '#F7F4EC'; c.fill();
      for (let i = 0; i < g.n; i++) {
        const A = P[i], B = P[(i + 1) % g.n], w = r.walls[i];
        c.strokeStyle = w.m ? ink : '#8A877C'; c.lineWidth = 5; c.setLineDash(w.m ? [] : [10, 8]); c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); c.setLineDash([]);
        const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L], gL = g.lens[i] || 1;
        (w.ops || []).forEach((o) => { const t0 = G.clamp(o.off, 0, gL) / gL * L, t1 = G.clamp(o.off + o.w, 0, gL) / gL * L; c.strokeStyle = '#fff'; c.lineWidth = 7; c.beginPath(); c.moveTo(A[0] + u[0] * t0, A[1] + u[1] * t0); c.lineTo(A[0] + u[0] * t1, A[1] + u[1] * t1); c.stroke();
          c.strokeStyle = o.type === 'window' ? '#4D8FBF' : brass; c.lineWidth = 2; c.beginPath(); c.moveTo(A[0] + u[0] * t0, A[1] + u[1] * t0); c.lineTo(A[0] + u[0] * t1, A[1] + u[1] * t1); c.stroke(); });
        // the length outside the wall
        const no = G.outward(g, i), mx = (A[0] + B[0]) / 2 + no[0] * 26, my = (A[1] + B[1]) / 2 + no[1] * 26;
        let ang = Math.atan2(u[1], u[0]); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
        c.save(); c.translate(mx, my); c.rotate(ang); txt(c, G.wallName(r, i) + '  ' + (w.m ? '' : '≈') + fl(g.lens[i], plan.unit), 0, 6, '500 15px ' + body, w.m ? ink : mu, 'center'); c.restore();
      }
    });
    plan.items.forEach((it) => {
      if (it.kind === 'photo') return;
      G.footprint(it).forEach((poly, k) => { const P = poly.map(T); c.beginPath(); P.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath();
        if (it.top) { c.setLineDash([6, 5]); c.strokeStyle = '#7A5BA8'; c.lineWidth = 1.5; c.stroke(); c.setLineDash([]); } else { c.fillStyle = k ? '#E8E2D3' : (it.kind === 'table' ? '#E3EEE8' : '#EFE9DC'); c.fill(); c.strokeStyle = k ? '#B9B09B' : em; c.lineWidth = k ? 1 : 1.6; c.stroke(); } });
      const p = T([it.x, it.y]), lab = it.kind === 'table' && !it.stand && it.num != null ? String(it.num) : (it.name || G.itemLabel(it));
      c.font = '600 13px ' + body; const sz = Math.max(it.w, it.d) * s; if (sz > 26) txt(c, fit(c, lab, Math.max(30, it.w * s - 6)), p[0], p[1] + 5, '600 13px ' + body, it.top ? '#5B3F8A' : ink, 'center');
    });
    gs.forEach((g, ri) => {   // room names last, on a light pill, so tables never cover them
      const ctr = T(g.center), a1 = (R.rooms[ri].exact ? '' : '≈') + m2(g.area); c.font = '600 20px ' + body; const w1 = c.measureText(R.rooms[ri].name).width; c.font = '400 16px ' + body; const w2 = g.area > 0 ? c.measureText(a1).width : 0, bw2 = Math.max(w1, w2) + 28;
      c.fillStyle = 'rgba(255,255,255,.88)'; c.beginPath(); if (c.roundRect) c.roundRect(ctr[0] - bw2 / 2, ctr[1] - 28, bw2, g.area > 0 ? 58 : 36, 10); else c.rect(ctr[0] - bw2 / 2, ctr[1] - 28, bw2, 58); c.fill();
      txt(c, R.rooms[ri].name, ctr[0], ctr[1] - 4, '600 20px ' + body, em, 'center'); if (g.area > 0) txt(c, a1, ctr[0], ctr[1] + 20, '400 16px ' + body, mu, 'center');
    });
    c.restore();
  }

  function build(k) {
    const R = G.reportData(S.plan, S.photos || []), u = R.unit, d = Doc(k), plan = S.plan || G.newPlan();
    let c = d.page();
    // header
    txt(c, String(S.name || 'Проект'), MX, 128, '600 50px ' + disp, em); eyebrow(c, 'Обмер', W - MX, 106, 'right'); txt(c, 'от ' + today(), W - MX, 132, '400 18px ' + body, mu, 'right');
    c.fillStyle = line; c.fillRect(MX, 150, CW, 1); d.y = 176;
    // summary chips
    let x = MX; const chips = [];
    if (R.rooms.length) chips.push(['Площадь', (R.areaExact ? '' : '≈') + m2(R.area)], ['Помещений', String(R.rooms.length)]);
    if (R.tables) chips.push(['Столов · мест', R.tables + ' · ' + R.seats]);
    if (R.photos.length) chips.push(['Фото · размеров', R.photos.length + ' · ' + R.dims]);
    if (R.nonum) chips.push(['Без числа', String(R.nonum), warn]);
    if (R.approxWalls) chips.push(['Стен на глаз', String(R.approxWalls), warn]);
    chips.forEach((q) => { const w0 = chip(c, x, d.y, q[0], q[1], q[2]); x += w0 + 12; });
    if (chips.length) d.y += 100;
    txt(c, 'Единицы: ' + uLab(u) + '. «≈» — длина не намерена, а получена из остальных стен или задана на глаз.', MX, d.y, '400 16px ' + body, mu); d.y += 34;
    // the plan
    if (R.rooms.length || plan.items.some((it) => it.kind !== 'photo')) {
      eyebrow(c, 'План', MX, d.y + 4); d.y += 18;
      const bh = Math.min(820, H - BOT - d.y - 40); c.strokeStyle = line; c.lineWidth = 1; c.strokeRect(MX, d.y, CW, bh); drawPlan(c, plan, R, MX, d.y, CW, bh); d.y += bh + 44;
    }
    // rooms and walls
    R.rooms.forEach((r) => {
      d.need(120); c = d.c;
      txt(c, r.name, MX, d.y, '600 26px ' + body, em); txt(c, 'S ' + (r.exact ? '' : '≈') + m2(r.area) + '   P ' + (r.exact ? '' : '≈') + fl(r.P, u) + ' ' + uLab(u) + '   потолок ' + fl(r.h, u) + ' ' + uLab(u), W - MX, d.y, '400 18px ' + body, mu, 'right');
      d.y += 16; c.fillStyle = line; c.fillRect(MX, d.y, CW, 1); d.y += 30;
      r.walls.forEach((w) => {
        if (d.need(34)) { c = d.c; txt(c, r.name + ' (продолжение)', MX, d.y, '600 18px ' + body, em); d.y += 34; }
        c = d.c; txt(c, w.name, MX, d.y, '600 18px ' + body); txt(c, (w.m ? '' : '≈') + fl(w.len, u) + ' ' + uLab(u), MX + 250, d.y, '600 18px ' + body, w.m ? ink : mu, 'right');
        txt(c, w.m ? 'намерено' : 'на глаз', MX + 280, d.y, '400 16px ' + body, w.m ? em : warn);
        const extra = [w.ops.length ? w.ops.map((o) => OPN[o] || o).join(', ') : '', w.from.length ? 'с фото «' + w.from[0].photo + '»' : ''].filter(Boolean).join(' · ');
        c.font = '400 16px ' + body; if (extra) txt(c, fit(c, extra, CW - 420), MX + 420, d.y, '400 16px ' + body, mu);
        d.y += 32;
      });
      d.y += 24;
    });
    // photos
    return Promise.all((S.photos || []).map((ph) => PF.photoCanvas(ph, 1.5).catch(() => null))).then((cvs) => {
      R.photos.forEach((rp, i) => {
        const pc = cvs[i], ph = S.photos[i]; let ih = 0, iw = CW;
        if (pc) { ih = CW * ph.h / ph.w; if (ih > 600) { ih = 600; iw = ih * ph.w / ph.h; } }   // two landscape photos fit on a page
        const rows = Math.ceil(rp.dims.length / 2) + rp.notes.length + rp.figs.length;
        d.need(70 + ih + Math.min(rows, 8) * 30 + 30); c = d.c;
        txt(c, rp.name, MX, d.y, '600 26px ' + body, em); txt(c, (rp.dims.length ? 'размеров ' + rp.dims.length : 'без размеров') + (rp.fit ? ' · с примеркой фотозоны' : ''), W - MX, d.y, '400 17px ' + body, mu, 'right'); d.y += 18;
        if (pc) { c.drawImage(pc, MX + (CW - iw) / 2, d.y, iw, ih); d.y += ih + 36; } else { txt(c, 'снимок не загружен на этом устройстве', MX, d.y + 30, '400 17px ' + body, warn); d.y += 60; }
        // sizes in two columns
        const half = Math.ceil(rp.dims.length / 2);
        for (let r0 = 0; r0 < half; r0++) {
          if (d.need(30)) { c = d.c; txt(c, rp.name + ' (продолжение)', MX, d.y, '600 18px ' + body, em); d.y += 32; }
          c = d.c;
          [rp.dims[r0], rp.dims[r0 + half]].forEach((dm, col) => { if (!dm) return; const x0 = MX + col * (CW / 2);
            txt(c, 'Размер ' + dm.n, x0, d.y, '400 17px ' + body, mu); txt(c, dm.v ? fl(dm.v, u) + ' ' + uLab(u) : '? — нет числа', x0 + 110, d.y, '600 17px ' + body, dm.v ? ink : warn);
            if (dm.wall) { c.font = '400 15px ' + body; txt(c, fit(c, '→ ' + dm.wall, CW / 2 - 260), x0 + 240, d.y, '400 15px ' + body, mu); } });
          d.y += 30;
        }
        rp.figs.forEach((f, fi) => { if (d.need(30)) c = d.c; c = d.c; txt(c, 'Фигура ' + (fi + 1) + ': P ' + fl(f.P, u) + ' ' + uLab(u) + (f.area > 0 ? ' · S ' + (f.exact ? '' : '≈') + m2(f.area) + (f.exact ? ' (точно)' : ' (при прямых углах)') : ''), MX, d.y, '600 17px ' + body, em); d.y += 30; });
        rp.notes.forEach((n) => { if (d.need(30)) c = d.c; c = d.c; c.font = '400 17px ' + body; txt(c, fit(c, '• ' + n, CW), MX, d.y, '400 17px ' + body); d.y += 30; });
        d.y += 30;
      });
      if (!R.rooms.length && !R.photos.length) { c = d.c; txt(c, 'В проекте пока нет ни плана, ни фото.', MX, d.y + 20, '400 20px ' + body, mu); }
      // footers: page n of N
      d.pages.forEach((cv, i) => { const cc = cv.getContext('2d'); cc.setTransform(k, 0, 0, k, 0, 0); cc.fillStyle = line; cc.fillRect(MX, H - 74, CW, 1); txt(cc, String(S.name || 'Проект') + ' · обмер', MX, H - 44, '400 15px ' + body, mu); txt(cc, 'стр. ' + (i + 1) + ' из ' + d.pages.length, W - MX, H - 44, '400 15px ' + body, mu, 'right'); });
      return { pages: d.pages, data: R };
    });
  }
  function pdf() {
    toast('Готовлю отчёт обмера…');
    const needCut = (S.photos || []).some((ph) => ph.fit && ph.fit.on);
    return IO.script('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js').then(() => IO.fonts()).then(() => (needCut ? PF.refreshCut(true) : null)).then(() => build(1.5)).then((r) => {
      const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
      r.pages.forEach((cv, i) => { if (i) doc.addPage(); doc.addImage(cv.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297); });
      return IO.save(IO.fname('pdf', 'Обмер'), doc.output('blob'), 'bin');
    }).catch(() => toast('Отчёт собрать не удалось: для PDF нужен интернет (загружается модуль). Попробуйте ещё раз при подключении.'));
  }
  /* the plan alone: an A4 landscape sheet with the name, the date and the totals — to send to the venue */
  function planCanvas(k) {
    const PW = 1754, PH = 1240, M0 = 70, R = G.reportData(S.plan, S.photos || []), plan = S.plan || G.newPlan(), cv = document.createElement('canvas');
    cv.width = PW * k; cv.height = PH * k; const c = cv.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0); c.fillStyle = '#fff'; c.fillRect(0, 0, PW, PH);
    txt(c, String(S.name || 'План зала'), M0, 96, '600 46px ' + disp, em); eyebrow(c, 'План зала', PW - M0, 78, 'right'); txt(c, today(), PW - M0, 104, '400 18px ' + body, mu, 'right');
    c.fillStyle = line; c.fillRect(M0, 122, PW - 2 * M0, 1);
    const sm = G.seatingSummary(plan), foot = [R.rooms.length ? 'площадь ' + (R.areaExact ? '' : '≈') + m2(R.area) : '', sm.tables ? 'столов ' + sm.tables + ' · мест ' + sm.seats : '', sm.stand ? 'коктейльных ' + sm.stand : '', 'единицы: ' + uLab(R.unit)].filter(Boolean).join('   ·   ');
    drawPlan(c, plan, R, M0, 140, PW - 2 * M0, PH - 140 - 110);
    c.fillStyle = line; c.fillRect(M0, PH - 92, PW - 2 * M0, 1); txt(c, foot, M0, PH - 58, '500 19px ' + body, ink);
    if (sm.list.length) { c.font = '400 16px ' + body; txt(c, fit(c, sm.list.map((r) => r.label + ' — ' + r.n).join('   ·   '), PW - 2 * M0), M0, PH - 30, '400 16px ' + body, mu); }
    return cv;
  }
  function planPng() { return IO.fonts().then(() => IO.canvasBlob(planCanvas(1.5))).then((bl) => IO.save(IO.fname('png', 'План'), bl, 'img')); }
  function planPdf() {
    return IO.script('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js').then(() => IO.fonts()).then(() => {
      const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape', compress: true });
      doc.addImage(planCanvas(1.5).toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 297, 210); return IO.save(IO.fname('pdf', 'План'), doc.output('blob'), 'bin');
    }).catch(() => toast('PDF собрать не удалось: нужен интернет (загружается модуль). Картинка PNG работает без него.'));
  }
  return { build, pdf, planCanvas, planPng, planPdf };
})();
