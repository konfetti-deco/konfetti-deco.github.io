// v39: a selection left from the old project / removed by undo never breaks drawing (the «зависание» after Новый проект)
const {chromium}=require('playwright');const path=require('path');
const FILE=process.env.FILE||'dist/konstruktor-fotozon.html';
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('console: '+m.text().slice(0,160))});
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve(FILE));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a).catch(e=>{errs.push('evaluate: '+e.message.split('\n')[0]);return null});
 // 1. plan with a selected table → Файл → Новый проект → План зала
 await p.click('#modesw [data-v=plan]');await ev(()=>{PL.act('fly-pick',{dataset:{g:'room',v:'rect'}});commit();const it=PG.makeItem('t_r150',3000,3000);S.plan.items.push(it);PL.st.sel={t:'item',i:it.id};commit()});await p.waitForTimeout(150);
 await ev(()=>act('new-proj'));await p.waitForTimeout(150);
 const go=await p.$('[data-act=new-go][data-id=plan]');ok(!!go,'new project dialog with «План зала»');if(go)await go.click();await p.waitForTimeout(250);
 ok(await ev(()=>!UI.modal&&S.plan.items.length===0&&S.name==='План зала'),'new project opened, dialog closed');
 await p.click('#modesw [data-v=scene]');await p.waitForTimeout(120);ok(await ev(()=>UI.mode)==='scene'&&await p.isVisible('#stagewrap'),'then «Сцена» responds');
 await p.click('#modesw [data-v=photo]');await p.waitForTimeout(120);ok(await ev(()=>UI.mode)==='photo','«Фото» responds');
 await p.click('#modesw [data-v=plan]');await p.waitForTimeout(120);ok(await ev(()=>UI.mode)==='plan'&&(await p.textContent('#dock')).includes('План зала'),'«План» responds, panel drawn');
 // 2. a table added and selected, then undone: the selection points at nothing
 await ev(()=>{PL.act('fly-pick',{dataset:{g:'room',v:'rect'}});commit();const it=PG.makeItem('t_r150',3000,3000);S.plan.items.push(it);UI.nextLabel='План: стол';commit();PL.st.sel={t:'item',i:it.id};render()});
 await p.keyboard.press('Control+z');await p.waitForTimeout(150);ok(await ev(()=>S.plan.items.length===0&&PL.st.sel===null),'undo of a selected table: selection dropped');
 await ev(()=>{const it=PG.makeItem('t_r120',5000,3000);S.plan.items.push(it);UI.nextLabel='План: стол';commit()});ok(await ev(()=>S.plan.items.length)===1&&await ev(()=>document.querySelectorAll('#pitems > *').length)>=1,'next table appears');
 // 3. a selected wall of a room removed by undo; a selected opening deleted
 await ev(()=>{const r=S.plan.rooms[0];PL.st.sel={t:'op',r:r.id,w:r.walls[0].id,o:'nope'};render()});ok(await ev(()=>PL.st.sel&&PL.st.sel.t)==='wall','missing opening → its wall selected');
 // 4. photo: open photo, then a new project without photos
 await p.click('#modesw [data-v=photo]');await p.setInputFiles('.fadd input >> nth=0','tmp/hall_test.jpg');await p.waitForFunction(()=>(S.photos||[]).length===1);await ev(()=>{S.photos[0].marks=[{id:'m1',t:'dim',a:[10,10],b:[300,10],v:1000,col:'#FF4D4F'}];PF.st.sel='m1';commit()});
 await ev(()=>act('new-proj'));await p.waitForTimeout(100);const g2=await p.$('[data-act=new-go][data-id=photo]');if(g2)await g2.click();await p.waitForTimeout(250);
 ok(await ev(()=>!UI.modal&&S.photos.length===0&&PF.st.open===null),'new photo project: empty gallery');
 // 5. open a project from a file object while plan item selected (load path without new-go)
 await p.click('#modesw [data-v=plan]');await ev(()=>{PL.act('fly-pick',{dataset:{g:'room',v:'rect'}});commit();const it=PG.makeItem('t_r150',3000,3000);S.plan.items.push(it);PL.st.sel={t:'item',i:it.id};commit()});
 await ev(()=>{loadState(M.template('three'))});await p.waitForTimeout(200);ok(await ev(()=>PL.st.sel===null&&UI.mode==='plan'),'template opened while a table was selected: no crash');
 ok(await ev(()=>(window.__renderErrors||[]).length===0),'no drawing errors: '+await ev(()=>JSON.stringify(window.__renderErrors||[])));
 ok(!errs.length,'no page errors: '+errs.slice(0,4).join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
