// v61: «Со стульями» — chairs off and back for one table and for several; the same chairs come back
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:854}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await p.click('#modesw [data-v=plan]');await p.waitForTimeout(150);
 await ev(()=>{S.plan.rooms=[PG.makeRoom('Зал',0,0,[[9000,0],[9000,90],[9000,180],[9000,270]])];const a=PG.makeItem('t_q180',2500,2500);a.id='A';a.num=1;a.sides=[3,2,1,0];const r=PG.makeItem('t_r150',6000,2500);r.id='R';r.num=2;r.seats=8;const c=PG.makeItem('t_q180',2500,6000);c.id='C';c.num=3;S.plan.items=[a,r,c];PL.st.sel={t:'item',i:'A'};PL.st.multi=[];commit();render()});await p.waitForTimeout(120);
 ok(await p.isChecked('#dock [data-pbind="it.chairs"]'),'table with chairs: «Со стульями» ticked');
 await p.click('#dock [data-pbind="it.chairs"]');await p.waitForTimeout(100);
 ok(await ev(()=>{const t=S.plan.items[0];return PG.seatCount(t)===0&&JSON.stringify(t.chOff.sides)==='[3,2,1,0]'}),'off: no chairs, the old ones remembered');
 ok(!(await p.isChecked('#dock [data-pbind="it.chairs"]'))&&!/Стулья —/.test(await p.textContent('#dock')),'unticked, the chairs block hidden');
 ok(await ev(()=>!document.querySelector('#pitems [data-k="A"] .pch, #pitems [data-k="A"] .pchr')),'no chairs drawn');
 await p.click('#dock [data-pbind="it.chairs"]');await p.waitForTimeout(100);
 ok(await ev(()=>{const t=S.plan.items[0];return JSON.stringify(t.sides)==='[3,2,1,0]'&&!t.chOff}),'on again: the same 3+2+1+0 back');
 await p.keyboard.press('Control+z');await p.waitForTimeout(100);ok(await ev(()=>PG.seatCount(S.plan.items[0])===0),'undo: back to no chairs');
 await p.keyboard.press('Control+y');await p.waitForTimeout(100);ok(await ev(()=>PG.seatCount(S.plan.items[0])===6),'redo: chairs');
 // a round table
 await ev(()=>{PL.st.sel={t:'item',i:'R'};render()});await p.click('#dock [data-pbind="it.chairs"]');await p.click('#dock [data-pbind="it.chairs"]');await p.waitForTimeout(100);
 ok(await ev(()=>S.plan.items[1].seats===8),'round table: 8 back');
 // several: all off, all back
 await ev(()=>{PL.st.multi=['A','R','C'];PL.st.sel=null;render()});await p.waitForTimeout(100);
 ok(await p.isChecked('#dock [data-pbind="m.chairs"]'),'several: ticked');
 await p.click('#dock [data-pbind="m.chairs"]');await p.waitForTimeout(100);ok(await ev(()=>S.plan.items.every(t=>PG.seatCount(t)===0)),'all three without chairs');
 ok(await ev(()=>/без стульев — 3 стола/.test(UI.histL[UI.hi]||'')),'one history step: «без стульев — 3 стола»');
 await p.click('#dock [data-pbind="m.chairs"]');await p.waitForTimeout(100);ok(await ev(()=>{const [a,r,c]=S.plan.items;return PG.seatCount(a)===6&&r.seats===8&&PG.seatCount(c)>0}),'all back as they were');
 // saved and loaded: the remembered chairs survive
 await ev(()=>{PG.setChairs(S.plan.items[0],false);commit()});ok(await ev(()=>{const n=PG.normalize(JSON.parse(JSON.stringify(S.plan)));return JSON.stringify(n.items[0].chOff.sides)==='[3,2,1,0]'}),'remembered chairs kept through save/load');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
