// v37: the measurement report — pages from the plan and the photos; its numbers are the plan's and the photos'
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/jspdf/,r=>r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('tmp/jspdf.umd.min.js','utf8')}));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs(?!.*jspdf)|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 // empty project: one page that says so
 let r=await ev(()=>RP.build(1).then(x=>({n:x.pages.length,w:x.pages[0].width,h:x.pages[0].height})));ok(r.n===1&&r.w===1240&&r.h===1754,'empty: one A4 page '+JSON.stringify(r));
 // a hall with tables, two photos with sizes
 await ev(()=>{PL.setMode('plan');PL.act('fly-pick',{dataset:{g:'room',v:'rect'}});commit();S.plan.rooms[0].name='Банкетный зал';for(let i=0;i<6;i++)S.plan.items.push(PG.makeItem('t_r150',2500+i*1500,3000));commit();PL.setMode('photo')});
 await p.setInputFiles('.fadd input >> nth=0','tmp/hall_test.jpg');await p.waitForFunction(()=>(S.photos||[]).length===1);
 await p.setInputFiles('.fadd input >> nth=0','tmp/hall_test.jpg');await p.waitForFunction(()=>(S.photos||[]).length===2);
 await ev(()=>{const w=S.plan.rooms[0].walls;S.photos[0].marks=[{id:'a',t:'dim',a:[100,100],b:[700,100],v:8000,col:'#FF4D4F'},{id:'b',t:'dim',a:[700,100],b:[700,500],v:3000,col:'#FF4D4F'},{id:'c',t:'dim',a:[700,500],b:[100,500],v:8000,col:'#FF4D4F'},{id:'d',t:'dim',a:[100,500],b:[100,100],v:3000,col:'#FF4D4F'},{id:'e',t:'text',a:[300,300],text:'розетка',col:'#FFD43B'}];
   PG.sendToWall(S.plan,S.photos[0].marks[0],S.plan.rooms[0].id,w[1].id);S.photos[1].marks=[{id:'x',t:'dim',a:[50,50],b:[400,50],v:null,col:'#FF4D4F'}];commit()});
 r=await ev(()=>RP.build(1).then(x=>{const D=x.data,R=PG.reportData(S.plan,S.photos),blank=x.pages.map(cv=>{const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let n=0;for(let i=0;i<d.length;i+=40)if(d[i]<240)n++;return n});return {n:x.pages.length,same:JSON.stringify(D)===JSON.stringify(R),D,blank}}));
 ok(r.n>=2,'pages: '+r.n);ok(r.same,'report data = PG.reportData of the project');ok(r.blank.every(n=>n>200),'every page has content '+r.blank.join(','));
 ok(r.D.rooms[0].name==='Банкетный зал'&&r.D.tables===6&&r.D.seats===60,'6 tables, 60 seats');ok(r.D.rooms[0].walls[1].len===8000&&r.D.rooms[0].walls[1].from[0].photo==='hall_test','wall B–C = 8 m from the photo');
 ok(r.D.photos[0].figs.length===1&&r.D.photos[0].figs[0].P===22000,'figure P 22 m');ok(r.D.nonum===1,'one size without a number');
 ok(await ev(()=>Math.abs(PG.reportData(S.plan,S.photos).area-PG.roomGeom(S.plan.rooms[0]).area)<1e-6),'total area = the room area');
 // pages as pictures for a look
 const shots=await ev(()=>RP.build(1).then(x=>x.pages.map(cv=>cv.toDataURL('image/jpeg',.85))));shots.forEach((u,i)=>fs.writeFileSync('tmp/shots/rep'+(i+1)+'.jpg',Buffer.from(u.split(',')[1],'base64')));
 // the PDF itself, through the File menu
 const got=await ev(()=>new Promise(res=>{const o=IO.save;IO.save=function(n,bl){IO.save=o;bl.arrayBuffer().then(a=>{const s=new TextDecoder('latin1').decode(new Uint8Array(a));res({n,size:bl.size,head:s.slice(0,5),pages:(s.match(/\/Type \/Page\b/g)||[]).length})});return Promise.resolve(true)};RP.pdf()}));
 ok(got.head==='%PDF-'&&/^Обмер .*\.pdf$/.test(got.n),'PDF made: '+got.n+' '+got.size+' bytes');ok(got.pages===r.n,'PDF pages = report pages ('+got.pages+')');
 ok((await ev(()=>document.body.innerHTML)).includes('report-pdf'),'report button present');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
