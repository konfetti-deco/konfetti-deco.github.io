// v37: the scene tried on a hall photo — four corners in perspective, opacity, straighten, export, undo, reload
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 ok(await ev(()=>S.els.filter(e=>!e.hide).length>0),'template scene has elements');
 await ev(()=>PL.setMode('photo'));await p.setInputFiles('.fadd input >> nth=0','tmp/hall_test.jpg');await p.waitForFunction(()=>(S.photos||[]).length===1);await p.waitForTimeout(200);
 const ph0=await ev(()=>({w:S.photos[0].w,h:S.photos[0].h}));
 // a measured 2 m line 400 px long: 0.2 px per mm
 await ev((h)=>{S.photos[0].marks=[{id:'d1',t:'dim',a:[100,60],b:[500,60],v:2000,col:'#FF4D4F'}];commit()},ph0.h);await p.waitForTimeout(100);
 ok((await p.textContent('#dock')).includes('Примерить сцену'),'photo panel offers «Примерить сцену»');
 await p.click('.tools [data-fact=tool][data-v=fit]');await p.waitForFunction(()=>S.photos[0].fit,null,{timeout:15000});await p.waitForTimeout(400);
 const cut=await ev(()=>{const c=PF.cut();return c&&{w:c.wmm,h:c.hmm,cw:c.cv.width}});ok(cut&&cut.w>500&&cut.h>500,'scene cut out: '+JSON.stringify(cut));
 let q=await ev(()=>S.photos[0].fit.q);const expW=Math.min(cut.w*0.2,ph0.w*0.95);
 ok(Math.abs((q[1][0]-q[0][0])-Math.max(expW,ph0.w*0.15))<1,'first placement by the measure: width '+(q[1][0]-q[0][0]).toFixed(1)+' px = scene '+Math.round(cut.w)+' mm × 0.2');
 ok(Math.abs((q[3][1]-q[0][1])/(q[1][0]-q[0][0])-cut.h/cut.w)<0.01,'scene proportions kept');
 ok((await ev(()=>UI.histL[UI.hi])).includes('примерка сцены'),'history: примерка сцены');
 // the canvas shows photo + scene; the plain image is hidden; scene pixels differ from the photo
 const vis=await ev(()=>{const c=document.getElementById('fcv');return {hidden:c.hidden,w:c.width,img:document.getElementById('fimg').style.visibility}});ok(!vis.hidden&&vis.w>100&&vis.img==='hidden','canvas on, plain image hidden '+JSON.stringify(vis));
 const lay=await ev(()=>{const ph=S.photos[0],L=PF.layer(ph),c=L.cv.getContext('2d'),k=L.cv.width/ph.w,q=ph.fit.q;const cx=(q[0][0]+q[2][0])/2,cy=(q[0][1]+q[2][1])/2;let inside=0,out=0;const d=c.getImageData(0,0,L.cv.width,L.cv.height).data;
   for(let y=0;y<L.cv.height;y+=7)for(let x=0;x<L.cv.width;x+=7){const a=d[(y*L.cv.width+x)*4+3];const ix=x/k,iy=y/k;const inQ=ix>q[0][0]+2&&ix<q[1][0]-2&&iy>q[0][1]+2&&iy<q[2][1]-2,outQ=ix<q[0][0]-3||ix>q[1][0]+3||iy<q[0][1]-3||iy>q[2][1]+3;if(a>8){if(inQ)inside++;else if(outQ)out++}}return {inside,out}});
 ok(lay.inside>200&&lay.out===0,'warped scene drawn inside its frame only '+JSON.stringify(lay));
 await p.screenshot({path:'tmp/shots/p14-fit.png'});
 // drag the top-left corner inwards (perspective): the quad changes, stays valid, one history step
 const scr=await ev(()=>{const r=document.getElementById('fsvg').getBoundingClientRect(),v=PF.st.v,q=S.photos[0].fit.q;return {x:r.left+(q[0][0]-v.x)*v.s,y:r.top+(q[0][1]-v.y)*v.s,s:v.s}});
 const h0=await ev(()=>UI.hi);
 await p.mouse.move(scr.x,scr.y);await p.mouse.down();await p.mouse.move(scr.x+30,scr.y+15,{steps:6});await p.mouse.move(scr.x+60,scr.y+30,{steps:6});await p.mouse.up();await p.waitForTimeout(200);
 let q2=await ev(()=>S.photos[0].fit.q);ok(Math.abs(q2[0][0]-(q[0][0]+60/scr.s))<1.5&&Math.abs(q2[0][1]-(q[0][1]+30/scr.s))<1.5,'corner dragged: '+q2[0].join(','));
 ok(q2[1].join()===q[1].join()&&q2[2].join()===q[2].join(),'other corners stay');
 ok(await ev(()=>UI.hi)===h0+1&&(await ev(()=>UI.histL[UI.hi])).includes('угол'),'one history step: примерка: угол');
 // a corner cannot fold the picture inside out
 const sc2=await ev(()=>{const r=document.getElementById('fsvg').getBoundingClientRect(),v=PF.st.v,q=S.photos[0].fit.q;return {x:r.left+(q[0][0]-v.x)*v.s,y:r.top+(q[0][1]-v.y)*v.s,tx:r.left+(q[2][0]+40-v.x)*v.s,ty:r.top+(q[2][1]+40-v.y)*v.s}});
 await p.mouse.move(sc2.x,sc2.y);await p.mouse.down();await p.mouse.move(sc2.tx,sc2.ty,{steps:10});await p.mouse.up();await p.waitForTimeout(150);
 ok(await ev(()=>PG.quadOk(S.photos[0].fit.q)),'dragging a corner past the opposite one keeps the frame valid');
 // move the whole frame from the inside
 await ev(()=>{const f=S.photos[0].fit;f.q=JSON.parse(JSON.stringify(f.q));});
 const q3=await ev(()=>S.photos[0].fit.q);const mid=await ev(()=>{const r=document.getElementById('fsvg').getBoundingClientRect(),v=PF.st.v,q=S.photos[0].fit.q,cx=(q[0][0]+q[1][0]+q[2][0]+q[3][0])/4,cy=(q[0][1]+q[1][1]+q[2][1]+q[3][1])/4;return {x:r.left+(cx-v.x)*v.s,y:r.top+(cy-v.y)*v.s,s:v.s}});
 await p.mouse.move(mid.x,mid.y);await p.mouse.down();await p.mouse.move(mid.x-40,mid.y,{steps:8});await p.mouse.up();await p.waitForTimeout(150);
 const q4=await ev(()=>S.photos[0].fit.q);ok(q4.every((pt,i)=>Math.abs(pt[0]-(q3[i][0]-40/mid.s))<1.5&&Math.abs(pt[1]-q3[i][1])<1.5),'frame moved as a whole');
 // opacity, straighten, hide
 await p.click('[data-fact=fit-op][data-v="0.6"]');await p.waitForTimeout(100);ok(await ev(()=>S.photos[0].fit.op)===0.6,'opacity 60 %');
 await p.click('[data-fact=fit-rect]');await p.waitForTimeout(100);const qr=await ev(()=>S.photos[0].fit.q);ok(qr[0][1]===qr[1][1]&&qr[0][0]===qr[3][0]&&qr[1][0]===qr[2][0],'«Выпрямить»: a rectangle again');
 ok(Math.abs((qr[3][1]-qr[0][1])/(qr[1][0]-qr[0][0])-cut.h/cut.w)<0.01,'straightened with the scene proportions');
 // export: the scene is in the picture
 const png=await ev(()=>new Promise(res=>{const o=IO.save;IO.save=function(n,b){IO.save=o;res({n,size:b.size});return Promise.resolve(true)};PF.exportPng()}));
 ok(/с фотозоной\.png$/.test(png.n)&&png.size>50000,'PNG with the scene: '+png.n+' '+png.size);
 await p.click('[data-fact=fit-on]');await p.waitForTimeout(150);ok(await ev(()=>!S.photos[0].fit.on&&document.getElementById('fcv').hidden&&document.getElementById('fimg').style.visibility===''),'«Скрыть»: plain photo back');
 await p.click('[data-fact=fit-on]');await p.waitForTimeout(150);
 // reload: the try-on is saved with the photo
 await p.waitForTimeout(600);const before=await ev(()=>JSON.stringify(S.photos[0].fit));await p.reload();await p.waitForSelector('#canvas');await p.waitForTimeout(600);
 ok(await ev(()=>JSON.stringify(S.photos[0].fit))===before,'try-on restored after reload');
 await ev(()=>{PF.openPhoto(S.photos[0].id);render()});await p.waitForTimeout(1500);
 ok(await ev(()=>!document.getElementById('fcv').hidden),'after reload the scene shows on the photo');
 // undo removes, «Убрать» deletes
 await ev(()=>{PF.st.tool='fit';render()});await p.waitForTimeout(100);await p.click('[data-fact=fit-del]');await p.waitForTimeout(100);ok(await ev(()=>!S.photos[0].fit),'«Убрать»');
 await p.keyboard.press('Control+z');await p.waitForTimeout(200);ok(await ev(()=>!!S.photos[0].fit),'undo brings it back');
 // empty scene: a clear message, no frame
 await ev(()=>{delete S.photos[0].fit;S.els.forEach(e=>e.hide=true);commit()});await p.waitForTimeout(100);
 await p.click('.tools [data-fact=tool][data-v=fit]');await p.waitForTimeout(1200);ok(await ev(()=>!S.photos[0].fit&&PF.st.tool===''),'empty scene: nothing to try on');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
