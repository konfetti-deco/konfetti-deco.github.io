// v38: with touch-action none on fields, a finger tap still focuses them and typing works (scene name, plan name, size)
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854},hasTouch:true,isMobile:false});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 for(const id of ['pname']){const el=await p.$('#'+id);ok(!!el,'field '+id);if(!el)continue;ok(await el.evaluate(i=>getComputedStyle(i).touchAction)==='none','touch-action none: '+id);await el.tap();await p.waitForTimeout(100);ok(await ev((x)=>document.activeElement&&document.activeElement.id===x,id),'tap focuses '+id);await p.keyboard.press('Escape');}
 await ev(()=>{PL.setMode('plan');PL.act('fly-pick',{dataset:{g:'room',v:'rect'}});commit();const it=PG.makeItem('z_podium',3000,3000);S.plan.items.push(it);PL.st.sel={t:'item',i:it.id};commit()});await p.waitForTimeout(150);
 const nm=await p.$('[data-pbind="it.name"]');await nm.tap();await p.waitForTimeout(100);ok(await ev(()=>document.activeElement&&document.activeElement.dataset.pbind==='it.name'),'tap focuses the plan name field');
 await p.keyboard.type('Зеркало');await p.keyboard.press('Enter');await p.waitForTimeout(150);ok(await ev(()=>S.plan.items.some(i=>i.name==='Зеркало')),'typed name saved');
 const w=await p.$('[data-pbind="it.w"]');await w.tap();await p.waitForTimeout(100);ok(await ev(()=>document.activeElement&&document.activeElement.dataset.pbind==='it.w'),'tap focuses a size field');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
