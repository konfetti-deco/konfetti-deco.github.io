// v48: short layer rows with a shape icon, the «≈» hint only twice, the plan alone as PNG and PDF
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/jspdf/,r=>r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('tmp/jspdf.umd.min.js','utf8')}));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs(?!.*jspdf)|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await ev(()=>{try{localStorage.removeItem('kd.hint.approx')}catch(e){}});
 await p.click('#modesw [data-v=plan]');
 const hint=async()=>{await ev(()=>{S.plan.rooms=[];commit()});await p.waitForTimeout(100);await p.evaluate(()=>{document.getElementById('toast').textContent=''});await ev(()=>PL.act('fly-pick',{dataset:{g:'room',v:'rect'}}));await p.waitForTimeout(150);return (await p.textContent('#toast')).includes('Размеры примерные')};
 ok(await hint(),'hint shown the first time');ok(await hint(),'and the second');ok(!(await hint()),'not the third time');
 await ev(()=>{const o=PG.gridOrigin(S.plan);S.plan.items=[Object.assign(PG.makeItem('t_q180',o[0]+3000,o[1]+3000),{num:1,sides:[3,3,0,0]}),Object.assign(PG.makeItem('t_r150',o[0]+7000,o[1]+3000),{num:2,w:1500,shape:'round',seats:9}),Object.assign(PG.makeItem('t_q180',o[0]+3000,o[1]+6000),{num:3,name:'Президиум',sides:[4,0,0,0],grp:'g1'})];PL.st.sel=null;commit();act('dtab',{dataset:{id:'layers'}})});await p.waitForTimeout(150);
 const rows=await ev(()=>[...document.querySelectorAll('#dock .lyrp .prow span')].map(s=>s.textContent));
 ok(rows.includes('▭ №1 · 1,8×0,8'),'rectangular row: '+rows.join(' | '));ok(rows.includes('◯ №2 · Ø1,5'),'round row with its own icon');ok(rows.some(r=>r==='▭ №3 · Президиум · 1,8×0,8 ⧉'),'own name and the group mark');
 // plan PNG
 const png=await ev(()=>new Promise(res=>{const o=IO.save;IO.save=function(n,bl){IO.save=o;res({n,size:bl.size,type:bl.type});return Promise.resolve(true)};act('plan-png')}));ok(/^План .*\.png$/.test(png.n)&&png.size>30000,'PNG: '+png.n+' '+png.size);
 const pdf=await ev(()=>new Promise(res=>{const o=IO.save;IO.save=function(n,bl){IO.save=o;bl.arrayBuffer().then(a=>{const s=new TextDecoder('latin1').decode(new Uint8Array(a));res({n,head:s.slice(0,5),land:/\/MediaBox \[0 0 841\.8\d* 595\.2\d*\]/.test(s)})});return Promise.resolve(true)};act('plan-pdf')}));
 ok(pdf.head==='%PDF-'&&/^План .*\.pdf$/.test(pdf.n),'PDF: '+pdf.n);ok(pdf.land,'A4 landscape');
 const shot=await ev(()=>RP.planCanvas(1).toDataURL('image/jpeg',.85));fs.writeFileSync('tmp/shots/p24-planpdf.jpg',Buffer.from(shot.split(',')[1],'base64'));
 await ev(()=>{PL.st.sel=null;act('dtab',{dataset:{id:'props'}})});await p.waitForTimeout(80);ok(await ev(()=>!!document.querySelector('#dock [data-act=plan-pdf]')&&!!document.querySelector('#dock [data-act=plan-png]')),'«Скачать план» buttons in the panel');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
