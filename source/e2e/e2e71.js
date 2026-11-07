// v56: shapes (place, draw free form and line, move points, add and remove points, style, obstacle) and dimensions (side in one tap, two points, follow the object, edit, delete) in the plan; PDF still draws
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/jspdf/,r=>r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('tmp/jspdf.umd.min.js','utf8')}));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs(?!.*jspdf)|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await p.click('#modesw [data-v=plan]');await p.waitForTimeout(150);
 await ev(()=>{S.plan.rooms=[PG.makeRoom('Зал',0,0,[[9000,0],[6000,90],[9000,180],[6000,270]])];S.plan.items=[];S.plan.dims=[];PL.st.sel=null;PL.st.v={s:0.08,x:-1500,y:-2600,user:true};commit();render()});await p.waitForTimeout(150);
 const scr=(x,y)=>ev(([x,y])=>{const r=document.getElementById('plan').getBoundingClientRect(),v=PL.st.v;return [r.left+(x-v.x)*v.s,r.top+(y-v.y)*v.s]},[x,y]);
 const tap=async(x,y)=>{const q=await scr(x,y);await p.mouse.click(q[0],q[1]);await p.waitForTimeout(90)};
 const dragMM=async(x0,y0,x1,y1)=>{const a=await scr(x0,y0),c=await scr(x1,y1);await p.mouse.move(a[0],a[1]);await p.mouse.down();await p.mouse.move(c[0],c[1],{steps:8});await p.mouse.up();await p.waitForTimeout(100)};
 // the «Фигуры» tool lists the shapes
 await p.click('.tools [data-ptool=geo]');await p.waitForTimeout(100);
 ok(await ev(()=>[...document.querySelectorAll('[data-pact=fly-pick][data-g=geo]')].map(b=>b.dataset.v).join(','))==='g_rect,g_oval,g_tri,g_wall,free,line','Фигуры: rectangle, circle, triangle, partition, own form, line');
 await p.click('[data-pact=fly-pick][data-g=geo][data-v=g_rect]');await p.waitForTimeout(80);await tap(6000,1500);
 ok(await ev(()=>{const it=S.plan.items[0];return it&&it.kind==='shape'&&it.shape==='rect'&&Math.abs(it.x-6000)<20&&PL.st.tool===null}),'rectangle placed by one tap, tool off');
 ok(await ev(()=>!!document.querySelector('#dock .swc')&&/Заливка/.test(document.getElementById('dock').textContent)),'shape properties: colours, fill');
 // style
 await p.click('#dock [data-pact=sh-col][data-v="#FF5FA2"]');await p.click('#dock [data-pact=sh-set][data-k=fill][data-v=hatch]');await p.click('#dock [data-pact=sh-set][data-k=lw][data-v="3"]');await p.waitForTimeout(80);
 ok(await ev(()=>{const it=S.plan.items[0];return it.col==='#FF5FA2'&&it.fill==='hatch'&&it.lw===3&&!!document.querySelector('#pdefs pattern#phFF5FA2')}),'colour, hatching, thick outline');
 // not an obstacle by default; marked → a table on it is flagged
 await ev(()=>{const t=PG.makeItem('t_q180',6000,1500);t.num=1;S.plan.items.push(t);commit();render()});await p.waitForTimeout(80);
 ok(await ev(()=>!PG.conflicts(S.plan).some(q=>q.a===S.plan.items[0].id||q.b===S.plan.items[0].id)),'a plain shape: a table on it is fine');
 await ev(()=>{PL.st.sel={t:'item',i:S.plan.items[0].id};render()});await p.waitForTimeout(80);await p.click('#dock [data-pbind="it.solid"]');await p.waitForTimeout(80);
 ok(await ev(()=>PG.conflicts(S.plan).some(q=>q.a===S.plan.items[0].id||q.b===S.plan.items[0].id)),'marked as an obstacle: the table on it is flagged');
 await ev(()=>{S.plan.items.pop();commit();render()});
 // free form: tap 4 points, close on the first
 await p.click('.tools [data-ptool=geo]');await p.click('[data-pact=fly-pick][data-g=geo][data-v=free]');await p.waitForTimeout(80);
 for(const q of [[600,3500],[2600,3500],[2600,5000],[600,5000]])await tap(q[0],q[1]);
 await tap(600,3500);
 ok(await ev(()=>{const it=S.plan.items.find(i=>i.ref==='g_free');return it&&it.pts.length===4&&Math.abs(it.w-2000)<5&&Math.abs(it.d-1500)<5&&!PL.st.draw}),'own form: 4 points, closed on the first');
 const fid=await ev(()=>S.plan.items.find(i=>i.ref==='g_free').id);
 // drag a point (snaps to the room corner when near)
 await ev((id)=>{PL.st.sel={t:'item',i:id};render()},fid);await p.waitForTimeout(80);
 await dragMM(600,5000,40,5960);
 ok(await ev((id)=>{const it=S.plan.items.find(i=>i.id===id),W=it.pts.map(q=>PG.toWorld(it,q[0],q[1]));return W.some(q=>Math.abs(q[0])<1&&Math.abs(q[1]-6000)<1)},fid),'a point dragged near the corner sticks to it');
 ok(await ev((id)=>{const it=S.plan.items.find(i=>i.id===id),bb=PG.bboxOf(it.pts);return Math.abs(bb.x0+bb.x1)<0.5&&Math.abs(bb.y0+bb.y1)<0.5},fid),'points re-centred after the move');
 // «+» in the middle of a side adds a point
 const mid=await ev((id)=>{const it=S.plan.items.find(i=>i.id===id),a=PG.toWorld(it,it.pts[0][0],it.pts[0][1]),c=PG.toWorld(it,it.pts[1][0],it.pts[1][1]);return [(a[0]+c[0])/2,(a[1]+c[1])/2]},fid);
 await dragMM(mid[0],mid[1],mid[0],mid[1]-700);
 ok(await ev((id)=>S.plan.items.find(i=>i.id===id).pts.length===5,fid),'«+» added a point');
 // tap a point → remove it
 const v2=await ev((id)=>{const it=S.plan.items.find(i=>i.id===id);return PG.toWorld(it,it.pts[1][0],it.pts[1][1])},fid);
 await tap(v2[0],v2[1]);ok(await ev(()=>!!PL.st.vsel&&PL.st.vsel.k===1),'tap chooses a point');
 await p.click('#dock [data-pact=v-del]');await p.waitForTimeout(80);ok(await ev((id)=>S.plan.items.find(i=>i.id===id).pts.length===4,fid),'point removed');
 // size by numbers stretches the points
 await ev((id)=>{PL.st.sel={t:'item',i:id};render()},fid);await p.waitForTimeout(60);
 await p.fill('#dock [data-pbind="it.w"]','3');await p.press('#dock [data-pbind="it.w"]','Enter');await p.waitForTimeout(100);
 ok(await ev((id)=>{const it=S.plan.items.find(i=>i.id===id),bb=PG.bboxOf(it.pts);return Math.abs(it.w-3000)<2&&Math.abs(bb.x1-bb.x0-3000)<2},fid),'length 3 m: points stretched');
 // a line: 3 points + «Готово»
 await p.click('.tools [data-ptool=geo]');await p.click('[data-pact=fly-pick][data-g=geo][data-v=line]');await p.waitForTimeout(80);
 for(const q of [[4000,4500],[5500,5200],[7500,4400]])await tap(q[0],q[1]);
 await p.click('#pbanner [data-pact=draw-done]');await p.waitForTimeout(100);
 ok(await ev(()=>{const it=S.plan.items.find(i=>i.ref==='g_line');return it&&it.open&&it.pts.length===3&&PG.shapeLength(it)>3500}),'line of 3 points');
 // on the upper layer a shape is a hanging piece
 await p.click('.tools .plyr [data-v=top]');await p.waitForTimeout(80);await p.click('.tools [data-ptool=geo]');await p.click('[data-pact=fly-pick][data-g=geo][data-v=g_oval]');await tap(7000,3000);
 ok(await ev(()=>{const it=S.plan.items.find(i=>i.ref==='g_oval');return it&&it.top===true}),'circle on «Верх»: a hanging piece');
 await p.click('.tools .plyr [data-v=floor]');await p.waitForTimeout(80);
 // dimensions: a side in one tap
 await ev(()=>{const t=PG.makeItem('t_q180',3500,1500);t.id='TT';t.num=2;S.plan.items.push(t);PL.st.sel=null;commit();render()});await p.waitForTimeout(80);
 await p.click('.tools [data-pact=ptool][data-v=dim]');await p.waitForTimeout(80);
 ok(await ev(()=>document.querySelectorAll('#pdim .pkp').length>10),'«Размер»: corners shown as dots');
 await tap(4500,0);
 ok(await ev(()=>{const d=S.plan.dims[0];return d&&d.a.ref&&d.a.ref.t==='r'&&d.b.ref&&Math.abs(PG.dimGeom(S.plan,d).L-9000)<1&&PG.dimGeom(S.plan,d).A2[1]<0}),'tap on wall A–B: 9,000, outside the room');
 ok(await ev(()=>/9,000/.test(document.getElementById('plab').textContent)),'its text on the plan');
 // two corners of the table
 await tap(3500-900+40,1500-400+40);await tap(3500+900-40,1500+400-40);
 ok(await ev(()=>{const d=S.plan.dims[1];return d&&d.a.ref&&d.a.ref.id==='TT'&&d.b.ref&&d.b.ref.id==='TT'&&Math.abs(PG.dimGeom(S.plan,d).L-Math.hypot(1800,800))<1}),'two taps near the table corners: diagonal, stuck to the corners');
 // a free point and a corner
 await tap(1000,2600);await tap(0,6000);ok(await ev(()=>{const d=S.plan.dims[2];return d&&!d.a.ref&&d.b.ref&&d.b.ref.t==='r'}),'free start, corner end');
 // the table moves → its dimension follows
 await p.click('.tools [data-pact=ptool][data-v=""]');await p.waitForTimeout(60);
 const before=await ev(()=>PG.dimGeom(S.plan,S.plan.dims[1]).A);
 await ev(()=>{const t=S.plan.items.find(i=>i.id==='TT');t.x+=1000;commit();render()});await p.waitForTimeout(60);
 const after=await ev(()=>PG.dimGeom(S.plan,S.plan.dims[1]).A);ok(Math.abs(after[0]-before[0]-1000)<1,'table moved 1 m: its dimension moved too');
 // choose a dimension by tapping its text; edit
 const dm0=await ev(()=>{const g=PG.dimGeom(S.plan,S.plan.dims[0]);return g.mid});await tap(dm0[0],dm0[1]);
 ok(await ev(()=>PL.st.sel&&PL.st.sel.t==='dim'),'tap on the line chooses the dimension');
 await p.fill('#dock [data-pbind="dm.txt"]','9 м по договору');await p.press('#dock [data-pbind="dm.txt"]','Enter');await p.waitForTimeout(80);
 ok(await ev(()=>S.plan.dims[0].txt==='9 м по договору'&&/9 м по договору/.test(document.getElementById('plab').textContent)),'own text');
 await p.click('#dock [data-pact=d-set][data-k=fs][data-v="4"]');await p.click('#dock [data-pact=d-set][data-k=arr][data-v=tick]');await p.waitForTimeout(80);
 ok(await ev(()=>S.plan.dims[0].fs===4&&S.plan.dims[0].arr==='tick'&&!!document.querySelector('#pdim .pdm.tick')),'big font, ticks');
 // drag the offset bar
 const g0=await ev(()=>PG.dimGeom(S.plan,S.plan.dims[0]));await dragMM(g0.mid[0],g0.mid[1],g0.mid[0],g0.mid[1]-600);
 ok(await ev((y)=>{const g=PG.dimGeom(S.plan,S.plan.dims[0]);return g.A2[1]<y-400},g0.A2[1]),'line pulled further out');
 // horizontal / vertical
 await ev(()=>{PL.st.sel={t:'dim',d:S.plan.dims[1].id};render()});await p.click('#dock [data-pact=d-set][data-k=dir][data-v=h]');await p.waitForTimeout(80);ok(await ev(()=>Math.abs(PG.dimGeom(S.plan,S.plan.dims[1]).L-1800)<1),'horizontal: 1,800');
 // Layers list has them; delete from the actions panel
 ok(await ev(()=>document.querySelectorAll('#dock [data-sel^="d|"]').length===3||[...document.querySelectorAll('[data-sel^="d|"]')].length===3),'Layers: 3 dimensions');
 await p.click('#qbar [data-id=del]');await p.waitForTimeout(80);ok(await ev(()=>S.plan.dims.length===2),'deleted from the actions panel');
 await p.keyboard.press('Control+z');await p.waitForTimeout(100);ok(await ev(()=>S.plan.dims.length===3),'undo brings it back');
 // the corner's object deleted: the end stays where it was
 const e1=await ev(()=>PG.dimGeom(S.plan,S.plan.dims[1]).A);
 await ev(()=>{S.plan.items=S.plan.items.filter(i=>i.id!=='TT');commit();render()});await p.waitForTimeout(80);
 ok(await ev((e)=>{const d=S.plan.dims[1],g=PG.dimGeom(S.plan,d);return !d.a.ref&&Math.abs(g.A[0]-e[0])<1&&Math.abs(g.A[1]-e[1])<1},e1),'object gone: the end stays in place, now free');
 // saved and loaded again
 ok(await ev(()=>{const n=PG.normalize(JSON.parse(JSON.stringify(S.plan)));return n.dims.length===3&&n.items.filter(i=>i.kind==='shape').length===S.plan.items.filter(i=>i.kind==='shape').length&&n.items.find(i=>i.ref==='g_line').open===true}),'normalize keeps shapes and dimensions');
 // the PDF plan draws them
 ok(await ev(()=>{const cv=RP.planCanvas(0.5),c=cv.getContext('2d'),d=c.getImageData(0,0,cv.width,cv.height).data;let blue=0,pink=0;for(let i=0;i<d.length;i+=4){if(d[i]<80&&d[i+1]>90&&d[i+1]<140&&d[i+2]>200)blue++;if(d[i]>230&&d[i+1]<130&&d[i+2]>140)pink++}return blue>50&&pink>50}),'PDF/PNG plan: dimensions (blue) and the pink shape drawn');
 ok(!(await ev(()=>/\bundefined\b|\bNaN\b/.test(document.body.innerText))),'no undefined on screen');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
