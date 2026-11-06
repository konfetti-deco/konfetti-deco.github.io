// v49: names of sizes, the keypad folds once a number is in, the contour tool (sides filled in one after another → P and S)
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await p.click('#modesw [data-v=photo]');await p.setInputFiles('.fadd input >> nth=0','tmp/hall_test.jpg');await p.waitForFunction(()=>(S.photos||[]).length===1);await p.waitForTimeout(200);
 const sc=(x,y)=>ev(([x,y])=>{const r=document.getElementById('fsvg').getBoundingClientRect(),v=PF.st.v;return [r.left+(x-v.x)*v.s,r.top+(y-v.y)*v.s]},[x,y]);
 // a size drawn: the keypad is open (no number yet)
 await p.click('.tools [data-fact=tool][data-v=dim]');let a=await sc(200,820),c=await sc(1100,820);await p.mouse.move(a[0],a[1]);await p.mouse.down();await p.mouse.move(c[0],c[1],{steps:8});await p.mouse.up();await p.waitForTimeout(150);
 ok(await ev(()=>!document.querySelector('#dock .kp').classList.contains('kpc')),'new size: keypad open');
 await p.fill('[data-fbind="m.text"]','Ширина сцены');await p.press('[data-fbind="m.text"]','Enter');await p.waitForTimeout(100);
 for(const k of ['9',',','5'])await p.click('.kp [data-kp="'+k+'"]');await p.click('.kp [data-kp=ok]');await p.waitForTimeout(150);
 ok(await ev(()=>{const m=S.photos[0].marks[0];return m.text==='Ширина сцены'&&m.v===9500}),'name and number saved');
 ok(await ev(()=>document.getElementById('fmarks').textContent.includes('Ширина сцены · 9,500 м')),'on the photo: «Ширина сцены · 9,500 м»');
 await ev(()=>act('dtab',{dataset:{id:'layers'}}));await p.waitForTimeout(80);ok((await p.textContent('#dock')).includes('Ширина сцены 9,5'),'«Слои»: Ширина сцены 9,5');
 ok(await ev(()=>PG.reportData(S.plan,S.photos).photos[0].dims[0].name)==='Ширина сцены','the report gets the name');
 // reselect: folded; a tap on the number opens it
 await ev(()=>{PF.act('sel',{dataset:{v:S.photos[0].marks[0].id}});act('dtab',{dataset:{id:'props'}})});await p.waitForTimeout(100);
 ok(await ev(()=>document.querySelector('#dock .kp').classList.contains('kpc')&&getComputedStyle(document.querySelector('#dock .kpk')).display==='none'),'size with a number: keypad folded to one line');
 await p.click('#dock .kp .kpv');await p.waitForTimeout(80);ok(await ev(()=>!document.querySelector('#dock .kp').classList.contains('kpc')),'a tap on the number opens the keypad');
 await p.click('.kp [data-kp=C]');for(const k of ['9',',','6'])await p.click('.kp [data-kp="'+k+'"]');await p.click('.kp [data-kp=ok]');await p.waitForTimeout(120);ok(await ev(()=>S.photos[0].marks[0].v)===9600,'and takes a new number');
 // contour: 4 corners, back to the first
 await p.click('.tools [data-fact=tool][data-v=poly]');const P=[[300,300],[900,300],[900,700],[300,700]];
 for(const q of P){const s=await sc(q[0],q[1]);await p.mouse.click(s[0],s[1]);await p.waitForTimeout(60)}
 ok((await p.textContent('#fbanner')).includes('углов 4'),'banner counts the corners');
 const f=await sc(302,302);await p.mouse.click(f[0],f[1]);await p.waitForTimeout(150);
 const cm=await ev(()=>S.photos[0].marks.filter(m=>m.poly).length);ok(cm===4,'closed: 4 sides became sizes');ok(await ev(()=>{const L=S.photos[0].marks.filter(m=>m.poly);return PF.st.sel===L[0].id&&L.every(m=>m.poly===L[0].poly)}),'first side selected, all in one contour');
 const vals=[['8'],['4'],['8'],['4']];for(const v of vals){for(const k of v)await p.click('.kp [data-kp="'+k+'"]');await p.click('.kp [data-kp=ok]');await p.waitForTimeout(120)}
 ok(await ev(()=>S.photos[0].marks.filter(m=>m.poly).map(m=>m.v).join())==='8000,4000,8000,4000','after each ✓ the next side opens: 8 · 4 · 8 · 4');
 ok(await ev(()=>PF.st.sel)===null,'after the last side the selection closes');
 const fig=await ev(()=>{const F=PG.photoFigures(S.photos[0].marks,PG.figTol(S.photos[0])).filter(f=>f.known);return F.map(f=>[f.P,Math.round(f.area/1e6)])});ok(fig.some(x=>x[0]===24000&&x[1]===32),'P 24 м, S ≈32 м²: '+JSON.stringify(fig));
 ok((await p.textContent('#dock')).includes('Площадь и периметр'),'panel shows area and perimeter');
 // undo the contour; Отмена while drawing
 await p.click('.tools [data-fact=tool][data-v=poly]');const s1=await sc(100,100);await p.mouse.click(s1[0],s1[1]);await p.click('#fbanner [data-fact=tool][data-v=""]');await p.waitForTimeout(80);ok(await ev(()=>PF.st.poly===null&&PF.st.tool===''),'«Отмена» drops an unfinished contour');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
