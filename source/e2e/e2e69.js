// v53: File menu lists (План / Фото / Сцена) with PDF and PNG each; the bigger left toolbar
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/jspdf/,r=>r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('tmp/jspdf.umd.min.js','utf8')}));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs(?!.*jspdf)|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 // grab what would be saved: name, size, and for PDFs the page boxes
 const grab=(name,click)=>ev(([name,click])=>new Promise(res=>{const o=IO.save;const t=setTimeout(()=>{IO.save=o;res(null)},20000);IO.save=function(n,bl){IO.save=o;clearTimeout(t);bl.arrayBuffer().then(a=>{const s=new TextDecoder('latin1').decode(new Uint8Array(a));res({n,size:bl.size,pdf:s.slice(0,5)==='%PDF-',pages:(s.match(/\/Type \/Page\b(?!s)/g)||[]).length,land:(s.match(/\/MediaBox \[0 0 841\.8\d* 595\.2\d*\]/g)||[]).length,port:(s.match(/\/MediaBox \[0 0 595\.2\d* 841\.8\d*\]/g)||[]).length})});return Promise.resolve(true)};if(click)document.querySelector(click).click();else act(name)}),[name,click]);
 // toolbar size
 const tb=await ev(()=>{const r=document.querySelector('.tools .tb').getBoundingClientRect(),c=document.querySelector('.tools').getBoundingClientRect(),s=document.querySelector('.tools .tb svg').getBoundingClientRect(),d=document.querySelector('.dstrip .tb');return [r.width,r.height,c.width,s.width,d?d.getBoundingClientRect().width:0]});
 ok(tb[0]>=46&&tb[1]>=44&&tb[2]>=54&&tb[3]>=24,'left toolbar: buttons '+tb[0]+'×'+tb[1]+', column '+tb[2]+', icon '+tb[3]);
 ok(tb[4]===0||tb[4]<40,'right strip unchanged ('+tb[4]+')');
 // menu: three lists, closed
 await p.click('.mbar .mb[data-id=file]');await p.waitForTimeout(80);
 ok(await ev(()=>[...document.querySelectorAll('#mpop .msb')].map(b=>b.dataset.id).join(','))==='plan,photo,scene','three lists: План, Фото, Сцена');
 ok(await ev(()=>!document.querySelector('#mpop [data-act=plan-pdf]').offsetParent),'lists closed at first');
 ok(await ev(()=>/пуст/.test(document.querySelector('#mpop .msb[data-id=plan]').textContent)),'empty plan marked «пуст»');
 await p.click('#mpop .msb[data-id=scene]');await p.waitForTimeout(80);
 ok(await p.isVisible('#mpop [data-act=scene-pdf]')&&await p.isVisible('#mpop [data-act=png]')&&await p.isVisible('#mpop [data-act=offer-pdf]'),'Сцена opens: PDF, PNG, offer');
 ok(await ev(()=>{const m=document.querySelector('#mpop .msub.open .msubm').getBoundingClientRect(),w=document.querySelector('#mpop').getBoundingClientRect();return m.left>=w.right-4&&m.right<=innerWidth}),'list flies out to the right, on screen');
 await p.click('#mpop .msb[data-id=plan]');await p.waitForTimeout(80);
 ok(await p.isVisible('#mpop [data-act=plan-pdf]')&&!(await p.isVisible('#mpop [data-act=scene-pdf]')),'one list at a time');
 ok(await ev(()=>document.querySelector('#mpop [data-act=plan-pdf]').disabled),'plan PDF disabled for an empty plan');
await p.click('#mpop .msb[data-id=plan]');await p.mouse.move(900,700);await p.waitForTimeout(60);ok(!(await p.isVisible('#mpop [data-act=plan-pdf]'))&&await p.isVisible('#mpop'),'second tap closes the list, the menu stays');
 // scene PDF and PNG
 await p.click('#mpop .msb[data-id=scene]');await p.waitForTimeout(60);
 const sp=await (async()=>{return grab('scene-pdf','#mpop [data-act=scene-pdf]')})();ok(sp&&sp.pdf&&sp.pages===1&&sp.land===1&&/^Сцена .*\.pdf$/.test(sp.n)&&sp.size>40000,'scene PDF: one A4 landscape page '+JSON.stringify(sp));
 ok(await p.isHidden('#mpop'),'menu closed after the action');
 const sn=await grab('png');ok(sn&&sn.size>40000&&/\.png$/.test(sn.n),'scene PNG '+JSON.stringify(sn&&{n:sn.n,size:sn.size}));
 // the scene sheet itself: picture and footer drawn
 ok(await ev(()=>IO.sceneCanvas(1200,{dims:true}).then(sc=>{const cv=RP.sceneSheet(sc,0.5),c=cv.getContext('2d'),d=c.getImageData(0,0,cv.width,cv.height).data;let n=0;for(let i=0;i<d.length;i+=16)if(d[i]<235||d[i+1]<235)n++;return cv.width>cv.height&&n>2000})),'scene sheet: landscape, has content');
 // plan
 await ev(()=>{S.plan.rooms=[PG.makeRoom('Зал',0,0,[[9000,0],[6000,90],[9000,180],[6000,270]])];commit();render()});
 const pp=await grab('plan-pdf');ok(pp&&pp.pdf&&pp.land===1,'plan PDF still works');
 // photos: none open, two in the project → this-photo items wait for an open photo; all-photos PDF has two pages
 await p.click('#modesw [data-v=photo]');await p.setInputFiles('.fadd input >> nth=0',['tmp/hall_test.jpg','tmp/hall_test.jpg']);await p.waitForFunction(()=>(S.photos||[]).length===2);await p.waitForTimeout(300);
 await ev(()=>{PF.st.open=null;render()});await p.waitForTimeout(100);
 await p.click('.mbar .mb[data-id=file]');await p.click('#mpop .msb[data-id=photo]');await p.waitForTimeout(80);
 ok(await ev(()=>document.querySelector('#mpop [data-act=photo-pdf]').disabled&&/Откройте фото/.test(document.querySelector('#mpop .msubm .mhd').textContent)),'no open photo: «это фото» disabled with a hint');
 ok(await ev(()=>/2 шт/.test(document.querySelector('#mpop .msb[data-id=photo]').textContent)),'count shown');
 await p.keyboard.press('Escape');
 const all=await grab('photos-pdf');ok(all&&all.pdf&&all.pages===2,'all photos: 2 pages '+JSON.stringify(all));
 // open one, add a size and a try-on-free sheet
 await ev(()=>{const ph=S.photos[0];ph.name='Сцена у окна';ph.marks.push({id:'d1',t:'dim',a:[50,50],b:[300,50],v:2400,text:'ширина ниши'});PF.st.open=ph.id;render()});await p.waitForTimeout(200);
 await p.click('.mbar .mb[data-id=file]');await p.click('#mpop .msb[data-id=photo]');await p.waitForTimeout(80);
 ok(await ev(()=>!document.querySelector('#mpop [data-act=photo-pdf]').disabled&&/Сцена у окна/.test(document.querySelector('#mpop .msubm .mhd').textContent)),'open photo named in the list');
 await p.keyboard.press('Escape');
 const one=await grab('photo-pdf');ok(one&&one.pdf&&one.pages===1&&/^Сцена у окна .*\.pdf$/.test(one.n),'this photo: one page, named after the photo '+JSON.stringify(one));
 const ph=await grab('photo-png');ok(ph&&/Сцена у окна — размеры\.png$/.test(ph.n)&&ph.size>20000,'this photo PNG '+JSON.stringify(ph&&{n:ph.n,size:ph.size}));
 // the sheet lists the size: draw it and check orientation follows the photo
 ok(await ev(()=>PF.photoCanvas(S.photos[0],1).then(pc=>{const R=PG.reportData(S.plan,S.photos);const cv=RP.photoSheet(S.photos[0],R.photos[0],pc,0.5);return (cv.width>cv.height)===(S.photos[0].w>=S.photos[0].h)&&R.photos[0].dims.length===1})),'photo sheet orientation follows the photo; size listed');
 // a portrait photo gets a portrait page
 ok(await ev(()=>{const ph=Object.assign({},S.photos[0],{w:600,h:900});const cv=RP.photoSheet(ph,{name:'x',dims:[],figs:[]},null,0.5);return cv.height>cv.width}),'portrait photo → portrait sheet');
 // the menu in the scene: one only list at a time even after re-open; hover-free
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
