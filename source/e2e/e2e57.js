// v42: chairs limited by the densest seating (50 cm per person); what normal / comfortable / free seating gives
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await p.click('#modesw [data-v=plan]');await p.click('[data-pact=fly-pick][data-g=room][data-v=rect]');await p.waitForTimeout(150);
 await ev(()=>{const it=PG.makeItem('t_q180',4000,4000);it.w=2000;it.d=800;it.sides=[3,3,0,0];it.num=1;S.plan.items.push(it);PL.st.sel={t:'item',i:it.id};commit();act('dtab',{dataset:{id:'props'}})});await p.waitForTimeout(150);
 const txt=await p.textContent('#dock');ok(txt.includes('до 4')&&txt.includes('до 1'),'limits per side shown: до 4 (2 м), до 1 (0,8 м)');
 const norms=await ev(()=>[...document.querySelectorAll('#dock .seatn span')].map(s=>s.textContent.replace(/\s+/g,' ').trim()));ok(norms.length===4&&/^10 плотно/.test(norms[0])&&/^8 обычно/.test(norms[1])&&/^6 комфортно/.test(norms[2])&&/^6 свободно/.test(norms[3]),'whole table: 10 / 8 / 6 / 6 → '+norms.join(' | '));
 const plus=(k)=>p.click('#dock [data-pact=it-side][data-k="'+k+'"][data-v="1"]');
 await plus(0);await p.waitForTimeout(100);ok(await ev(()=>S.plan.items[0].sides[0])===4,'+ : 4 on the top side');
 ok(await ev(()=>document.querySelector('#dock [data-pact=it-side][data-k="0"][data-v="1"]').disabled),'+ disabled at the limit');
 await ev(()=>PL.act('it-side',{dataset:{k:'0',v:'1'}}));await p.waitForTimeout(150);ok(await ev(()=>S.plan.items[0].sides[0])===4,'cannot go to 5 on 2 m');ok((await p.textContent('body')).includes('Плотнее не сядут'),'explains why');
 await p.fill('[data-pbind="it.side1"]','9');await p.press('[data-pbind="it.side1"]','Enter');await p.waitForTimeout(150);ok(await ev(()=>S.plan.items[0].sides[1])===4,'typed 9 → cut to 4');
 // a smaller table drops chairs that no longer fit
 await p.fill('[data-pbind="it.w"]','1,2');await p.press('[data-pbind="it.w"]','Enter');await p.waitForTimeout(150);ok(await ev(()=>S.plan.items[0].sides.join())==='2,2,0,0','table 1,2 m: sides cut to 2 and 2: '+await ev(()=>S.plan.items[0].sides.join()));
 // round
 await ev(()=>{const it=PG.makeItem('t_r150',8000,4000);it.w=1500;it.seats=8;S.plan.items.push(it);PL.st.sel={t:'item',i:it.id};commit()});await p.waitForTimeout(120);
 ok((await p.textContent('#dock')).includes('до 9'),'round Ø1,5: до 9');await ev(()=>{PL.act('it-seats',{dataset:{v:'1'}});PL.act('it-seats',{dataset:{v:'1'}})});await p.waitForTimeout(100);ok(await ev(()=>S.plan.items[1].seats)===9,'round stops at 9');
 // an old project with too many chairs: warned, not silently changed
 await ev(()=>{S.plan.items[1].seats=20;commit()});await p.waitForTimeout(100);ok((await p.textContent('#dock')).includes('больше, чем помещается'),'too many chairs in an old project: warning');ok(await ev(()=>S.plan.items[1].seats)===20,'not changed silently');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
