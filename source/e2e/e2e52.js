// v39: the plan and the photo refit when the screen size changes (rotation, panel folded) — size now comes from a ResizeObserver
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await p.click('#modesw [data-v=plan]');await ev(()=>{PL.act('fly-pick',{dataset:{g:'room',v:'rect'}});commit()});await p.waitForTimeout(200);
 const w0=await ev(()=>PL.st.lastW);ok(w0>300,'plan fitted: '+w0);
 await p.setViewportSize({width:900,height:1200});await p.waitForTimeout(400);
 const w1=await ev(()=>({lw:PL.st.lastW,cw:document.getElementById('planhost').clientWidth}));ok(Math.abs(w1.lw-w1.cw)<=3&&w1.lw<w0,'after rotation the plan refits by itself: '+JSON.stringify(w1));
 // room still fully in view
 ok(await ev(()=>{const g=document.querySelector('#plan').getBoundingClientRect(),bb=PG.planBBox(S.plan),v=PL.st.v;const x0=(bb.x0-v.x)*v.s,x1=(bb.x1-v.x)*v.s;return x0>=-1&&x1<=g.width+1}),'room inside the view');
 await p.click('#modesw [data-v=photo]');await p.setInputFiles('.fadd input >> nth=0','tmp/hall_test.jpg');await p.waitForFunction(()=>(S.photos||[]).length===1);await p.waitForTimeout(300);
 const f0=await ev(()=>PF.st.lastW);await p.setViewportSize({width:1280,height:800});await p.waitForTimeout(400);
 const f1=await ev(()=>({lw:PF.st.lastW,cw:document.getElementById('photohost').clientWidth}));ok(Math.abs(f1.lw-f1.cw)<=3&&f1.lw!==f0,'photo refits too: '+f0+' → '+JSON.stringify(f1));
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
