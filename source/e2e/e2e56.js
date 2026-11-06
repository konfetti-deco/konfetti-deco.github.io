// v41: «Слои» of the plan — lock and delete on every row; a locked table is selected by a tap but does not move
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await p.click('#modesw [data-v=plan]');await p.click('[data-pact=fly-pick][data-g=room][data-v=rect]');await p.waitForTimeout(150);
 await ev(()=>{for(let i=0;i<3;i++){const it=PG.makeItem('t_q180',3000+i*3000,3000);it.num=i+1;S.plan.items.push(it)}commit();act('dtab',{dataset:{id:'layers'}})});await p.waitForTimeout(150);
 ok(await ev(()=>document.querySelectorAll('#dock .prw [data-pact=lyr-lock]').length)===4&&await ev(()=>document.querySelectorAll('#dock .prw [data-pact=lyr-del]').length)===4,'every row (room + 3 tables) has lock and delete');
 const id2=await ev(()=>S.plan.items[1].id);
 await p.click('#dock [data-pact=lyr-lock][data-v="i|'+id2+'"]');await p.waitForTimeout(120);ok(await ev((id)=>S.plan.items.find(i=>i.id===id).lock===true,id2),'table №2 locked');
 ok(await ev((id)=>document.querySelector('#dock [data-pact=lyr-lock][data-v="i|'+id+'"]').getAttribute('aria-pressed'),id2)==='true','lock shown as pressed');
 ok((await ev(()=>UI.histL[UI.hi])).includes('закреплено'),'history: закреплено');
 const xy=await ev((id)=>{const it=S.plan.items.find(i=>i.id===id),r=document.getElementById('plan').getBoundingClientRect(),v=PL.st.v;return [r.left+(it.x-v.x)*v.s,r.top+(it.y-v.y)*v.s]},id2);
 await p.mouse.move(xy[0],xy[1]);await p.mouse.down();await p.mouse.move(xy[0]+60,xy[1]+40,{steps:8});await p.mouse.up();await p.waitForTimeout(150);
 ok(await ev((id)=>{const it=S.plan.items.find(i=>i.id===id);return it.x===6000&&it.y===3000},id2),'a drag does not move the locked table');
 await p.mouse.click(xy[0],xy[1]);await p.waitForTimeout(120);ok(await ev((id)=>PL.st.sel&&PL.st.sel.i===id,id2),'but a tap selects it');
 ok(await ev(()=>document.querySelectorAll('#phnd [data-r^="z|"], #phnd [data-r^="q|"]').length)===0,'no size / turn handles on a locked table');
 await p.click('#dock [data-pact=lyr-lock][data-v="i|'+id2+'"]');await p.waitForTimeout(120);ok(await ev((id)=>!S.plan.items.find(i=>i.id===id).lock,id2),'unlocked');
 await p.mouse.move(xy[0],xy[1]);await p.mouse.down();await p.mouse.move(xy[0]+60,xy[1]+97,{steps:8});await p.mouse.up();await p.waitForTimeout(150);ok(await ev((id)=>S.plan.items.find(i=>i.id===id).y!==3000,id2),'unlocked table moves again');
 // delete from the row
 const id3=await ev(()=>S.plan.items[2].id);await p.click('#dock [data-pact=lyr-del][data-v="i|'+id3+'"]');await p.waitForTimeout(120);ok(await ev(()=>S.plan.items.length)===2,'row delete removes the table');
 await p.keyboard.press('Control+z');await p.waitForTimeout(120);ok(await ev(()=>S.plan.items.length)===3,'undo brings it back');
 // room lock: walls and room do not move
 const rid=await ev(()=>S.plan.rooms[0].id);await p.click('#dock [data-pact=lyr-lock][data-v="r|'+rid+'"]');await p.waitForTimeout(100);
 const before=await ev(()=>JSON.stringify(S.plan.rooms[0]));const c=await ev(()=>{const g=PG.roomGeom(S.plan.rooms[0]),q=g.raw[2],r=document.getElementById('plan').getBoundingClientRect(),v=PL.st.v;return [r.left+(q[0]-v.x)*v.s,r.top+(q[1]-v.y)*v.s]});
 await ev(()=>{PL.st.sel={t:'room',r:S.plan.rooms[0].id};render()});await p.mouse.move(c[0],c[1]);await p.mouse.down();await p.mouse.move(c[0]+50,c[1]+50,{steps:6});await p.mouse.up();await p.waitForTimeout(120);
 ok(await ev(()=>JSON.stringify(S.plan.rooms[0]))===before,'locked room keeps its corners');
 await p.waitForTimeout(600);await p.reload();await p.waitForSelector('#canvas');await p.waitForTimeout(400);ok(await ev(()=>S.plan.rooms[0].lock===true),'lock saved with the project');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
