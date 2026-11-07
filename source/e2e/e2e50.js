// v39: tables placed with the tool, then undo (button, Ctrl+Z, history list) — the plan follows every step
const {chromium}=require('playwright');const path=require('path');
const FILE=process.env.FILE||'dist/konstruktor-fotozon.html';
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854},hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('console: '+m.text().slice(0,200))});
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve(FILE));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a).catch(e=>{errs.push('evaluate: '+e.message.split('\n')[0]);return null});
 await p.click('#modesw [data-v=plan]');await ev(()=>{PL.act('fly-pick',{dataset:{g:'room',v:'rect'}});commit()});await p.waitForTimeout(150);
 const box=await ev(()=>{const r=document.getElementById('plan').getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height}});
 for(let i=0;i<4;i++){await ev(()=>{PL.act('fly-pick',{dataset:{g:'tables',v:'t_q180'}})});await p.waitForTimeout(80);await p.touchscreen.tap(box.x+box.w*(0.3+i*0.12),box.y+box.h*0.5);await p.waitForTimeout(120)}
 ok(await ev(()=>PL.st.tool)===null,'each tap places one table and ends the tool');
 const n=()=>ev(()=>S.plan.items.filter(i=>i.kind==='table').length);
 ok(await n()===4,'4 tables placed: '+await n());
 const domN=()=>ev(()=>document.querySelectorAll('#pitems [data-id], #pitems > g').length);const d4=await domN();
 await p.click('#qbar [data-id=undo]');await p.waitForTimeout(150);ok(await n()===3,'undo button: 3 tables');ok(await domN()<d4,'plan redrawn after undo');
 ok(await ev(()=>{const h=document.querySelector('#dock .phead h3');return h?h.textContent:''})!=='Стол №4','panel title no longer «Стол №4»: '+await ev(()=>{const h=document.querySelector('#dock .phead h3');return h?h.textContent:''}));
 await p.keyboard.press('Control+z');await p.waitForTimeout(150);ok(await n()===2,'Ctrl+Z: 2 tables');
 // the history list: tap an earlier step
 await ev(()=>act('dtab',{dataset:{id:'hist'}}));await p.waitForTimeout(100);
 const rows=await p.$$('[data-act=hgo], .hrow, [data-act=hist]');ok(rows.length>0,'history rows shown: '+rows.length);
 const hiBefore=await ev(()=>UI.hi);if(rows.length){await rows[Math.max(0,hiBefore-2)].click().catch(()=>{});await p.waitForTimeout(150)}
 ok(await ev(()=>UI.hi)<hiBefore,'history row tap moves back: '+hiBefore+' → '+await ev(()=>UI.hi));
 await p.click('#qbar [data-id=redo]');await p.waitForTimeout(150);ok(await ev(()=>UI.hi)>0,'redo works');
 ok(await ev(()=>(window.__renderErrors||[]).length===0),'no drawing errors: '+await ev(()=>JSON.stringify(window.__renderErrors||[])));
 ok(!errs.length,'no page errors: '+errs.slice(0,3).join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
