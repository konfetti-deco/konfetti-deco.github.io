// v45: «Сохранить» asks for the name (prefilled; a default name is selected so typing replaces it); «Как новый» keeps the old project
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 // a stand-in for the cloud: records what is saved
 await ev(()=>{window.__saved=[];IO.db={};IO.saveProject=function(){if(!S.pid)S.pid='p'+(__saved.length+1);__saved.push({name:S.name,pid:S.pid});return Promise.resolve(true)};window.refreshProjects=function(){}});
 await ev(()=>{act('new-proj')});const g=await p.$('[data-act=new-go][data-id=plan]');await g.click();await p.waitForTimeout(150);
 ok(await ev(()=>S.name)==='План зала','new plan project is called «План зала»');
 await p.click('.top [data-act=save], header [data-act=save], [data-act=save] >> nth=0');await p.waitForTimeout(150);
 ok(await ev(()=>UI.modal&&UI.modal.type==='save'),'«Сохранить» opens the save box');
 const sel=await ev(()=>{const f=document.getElementById('save-name');return {v:f.value,s:f.selectionStart,e:f.selectionEnd,focus:document.activeElement===f}});ok(sel.v==='План зала'&&sel.s===0&&sel.e===sel.v.length&&sel.focus,'name prefilled, focused and selected: '+JSON.stringify(sel));
 await p.keyboard.type('Зал 1 — ресторан Альпы');await p.keyboard.press('Enter');await p.waitForTimeout(150);
 let sv=await ev(()=>__saved);ok(sv.length===1&&sv[0].name==='Зал 1 — ресторан Альпы','saved under the typed name (Enter)');ok(await ev(()=>!UI.modal&&S.name==='Зал 1 — ресторан Альпы'&&document.getElementById('pname').value==='Зал 1 — ресторан Альпы'),'box closed, title updated');
 // again: the same project is updated; the name is not selected now (cursor at the end)
 await p.click('[data-act=save] >> nth=0');await p.waitForTimeout(150);ok(await ev(()=>{const f=document.getElementById('save-name');return f.selectionStart===f.value.length&&f.selectionEnd===f.value.length}),'own name: cursor at the end, not selected');
 ok(await ev(()=>!!document.querySelector('#modal [data-act=save-go][data-id=new]')),'«Как новый» offered for a saved project');
 await p.click('#modal [data-act=save-go][data-id=over]');await p.waitForTimeout(150);sv=await ev(()=>__saved);ok(sv.length===2&&sv[1].pid===sv[0].pid,'«Сохранить» updates the same project');
 // save as new with another name
 await p.click('[data-act=save] >> nth=0');await p.waitForTimeout(120);await p.fill('#save-name','Зал 2');await p.click('#modal [data-act=save-go][data-id=new]');await p.waitForTimeout(150);
 sv=await ev(()=>__saved);ok(sv.length===3&&sv[2].pid!==sv[0].pid&&sv[2].name==='Зал 2','«Как новый» → a separate project «Зал 2»');
 // File → Сохранить как новый
 await ev(()=>act('save-as'));await p.waitForTimeout(120);ok(await ev(()=>UI.modal&&UI.modal.asNew&&document.querySelector('#modal [data-act=save-go]').dataset.id==='new'),'File → «Сохранить как новый» opens the box for a copy');
 await p.fill('#save-name','Зал 3');await p.keyboard.press('Enter');await p.waitForTimeout(150);sv=await ev(()=>__saved);ok(sv.length===4&&sv[3].name==='Зал 3'&&sv[3].pid!==sv[2].pid,'copy «Зал 3» saved separately');
 // Ctrl+S and an empty name
 await p.keyboard.press('Control+s');await p.waitForTimeout(120);ok(await ev(()=>UI.modal&&UI.modal.type==='save'),'Ctrl+S opens the box');
 await p.fill('#save-name','   ');await p.click('#modal [data-act=save-go][data-id=over]');await p.waitForTimeout(120);ok(await ev(()=>__saved.length===4&&UI.modal&&UI.modal.type==='save'),'empty name: not saved, box stays');
 await p.keyboard.press('Escape');await p.waitForTimeout(80);ok(await ev(()=>!UI.modal),'Esc closes');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
