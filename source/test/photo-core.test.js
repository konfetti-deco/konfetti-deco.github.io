/* Photo ↔ plan core tests (plancore.js): try-on maths, the report numbers. Run: node test/photo-core.test.js
   Rebuilt on 2026-11-05 after the workspace was lost; the older invariant suites (plan.test.js, engine.test.js) did not survive. */
const PG = require('../src/plancore.js');
let fails = 0, passes = 0;
function ok(c, msg) { if (c) passes++; else { fails++; console.log('  FAIL: ' + msg); } }
function near(a, b, tol, msg) { ok(Math.abs(a - b) <= tol, msg + ' (got ' + a + ', want ' + b + ' ±' + tol + ')'); }
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

/* 21. a size from a photo sent to a plan wall; the camera's wall */
{ const r = PG.makeRoom('Зал', 0, 0, PG.SHAPES.rect(12000, 8000).map((x) => [x[0], x[1], false])), p = PG.normalize({ rooms: [r], items: [] }), w = p.rooms[0].walls;
  PG.addOpening(w[0], 'door', 12000, 6000);
  const pin = { x: 6000, y: 6000, rot: 0 }; ok(PG.wallSeen(p, pin).wid === w[0].id, 'camera at the bottom looking up sees wall A–B');
  pin.rot = 90; ok(PG.wallSeen(p, pin).wid === w[1].id, 'turned right: wall B–C'); pin.rot = 180; ok(PG.wallSeen(p, pin).wid === w[2].id, 'turned back: wall C–D');
  const m = { t: 'dim', v: 12350 }; ok(PG.sendToWall(p, m, p.rooms[0].id, w[0].id) && w[0].len === 12350 && w[0].m && m.wid === w[0].id, 'size sent: wall measured 12,350');
  ok(!PG.sendToWall(p, { t: 'dim', v: null }, p.rooms[0].id, w[1].id) && !w[1].m, 'no number — nothing sent');
  const ph = PG.normPhotos([{ im: 'i', w: 10, h: 10, marks: [{ t: 'dim', a: [0, 0], b: [5, 5], v: 12350, rid: p.rooms[0].id, wid: w[0].id }] }]); ok(ph[0].marks[0].wid === w[0].id, 'the link is saved with the photo'); }

/* 22. the scene tried on a photo: square → quad (corners exact, a real projective map), triangle affine, folded quads refused */
for (let k = 0; k < 400; k++) {
  const cx = rnd(200, 1000), cy = rnd(200, 800), J = () => rnd(150, 300), q = [[cx - J(), cy - J()], [cx + J(), cy - J()], [cx + J(), cy + J()], [cx - J(), cy + J()]];   // offsets 150–300 in each quadrant keep the quad convex
  const H = PG.sq2quad(q), c = [[0, 0], [1, 0], [1, 1], [0, 1]];
  c.forEach((uv, i) => { const p = H(uv[0], uv[1]); near(p[0], q[i][0], 1e-6, 'corner ' + i + ' x'); near(p[1], q[i][1], 1e-6, 'corner ' + i + ' y'); });
  // a straight line of the scene stays straight on the photo; the middle is where the diagonals cross (projective, not bilinear)
  const a = H(0.2, 0.3), b = H(0.2, 0.9), m = H(0.2, 0.6), cr = (b[0] - a[0]) * (m[1] - a[1]) - (b[1] - a[1]) * (m[0] - a[0]);
  near(cr / Math.hypot(b[0] - a[0], b[1] - a[1]), 0, 1e-6, 'lines stay straight');
  const ctr = H(0.5, 0.5), d1 = [q[0], q[2]], d2 = [q[1], q[3]];
  const side = (s, p) => (s[1][0] - s[0][0]) * (p[1] - s[0][1]) - (s[1][1] - s[0][1]) * (p[0] - s[0][0]);
  near(side(d1, ctr) / Math.hypot(d1[1][0] - d1[0][0], d1[1][1] - d1[0][1]), 0, 1e-6, 'centre on diagonal 1'); near(side(d2, ctr) / Math.hypot(d2[1][0] - d2[0][0], d2[1][1] - d2[0][1]), 0, 1e-6, 'centre on diagonal 2');
  ok(PG.quadOk(q), 'convex clockwise quad accepted');
  ok(!PG.quadOk([q[0], q[2], q[1], q[3]]), 'crossed (bow-tie) quad refused'); ok(!PG.quadOk([q[3], q[2], q[1], q[0]]), 'mirrored order refused');
  const s = [[rnd(0, 99), rnd(0, 99)], [rnd(100, 200), rnd(0, 50)], [rnd(0, 50), rnd(100, 200)]], t = [H(0, 0), H(0.3, 0.1), H(0.1, 0.4)], A = PG.triAffine(s, t);
  if (!A) { const dd = (s[1][0] - s[0][0]) * (s[2][1] - s[0][1]) - (s[2][0] - s[0][0]) * (s[1][1] - s[0][1]); ok(dd === 0, 'no map only for a flat triangle'); continue; }
  s.forEach((p, i) => { near(A[0] * p[0] + A[2] * p[1] + A[4], t[i][0], 1e-6, 'affine x ' + i); near(A[1] * p[0] + A[3] * p[1] + A[5], t[i][1], 1e-6, 'affine y ' + i); });
}
{ const sq = [[0, 0], [10, 0], [10, 10], [0, 10]], H = PG.sq2quad(sq), p = H(0.25, 0.75); near(p[0], 2.5, 1e-9, 'rectangle: plain scaling x'); near(p[1], 7.5, 1e-9, 'rectangle: plain scaling y');
  ok(!PG.quadOk([[0, 0], [10, 0], [10, 10], [5, 2]]), 'dented quad refused'); ok(!PG.quadOk([[0, 0], [0.5, 0], [10, 10], [0, 10]]), 'a collapsed side refused');
  ok(PG.triAffine([[0, 0], [1, 1], [2, 2]], sq) === null, 'flat triangle: no map');
  // first placement: real size from the longest measured line; otherwise half the photo
  const ph = { w: 1200, h: 900, marks: [{ t: 'dim', a: [100, 100], b: [500, 100], v: 2000 }, { t: 'dim', a: [0, 0], b: [10, 0], v: 100 }] };
  let f = PG.fitQuad(ph, 3000, 2400); near(f.q[1][0] - f.q[0][0], 600, 0.2, 'scaled by the 2 m line: 3 m scene = 600 px'); near(f.q[3][1] - f.q[0][1], 480, 0.2, 'height keeps the scene proportions'); ok(f.scaled && PG.quadOk(f.q), 'scaled, valid');
  ok(f.q[2][1] <= ph.h && f.q[0][1] >= 0, 'inside the photo');
  f = PG.fitQuad({ w: 1200, h: 900, marks: [] }, 3000, 2400); near(f.q[1][0] - f.q[0][0], 600, 0.2, 'no scale: half the photo'); ok(!f.scaled, 'not scaled');
  const g = PG.fitQuad({ w: 1200, h: 900, marks: [] }, 1000, 5000); ok(g.q[2][1] - g.q[1][1] <= 900 * 0.85 + 0.1, 'a tall scene is fitted into the height');
  // stored with the photo; a broken one is dropped
  let n = PG.normPhotos([{ im: 'i', w: 1200, h: 900, marks: [], fit: { q: f.q, op: 0.6 } }]); ok(n[0].fit && n[0].fit.op === 0.6 && n[0].fit.on === true, 'fit saved with the photo');
  n = PG.normPhotos([{ im: 'i', w: 1200, h: 900, marks: [], fit: { q: [[0, 0], [10, 10], [10, 0], [0, 10]] } }]); ok(!('fit' in n[0]), 'folded fit dropped');
  n = PG.normPhotos([{ im: 'i', w: 1200, h: 900, marks: [], fit: { q: f.q, op: 5, on: false } }]); ok(n[0].fit.op === 1 && n[0].fit.on === false, 'opacity clamped, hidden kept'); }

/* 23. the report's numbers: the same as the plan and the photos, and they add up */
{ const r1 = PG.makeRoom('Зал', 0, 0, PG.SHAPES.rect(12000, 8000).map((x) => [x[0], x[1], true])), r2 = PG.makeRoom('', 20000, 0, PG.SHAPES.rect(4000, 3000).map((x) => [x[0], x[1], false]));
  const p = PG.normalize({ rooms: [r1, r2], items: [] }); PG.addOpening(p.rooms[0].walls[0], 'door', 12000, 6000);
  p.items.push(PG.makeItem('t_r120', 3000, 3000)); p.items.push(PG.makeItem('t_r150', 6000, 3000));
  const w1 = p.rooms[0].walls[1];
  const photos = PG.normPhotos([{ id: 'f1', im: 'i', w: 1200, h: 900, name: 'Стена у сцены', marks: [
    { t: 'dim', a: [0, 0], b: [100, 0], v: 8000, rid: p.rooms[0].id, wid: w1.id }, { t: 'dim', a: [100, 0], b: [100, 100], v: 3000 }, { t: 'dim', a: [100, 100], b: [0, 100], v: 8000 }, { t: 'dim', a: [0, 100], b: [0, 0], v: 3000 },
    { t: 'dim', a: [500, 500], b: [600, 500], v: null }, { t: 'text', a: [5, 5], text: 'розетка' }, { t: 'text', a: [6, 6], text: '  ' }] }]);
  const R = PG.reportData(p, photos), g1 = PG.roomGeom(p.rooms[0]), g2 = PG.roomGeom(p.rooms[1]);
  ok(R.rooms.length === 2 && R.rooms[1].name === 'Помещение 2', 'rooms listed, unnamed numbered');
  near(R.rooms[0].area, g1.area, 1e-9, 'room area = plan area'); near(R.rooms[0].P, g1.P, 1e-9, 'room perimeter = plan perimeter'); near(R.area, g1.area + g2.area, 1e-6, 'total area = sum of rooms');
  near(R.rooms[0].area, 96e6, 1, 'measured 12×8 m hall = 96 m²'); ok(R.rooms[0].exact && !R.rooms[1].exact && !R.areaExact, 'exact only when all walls measured and closed');
  ok(R.rooms[0].walls.length === 4 && R.rooms[0].walls.every((w, i) => w.len === g1.lens[i]), 'wall lengths = plan lengths');
  ok(R.rooms[0].walls[0].ops.join() === 'door', 'openings listed'); ok(R.rooms[0].walls[1].from.length === 1 && R.rooms[0].walls[1].from[0].photo === 'Стена у сцены' && R.rooms[0].walls[1].from[0].v === 8000, 'wall shows the photo its length came from');
  ok(R.approxWalls === 4, 'approximate walls counted: 4 (second room)'); ok(R.tables === 2 && R.seats === PG.totals(p).seats && R.seats > 0, 'tables and seats = plan totals');
  ok(R.photos[0].dims.length === 5 && R.dims === 5 && R.nonum === 1 && R.photos[0].dims[4].v === null, 'sizes counted, the one without a number flagged');
  ok(R.photos[0].dims[0].wall === 'Зал, B–C' && R.photos[0].dims[1].wall === '', 'size linked to its wall');
  ok(R.photos[0].notes.length === 1 && R.photos[0].notes[0] === 'розетка', 'notes listed, empty ones skipped');
  const F = PG.photoFigures(photos[0].marks, PG.figTol(photos[0])).filter((f) => f.known);
  ok(R.photos[0].figs.length === F.length && F.length === 1 && R.photos[0].figs[0].P === F[0].P && R.photos[0].figs[0].P === 22000, 'figure perimeter = photo figure (22 m)');
  near(R.photos[0].figs[0].area, 24e6, 1, 'figure area 8×3 = 24 m² (right angles)');
  const E = PG.reportData(null, null); ok(E.rooms.length === 0 && E.photos.length === 0 && E.area === 0 && !E.areaExact, 'empty project: empty report'); }
/* 24. lining up: guides to other objects' centres and edges, the grid from corner A, a free spot for a new object */
{ const r = PG.makeRoom('Зал', 0, 0, PG.SHAPES.rect(12000, 8000).map((x) => [x[0], x[1], true])), p = PG.normalize({ rooms: [r], items: [] });
  const a = PG.makeItem('t_q180', 3000, 2000), b = PG.makeItem('t_q180', 7000, 5000), m = PG.makeItem('t_q180', 0, 0); p.items.push(a, b);
  for (let k = 0; k < 300; k++) {
    const dx = rnd(-79, 79), dy = rnd(-79, 79);
    let s = PG.alignSnap(p, m, 3000 + dx, 4000, 80, 0); near(s.x, 3000, 1e-9, 'centre x snaps to table A centre (off by ' + dx + ')'); ok(s.guides.some((g) => g.vert && g.at === 3000), 'vertical guide at x=3000');
    s = PG.alignSnap(p, m, 5000, 5000 + dy, 80, 0); near(s.y, 5000, 1e-9, 'centre y snaps to table B centre'); ok(s.guides.some((g) => !g.vert && g.at === 5000), 'horizontal guide at y=5000');
  }
  const ab = PG.itemBBox(a); let s = PG.alignSnap(p, m, 1500, ab.y0 + 30 + (PG.itemBBox(m).y1 - PG.itemBBox(m).y0) / 2, 80, 0); near(PG.itemBBox(Object.assign({}, m, { x: s.x, y: s.y })).y0, ab.y0, 1e-6, 'top edge snaps to top edge');
  s = PG.alignSnap(p, m, 5000, 6500, 80, 0); ok(s.guides.length === 0 && s.x === 5000 && s.y === 6500, 'far from every line: no snap, no guide');
  const g = PG.alignSnap(p, m, 3000 + 40, 6500, 80, 0).guides.find((q) => q.vert); ok(g && g.a <= ab.y0 - 250 && g.b >= 6500, 'the guide reaches from table A to the dragged one');
  const top = PG.makeItem('u_spot', 3000, 2000); p.items.push(top); s = PG.alignSnap(p, Object.assign(PG.makeItem('t_q180', 0, 0), { id: 'zz' }), 3000 + 40, 7000, 80, 0); near(s.x, 3000, 1e-9, 'floor table lines up with floor tables');
  const sp = PG.makeItem('u_spot', 0, 0); s = PG.alignSnap({ rooms: p.rooms, items: [a, b] }, sp, 3040, 7000, 80, 0); near(s.x, 3040, 1e-9, 'an upper-layer object ignores floor tables');
  // grid from corner A
  p.rooms[0].x = 250; p.rooms[0].y = 130; const go = PG.gridOrigin(p); ok(go[0] === 250 && go[1] === 130, 'grid starts at corner A: ' + go);
  s = PG.alignSnap({ rooms: p.rooms, items: [] }, m, 1730, 2390, 80, 1000); ok(s.x === 1250 && s.y === 2130, 'grid 1 m snaps the centre (from corner A at 250,130): ' + s.x + ',' + s.y);
  s = PG.alignSnap({ rooms: p.rooms, items: [] }, m, 1730, 2390, 80, 500); ok(s.x === 1750 && s.y === 2630, 'grid 0.5 m: ' + s.x + ',' + s.y);
  s = PG.alignSnap({ rooms: p.rooms, items: [a] }, m, a.x + 30, 2390, 80, 1000); ok(s.x === a.x, 'a guide wins over the grid');
  ok(PG.normalize({ snap: 1000 }).snap === 1000 && PG.normalize({ snap: 7 }).snap === 0 && PG.normalize({}).snap === 0, 'grid setting saved, bad values off');
  p.rooms[0].x = 0; p.rooms[0].y = 0;
  // a free spot: not over another table with its chairs, inside the room
  const q = PG.makeItem('t_q180', 0, 0), fsp = PG.freeSpot(p, q, 3000, 2000), fb = PG.fullBox(Object.assign({}, q, { x: fsp[0], y: fsp[1] }));
  ok(!p.items.filter((o) => !o.top && o.kind !== 'photo').some((o) => { const b2 = PG.fullBox(o); return b2.x0 < fb.x1 && b2.x1 > fb.x0 && b2.y0 < fb.y1 && b2.y1 > fb.y0; }), 'free spot touches no table: ' + fsp);
  ok(fb.x0 >= 0 && fb.y0 >= 0 && fb.x1 <= 12000 && fb.y1 <= 8000, 'free spot inside the room');
  ok(PG.freeSpot({ rooms: p.rooms, items: [] }, q, 6000, 4000).join() === '6000,4000', 'empty room: right at the centre');
  const full = { rooms: p.rooms, items: [] }; for (let i = 0; i < 400; i++) full.items.push(Object.assign(PG.makeItem('t_q180', 300 + (i % 20) * 600, 300 + Math.floor(i / 20) * 400), { id: 'f' + i }));
  ok(PG.freeSpot(full, q, 6000, 4000).join() === '6000,4000', 'no room left: the centre anyway'); }

/* 25. chairs: no more than at the densest seating (50 cm per person along the edge) */
{ const T = (w, d) => Object.assign(PG.makeItem('t_q180', 0, 0), { w, d, shape: 'rect' });
  const want = { 1200: [2, 2, 1, 1], 1500: [3, 2, 2, 1], 1800: [3, 3, 2, 2], 2000: [4, 3, 2, 2], 2400: [4, 4, 3, 3], 3000: [6, 5, 4, 3] };
  Object.keys(want).forEach((L) => { const l = PG.seatLimits(T(+L, 800)).per[0]; ok([l.dense, l.normal, l.comfort, l.free].join() === want[L].join(), 'side ' + L + ' mm: ' + [l.dense, l.normal, l.comfort, l.free].join('/') + ' (want ' + want[L].join('/') + ')'); });
  ok(PG.seatLimits(T(2000, 800)).per[2].dense === 1, 'end of a 0,8 m deep table: 1 chair');
  const R = (d) => Object.assign(PG.makeItem('t_r150', 0, 0), { w: d, shape: 'round' }), wr = { 1200: [7, 6, 5, 4], 1500: [9, 7, 6, 5], 1800: [11, 9, 8, 7] };
  Object.keys(wr).forEach((D) => { const l = PG.seatLimits(R(+D)).per[0]; ok([l.dense, l.normal, l.comfort, l.free].join() === wr[D].join(), 'round Ø' + D + ': ' + [l.dense, l.normal, l.comfort, l.free].join('/')); });
  for (let k = 0; k < 500; k++) { const w = rnd(600, 6000), d = rnd(500, 1500), t = T(w, d), lim = PG.seatLimits(t);
    ok(lim.max[0] === Math.floor(w / 500 + 1e-9) && lim.max[2] === Math.floor(d / 500 + 1e-9), 'max per side = length / 50 cm');
    ok(lim.tot.dense >= lim.tot.normal && lim.tot.normal >= lim.tot.comfort && lim.tot.comfort >= lim.tot.free, 'denser never seats fewer');
    t.sides = [99, 0, 5, 1]; PG.fitSeats(t); ok(t.sides[0] === lim.max[0] && t.sides[2] === Math.min(5, lim.max[2]) && t.sides[3] === Math.min(1, lim.max[3]), 'fitSeats cuts each side to its limit');
    ok(PG.seatCount(t) <= lim.tot.dense, 'seat count within the densest total'); }
  const o = Object.assign(PG.makeItem('t_r150', 0, 0), { w: 2400, d: 1200, shape: 'oval' }), lo = PG.seatLimits(o).per[0].dense; ok(lo === Math.floor(PG.edgeLens(o)[0] / 500), 'oval by its perimeter: ' + lo);
  near(PG.edgeLens(Object.assign({}, o, { d: 2400 }))[0], Math.PI * 2400, 1e-6, 'an oval with equal sides is a circle');
  const r = R(1500); r.seats = 30; ok(PG.fitSeats(r) && r.seats === 9, 'round Ø1,5: 30 → 9'); ok(!PG.fitSeats(r), 'nothing to cut the second time'); }

/* 26. resizing: the side being pulled sticks to another object's side or centre, or to a ruler guide; turned 90° too */
{ const p = PG.normalize({ rooms: [], items: [] }), A = Object.assign(PG.makeItem('t_q180', 6000, 6000), { id: 'A', w: 6000, d: 1000 }); p.items.push(A);   // y 5500..6500
  const mk = (o) => Object.assign(PG.makeItem('t_q180', 0, 0), { id: 'M' }, o);
  for (let k = 0; k < 200; k++) {
    const off = rnd(-70, 70), before = mk({ x: 1000, y: 3500, w: 1000, d: 3000 });   // y 2000..5000
    const it = mk({ x: 1000, y: 3500 + (1500 + off) / 2, w: 1000, d: 3000 + 1500 + off });   // bottom pulled to 6500 + off, top fixed at 2000
    const g = PG.snapResize(p, it, before, 80, {}); const b = PG.itemBBox(it);
    near(b.y1, 6500, 1e-6, 'bottom side sticks to table A bottom (off ' + off + ')'); near(b.y0, 2000, 1e-6, 'top side stays'); ok(it.w === 1000, 'width untouched'); ok(g.length === 1 && !g[0].vert && g[0].at === 6500, 'a horizontal guide at 6500');
  }
  let before = mk({ x: 1000, y: 3500, w: 1000, d: 3000 }), it = mk({ x: 1000, y: 3500 + 1260, w: 1000, d: 3000 + 2520 });   // bottom at 7520, near a ruler guide at 7500
  PG.snapResize(p, it, before, 80, { guides: [{ vert: false, at: 7500 }] }); near(PG.itemBBox(it).y1, 7500, 1e-6, 'bottom sticks to the ruler guide');
  it = mk({ x: 1000, y: 3500 + 1260, w: 1000, d: 3000 + 2520 }); PG.snapResize(p, it, before, 80, { guides: [{ vert: true, at: 7500 }] }); near(PG.itemBBox(it).y1, 7520, 1e-6, 'a vertical guide does not catch a horizontal side');
  it = mk({ x: 1000, y: 3500 + 1260, w: 1000, d: 3000 + 2520 }); PG.snapResize(p, it, before, 80, { objects: false, guides: [] }); near(PG.itemBBox(it).y1, 7520, 1e-6, '«к объектам» off: no sticking');
  // turned 90°: its depth runs along x
  before = mk({ x: 2000, y: 3000, w: 1000, d: 2000, rot: 90 }); it = mk({ x: 2000 + 1980, y: 3000, w: 1000, d: 2000 + 3960 / 1 - 0, rot: 90 });
  it.d = 2000 + 3960; it.x = 1000 + (2000 + 3960) / 2;   // left side fixed at x=1000, right pulled to 6960, near A's right? no: A spans 3000..9000 — centre 6000, so use 6960 vs nothing; pull to 8980 instead
  it.d = 7980; it.x = 1000 + 7980 / 2; PG.snapResize(p, it, before, 80, {}); const bt = PG.itemBBox(it); near(bt.x1, 9000, 1e-6, 'turned 90°: right side sticks to A right side'); near(bt.x0, 1000, 1e-6, 'left side stays'); ok(it.d === 8000 && it.w === 1000, 'its own depth changed: ' + it.w + '×' + it.d);
  it = mk({ x: 2000, y: 3000, w: 1000, d: 2000, rot: 30 }); ok(PG.snapResize(p, it, mk({ x: 2000, y: 3000, w: 1000, d: 1900, rot: 30 }), 80, {}).length === 0, 'a slanted object is left alone');
  const r = PG.snapLine(p, mk({ x: 0, y: 0 }), true, 6030, 80, {}); ok(r && r.v === 6000, 'a side line also sticks to a centre line'); }

/* 27. several objects: line up, spread evenly, number again, one seating */
{ const T = (id, x, y, w, d, o) => Object.assign(PG.makeItem('t_q180', x, y), { id, w, d, sides: [0, 0, 0, 0] }, o || {});
  for (let k = 0; k < 200; k++) {
    const L = [T('a', rnd(1000, 9000), rnd(1000, 9000), rnd(600, 3000), rnd(600, 1500)), T('b', rnd(1000, 9000), rnd(1000, 9000), rnd(600, 3000), rnd(600, 1500)), T('c', rnd(1000, 9000), rnd(1000, 9000), rnd(600, 3000), rnd(600, 1500), { rot: 90 })];
    const B = L.map(PG.itemBBox), x0 = Math.min(...B.map((b) => b.x0)), y1 = Math.max(...B.map((b) => b.y1)), cx = (Math.min(...B.map((b) => b.x0)) + Math.max(...B.map((b) => b.x1))) / 2;
    const C = JSON.parse(JSON.stringify(L)); PG.alignItems(C, 'left'); C.forEach((it) => near(PG.itemBBox(it).x0, x0, 0.11, 'left edges line up'));
    C.forEach((it, i) => near(it.y, L[i].y, 1e-9, 'left: y untouched'));
    const D = JSON.parse(JSON.stringify(L)); PG.alignItems(D, 'bottom'); D.forEach((it) => near(PG.itemBBox(it).y1, y1, 0.11, 'bottoms line up'));
    const E = JSON.parse(JSON.stringify(L)); PG.alignItems(E, 'cx'); E.forEach((it) => { const b = PG.itemBBox(it); near((b.x0 + b.x1) / 2, cx, 0.11, 'centres on one vertical line'); });
    // spread: the outer two stay, gaps equal
    const F = JSON.parse(JSON.stringify(L)); { let x = 500; F.forEach((it) => { const b = PG.itemBBox(it), w = b.x1 - b.x0; it.x = x + w / 2; x += w + rnd(0, 3000); }); F.reverse(); }   // a row without overlaps, listed in any order
    const F0 = JSON.parse(JSON.stringify(F)); PG.distributeItems(F, 'x'); const S = F.map(PG.itemBBox).sort((a, b) => (a.x0 + a.x1) - (b.x0 + b.x1));
    const g1 = S[1].x0 - S[0].x1, g2 = S[2].x0 - S[1].x1; near(g1, g2, 0.25, 'equal gaps (' + g1.toFixed(1) + ' / ' + g2.toFixed(1) + ')');
    const ends = (A) => { const s = A.map(PG.itemBBox); return [Math.min(...s.map((b) => b.x0)), Math.max(...s.map((b) => b.x1))]; }; const e0 = ends(F0), e1 = ends(F);
    near(e1[0], e0[0], 0.11, 'left end stays'); near(e1[1], e0[1], 0.25, 'right end stays'); ok(g1 >= -0.25, 'no overlap made');
    const G2 = JSON.parse(JSON.stringify(L)); PG.distributeItems(G2, 'y', 1500); const S2 = G2.map(PG.itemBBox).sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
    near(S2[1].y0 - S2[0].y1, 1500, 0.25, 'given gap 1,5 m'); near(S2[2].y0 - S2[1].y1, 1500, 0.25, 'given gap 1,5 m (2)');
  }
  const lk = [T('a', 1000, 1000, 1000, 800), T('b', 3000, 1600, 1000, 800, { lock: true })]; PG.alignItems(lk, 'top'); ok(lk[1].y === 1600 && Math.abs(PG.itemBBox(lk[0]).y0 - 600) < 0.11, 'a locked one stays and still counts for the line');
  // renumber: two rows, left to right, top to bottom
  const p = { items: [T('t1', 7000, 2000, 1800, 800, { num: 9 }), T('t2', 1000, 2100, 1800, 800, { num: 4 }), T('t3', 4000, 1950, 1800, 800, { num: 12 }), T('t4', 2000, 5000, 1800, 800, { num: 2 }), T('t5', 6000, 5100, 1800, 800, { num: 7 }), Object.assign(PG.makeItem('z_podium', 0, 0), { id: 'z' })] };
  PG.renumber(p, 'rows'); ok(['t2', 't3', 't1', 't4', 't5'].map((id) => p.items.find((i) => i.id === id).num).join() === '1,2,3,4,5', 'by rows: 1 2 3 / 4 5');
  PG.renumber(p, 'cols'); ok(['t2', 't4', 't3', 't5', 't1'].map((id) => p.items.find((i) => i.id === id).num).join() === '1,2,3,4,5', 'by columns');
  ok(p.items.find((i) => i.id === 'z').num === undefined, 'a podium gets no number');
  // seating for a table
  const t = T('s', 0, 0, 2000, 800); t.sides = [3, 3, 0, 0]; PG.applySeating(t, 'dense'); ok(t.sides.join() === '4,4,0,0', 'dense on the used sides: 4,4,0,0');
  PG.applySeating(t, 'comfort'); ok(t.sides.join() === '2,2,0,0', 'comfort: 2,2,0,0');
  const e = T('e', 0, 0, 2000, 800); PG.applySeating(e, 'normal'); ok(e.sides.join() === '3,3,0,0', 'no chairs yet: long sides, normal 3,3');
  const w = T('w', 0, 0, 2000, 800); w.sides = [1, 1, 1, 1]; PG.applySeating(w, 'dense'); ok(w.sides.join() === '4,4,1,1', 'all four sides used: 4,4,1,1');
  const r = Object.assign(PG.makeItem('t_r150', 0, 0), { w: 1800, shape: 'round' }); PG.applySeating(r, 'normal'); ok(r.seats === 9, 'round Ø1,8 normal: 9'); }

/* 28. passages narrower than the minimum (chairs included), and the summary of tables */
{ const T = (id, x, y, o) => Object.assign(PG.makeItem('t_q180', x, y), { id, w: 1800, d: 800, sides: [3, 3, 0, 0] }, o || {});
  for (let k = 0; k < 150; k++) {
    const gap = rnd(50, 1500), a = T('a', 3000, 3000), fa = PG.fullBox(a), b0 = T('b', 0, 3000), fb = PG.fullBox(b0), b = T('b', fa.x1 + gap - fb.x0, 3000);
    const g = PG.narrowGaps({ items: [a, b] }, 900);
    if (gap < 900) { ok(g.length === 1 && Math.abs(g[0].d - gap) < 1, 'gap ' + gap + ' mm found: ' + (g[0] && g[0].d.toFixed(1))); near(Math.hypot(g[0].q[0] - g[0].p[0], g[0].q[1] - g[0].p[1]), g[0].d, 1e-6, 'its two points are that far apart'); }
    else ok(g.length === 0, 'gap ' + gap + ' mm is wide enough');
  }
  // chairs count: two tables 1,2 m apart by the bodies but chairs reach into the gap
  const a = T('a', 3000, 3000), b = T('b', 3000, 3000 + 800 + 1200); const g = PG.narrowGaps({ items: [a, b] }, 900);
  ok(g.length === 1 && g[0].d < 1200, 'chairs make the passage narrower than the bodies: ' + (g[0] && Math.round(g[0].d)));
  ok(PG.narrowGaps({ items: [a, T('c', 3000, 3300)] }, 900).length === 0, 'overlapping ones are a conflict, not a passage');
  ok(PG.narrowGaps({ items: [a, b] }, 0).length === 0, 'minimum 0: off');
  const ga = Object.assign(T('x', 3000, 6000), { grp: 'g1' }), gb = Object.assign(T('y', 5000, 6000), { grp: 'g1' }); ok(PG.narrowGaps({ items: [ga, gb] }, 900).length === 0, 'tables of one group are not a passage');
  ok(PG.normalize({}).aisle === 900 && PG.normalize({ aisle: 0 }).aisle === 0 && PG.normalize({ aisle: 1200 }).aisle === 1200, 'aisle setting saved');
  // summary
  const p = { items: [T('1', 0, 0), T('2', 0, 0), T('3', 0, 0, { sides: [2, 2, 0, 0] }), Object.assign(PG.makeItem('t_r150', 0, 0), { id: 'r', w: 1500, shape: 'round', seats: 8 }), Object.assign(PG.makeItem('t_r150', 0, 0), { id: 's', w: 700, shape: 'round', stand: true }), Object.assign(PG.makeItem('z_podium', 0, 0), { id: 'z' })] };
  const S2 = PG.seatingSummary(p); ok(S2.tables === 4 && S2.stand === 1 && S2.seats === 6 + 6 + 4 + 8, 'totals: 4 tables, 1 standing, 24 seats');
  ok(S2.list[0].label === 'Прямоугольный 1,80×0,80 м' && S2.list[0].n === 3 && S2.list[0].seats === 16, 'rows by kind and size: ' + S2.list.map((r) => r.label + ' ' + r.n).join('; '));
  ok(S2.list.reduce((x, r) => x + r.seats, 0) === S2.seats, 'rows add up to the total seats');
  ok(S2.list[S2.list.length - 1].stand, 'standing tables listed last'); }

/* 29. equal steps in a row: the third table lands at the same gap (outermost points with chairs) or the same centre distance */
{ const R = (id, x, y) => Object.assign(PG.makeItem('t_r150', x, y), { id, w: 1500, shape: 'round', seats: 9 });
  const fb = PG.fullBox(R('q', 0, 0)), W = fb.x1 - fb.x0;   // the table with its chairs
  for (let k = 0; k < 200; k++) {
    const gap = rnd(300, 2500), A = R('a', 2000, 3000), B = R('b', 2000 + W + gap, 3000), p = { rooms: [], items: [A, B] }, M = R('m', 0, 0);
    const off = rnd(-60, 60), want = B.x + (B.x - A.x);   // makeItem rounds positions
    let s = PG.alignSnap(p, M, want + off, 3000 + rnd(-200, 200), 80, 0, { space: 'edge' });
    near(s.x, want, 1e-6, 'third at the same gap ' + gap + ' (off ' + off + ')'); ok(s.spacing.length === 2 && s.spacing.every((m) => Math.abs(m.d - gap) < 1.5 && !m.vert), 'two equal-step marks of ' + gap + ': ' + s.spacing.map((m) => m.d.toFixed(1)));
    s = PG.alignSnap(p, M, A.x - (B.x - A.x) + off, 3000, 80, 0, { space: 'edge' }); near(s.x, A.x - (B.x - A.x), 1e-6, 'also on the left side');
    // between the two: centred, equal gaps both sides
    const C = R('c', 2000 + 2 * (W + gap) + W + 600, 3000), p2 = { rooms: [], items: [A, C] }, mid = (A.x + C.x) / 2;
    s = PG.alignSnap(p2, M, mid + off, 3000, 80, 0, { space: 'edge' }); near(s.x, mid, 1e-6, 'between two: in the middle');
    // centres
    const step = rnd(2500, 5000), A2 = R('a', 1000, 6000), B2 = R('b', 1000 + step, 6000);
    s = PG.alignSnap({ rooms: [], items: [A2, B2] }, M, 1000 + 2 * step + off, 6000, 80, 0, { space: 'center' }); near(s.x, 1000 + 2 * step, 1e-6, 'by centres: step ' + step);
    s = PG.alignSnap({ rooms: [], items: [A2, B2] }, M, 1000 + 2 * step + off, 6000, 80, 0, { space: 'off' }); ok(s.spacing.length === 0, 'off: no equal steps');
  }
  // columns too, and a table in another row does not count
  const A = R('a', 3000, 1000), B = R('b', 3000, 4000), O = R('o', 9000, 2500), M = R('m', 0, 0);
  const s = PG.alignSnap({ rooms: [], items: [A, B, O] }, M, 3000, 7000 + 40, 80, 0, { space: 'center' }); near(s.y, 7000, 1e-6, 'a column by centres'); ok(s.spacing.length === 2 && s.spacing.every((m) => m.vert), 'vertical marks');
  ok(PG.normalize({}).space === 'edge' && PG.normalize({ space: 'center' }).space === 'center' && PG.normalize({ space: 'x' }).space === 'edge', 'setting saved, edge by default'); }

/* 30. measuring by a reference rectangle: the way back from the photo to the plane is exact for points of that plane */
for (let k = 0; k < 300; k++) {
  // a wall plane in mm, seen through a random perspective (the quad), a door 900 × 2100 on it
  const cx = rnd(300, 900), cy = rnd(300, 700), J = () => rnd(150, 300), Q = [[cx - J(), cy - J()], [cx + J(), cy - J()], [cx + J(), cy + J()], [cx - J(), cy + J()]];
  const W = 900, H = 2100, F = PG.sq2quad(Q), ref = { q: Q, w: W, h: H };
  const B = PG.quad2sq(Q); [[0, 0], [1, 0], [1, 1], [0, 1], [0.3, 0.7]].forEach((uv) => { const p = F(uv[0], uv[1]), r = B(p[0], p[1]); near(r[0], uv[0], 1e-7, 'there and back u'); near(r[1], uv[1], 1e-7, 'there and back v'); });
  // two points of the same plane: a length known in mm
  const u1 = Math.random() * 2 - 0.5, v1 = Math.random() * 2 - 0.5, u2 = Math.random() * 2 - 0.5, v2 = Math.random() * 2 - 0.5;
  const want = Math.hypot((u1 - u2) * W, (v1 - v2) * H), L = PG.refLen(ref, F(u1, v1), F(u2, v2));
  if (isFinite(L)) near(L, want, Math.max(1e-6, want * 1e-7), 'length on the reference plane');
  near(PG.refLen(ref, Q[0], Q[1]), W, 1e-6, 'its top side = its width'); near(PG.refLen(ref, Q[1], Q[2]), H, 1e-6, 'its side = its height');
}
ok(PG.refLen({ q: [[0, 0], [10, 0], [10, 10], [0, 10]], w: null, h: 2100 }, [0, 0], [5, 0]) === null, 'no width: no length');
ok(PG.refLen({ q: [[0, 0], [10, 10], [10, 0], [0, 10]], w: 900, h: 2100 }, [0, 0], [5, 0]) === null, 'a folded reference: no length');
{ const n = PG.normPhotos([{ im: 'i', w: 100, h: 100, marks: [{ t: 'dim', a: [0, 0], b: [1, 1], v: 2350, est: true }, { t: 'dim', a: [0, 0], b: [1, 1], v: null, est: true }], ref: { q: [[10, 10], [60, 10], [60, 90], [10, 90]], w: 900, h: '2100' } }]);
  ok(n[0].ref && n[0].ref.w === 900 && n[0].ref.h === 2100, 'reference kept with the photo'); ok(n[0].marks[0].est === true && !n[0].marks[1].est, 'an estimate is marked only with a number'); }

console.log(passes + ' checks passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
