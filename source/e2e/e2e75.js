// v63: the lower dock (Слои / История / Проверки / План) never disappears — a split saved on a tall screen is cut to fit a short one
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:800,height:1280}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 // portrait: the split pulled far down, as on the tablet held upright
 await ev(()=>{UI.dsplit=1000;document.getElementById('dock').style.setProperty('--dsplit','1000px');wsSave()});
 const vis=()=>ev(()=>{const d=document.getElementById('dock').getBoundingClientRect(),t=document.querySelector('#dock .dbot .dtabs').getBoundingClientRect(),bot=document.querySelector('#dock .dbot').getBoundingClientRect();return {tabsVisible:t.height>0&&t.bottom<=d.bottom+1&&t.top>=d.top,botH:Math.round(bot.height),dockH:Math.round(d.height)}});
 let v=await vis();ok(v.tabsVisible&&v.botH>=100,'portrait, split low: tabs visible '+JSON.stringify(v));
 // turned to landscape (short): the saved 1000 px would push the tabs off — they stay
 await p.setViewportSize({width:1280,height:800});await p.waitForTimeout(200);
 v=await vis();ok(v.tabsVisible&&v.botH>=100,'landscape: tabs still visible '+JSON.stringify(v));
 // reload with that saved split
 await p.reload();await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 v=await vis();ok(v.tabsVisible&&v.botH>=100,'reload in landscape: tabs visible '+JSON.stringify(v));
 await p.click('#dock .dbot .dtabs button >> nth=1');await p.waitForTimeout(80);ok(await p.isVisible('#dock .dbot .dtabs'),'tabs usable');
 // the other way: split dragged very high stays at least 90 px of properties
 await ev(()=>{document.getElementById('dock').style.setProperty('--dsplit','10px')});await p.waitForTimeout(50);const th=await ev(()=>document.querySelector('#dock .dtop').getBoundingClientRect().height);ok(th>=89,'properties keep at least 90 px ('+th+')');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
