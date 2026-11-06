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

console.log(passes + ' checks passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
