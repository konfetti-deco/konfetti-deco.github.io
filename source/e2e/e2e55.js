// v41: rulers on the plan, guides pulled out of them, objects snap to guides; switches for snapping and rulers
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('console: '+m.text().slice(0,200))});
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await p.click('#modesw [data-v=plan]');await p.click('[data-pact=fly-pick][data-g=room][data-v=rect]');await p.waitForTimeout(200);
 const R=await ev(()=>{const r=document.getElementById('plan').getBoundingClientRect();return {l:r.left,t:r.top,w:r.width,h:r.height}});
 ok(await ev(()=>document.querySelectorAll('#prul .prb').length)===3,'rulers drawn (top, left, corner)');
 const labs=await ev(()=>[...document.querySelectorAll('#prul .prl text')].map(t=>t.textContent));ok(labs.includes('0')&&labs.length>6,'ruler numbers from corner A: '+labs.slice(0,8).join(' '));
 const sc=(x,y)=>ev(([x,y])=>{const r=document.getElementById('plan').getBoundingClientRect(),v=PL.st.v;return [r.left+(x-v.x)*v.s,r.top+(y-v.y)*v.s]},[x,y]);
 // pull a horizontal guide from the top ruler to y = 2000 mm from corner A
 const o=await ev(()=>PG.gridOrigin(S.plan));const tgt=await sc(o[0]+5000,o[1]+2003);
 await p.mouse.move(R.l+400,R.t+10);await p.mouse.down();await p.mouse.move(R.l+400,R.t+60,{steps:4});await p.mouse.move(tgt[0],tgt[1],{steps:8});
 ok(await ev(()=>!document.getElementById('ptip').hidden&&document.getElementById('ptip').textContent.includes('от угла A')),'tip shows the distance from corner A: '+await ev(()=>document.getElementById('ptip').textContent));
 await p.mouse.up();await p.waitForTimeout(150);
 let G=await ev(()=>S.plan.guides);ok(G.length===1&&!G[0].vert&&Math.abs(G[0].at-(o[1]+2000))<=10,'horizontal guide at ≈2 m: '+JSON.stringify(G));
 ok((await ev(()=>UI.histL[UI.hi])).includes('направляющая'),'history: направляющая');
 ok(await ev(()=>document.querySelectorAll('#pover .pgl').length)===1&&await ev(()=>document.querySelectorAll('#prul .prgm').length)===1,'guide line and its ruler marker drawn');
 // exact value from the panel
 ok(await ev(()=>PL.st.sel&&PL.st.sel.t==='guide'),'guide selected after pulling');
 await p.fill('[data-pbind="g.at"]','2,5');await p.press('[data-pbind="g.at"]','Enter');await p.waitForTimeout(120);ok(await ev(()=>S.plan.guides[0].at)===o[1]+2500,'typed 2,5 m → guide at 2500 from A');
 // a vertical guide from the left ruler
 const tv=await sc(o[0]+3000,o[1]+6000);await p.mouse.move(R.l+10,R.t+400);await p.mouse.down();await p.mouse.move(R.l+60,R.t+400,{steps:4});await p.mouse.move(tv[0],tv[1],{steps:8});await p.mouse.up();await p.waitForTimeout(120);
 G=await ev(()=>S.plan.guides);ok(G.length===2&&G[1].vert&&Math.abs(G[1].at-(o[0]+3000))<=10,'vertical guide at ≈3 m');
 // a table snaps to both guides by its centre
 await ev(()=>{const it=PG.makeItem('t_q180',8000,5000);it.num=1;S.plan.items.push(it);PL.st.sel=null;commit()});
 const s0=await ev(()=>PL.st.v.s);const f=await sc(8000,5000),t=await sc(o[0]+3000+5/s0,o[1]+2500-4/s0);
 await p.mouse.move(f[0],f[1]);await p.mouse.down();await p.mouse.move(f[0]-20,f[1],{steps:3});await p.mouse.move(t[0],t[1],{steps:10});await p.mouse.up();await p.waitForTimeout(120);
 let it=await ev(()=>{const i=S.plan.items[0];return {x:i.x,y:i.y}});ok(it.x===o[0]+3000&&it.y===o[1]+2500,'table centre lands on the crossing of the guides: '+JSON.stringify(it));
 // edge snap: top edge onto the horizontal guide
 const hb=await ev(()=>{const i=S.plan.items[0],b=PG.itemBBox(i);return (b.y1-b.y0)/2});
 const f2=await sc(it.x,it.y),t2=await sc(o[0]+6500,o[1]+2500+hb+3/s0);await p.mouse.move(f2[0],f2[1]);await p.mouse.down();await p.mouse.move(f2[0]+20,f2[1],{steps:3});await p.mouse.move(t2[0],t2[1],{steps:10});await p.mouse.up();await p.waitForTimeout(120);
 ok(await ev(()=>{const b=PG.itemBBox(S.plan.items[0]);return b.y0})===o[1]+2500,'top edge snapped onto the guide');
 // dragging a guide back to its ruler removes it
 const gy=await sc(o[0]+9000,o[1]+2500);await p.mouse.move(gy[0],gy[1]);await p.mouse.down();await p.mouse.move(gy[0],gy[1]-30,{steps:3});await p.mouse.move(gy[0],R.t+8,{steps:8});await p.mouse.up();await p.waitForTimeout(120);
 ok(await ev(()=>S.plan.guides.length)===1,'guide dragged onto the ruler is removed');ok((await ev(()=>UI.histL[UI.hi])).includes('убрана'),'history: направляющая убрана');
 await p.keyboard.press('Control+z');await p.waitForTimeout(120);ok(await ev(()=>S.plan.guides.length)===2,'undo brings it back');
 // switches
 await p.click('#statbar [data-pact=smart]');await p.waitForTimeout(80);ok(await ev(()=>S.plan.smart)===false,'«к объектам» off');
 await p.click('#statbar [data-pact=rulers]');await p.waitForTimeout(80);ok(await ev(()=>S.plan.rulers===false&&document.querySelectorAll('#prul .prb').length===0&&document.querySelectorAll('#pover .pgl').length===0),'«линейки» off: rulers and guides hidden');
 await p.click('#statbar [data-pact=rulers]');await p.waitForTimeout(80);await p.click('#statbar [data-pact=smart]');await p.waitForTimeout(80);
 // pan updates the rulers
 const l0=await ev(()=>document.querySelector('#prul .prl text').getAttribute('x'));await ev(()=>{PL.st.v={...PL.st.v,x:PL.st.v.x-777,user:true};PL.paint()});const l1=await ev(()=>document.querySelector('#prul .prl text').getAttribute('x'));ok(l0!==l1,'rulers follow panning');
 // saved with the project
 await p.waitForTimeout(600);await p.reload();await p.waitForSelector('#canvas');await p.waitForTimeout(500);ok(await ev(()=>S.plan.guides.length===2&&S.plan.rulers!==false),'guides kept after reload');
 await p.screenshot({path:'tmp/shots/p17-rulers.png'});
 ok(!errs.length,'no page errors: '+errs.slice(0,3).join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
