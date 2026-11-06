// v50: measuring by a reference (a door of known size) and the try-on by two points on the floor
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await p.click('#modesw [data-v=photo]');await p.setInputFiles('.fadd input >> nth=0','tmp/hall_test.jpg');await p.waitForFunction(()=>(S.photos||[]).length===1);await p.waitForTimeout(200);
 const sc=(x,y)=>ev(([x,y])=>{const r=document.getElementById('fsvg').getBoundingClientRect(),v=PF.st.v;return [r.left+(x-v.x)*v.s,r.top+(y-v.y)*v.s]},[x,y]);
 ok((await p.textContent('#dock')).includes('Измерить по эталону'),'photo panel offers «Измерить по эталону»');
 await p.click('#dock [data-fact=tool][data-v=ref]');await p.waitForTimeout(150);ok(await ev(()=>!!S.photos[0].ref&&PF.st.tool==='ref'),'reference set, corners editable');
 // put the 4 corners onto the brown «door» of the test photo (480,374)-(800,800)
 const C=[[480,374],[800,374],[800,800],[480,800]];
 for(let i=0;i<4;i++){const q=await ev((i)=>S.photos[0].ref.q[i],i);const f=await sc(q[0],q[1]),t=await sc(C[i][0],C[i][1]);await p.mouse.move(f[0],f[1]);await p.mouse.down();await p.mouse.move(f[0]+10,f[1]+10,{steps:3});await p.mouse.move(t[0],t[1],{steps:8});await p.mouse.up();await p.waitForTimeout(80)}
 ok(await ev((C)=>S.photos[0].ref.q.every((q,i)=>Math.abs(q[0]-C[i][0])<3&&Math.abs(q[1]-C[i][1])<3),C),'corners on the door');
 await p.click('#dock [data-fact=ref-pre][data-v="900|2100"]');await p.waitForTimeout(100);ok(await ev(()=>S.photos[0].ref.w===900&&S.photos[0].ref.h===2100),'«Дверь 0,9×2,1» preset');
 ok((await p.textContent('#dock')).includes('Размеры без числа теперь показывают'),'panel: estimates on');
 // a size across the door's width, without a number: ≈ 0,900
 await p.click('.tools [data-fact=tool][data-v=dim]');let a=await sc(480,600),c=await sc(800,600);await p.mouse.move(a[0],a[1]);await p.mouse.down();await p.mouse.move(c[0],c[1],{steps:8});await p.mouse.up();await p.waitForTimeout(150);
 const est=await ev(()=>PG.refLen(S.photos[0].ref,S.photos[0].marks[0].a,S.photos[0].marks[0].b));ok(Math.abs(est-900)<15,'estimate across the door ≈ 900 mm: '+Math.round(est));
 ok(await ev(()=>document.getElementById('fmarks').textContent.includes('≈')),'on the photo: «≈» value');
 ok((await p.textContent('#dock')).includes('По эталону ≈'),'panel offers the estimate');
 await p.click('#dock [data-fact=est-take]');await p.waitForTimeout(100);ok(await ev(()=>{const m=S.photos[0].marks[0];return m.est===true&&Math.abs(m.v-900)<15}),'«Принять»: number taken, marked as estimate');
 ok(await ev(()=>PG.reportData(S.plan,S.photos).photos[0].dims[0].est)===true,'the report knows it is an estimate');
 // a tape number replaces the estimate mark
 await ev(()=>{PF.act('sel',{dataset:{v:S.photos[0].marks[0].id}})});await p.waitForTimeout(80);await p.click('#dock .kp .kpv');for(const k of ['C','0',',','9','1'])await p.click('.kp [data-kp="'+k+'"]');await p.click('.kp [data-kp=ok]');await p.waitForTimeout(100);
 ok(await ev(()=>{const m=S.photos[0].marks[0];return m.v===910&&!m.est}),'a typed number: no longer «≈»');
 // reference removed: estimates gone
 await ev(()=>{PF.st.sel=null;render()});await p.click('#dock [data-fact=ref-del]');await p.waitForTimeout(80);ok(await ev(()=>!S.photos[0].ref),'«Убрать эталон»');
 // try-on by two floor points
 await ev(()=>PF.act('tool',{dataset:{v:'fit'}}));await p.waitForFunction(()=>S.photos[0].fit,null,{timeout:15000});await p.waitForTimeout(200);
 await p.click('#dock [data-fact=fit-floor]');await p.waitForTimeout(300);ok(await ev(()=>PF.st.tool)==='fit2','«По 2 точкам пола»: tap mode');
 const l=await sc(300,780),r=await sc(1000,800);await p.mouse.click(l[0],l[1]);await p.waitForTimeout(80);ok((await p.textContent('#fbanner')).includes('правый край'),'after the first point: asks for the right one');await p.mouse.click(r[0],r[1]);await p.waitForTimeout(200);
 const q=await ev(()=>S.photos[0].fit.q);ok(Math.abs(q[3][0]-300)<3&&Math.abs(q[3][1]-780)<3&&Math.abs(q[2][0]-1000)<3&&Math.abs(q[2][1]-800)<3,'bottom corners on the floor points');
 const ratio=await ev(()=>{const c=PF.cut(),q=S.photos[0].fit.q;return [(q[3][1]-q[0][1])/Math.hypot(q[2][0]-q[3][0],q[2][1]-q[3][1]),c.hmm/c.wmm]});ok(Math.abs(ratio[0]-ratio[1])<0.01,'height from the scene proportions: '+ratio.map(x=>x.toFixed(3)).join(' = '));
 ok(await ev(()=>PF.st.tool)==='fit','back to the corner tool');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
