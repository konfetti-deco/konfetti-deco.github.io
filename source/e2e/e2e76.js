// v64: «Вид → Проверка экрана и касаний» — reports the screen and browser, logs taps on the three fields and the drag chip, copies as text
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1.5,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 15; SM-X400) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Safari/537.36'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 await p.click('.mbar .mb[data-id=view]');await p.waitForTimeout(80);await p.click('#mpop [data-act=diag]');await p.waitForTimeout(100);
 ok(await p.isVisible('.dgbox'),'check opens from «Вид»');
 const txt=await p.textContent('.dginfo');ok(/Samsung Internet 28\.0/.test(txt)&&/SM-X400/.test(txt)&&/1280 × 800/.test(txt)&&/1\.5/.test(txt)&&/1920 × 1200/.test(txt),'browser, model, CSS size, pixel ratio, physical pixels: '+txt.replace(/\s+/g,' ').slice(0,200));
 await p.tap('[data-dg="Б"]');await p.waitForTimeout(900);
 const lg=await p.textContent('.dglog');ok(/поле Б: pointerdown \(touch\)/.test(lg)&&/поле Б: фокус/.test(lg)&&/поле Б: click/.test(lg),'a finger tap on a field is logged: '+lg.split('\n').slice(0,5).join(' | '));
 const c=await p.evaluate(()=>{const r=document.querySelector('.dgchip').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]});
 await p.mouse.move(c[0],c[1]);await p.mouse.down();await p.mouse.move(c[0]+60,c[1]+10,{steps:5});await p.mouse.up();await p.waitForTimeout(80);
 ok(/квадрат: pointerup \(mouse\), движений [1-9]/.test(await p.textContent('.dglog')),'drag on the chip logged with moves');
 ok(await p.evaluate(()=>/Браузер: Samsung Internet 28\.0/.test(DG.text())&&/События/.test(DG.text())),'copy text has the report');
 // recording across the app: a tap on a panel field is logged with its name; reopened window keeps the log
 await p.click('.dgrec input');await p.click('.dgx');await p.click('#modesw [data-v=plan]');await p.waitForTimeout(150);
 await p.evaluate(()=>{S.plan.rooms=[PG.makeRoom('Зал',0,0,[[9000,0],[9000,90],[9000,180],[9000,270]])];const a=PG.makeItem('t_q180',2500,2500);a.num=1;S.plan.items=[a];PL.st.sel={t:'item',i:a.id};commit();render()});await p.waitForTimeout(150);
 await p.tap('#dock [data-pbind="it.name"]');await p.waitForTimeout(150);
 await p.evaluate(()=>{const f=document.querySelector('#dock [data-pbind="it.name"]');render();UI.dirty=1;document.querySelector('#dock').innerHTML+='';});await p.waitForTimeout(100);
 await p.click('.mbar .mb[data-id=view]');await p.click('#mpop [data-act=diag]');await p.waitForTimeout(100);
 const L=await p.textContent('.dglog');ok(/pointerdown \(touch\) input\[it\.name\]/.test(L)&&/фокус → input\[it\.name\]/.test(L),'app-wide: the panel field tap logged');
 ok(/ПОЛЕ ПЕРЕРИСОВАНО/.test(L),'a field that loses focus because the panel is redrawn is marked');
 ok(!(await p.evaluate(()=>/\bundefined\b|\bNaN\b/.test(document.querySelector('.dgbox').innerText+document.querySelector('.dgx').innerHTML))),'no undefined in the check');
 await p.click('.dgx');ok(await p.isHidden('.dgbox'),'closes');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
