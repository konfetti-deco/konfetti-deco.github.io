// v59: with several chosen (a group), touching another object — a table, a door, a wall, a room — chooses that one; «Несколько» still adds
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:854}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await p.click('#modesw [data-v=plan]');await p.waitForTimeout(150);
 await ev(()=>{const r=PG.makeRoom('Зал',0,0,[[9000,0],[12000,90],[9000,180],[12000,270]]);PG.addOpening(r.walls[3],'door2',12000,6000);S.plan.rooms=[r];const L=[];let n=1;
   for(const [x,y] of [[2500,3000],[3300,3000],[2500,4800],[3300,4800]]){const t=PG.makeItem('t_q180',x,y);t.rot=90;t.num=n++;t.grp='gA';L.push(t)}
   const s1=PG.makeItem('t_q180',2000,10000);s1.id='S1';s1.num=n++;const s2=PG.makeItem('t_q180',6000,10500);s2.id='S2';s2.num=n++;L.push(s1,s2);S.plan.items=L;
   PL.st.multi=L.slice(0,4).map(i=>i.id);PL.st.sel=null;PL.st.v={s:0.055,x:-1500,y:-2600,user:true};commit();render()});await p.waitForTimeout(150);
 const scr=(x,y)=>ev(([x,y])=>{const r=document.getElementById('plan').getBoundingClientRect(),v=PL.st.v;return [r.left+(x-v.x)*v.s,r.top+(y-v.y)*v.s]},[x,y]);
 const tap=async(x,y)=>{const q=await scr(x,y);await p.mouse.click(q[0],q[1]);await p.waitForTimeout(100)};
 ok(await ev(()=>PL.st.multi.length===4),'group of 4 chosen');
 await tap(2000,10000);ok(await ev(()=>PL.st.multi.length===0&&PL.st.sel&&PL.st.sel.i==='S1'),'tap on a standalone table: it is chosen, the group is let go');
 ok(await ev(()=>/Стол №5/.test(document.querySelector('#dock .phead').textContent)),'its properties on the right');
 await tap(2500,3000);ok(await ev(()=>PL.st.multi.length===4),'tap on a group member: the group again');
 await tap(6000,10500);ok(await ev(()=>PL.st.sel&&PL.st.sel.i==='S2'&&!PL.st.multi.length),'second standalone table');
 await tap(2500,3000);
 await tap(0,6000);ok(await ev(()=>PL.st.sel&&PL.st.sel.t==='op'&&!PL.st.multi.length),'tap on the door: the door is chosen');
 await tap(2500,3000);
 await tap(9000,8000);ok(await ev(()=>PL.st.sel&&(PL.st.sel.t==='wall')&&!PL.st.multi.length),'tap on a wall: the wall is chosen');
 await tap(2500,3000);
 const a=await scr(6000,10500),c=await scr(7000,11000);await p.mouse.move(a[0],a[1]);await p.mouse.down();await p.mouse.move(c[0],c[1],{steps:6});await p.mouse.up();await p.waitForTimeout(100);
 ok(await ev(()=>PL.st.sel&&PL.st.sel.i==='S2'&&!PL.st.multi.length&&Math.abs(S.plan.items.find(i=>i.id==='S2').x-7000)<120),'dragging another table: it moves and is chosen alone');
 ok(await ev(()=>S.plan.items.slice(0,4).every((t,k)=>Math.abs(t.x-[2500,3300,2500,3300][k])<1)),'the group did not move');
 // «Несколько» still adds
 await tap(2500,3000);await p.click('.tools [data-pact=ptool][data-v=multi]');await p.waitForTimeout(60);await tap(2000,10000);
 ok(await ev(()=>PL.st.multi.length===5&&PL.st.multi.indexOf('S1')>=0),'with «Несколько» on, a tap adds to the group selection');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
