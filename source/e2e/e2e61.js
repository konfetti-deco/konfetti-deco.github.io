// v46: several objects — «Несколько» (taps and frame), move together, line up, spread evenly, renumber, one seating
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('console: '+m.text().slice(0,200))});
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await p.click('#modesw [data-v=plan]');await p.click('[data-pact=fly-pick][data-g=room][data-v=rect]');await p.waitForTimeout(150);
 const o=await ev(()=>PG.gridOrigin(S.plan));
 await ev((o)=>{const T=(id,x,y,n)=>Object.assign(PG.makeItem('t_q180',o[0]+x,o[1]+y),{id,num:n,sides:[3,3,0,0]});S.plan.items=[T('a',2000,2000,7),T('b',5200,2600,3),T('c',9000,1800,9),T('d',3000,6000,1)];PL.st.sel=null;commit()},o);
 const sc=(id)=>ev((id)=>{const it=S.plan.items.find(i=>i.id===id),r=document.getElementById('plan').getBoundingClientRect(),v=PL.st.v;return [r.left+(it.x-v.x)*v.s,r.top+(it.y-v.y)*v.s]},id);
 await p.click('.tools [data-pact=ptool][data-v=multi]');ok(await ev(()=>PL.st.tool)==='multi','«Несколько» on');
 for(const id of ['a','b','c']){const q=await sc(id);await p.mouse.click(q[0],q[1]);await p.waitForTimeout(80)}
 ok(await ev(()=>PL.st.multi.slice().sort().join())==='a,b,c','three tables chosen by taps');ok((await p.textContent('#dock')).includes('Выделено: 3'),'panel: Выделено: 3');
 const q=await sc('b');await p.mouse.click(q[0],q[1]);await p.waitForTimeout(80);ok(await ev(()=>PL.st.multi.slice().sort().join())==='a,c','a second tap takes one away');
 await p.mouse.click(q[0],q[1]);await p.waitForTimeout(80);
 // line up by the top
 await p.click('#dock .igl.sh:has-text("Выровнять и распределить")');await p.waitForTimeout(80);await p.click('#dock [data-pact=m-align][data-v=top]');await p.waitForTimeout(100);
 ok(await ev(()=>{const t=['a','b','c'].map(id=>PG.itemBBox(S.plan.items.find(i=>i.id===id)).y0);return Math.max(...t)-Math.min(...t)<0.2}),'tops on one line');ok(await ev(()=>S.plan.items.find(i=>i.id==='d').y)===o[1]+6000,'the unchosen table untouched');
 ok((await ev(()=>UI.histL[UI.hi])).includes('по верху'),'history: выровнено по верху');
 // spread evenly, then with a 1 m gap
 await p.click('#dock [data-pact=m-dist][data-v=x]');await p.waitForTimeout(100);
 let g=await ev(()=>{const B=['a','b','c'].map(id=>PG.itemBBox(S.plan.items.find(i=>i.id===id))).sort((u,v)=>u.x0-v.x0);return [B[1].x0-B[0].x1,B[2].x0-B[1].x1]});ok(Math.abs(g[0]-g[1])<0.5,'equal gaps: '+g.map(Math.round));
 await p.fill('[data-pbind="m.gap"]','1');await p.press('[data-pbind="m.gap"]','Enter');await p.waitForTimeout(80);await p.click('#dock [data-pact=m-dist][data-v=x]');await p.waitForTimeout(100);
 g=await ev(()=>{const B=['a','b','c'].map(id=>PG.itemBBox(S.plan.items.find(i=>i.id===id))).sort((u,v)=>u.x0-v.x0);return [B[1].x0-B[0].x1,B[2].x0-B[1].x1]});ok(Math.abs(g[0]-1000)<0.5&&Math.abs(g[1]-1000)<0.5,'gaps exactly 1 m: '+g.map(Math.round));
 // move all three by dragging one
 const before=await ev(()=>['a','b','c','d'].map(id=>{const i=S.plan.items.find(x=>x.id===id);return [i.x,i.y]}));const qa=await sc('a');
 await p.mouse.move(qa[0],qa[1]);await p.mouse.down();await p.mouse.move(qa[0]+20,qa[1]+20,{steps:3});await p.mouse.move(qa[0]+40,qa[1]+63,{steps:6});await p.mouse.up();await p.waitForTimeout(120);
 const after=await ev(()=>['a','b','c','d'].map(id=>{const i=S.plan.items.find(x=>x.id===id);return [i.x,i.y]}));
 const dA=[after[0][0]-before[0][0],after[0][1]-before[0][1]];ok(Math.abs(dA[0])>100&&[1,2].every(k=>Math.abs(after[k][0]-before[k][0]-dA[0])<0.2&&Math.abs(after[k][1]-before[k][1]-dA[1])<0.2),'dragging one moves all three by the same step');
 ok(after[3][0]===before[3][0]&&after[3][1]===before[3][1],'the fourth stays');ok((await ev(()=>UI.histL[UI.hi])).includes('3 объекта'),'history: перемещение — 3 объекта');
 // seating and numbers for the chosen ones
 await p.click('#dock [data-pact=seat-set][data-v=dense]');await p.waitForTimeout(100);ok(await ev(()=>['a','b','c'].every(id=>S.plan.items.find(i=>i.id===id).sides.join()==='3,3,0,0'))&&await ev(()=>S.plan.items.find(i=>i.id==='d').sides.join())==='3,3,0,0','dense on 1,8 m: 3,3 (already the most)');
 await p.click('#dock [data-pact=seat-set][data-v=comfort]');await p.waitForTimeout(100);ok(await ev(()=>['a','b','c'].every(id=>S.plan.items.find(i=>i.id===id).sides.join()==='2,2,0,0')&&S.plan.items.find(i=>i.id==='d').sides.join()==='3,3,0,0'),'comfort on the chosen: 2,2 — the fourth unchanged');
 await p.click('#dock [data-pact=m-num][data-v=rows]');await p.waitForTimeout(100);ok(await ev(()=>['a','b','c'].map(id=>S.plan.items.find(i=>i.id===id).num).join())==='3,4,5','chosen renumbered from their smallest: 3,4,5');
 // frame selection
 await p.keyboard.press('Escape');await p.waitForTimeout(80);ok(await ev(()=>PL.st.multi.length)===0,'Esc clears');
 const R=await ev(()=>{const r=document.getElementById('plan').getBoundingClientRect();return {l:r.left,t:r.top,w:r.width,h:r.height}});const qd=await sc('d');
 await p.mouse.move(qd[0]-90,qd[1]-60);await p.mouse.down();await p.mouse.move(qd[0],qd[1],{steps:4});await p.mouse.move(qd[0]+90,qd[1]+60,{steps:4});await p.waitForTimeout(60);ok(await ev(()=>document.querySelectorAll('#pover .pmq').length)===1,'frame drawn while dragging');await p.mouse.up();await p.waitForTimeout(100);
 ok(await ev(()=>PL.st.sel&&PL.st.sel.i==='d'&&PL.st.multi.length===0),'frame around one table selects it alone');
 // whole plan renumber + seating for all
 await ev(()=>{PL.st.tool=null;PL.st.multi=[];PL.st.sel=null;render()});await p.click('#dock [data-pact=renum][data-v=rows]');await p.waitForTimeout(100);
 ok(await ev(()=>S.plan.items.map(i=>i.num).sort((a,b)=>a-b).join())==='1,2,3,4','whole plan numbered 1–4');
 await p.click('#dock [data-pact=seat-set][data-all="1"][data-v=normal]');await p.waitForTimeout(100);ok(await ev(()=>S.plan.items.every(i=>i.sides.join()==='3,3,0,0')),'«Посадка всем: обычно» → 3,3 everywhere');
 // single table: seating buttons, current one pressed
 await ev(()=>{PL.st.sel={t:'item',i:'a'};render()});await p.waitForTimeout(80);ok(await ev(()=>document.querySelector('#dock [data-pact=seat-set][data-v=normal]').getAttribute('aria-pressed'))==='true','single table: «обычно» shown as current');
 await p.click('#dock [data-pact=seat-set][data-v=free]');await p.waitForTimeout(80);ok(await ev(()=>S.plan.items.find(i=>i.id==='a').sides.join())==='2,2,0,0','single table: «свободно» → 2,2');
 // Delete removes all chosen
 await ev(()=>{PL.st.multi=['b','c'];PL.st.sel=null;render()});await p.keyboard.press('Delete');await p.waitForTimeout(100);ok(await ev(()=>S.plan.items.length)===2,'Delete removes both chosen');await p.keyboard.press('Control+z');await p.waitForTimeout(100);ok(await ev(()=>S.plan.items.length)===4,'undo');
 ok(!errs.length,'no page errors: '+errs.slice(0,3).join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
