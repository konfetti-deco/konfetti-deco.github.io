// v36: names are typed with the letter keyboard; a podium renamed to «Зеркало» shows everywhere
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await ev(()=>{PL.setMode('plan');PL.act('fly-pick',{dataset:{g:'room',v:'rect'}});commit();const it=PG.makeItem('z_podium',3000,3000);S.plan.items.push(it);PL.st.sel={t:'item',i:it.id};commit()});await p.waitForTimeout(150);
 const nm=await p.$('[data-pbind="it.name"]');ok(!!nm,'name field present');
 ok(await nm.getAttribute('inputmode')==='text','name field: letter keyboard (inputmode=text), was decimal');
 ok(await p.$eval('[data-pbind="it.w"]',i=>i.getAttribute('inputmode'))==='decimal','size fields keep the number keyboard');
 await nm.click();await p.keyboard.type('Зеркало');await p.keyboard.press('Enter');await p.waitForTimeout(150);
 ok(await ev(()=>S.plan.items.find(i=>i.sub==='stage'||/podium/.test(i.cat||'')||i.kind==='zone').name)==='Зеркало','item renamed: Зеркало');
 const dock=await p.textContent('#dock');ok(dock.includes('Зеркало'),'panel shows Зеркало');
 ok(await ev(()=>document.getElementById('pitems').textContent.includes('Зеркало')),'plan label shows Зеркало');
 // clearing the name brings the catalogue name back
 await p.fill('[data-pbind="it.name"]','');await p.press('[data-pbind="it.name"]','Enter');await p.waitForTimeout(120);
 ok(await ev(()=>document.getElementById('pitems').textContent.includes('Подиум')),'empty name → back to «Подиум»');
 // room name too
 await ev(()=>{PL.st.sel={t:'room',r:S.plan.rooms[0].id};render()});await p.waitForTimeout(100);
 const rn=await p.$('[data-pbind="r.name"]');ok(rn&&await rn.getAttribute('inputmode')==='text','room name: letter keyboard');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
