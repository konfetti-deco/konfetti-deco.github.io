// v58: plan labels do not sit on each other — a wall's length goes outside when an object is inside; passage widths that would overlap keep only the narrowest label
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:854}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await p.click('#modesw [data-v=plan]');await p.waitForTimeout(150);
 const boxes=()=>ev(()=>[...document.querySelectorAll('#plab text')].map(t=>{const r=t.getBoundingClientRect();return {t:t.textContent,c:t.getAttribute('class'),x0:r.left,y0:r.top,x1:r.right,y1:r.bottom}}));
 const overlaps=(L)=>{const o=[];for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const a=L[i],c=L[j];const ix=Math.min(a.x1,c.x1)-Math.max(a.x0,c.x0),iy=Math.min(a.y1,c.y1)-Math.max(a.y0,c.y0);if(ix>2&&iy>2)o.push(a.t+' × '+c.t)}return o};
 await ev(()=>{S.plan.rooms=[PG.makeRoom('Банкетный зал',0,0,[[9650,0],[20000,90],[9650,180],[20000,270]])];const st=PG.makeItem('z_stage',4800,400);st.w=5850;st.d=600;st.name='Сцена';const L=[st];let n=1;
   for(const [x0,y0] of [[2500,5000],[6000,5000],[2500,10500],[6000,10500]])for(const dy of [0,1800])for(const dx of [0,800]){const t=PG.makeItem('t_q180',x0+dx,y0+dy);t.rot=90;t.sides=[0,0,2,2];t.num=n++;L.push(t)}
   for(const [x0,y0] of [[2500,8000],[6000,8000]]){const t=PG.makeItem('t_q180',x0+400,y0);t.sides=[2,2,0,0];t.num=n++;L.push(t)}
   S.plan.items=L;PL.st.sel=null;commit();render()});
 for(const sc of [0.115,0.07,0.053,0.035,0.024]){
   await ev((sc)=>{PL.st.v={s:sc,x:-1500,y:-1500,user:true};PL.paint()},sc);await p.waitForTimeout(80);
   const L=await boxes(),top=L.find(q=>/9,650/.test(q.t)),stage=await ev(()=>{const r=document.querySelector('#pitems .pig .pib').getBoundingClientRect();return {x0:r.left,y0:r.top,x1:r.right,y1:r.bottom}});
   ok(top&&top.y1<=stage.y0+1,'scale '+sc+': top wall length not on the stage ('+(top&&Math.round(top.y1))+' vs '+Math.round(stage.y0)+')');
   const ov=overlaps(L.filter(q=>q.t.trim()));ok(!ov.length,'scale '+sc+': no labels on each other '+ov.slice(0,3).join(', '));
 }
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
