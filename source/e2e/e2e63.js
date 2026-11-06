// v48: equal steps — the third round table snaps to the same gap as between the first two; both gaps shown at once
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await p.click('#modesw [data-v=plan]');await p.click('[data-pact=fly-pick][data-g=room][data-v=rect]');await p.waitForTimeout(150);
 const setup=(space)=>ev((space)=>{const o=PG.gridOrigin(S.plan),R=(id,x,y,n)=>Object.assign(PG.makeItem('t_r150',o[0]+x,o[1]+y),{id,num:n,w:1500,shape:'round',seats:9});S.plan.items=[R('a',2000,2000,1),R('b',5000,2000,2),R('c',9500,5200,3)];S.plan.space=space;PL.st.sel=null;commit()},space);
 const sc=(x,y)=>ev(([x,y])=>{const r=document.getElementById('plan').getBoundingClientRect(),v=PL.st.v;return [r.left+(x-v.x)*v.s,r.top+(y-v.y)*v.s]},[x,y]);
 const go=async(tx,ty)=>{const c=await ev(()=>{const i=S.plan.items.find(i=>i.id==='c');return [i.x,i.y]});const f=await sc(c[0],c[1]),t=await sc(tx,ty);await p.mouse.move(f[0],f[1]);await p.mouse.down();await p.mouse.move(f[0]-20,f[1],{steps:3});await p.mouse.move(t[0],t[1],{steps:12});await p.waitForTimeout(60);const marks=await ev(()=>document.querySelectorAll('#pover .psp').length);await p.mouse.up();await p.waitForTimeout(120);return marks};
 await setup('edge');const o=await ev(()=>PG.gridOrigin(S.plan));const s0=await ev(()=>PL.st.v.s);
 // a—b gap by the outermost chairs; drop c 5 px past the same gap on the right
 const gab=await ev(()=>{const A=PG.fullBox(S.plan.items[0]),B=PG.fullBox(S.plan.items[1]);return B.x0-A.x1});
 let marks=await go(o[0]+8000+5/s0,o[1]+2000+3/s0);
 const res=await ev(()=>{const B=PG.fullBox(S.plan.items[1]),C=PG.fullBox(S.plan.items[2]),c=S.plan.items[2];return {g:C.x0-B.x1,y:c.y}});
 ok(Math.abs(res.g-gab)<1,'third table: the same gap by the outermost chairs: '+res.g.toFixed(1)+' = '+gab.toFixed(1));ok(res.y===o[1]+2000,'and on the same line');
 ok(marks>=6,'both gaps shown with dimension lines while dragging: '+marks+' lines');
 // by centres
 await setup('center');marks=await go(o[0]+8000+5/s0,o[1]+2000);ok(await ev(()=>{const i=S.plan.items;return Math.abs((i[2].x-i[1].x)-(i[1].x-i[0].x))<0.5}),'by centres: equal centre distances');
 // between two: the middle
 await setup('edge');await ev(()=>{const o=PG.gridOrigin(S.plan);S.plan.items[1].x=o[0]+9000;commit()});marks=await go(o[0]+5500+4/s0,o[1]+2000);ok(await ev(()=>{const A=PG.fullBox(S.plan.items[0]),B=PG.fullBox(S.plan.items[1]),C=PG.fullBox(S.plan.items[2]);return Math.abs((C.x0-A.x1)-(B.x0-C.x1))<1}),'between two: equal gaps on both sides');
 // off
 await setup('off');await go(o[0]+8000+5/s0,o[1]+2000);ok(await ev(()=>{const i=S.plan.items;return Math.abs((i[2].x-i[1].x)-(i[1].x-i[0].x))>2}),'«нет»: no equal-step snapping');
 // settings switch
 await ev(()=>{PL.st.sel=null;render()});await p.click('#dock [data-pact=space][data-v=center]');await p.waitForTimeout(80);ok(await ev(()=>S.plan.space)==='center','panel: «Равный шаг: по центрам»');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
