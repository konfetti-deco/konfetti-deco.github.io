// v40: a picked object appears at once (no «Коснитесь, чтобы поставить»), lines up with others while dragged, grid with snapping
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('console: '+m.text().slice(0,200))});
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await p.click('#modesw [data-v=plan]');await p.click('[data-pact=fly-pick][data-g=room][data-v=rect]');await p.waitForTimeout(200);
 const pick=async(g,v,at)=>{await ev(([g,v])=>PL.act('fly-pick',{dataset:{g,v}}),[g,v]);await p.waitForTimeout(100);const xy=await ev((at)=>{const r=document.getElementById('plan').getBoundingClientRect(),v=PL.st.v,o=PG.gridOrigin(S.plan);return [r.left+(o[0]+at[0]-v.x)*v.s,r.top+(o[1]+at[1]-v.y)*v.s]},at||[6000,4000]);await p.mouse.click(xy[0],xy[1]);await p.waitForTimeout(150)};
 const h0=await ev(()=>UI.hi);await ev(()=>PL.act('fly-pick',{dataset:{g:'tables',v:'t_q180'}}));await p.waitForTimeout(100);
 ok(await ev(()=>!document.getElementById('pbanner').hidden&&document.getElementById('pbanner').textContent.includes('Коснитесь места')&&!document.getElementById('pbanner').textContent.includes('Готово')),'banner «Коснитесь места…» without «Готово»');
 await ev(()=>PL.st.tool=null);await pick('tables','t_q180',[3000,2000]);
 let st=await ev(()=>({n:S.plan.items.length,tool:PL.st.tool,sel:PL.st.sel&&PL.st.sel.t,ban:document.getElementById('pbanner').hidden,it:S.plan.items[0]}));
 ok(st.n===1&&st.sel==='item'&&!st.tool,'one tap places the table, selected, tool ended: '+JSON.stringify({n:st.n,tool:st.tool,sel:st.sel}));ok(st.ban,'banner gone after the tap');
 ok(await ev(()=>UI.hi)===h0+1&&(await ev(()=>UI.histL[UI.hi])).includes('Прямоугольный'),'one history step');
 const inView=await ev(()=>{const it=S.plan.items[0],v=PL.st.v,r=document.getElementById('plan').getBoundingClientRect(),x=(it.x-v.x)*v.s,y=(it.y-v.y)*v.s;return x>0&&x<r.width&&y>0&&y<r.height&&PG.pointInPoly([it.x,it.y],PG.roomGeom(S.plan.rooms[0]).pts)});ok(await ev(()=>{const it=S.plan.items[0],o=PG.gridOrigin(S.plan);return Math.abs(it.x-(o[0]+3000))<=10&&Math.abs(it.y-(o[1]+2000))<=10}),'placed where tapped');
 await pick('tables','t_q180',[6000,2000]);await pick('tables','t_r150',[9000,5000]);
 ok(await ev(()=>S.plan.items.filter(i=>i.kind==='table').map(i=>i.num).join())==='1,2,3','numbered 1, 2, 3');
 await pick('open','door',[12000,4000]);ok(await ev(()=>S.plan.rooms[0].walls.some(w=>(w.ops||[]).some(o=>o.type==='door'))&&PL.st.sel.t==='op'&&S.plan.rooms[0].walls[1].ops.length===1),'door: one tap on wall B–C puts it there');
 await pick('col','sq',[1000,7000]);ok(await ev(()=>S.plan.items.some(i=>i.kind==='column')&&!PL.st.tool),'column: one tap');
 await pick('tables','P',[6000,6000]);ok(await ev(()=>S.plan.items.filter(i=>i.ref==='t_q220').length)>=3,'П-образный: one tap');
 // dragging: line up with another table
 await ev(()=>{S.plan.items=S.plan.items.filter(i=>i.kind==='table'&&i.ref!=='t_q220').slice(0,2);S.plan.items[0].x=3000;S.plan.items[0].y=2500;S.plan.items[1].x=7000;S.plan.items[1].y=5500;PL.st.sel=null;commit()});await p.waitForTimeout(150);
 const scr=(x,y)=>ev(([x,y])=>{const r=document.getElementById('plan').getBoundingClientRect(),v=PL.st.v;return [r.left+(x-v.x)*v.s,r.top+(y-v.y)*v.s]},[x,y]);
 const B=await ev(()=>({x:S.plan.items[1].x,y:S.plan.items[1].y,s:PL.st.v.s}));const from=await scr(B.x,B.y);
 const tgtY=2500+4/B.s;   // 4 px off the line of table 1
 const to=await scr(B.x,tgtY);
 await p.mouse.move(from[0],from[1]);await p.mouse.down();await p.mouse.move(from[0],from[1]-20,{steps:3});await p.mouse.move(to[0],to[1],{steps:8});await p.waitForTimeout(80);
 const mid=await ev(()=>({g:document.querySelectorAll('#pover .pgd').length,y:S.plan.items[1].y}));ok(mid.g>=1,'guide line shown while dragging: '+mid.g);ok(mid.y===2500,'snapped onto table 1\'s line: y='+mid.y);
 await p.mouse.up();await p.waitForTimeout(120);ok(await ev(()=>S.plan.items[1].y)===2500,'stays on the line after release');ok(await ev(()=>document.querySelectorAll('#pover .pgd').length)===0,'guide gone after release');
 ok((await ev(()=>UI.histL[UI.hi])).includes('перемещение'),'history: перемещение');
 // Shift: free
 const f2=await scr(7000,2500),t2=await scr(7000,2500+4/B.s+0);await p.keyboard.down('Shift');await p.mouse.move(f2[0],f2[1]);await p.mouse.down();await p.mouse.move(f2[0],f2[1]+30,{steps:3});await p.mouse.move(t2[0],t2[1]+0.5,{steps:6});await p.mouse.up();await p.keyboard.up('Shift');await p.waitForTimeout(100);
 ok(await ev(()=>S.plan.items[1].y)!==2500,'Shift: moves freely, no snapping: y='+await ev(()=>S.plan.items[1].y));
 // grid: status bar switch
 await p.click('#statbar [data-pact=snapcyc]');await p.waitForTimeout(120);ok(await ev(()=>S.plan.snap)===1000,'status bar: сетка 1 м');ok(await ev(()=>document.querySelectorAll('#pgrid .pg3 line').length)>10,'1 m grid lines drawn');
 ok((await p.textContent('#statbar')).includes('сетка 1 м'),'switch shows «сетка 1 м»');
 await ev(()=>{S.plan.items[1].x=7000;S.plan.items[1].y=6000;commit()});const f3=await scr(7000,6000),t3=await scr(8330,6000+0);
 await p.mouse.move(f3[0],f3[1]);await p.mouse.down();await p.mouse.move(f3[0]+20,f3[1],{steps:3});await p.mouse.move(t3[0],t3[1],{steps:8});await p.mouse.up();await p.waitForTimeout(100);
 const o=await ev(()=>PG.gridOrigin(S.plan));ok(await ev((o)=>{const x=S.plan.items[1].x;return (x-o[0])%1000===0},o),'centre lands on the 1 m grid: x='+await ev(()=>S.plan.items[1].x));
 await p.click('#statbar [data-pact=snapcyc]');await p.waitForTimeout(80);ok(await ev(()=>S.plan.snap)===500,'then 0,5 м');await p.click('#statbar [data-pact=snapcyc]');await p.waitForTimeout(80);ok(await ev(()=>S.plan.snap)===0,'then off');
 // a photo marked on the plan at once
 await p.click('#modesw [data-v=photo]');await p.setInputFiles('.fadd input >> nth=0','tmp/hall_test.jpg');await p.waitForFunction(()=>(S.photos||[]).length===1);await p.waitForTimeout(150);
 await ev(()=>PF.act('pin',{dataset:{}}));await p.waitForTimeout(200);ok(await ev(()=>UI.mode==='plan'&&PL.st.tool&&PL.st.tool.indexOf('pin:')===0),'photo: tap-to-mark tool');const pp=await ev(()=>{const r=document.getElementById('plan').getBoundingClientRect(),v=PL.st.v,o=PG.gridOrigin(S.plan);return [r.left+(o[0]+2000-v.x)*v.s,r.top+(o[1]+6000-v.y)*v.s]});await p.mouse.click(pp[0],pp[1]);await p.waitForTimeout(150);ok(await ev(()=>S.plan.items.some(i=>i.kind==='photo')&&!PL.st.tool),'one tap marks the photo');
 ok(!errs.length,'no page errors: '+errs.slice(0,3).join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
