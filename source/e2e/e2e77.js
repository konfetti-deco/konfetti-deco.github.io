// v66: «Стилус в полях» — keyboard (fields take no gesture) or handwriting (fields let the system take the pen); remembered on this device
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:800}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ta=()=>p.evaluate(()=>{const f=document.querySelector('#pname')||document.querySelector('input[type=text]');return getComputedStyle(f).touchAction});
 ok(await ta()==='none','default: keyboard mode, fields take no gesture');
 await p.click('.mbar .mb[data-id=view]');await p.waitForTimeout(80);
 ok(await p.isVisible('#mpop [data-act=pen][data-id=hand]')&&await p.evaluate(()=>/✓|on/.test(document.querySelector('#mpop [data-act=pen][data-id=key]').className+document.querySelector('#mpop [data-act=pen][data-id=key]').textContent)),'«Вид»: both choices, keyboard ticked');
 await p.click('#mpop [data-act=pen][data-id=hand]');await p.waitForTimeout(80);
 ok(await ta()==='auto','handwriting: fields let the pen through');
 await p.reload();await p.waitForSelector('#canvas');await p.waitForTimeout(300);ok(await ta()==='auto','remembered after reload');
 await p.evaluate(()=>DG.open());ok(/Стилус в полях\s*рукописный ввод/.test(await p.textContent('.dginfo')),'shown in the check');await p.click('.dgx');
 await p.click('.mbar .mb[data-id=view]');await p.click('#mpop [data-act=pen][data-id=key]');await p.waitForTimeout(80);ok(await ta()==='none','back to keyboard');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
