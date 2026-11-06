// v40: tapping an object on the plan brings its row into view in «Слои»
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:800}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await p.click('#modesw [data-v=plan]');await p.click('[data-pact=fly-pick][data-g=room][data-v=rect]');await p.waitForTimeout(200);
 await ev(()=>{for(let i=0;i<30;i++){const it=PG.makeItem('t_r120',900+(i%8)*1350,900+Math.floor(i/8)*1800);it.num=i+1;S.plan.items.push(it)}commit();act('dtab',{dataset:{id:'layers'}})});await p.waitForTimeout(200);
 const vis=async()=>ev(()=>{const n=document.querySelector('#dock .lyrp .prow.on');if(!n)return 'no row';let b=n.parentNode;while(b&&!(b.scrollHeight>b.clientHeight+2&&/(auto|scroll)/.test(getComputedStyle(b).overflowY)))b=b.parentNode;const r=n.getBoundingClientRect(),c=b.getBoundingClientRect();return r.top>=c.top-1&&r.bottom<=c.bottom+1?'visible':'hidden '+Math.round(r.top)+' '+Math.round(c.top)+'-'+Math.round(c.bottom)});
 // tap table №28 on the plan
 const xy=await ev(()=>{const it=S.plan.items.find(i=>i.num===28),r=document.getElementById('plan').getBoundingClientRect(),v=PL.st.v;return [r.left+(it.x-v.x)*v.s,r.top+(it.y-v.y)*v.s]});
 await p.mouse.click(xy[0],xy[1]);await p.waitForTimeout(200);ok(await ev(()=>PL.st.sel&&PL.st.sel.t==='item'&&S.plan.items.find(i=>i.id===PL.st.sel.i).num===28),'table №28 selected by a tap');
 ok(await vis()==='visible','its row is in view in «Слои»: '+await vis());
 const xy2=await ev(()=>{const it=S.plan.items.find(i=>i.num===1),r=document.getElementById('plan').getBoundingClientRect(),v=PL.st.v;return [r.left+(it.x-v.x)*v.s,r.top+(it.y-v.y)*v.s]});
 await p.mouse.click(xy2[0],xy2[1]);await p.waitForTimeout(200);ok(await vis()==='visible','and back up for table №1: '+await vis());
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
