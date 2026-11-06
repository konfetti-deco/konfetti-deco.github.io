// v51: several chosen objects can be duplicated (panel, optbar, long-press menu, Ctrl+D)
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await p.click('#modesw [data-v=plan]');await p.click('[data-pact=fly-pick][data-g=room][data-v=rect]');await p.waitForTimeout(150);
 await ev(()=>{const o=PG.gridOrigin(S.plan),T=(id,x,y,n,o2)=>Object.assign(PG.makeItem('t_r150',o[0]+x,o[1]+y),{id,num:n,w:1500,shape:'round',seats:9},o2||{});S.plan.items=[T('a',2000,2000,1),T('b',4500,2000,2,{lock:true}),T('c',2000,5000,3,{grp:'g1'}),T('d',4500,5000,4,{grp:'g1'})];PL.st.multi=['a','b'];PL.st.sel=null;commit()});await p.waitForTimeout(100);
 ok(await ev(()=>!!document.querySelector('#dock [data-pact=m-dup]')),'«Дублировать 2» in the panel');
 await p.click('#dock [data-pact=m-dup]');await p.waitForTimeout(120);
 let r=await ev(()=>({n:S.plan.items.length,sel:PL.st.multi.slice(),nums:S.plan.items.map(i=>i.num),copies:PL.st.multi.map(id=>S.plan.items.find(i=>i.id===id))}));
 ok(r.n===6,'two copies added');ok(r.sel.length===2&&!r.sel.includes('a')&&!r.sel.includes('b'),'the copies are now selected');
 ok(r.copies.every(c=>!c.lock),'copies are not locked');ok(r.nums.slice(4).sort().join()==='5,6','copies numbered on: 5, 6');
 ok(await ev(()=>{const A=PG.fullBox(S.plan.items.find(i=>i.id==='b')),C=PL.st.multi.map(id=>PG.fullBox(S.plan.items.find(i=>i.id===id)));return C.every(c=>c.x0>A.x1)}),'copies stand to the right, not on top of the originals');
 ok((await ev(()=>UI.histL[UI.hi])).includes('копия — 2'),'history: копия — 2 объекта');
 // a group duplicated stays a group of its own
 await ev(()=>{PL.st.multi=['c','d'];render()});await p.keyboard.press('Control+d');await p.waitForTimeout(120);
 r=await ev(()=>{const C=PL.st.multi.map(id=>S.plan.items.find(i=>i.id===id));return {n:S.plan.items.length,g:C.map(c=>c.grp)}});ok(r.n===8&&r.g[0]&&r.g[0]===r.g[1]&&r.g[0]!=='g1','Ctrl+D: the group copied as a new group');
 // optbar and long-press menu
 ok(await ev(()=>!!document.querySelector('#optbar [data-pact=m-dup]')),'optbar has «Дублировать выделенные»');
 const q=await ev(()=>{const it=S.plan.items.find(i=>i.id===PL.st.multi[0]),r=document.getElementById('plan').getBoundingClientRect(),v=PL.st.v;return [r.left+(it.x-v.x)*v.s,r.top+(it.y-v.y)*v.s]});
 await p.mouse.click(q[0],q[1],{button:'right'});await p.waitForTimeout(120);ok(await ev(()=>[...document.querySelectorAll('#pctx .cxi')].some(b=>b.textContent==='Дублировать')),'long-press menu of a selection: «Дублировать»');
 await p.click('#pctx .cxi >> text=Дублировать');await p.waitForTimeout(120);ok(await ev(()=>S.plan.items.length)===10,'menu → two more copies');
 await p.keyboard.press('Control+z');await p.waitForTimeout(100);ok(await ev(()=>S.plan.items.length)===8,'undo removes the copies');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
