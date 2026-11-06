// v43: handles in the middle of each side change only the length or only the width; the opposite side stays put
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await p.click('#modesw [data-v=plan]');await p.click('[data-pact=fly-pick][data-g=room][data-v=rect]');await p.waitForTimeout(150);
 const put=(o)=>ev((o)=>{S.plan.items=[];const it=Object.assign(PG.makeItem(o.ref||'t_q180',6000,4000),o);it.sides=[0,0,0,0];S.plan.items.push(it);PL.st.sel={t:'item',i:it.id};commit();PL.st.v={s:0.12,x:2000,y:1000,user:true};PL.paint()},o);
 const hpos=(h)=>ev((h)=>{const n=document.querySelector('#phnd [data-r$="|'+h+'"]');if(!n)return null;const r=n.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]},h);
 const drag=async(h,dx,dy,shift)=>{const a=await hpos(h);if(!a)return false;if(shift)await p.keyboard.down('Shift');await p.mouse.move(a[0],a[1]);await p.mouse.down();await p.mouse.move(a[0]+dx/2,a[1]+dy/2,{steps:4});await p.mouse.move(a[0]+dx,a[1]+dy,{steps:6});await p.mouse.up();if(shift)await p.keyboard.up('Shift');await p.waitForTimeout(120);return true};
 const box=()=>ev(()=>{const i=S.plan.items[0],b=PG.itemBBox(i);return {w:i.w,d:i.d,x0:Math.round(b.x0),x1:Math.round(b.x1),y0:Math.round(b.y0),y1:Math.round(b.y1)}});
 await put({w:1800,d:800});
 ok(await ev(()=>document.querySelectorAll('#phnd [data-r*="|e"]').length)===4,'4 side handles + 4 corners on a rectangular table');
 let b0=await box();await drag('e1',60,0);let b1=await box();   // 60 px at 0.12 px/mm = 500 mm
 ok(Math.abs(b1.w-2300)<=10&&b1.d===800,'right side: only the length grows 1,8 → 2,3 m: '+b1.w+'×'+b1.d);ok(b1.x0===b0.x0,'left side did not move');
 b0=b1;await drag('e2',0,48);b1=await box();ok(Math.abs(b1.d-1200)<=10&&b1.w===b0.w,'bottom side: only the depth 0,8 → 1,2 m: '+b1.w+'×'+b1.d);ok(b1.y0===b0.y0,'top side did not move');
 b0=b1;await drag('e3',36,0);b1=await box();ok(Math.abs(b1.w-(b0.w-300))<=10&&b1.x1===b0.x1,'left side pulled in: shorter, right side fixed');
 b0=b1;await drag('e0',0,-24);b1=await box();ok(Math.abs(b1.d-(b0.d+200))<=10&&b1.y1===b0.y1,'top side out: deeper, bottom side fixed');
 b0=b1;await drag('2',24,24);b1=await box();ok(Math.abs(b1.w-(b0.w+200))<=10&&Math.abs(b1.d-(b0.d+200))<=10&&b1.x0===b0.x0&&b1.y0===b0.y0,'corner: both sizes, the opposite corner fixed');
 ok((await ev(()=>UI.histL[UI.hi])).includes('размер'),'history: размер');
 // Shift: from the centre
 const c0=await ev(()=>[S.plan.items[0].x,S.plan.items[0].y]);await drag('e1',24,0,true);ok(await ev((c)=>S.plan.items[0].x===c[0],c0),'Shift: grows on both sides, centre stays');
 // rotated 90°: the side handle still changes its own dimension
 await put({w:1800,d:800,rot:90});b0=await box();await drag('e1',0,60);b1=await box();ok(Math.abs(b1.w-2300)<=10&&b1.d===800&&b1.y0===b0.y0,'turned 90°: the side handle lengthens it along its own side');
 // round: one diameter handle only; tiny table: no side handles
 await put({ref:'t_r150',w:1500,shape:'round'});await p.waitForTimeout(150);await ev(()=>PL.paint());ok(await ev(()=>document.querySelectorAll('#phnd [data-r*="|e"]').length)===0,'round table: no side handles');
 await put({w:250,d:200,ref:'t_q180'});ok(await ev(()=>document.querySelectorAll('#phnd [data-r*="|e"]').length)===0,'small on screen: side handles hidden, corners stay');
 // chairs that no longer fit go when the side is shortened
 await put({w:2000,d:800});await ev(()=>{S.plan.items[0].sides=[4,4,1,1];commit()});await drag('e1',-96,0);ok(await ev(()=>S.plan.items[0].sides[0])<=2,'shorter side: extra chairs taken away: '+await ev(()=>S.plan.items[0].sides.join()));
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
