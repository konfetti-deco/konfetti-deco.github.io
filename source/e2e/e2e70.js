// v55: the actions panel (top / floating / hidden, chosen buttons) in all three tabs; plan copy-paste; photo duplicate and copy-paste; chair sides follow the turn
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 const ids=(sel)=>ev((sel)=>[...document.querySelectorAll(sel+' [data-act=qa]')].map(b=>b.dataset.id+(b.disabled?'-':'')).join(','),sel);
 const qa=async(id,where='#qbar')=>{await p.click(where+' [data-act=qa][data-id='+id+']');await p.waitForTimeout(120)};
 // top bar: fits, all buttons in the scene
 ok(await ev(()=>{const t=document.querySelector('.top');return t.scrollWidth<=t.clientWidth+1}),'top bar fits at 1280 px');
 ok(await ev(()=>!!document.querySelector('#savebtn').offsetParent&&document.querySelector('#savebtn').getBoundingClientRect().right<=innerWidth),'Save still visible');
 ok(await ids('#qbar')==='undo-,redo-,dup-,copy-,paste-,del-,up-,down-,lock-,rot-,multi','scene, nothing chosen: all buttons, greyed except «Несколько» ('+await ids('#qbar')+')');
 // scene: choose an element
 const n0=await ev(()=>S.els.length);const e0=await ev(()=>{const e=S.els.find(e=>e.type==='sym'||e.type==='prop')||S.els[S.els.length-1];UI.sel=e.id;render();return e.id});await p.waitForTimeout(100);
 await qa('dup');ok(await ev(()=>S.els.length)===n0+1,'scene: duplicate');
 await qa('del');ok(await ev(()=>S.els.length)===n0,'scene: delete');
 await ev((id)=>{UI.sel=id;render()},e0);await p.waitForTimeout(80);
 await qa('lock');ok(await ev((id)=>!!S.els.find(e=>e.id===id).lock,e0),'scene: lock');ok(await p.getAttribute('#qbar [data-id=lock]','aria-pressed')==='true','lock shows on');
 await qa('lock');ok(await ev((id)=>!S.els.find(e=>e.id===id).lock,e0),'scene: unlock');
 const canRot=await ev((id)=>M.canRot(S.els.find(e=>e.id===id)),e0);
 if(canRot){await qa('rot');ok(await ev((id)=>S.els.find(e=>e.id===id).rot===90,e0),'scene: turn 90°');await p.keyboard.press('Control+z');await p.waitForTimeout(100)}else ok(await ev(()=>document.querySelector('#qbar [data-id=rot]').disabled),'scene: rot greyed for an element that does not turn');
 const ordBefore=await ev((id)=>{const o=SC.order(S);return o.indexOf(S.els.findIndex(e=>e.id===id))},e0);
 if(!(await ev(()=>document.querySelector('#qbar [data-id=down]').disabled))){await qa('down');ok(await ev((id)=>{const o=SC.order(S);return o.indexOf(S.els.findIndex(e=>e.id===id))},e0)===ordBefore-1,'scene: layer back')}
 await qa('copy');ok(await ev(()=>V.hasClip()),'scene: copied');await qa('paste');ok(await ev(()=>S.els.length)===n0+1,'scene: pasted');await p.keyboard.press('Control+z');await p.waitForTimeout(100);
 await qa('multi');ok(await ev(()=>UI.mmode===true)&&await p.getAttribute('#qbar [data-id=multi]','aria-pressed')==='true','scene: «Несколько» on');await qa('multi');
 await qa('undo');ok(await ev(()=>UI.hi>=0),'undo pressed');
 // plan
 await p.click('#modesw [data-v=plan]');await p.waitForTimeout(150);
 await ev(()=>{S.plan.rooms=[PG.makeRoom('Зал',0,0,[[12000,0],[9000,90],[12000,180],[9000,270]])];const t=PG.makeItem('t_q180',3000,3000);t.id='T1';t.num=1;t.sides=[3,2,1,0];S.plan.items=[t];PL.st.sel=null;PL.st.multi=[];commit();render()});await p.waitForTimeout(150);
 ok(await ids('#qbar')==='undo,redo-,dup-,copy-,paste-,del-,lock-,rot-,multi','plan: no layer buttons, nothing chosen greyed ('+await ids('#qbar')+')');
 await ev(()=>{PL.st.sel={t:'item',i:'T1'};render()});await p.waitForTimeout(100);
 await qa('dup');ok(await ev(()=>S.plan.items.length===2&&S.plan.items[1].num===2),'plan: duplicate, numbered on');
 await qa('copy');ok(await ev(()=>PL.canPaste()),'plan: copied');
 await qa('paste');ok(await ev(()=>S.plan.items.length===3&&PL.st.sel&&PL.st.sel.i===S.plan.items[2].id&&S.plan.items[2].num===3),'plan: pasted, the copy chosen and numbered');
 ok(await ev(()=>{const a=S.plan.items[1],c=S.plan.items[2];return c.x>a.x}),'plan: the pasted copy stands beside');
 // paste survives into another project (localStorage)
 ok(await ev(()=>{try{return JSON.parse(localStorage.getItem('fotozona.pclip.v1')).items.length===1}catch(e){return false}}),'plan clipboard kept for other projects');
 await ev(()=>{PL.st.sel={t:'item',i:'T1'};render()});await p.waitForTimeout(80);
 await qa('rot');ok(await ev(()=>S.plan.items[0].rot===90),'plan: turn 90°');
 // chair sides named as it stands now: before the turn top=3, bottom=2, left=1, right=0; after 90° clockwise top→right, bottom→left, left→top, right→bottom
 const rows=await ev(()=>[...document.querySelectorAll('#dock .fld')].filter(n=>/^(Сверху|Снизу|Слева|Справа)/.test(n.textContent.trim())&&n.querySelector('input')).map(n=>n.textContent.trim().slice(0,6).trim()+'='+n.querySelector('input').value));
 ok(JSON.stringify(rows)==='["Сверху=1","Снизу=0","Слева=2","Справа=3"]','chair sides after 90°: '+JSON.stringify(rows));
 await qa('lock');ok(await ev(()=>!!S.plan.items[0].lock),'plan: lock');await qa('lock');ok(await ev(()=>!S.plan.items[0].lock),'plan: unlock');
 await qa('del');ok(await ev(()=>S.plan.items.length===2&&!S.plan.items.some(i=>i.id==='T1')),'plan: delete');
 await qa('multi');ok(await ev(()=>PL.st.tool==='multi'),'plan: «Несколько» on');await qa('multi');ok(await ev(()=>PL.st.tool!=='multi'),'off');
 // Ctrl+C / Ctrl+V in the plan
 await ev(()=>{PL.st.sel={t:'item',i:S.plan.items[0].id};render()});await p.keyboard.press('Control+c');await p.keyboard.press('Control+v');await p.waitForTimeout(120);ok(await ev(()=>S.plan.items.length===3),'plan: Ctrl+C, Ctrl+V');
 // several: copy-paste keeps the group size
 await ev(()=>{PL.st.multi=S.plan.items.map(i=>i.id);PL.st.sel=null;render()});await p.waitForTimeout(80);await qa('copy');await qa('paste');ok(await ev(()=>S.plan.items.length===6&&PL.st.multi.length===3),'plan: 3 chosen → 3 pasted and chosen');
 // photo
 await p.click('#modesw [data-v=photo]');await p.setInputFiles('.fadd input >> nth=0',['tmp/hall_test.jpg','tmp/hall_test.jpg']);await p.waitForFunction(()=>(S.photos||[]).length===2);await p.waitForTimeout(250);
 await ev(()=>{const ph=S.photos[0];ph.marks.push({id:'q1',t:'dim',a:[100,100],b:[300,100],v:1500,col:'#FFD43B',text:'ниша'});PF.st.open=ph.id;PF.st.sel=null;render()});await p.waitForTimeout(150);
 ok(await ids('#qbar')==='undo,redo-,dup-,copy-,paste-,del-','photo: only undo, redo, duplicate, copy, paste, delete ('+await ids('#qbar')+')');
 await ev(()=>{PF.st.sel='q1';render()});await p.waitForTimeout(80);
 await qa('dup');ok(await ev(()=>{const m=S.photos[0].marks;return m.length===2&&m[1].v===1500&&m[1].a[0]>100&&PF.st.sel===m[1].id}),'photo: duplicate a size, shifted, chosen');
 await qa('copy');await ev(()=>{PF.st.open=S.photos[1].id;PF.st.sel=null;render()});await p.waitForTimeout(100);
 await qa('paste');ok(await ev(()=>S.photos[1].marks.length===1&&S.photos[1].marks[0].text==='ниша'),'photo: pasted onto another photo');
 await qa('del');ok(await ev(()=>S.photos[1].marks.length===0),'photo: delete');
 // settings: hide a button, the menu stays open
 await p.click('#qbar [data-act=qcfg]');await p.waitForTimeout(80);ok(await p.isVisible('#mpop [data-id="pos:float"]'),'⋯ opens the panel settings');
 await p.click('#mpop [data-id="b:copy"]');await p.waitForTimeout(80);ok(await p.isVisible('#mpop')&&!(await p.isVisible('#qbar [data-id=copy]')),'button hidden, menu still open');
 await p.click('#mpop [data-id="b:copy"]');await p.waitForTimeout(80);ok(await p.isVisible('#qbar [data-id=copy]'),'button back');
 // floating
 await p.click('#mpop [data-id="pos:float"]');await p.waitForTimeout(150);
 ok(await p.isVisible('#qfloat')&&await ev(()=>!document.querySelector('#qbar [data-act=qa]')),'floating: on the canvas, the top bar is clear');
 const r0=await ev(()=>{const r=document.querySelector('#qfloat').getBoundingClientRect();return [r.left,r.top]});
 const g=await ev(()=>{const r=document.querySelector('#qfloat .qgrip').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]});
 await p.mouse.move(g[0],g[1]);await p.mouse.down();await p.mouse.move(g[0]+200,g[1]+300,{steps:6});await p.mouse.up();await p.waitForTimeout(80);
 const r1=await ev(()=>{const r=document.querySelector('#qfloat').getBoundingClientRect();return [r.left,r.top]});
 ok(Math.abs(r1[0]-r0[0]-200)<3&&Math.abs(r1[1]-r0[1]-300)<3,'dragged by the grip '+r0+' → '+r1);
 ok(await ev(()=>{const q=JSON.parse(localStorage.getItem('fotozona.qbar.v1'));return q.pos==='float'&&Math.abs(q.x-document.querySelector('#qfloat').getBoundingClientRect().left)<2}),'place remembered');
 await p.click('#qfloat [data-act=qcfg]');await p.click('#mpop [data-id=vert]');await p.waitForTimeout(80);ok(await ev(()=>{const r=document.querySelector('#qfloat').getBoundingClientRect();return r.height>r.width}),'vertical');
 await p.keyboard.press('Escape');
 // works while floating
 await ev(()=>{PF.st.open=S.photos[0].id;PF.st.sel=S.photos[0].marks[0].id;render()});await p.waitForTimeout(80);await qa('del','#qfloat');ok(await ev(()=>S.photos[0].marks.length===1),'floating panel acts');
 // a reload keeps it floating
 await p.reload();await p.waitForSelector('#canvas');await p.waitForTimeout(300);ok(await p.isVisible('#qfloat')&&await ev(()=>document.querySelector('#qfloat').classList.contains('vert')),'after reload: still floating, vertical');
 // hidden: only undo/redo in the top bar; back from the View menu
 await p.click('#qfloat [data-act=qcfg]');await p.click('#mpop [data-id="pos:off"]');await p.waitForTimeout(100);
 ok(await p.isHidden('#qfloat')&&await ids('#qbar')==='undo-,redo-'.replace(/-/g,'')+''||/^undo-?,redo-?$/.test(await ids('#qbar')),'hidden: undo and redo stay ('+await ids('#qbar')+')');
 await p.click('.mbar .mb[data-id=view]');await p.waitForTimeout(80);await p.click('#mpop [data-id="pos:top"]');await p.waitForTimeout(100);
 ok((await ids('#qbar')).split(',').length===6,'back to the top bar from «Вид» (photo: 6 buttons)');
 ok(!(await ev(()=>/\bundefined\b|\bNaN\b/.test(document.body.innerText))),'no undefined on screen');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
