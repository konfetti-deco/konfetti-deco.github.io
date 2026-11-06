// v44: pulling a side sticks to the neighbour's side and to a ruler guide, with a guide line shown (the scene from the screenshots)
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await p.click('#modesw [data-v=plan]');await p.click('[data-pact=fly-pick][data-g=room][data-v=rect]');await p.waitForTimeout(150);
 const o=await ev(()=>PG.gridOrigin(S.plan));
 // table 10 across the top (y 1640..2640), table 6 lower (y 4940..5940), table 11 upright at the left touching 10, a guide at y 6800
 await ev((o)=>{const T=(n,x,y,w,d)=>{const it=PG.makeItem('t_q180',o[0]+x,o[1]+y);Object.assign(it,{w,d,num:n,sides:[0,0,0,0],id:'t'+n});return it};
   S.plan.items=[T(10,5500,2140,7000,1000),T(6,5100,5440,6500,1000),T(11,1300,3700,1140,3000)];S.plan.items[2].y=o[1]+2140-500+1500;S.plan.guides=[{id:'g1',vert:false,at:o[1]+6800}];PL.st.sel={t:'item',i:'t11'};commit();PL.st.v={s:0.07,x:o[0]-1500,y:o[1]-500,user:true};PL.paint()},o);
 await p.waitForTimeout(150);
 const hp=(h)=>ev((h)=>{const n=document.querySelector('#phnd [data-r="z|t11|'+h+'"]');const r=n.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]},h);
 const scY=(y)=>ev((y)=>{const r=document.getElementById('plan').getBoundingClientRect(),v=PL.st.v;return r.top+(y-v.y)*v.s},y);
 const bb=()=>ev(()=>{const b=PG.itemBBox(S.plan.items.find(i=>i.id==='t11'));return {y0:Math.round(b.y0),y1:Math.round(b.y1)}});
 const top0=(await bb()).y0;
 // pull the bottom side to 4 px past table 6's bottom (y 5940)
 let a=await hp('e2');let ty=await scY(o[1]+5940)+4;await p.mouse.move(a[0],a[1]);await p.mouse.down();await p.mouse.move(a[0],a[1]+30,{steps:4});await p.mouse.move(a[0],ty,{steps:10});
 const mid=await ev(()=>document.querySelectorAll('#pover .pgd').length);ok(mid>=1,'guide line shows while pulling the side: '+mid);
 await p.mouse.up();await p.waitForTimeout(120);let b1=await bb();ok(b1.y1===o[1]+5940,'bottom side sticks to table 6\'s bottom: '+(b1.y1-o[1]));ok(b1.y0===top0,'top side stays against table 10');
 // to table 6's top
 a=await hp('e2');ty=await scY(o[1]+4940)-3;await p.mouse.move(a[0],a[1]);await p.mouse.down();await p.mouse.move(a[0],a[1]-30,{steps:4});await p.mouse.move(a[0],ty,{steps:10});await p.mouse.up();await p.waitForTimeout(120);
 b1=await bb();ok(b1.y1===o[1]+4940,'or to table 6\'s top: '+(b1.y1-o[1]));
 // to the ruler guide
 a=await hp('e2');ty=await scY(o[1]+6800)+5;await p.mouse.move(a[0],a[1]);await p.mouse.down();await p.mouse.move(a[0],a[1]+30,{steps:4});await p.mouse.move(a[0],ty,{steps:12});await p.mouse.up();await p.waitForTimeout(120);
 b1=await bb();ok(b1.y1===o[1]+6800,'or to the ruler guide: '+(b1.y1-o[1]));ok(await ev(()=>{const i=S.plan.items.find(i=>i.id==='t11');return i.w===1140}),'width untouched');
 // Shift: free
 a=await hp('e2');ty=await scY(o[1]+5940)+4;await p.keyboard.down('Shift');await p.mouse.move(a[0],a[1]);await p.mouse.down();await p.mouse.move(a[0],a[1]-30,{steps:4});await p.mouse.move(a[0],ty,{steps:10});await p.mouse.up();await p.keyboard.up('Shift');await p.waitForTimeout(120);
 ok((await bb()).y1!==o[1]+5940,'Shift: no sticking');
 // moving: table 6 slides left until its left side touches table 11's right side
 await ev(()=>{PL.st.sel=null;render()});const t6=await ev(()=>{const i=S.plan.items.find(i=>i.id==='t6'),r=document.getElementById('plan').getBoundingClientRect(),v=PL.st.v;return {sx:r.left+(i.x-v.x)*v.s,sy:r.top+(i.y-v.y)*v.s,s:v.s,x0:PG.itemBBox(i).x0,r11:PG.itemBBox(S.plan.items.find(i=>i.id==='t11')).x1}});
 const dx=(t6.r11+3/t6.s-t6.x0)*t6.s;await p.mouse.move(t6.sx,t6.sy);await p.mouse.down();await p.mouse.move(t6.sx-20,t6.sy,{steps:4});await p.mouse.move(t6.sx+dx,t6.sy,{steps:10});await p.mouse.up();await p.waitForTimeout(120);
 ok(await ev(()=>Math.round(PG.itemBBox(S.plan.items.find(i=>i.id==='t6')).x0)===Math.round(PG.itemBBox(S.plan.items.find(i=>i.id==='t11')).x1)),'moving: table 6 sticks to table 11 side to side');
 // the scene: a side pulled near another element's side sticks to it
 const sc=await ev(()=>{PL.setMode('scene');loadState(M.template('three'));const z=(e)=>SC.zOf(S,e);const els=S.els.filter(e=>!e.hide&&!e.rot&&e.type!=='text');let A=null,B=null;
   for(const a of els){for(const b of els){if(a!==b&&Math.abs(z(a)-z(b))<100&&b.x+b.w>a.x+200){A=a;B=b;break}}if(A)break}
   if(!A)return 'no pair';const want=B.x+B.w;A.w=want-A.x+4;snapSize(A,'e',1);const r1=A.x+A.w;A.w=want-A.x+30;snapSize(A,'e',1);const r2=A.x+A.w;return {want,r1,r2,g:document.querySelectorAll('#guides .gv').length}});
 ok(sc!=='no pair'&&sc.r1===sc.want,'scene: right side sticks to the neighbour (4 mm off → '+JSON.stringify(sc)+')');ok(sc.r2!==sc.want,'scene: 30 mm off — too far, no sticking');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
