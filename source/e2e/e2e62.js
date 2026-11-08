// v47: groups, long-press menu, summary of tables, narrow passages
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854},hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('console: '+m.text().slice(0,200))});
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await p.click('#modesw [data-v=plan]');await p.click('[data-pact=fly-pick][data-g=room][data-v=rect]');await p.waitForTimeout(150);
 const o=await ev(()=>PG.gridOrigin(S.plan));
 const sc=(id)=>ev((id)=>{const it=S.plan.items.find(i=>i.id===id),r=document.getElementById('plan').getBoundingClientRect(),v=PL.st.v;return [r.left+(it.x-v.x)*v.s,r.top+(it.y-v.y)*v.s]},id);
 // П-shaped table: placed as a group
 await ev(()=>PL.act('fly-pick',{dataset:{g:'tables',v:'P'}}));const at=await ev((o)=>{const r=document.getElementById('plan').getBoundingClientRect(),v=PL.st.v;return [r.left+(o[0]+6000-v.x)*v.s,r.top+(o[1]+4000-v.y)*v.s]},o);await p.mouse.click(at[0],at[1]);await p.waitForTimeout(150);
 const gids=await ev(()=>S.plan.items.filter(i=>i.grp).map(i=>i.id));ok(gids.length===3&&await ev(()=>new Set(S.plan.items.map(i=>i.grp)).size)===1,'П-образный: its 3 tables are one group');
 await ev(()=>{PL.st.sel=null;PL.st.multi=[];render()});const g0=await sc(gids[0]);await p.mouse.click(g0[0],g0[1]);await p.waitForTimeout(120);
 ok(await ev(()=>PL.st.multi.length)===3&&(await p.textContent('#dock')).includes('Группа: 3'),'a tap on one of them chooses the whole group');
 const before=await ev(()=>S.plan.items.map(i=>[i.x,i.y]));const g1=await sc(gids[1]);await p.mouse.move(g1[0],g1[1]);await p.mouse.down();await p.mouse.move(g1[0]+20,g1[1],{steps:3});await p.mouse.move(g1[0]+57,g1[1]+21,{steps:6});await p.mouse.up();await p.waitForTimeout(120);
 const after=await ev(()=>S.plan.items.map(i=>[i.x,i.y]));const dx=after[0][0]-before[0][0];ok(Math.abs(dx)>50&&after.every((q,i)=>Math.abs(q[0]-before[i][0]-dx)<0.2),'dragging one moves the whole group');
 await p.click('#dock [data-pact=m-ungroup]');await p.waitForTimeout(100);ok(await ev(()=>S.plan.items.every(i=>!i.grp)),'«Разгруппировать»');
 await ev(()=>{PL.st.multi=[];PL.st.sel=null;render()});await p.mouse.click(g0[0]+(after[0][0]-before[0][0])*0,g0[1]);await p.waitForTimeout(100);
 await ev((ids)=>{PL.st.multi=ids.slice(0,2);PL.st.sel=null;render()},gids);await p.click('#dock [data-pact=m-group]');await p.waitForTimeout(100);ok(await ev((ids)=>{const a=S.plan.items.find(i=>i.id===ids[0]),b=S.plan.items.find(i=>i.id===ids[1]);return a.grp&&a.grp===b.grp},gids),'«Сгруппировать» two of them');
 // a single member through «Слои»
 await ev(()=>act('dtab',{dataset:{id:'layers'}}));await p.waitForTimeout(80);await p.click('#dock [data-pact=sel][data-sel="i|'+gids[0]+'"]');await p.waitForTimeout(100);ok(await ev((id)=>PL.st.sel&&PL.st.sel.i===id&&PL.st.multi.length===0,gids[0]),'one member alone via «Слои»');
 // long press menu
 await ev(()=>{const T=(id,x,y,n)=>Object.assign(PG.makeItem('t_q180',x,y),{id,num:n,sides:[3,3,0,0]});const o=PG.gridOrigin(S.plan);S.plan.items=[T('a',o[0]+3000,o[1]+2500,1),T('b',o[0]+3000,o[1]+2500+800+1200,2)];PL.st.sel=null;PL.st.multi=[];commit()});await p.waitForTimeout(120);
 const qa=await sc('a');await p.mouse.move(qa[0],qa[1]);await p.mouse.down();await p.waitForTimeout(750);
 ok(await ev(()=>!document.getElementById('pctx').hidden),'holding a table opens its menu');const items=await ev(()=>[...document.querySelectorAll('#pctx .cxi')].map(b=>b.textContent));ok(items.includes('Закрепить')&&items.includes('Дублировать')&&items.includes('Повернуть на 90°')&&items.includes('Удалить'),'menu: '+items.join(' · '));
 await p.mouse.move(qa[0]+40,qa[1]+40,{steps:4});await p.mouse.up();await p.waitForTimeout(80);ok(await ev(()=>{const i=S.plan.items.find(i=>i.id==='a');return Math.abs(i.x-(PG.gridOrigin(S.plan)[0]+3000))<1}),'the table did not move after the menu opened');
 await p.click('#pctx .cxi >> text=Повернуть на 90°');await p.waitForTimeout(100);ok(await ev(()=>S.plan.items.find(i=>i.id==='a').rot)===90,'menu: turned 90°');ok(await ev(()=>document.getElementById('pctx').hidden),'menu closes');
 // right click opens it too; a tap elsewhere closes
 await p.mouse.click(qa[0],qa[1],{button:'right'});await p.waitForTimeout(100);ok(await ev(()=>!document.getElementById('pctx').hidden),'right click opens the menu');
 const R=await ev(()=>{const r=document.getElementById('plan').getBoundingClientRect();return [r.left+r.width-60,r.top+r.height-60]});await p.mouse.click(R[0],R[1]);await p.waitForTimeout(100);ok(await ev(()=>document.getElementById('pctx').hidden),'a tap elsewhere closes it');
 // touch: long press with a finger
 await ev(()=>{PL.st.sel=null;render()});const qb=await sc('b');await ev(([x,y])=>{const t=document.elementFromPoint(x,y);const mk=(type)=>new PointerEvent(type,{bubbles:true,pointerId:7,pointerType:'touch',clientX:x,clientY:y,isPrimary:true,button:0});t.dispatchEvent(mk('pointerdown'))},qb);await p.waitForTimeout(700);
 ok(await ev(()=>!document.getElementById('pctx').hidden&&document.querySelector('#pctx .cxh').textContent==='Стол №2'),'finger long press: menu for Стол №2');
 await ev(([x,y])=>{const t=document.elementFromPoint(x,y);t.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:7,pointerType:'touch',clientX:x,clientY:y}))},qb);await p.click('#pctx .cxi >> text=Закрепить');await p.waitForTimeout(100);ok(await ev(()=>S.plan.items.find(i=>i.id==='b').lock===true),'menu: locked');
 // passages: bodies 1,2 m apart, chairs make it narrower than 0,9 m
 ok(await ev(()=>document.querySelectorAll('#pover .pna').length)===1,'narrow passage drawn on the plan');
 await ev(()=>act('dtab',{dataset:{id:'checks'}}));await p.waitForTimeout(80);ok((await p.textContent('#dock')).includes('Узкий проход'),'«Проверки»: Узкий проход');
 await ev(()=>{S.plan.aisle=0;commit()});await p.waitForTimeout(80);ok(await ev(()=>document.querySelectorAll('#pover .pna').length)===0,'minimum 0: not checked');await ev(()=>{S.plan.aisle=900;commit()});
 // summary
 await ev(()=>{PL.st.sel=null;PL.st.multi=[];act('dtab',{dataset:{id:'props'}});render()});await p.waitForTimeout(80);const dock=await p.textContent('#dock');ok(dock.includes('Сводка рассадки')&&dock.includes('Прямоугольный 1,80×0,80 м')&&dock.includes('12 мест'),'summary in the panel');
 ok(await ev(()=>PL.sumText(S.plan)).then(t=>/Всего в зале: 2 стола, 12 мест/.test(t)),'summary text: Всего в зале: 2 стола, 12 мест');
 await p.click('#dock [data-pact=sum-copy]');await p.waitForTimeout(150);ok((await p.textContent('body')).includes('Сводка скопирована'),'copy → confirmation');
 ok(!errs.length,'no page errors: '+errs.slice(0,3).join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
