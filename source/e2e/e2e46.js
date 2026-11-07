// smoke after the rebuild: every mode opens, scene draws, plan room + table, photo marks, save → reload keeps all, PNG/offer builders run, no page errors
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(400);
 const ev=(f,a)=>p.evaluate(f,a);
 ok(/версия 60/.test(await p.textContent('#ver')),'version label 60');
 const ta=await p.evaluate(()=>[...document.querySelectorAll('#dock input:not([type=range]):not([type=checkbox]):not([type=color]):not([type=file]), #dock textarea, #dock select')].map(i=>getComputedStyle(i).touchAction));ok(ta.length>0&&ta.every(t=>t==='none'),'panel text fields: touch-action none (no stylus handwriting) '+ta.length);
 const rng=await p.evaluate(()=>{const r=document.querySelector('input[type=range]');return r?getComputedStyle(r).touchAction:'pan-y'});ok(rng!=='none','sliders keep their own touch-action: '+rng);
 ok(await ev(()=>document.querySelectorAll('#scn .el').length>0),'scene elements drawn');
 ok(await ev(()=>R&&R.cost&&R.cost.all>0),'estimate computed: '+await ev(()=>R.cost.all));
 // scene edit + undo
 const n0=await ev(()=>S.els.length);await ev(()=>{const e=JSON.parse(JSON.stringify(S.els[0]));e.id='dup1';e.x+=500;S.els.push(e);commit()});ok(await ev(()=>S.els.length)===n0+1,'scene: element added');
 await p.keyboard.press('Control+z');await p.waitForTimeout(150);ok(await ev(()=>S.els.length)===n0,'scene: undo');
 // plan
 await p.click('#modesw [data-v=plan]');await p.waitForTimeout(200);ok(await ev(()=>UI.mode)==='plan','plan mode');
 const nmI=await p.$('[data-pbind]');
 await ev(()=>{PL.act('fly-pick',{dataset:{g:'room',v:'rect'}});commit();const it=PG.makeItem('t_r150',3000,3000);it.num=1;S.plan.items.push(it);commit()});await p.waitForTimeout(200);
 ok(await ev(()=>S.plan.rooms.length===1&&document.querySelectorAll('#pitems > *').length>=1),'room and table drawn');
 ok((await p.textContent('#statbar')).length>5,'plan status bar');
 // photo
 await p.click('#modesw [data-v=photo]');await p.waitForTimeout(200);ok(await ev(()=>UI.mode)==='photo','photo mode');
 await p.setInputFiles('.fadd input >> nth=0','tmp/hall_test.jpg');await p.waitForFunction(()=>(S.photos||[]).length===1);await p.waitForTimeout(200);
 ok(await ev(()=>!document.getElementById('fed').hidden),'photo opened after upload');
 // draw a size with the tool by dragging
 await p.click('.tools [data-fact=tool][data-v=dim]');const r=await ev(()=>{const b=document.getElementById('fsvg').getBoundingClientRect();return {x:b.left+b.width*0.3,y:b.top+b.height*0.3}});
 await p.mouse.move(r.x,r.y);await p.mouse.down();await p.mouse.move(r.x+150,r.y,{steps:8});await p.mouse.up();await p.waitForTimeout(200);
 ok(await ev(()=>S.photos[0].marks.length===1&&S.photos[0].marks[0].t==='dim'),'size drawn by dragging');
 for(const k of ['2',',','5'])await p.click('.kp [data-kp="'+k+'"]');await p.click('.kp [data-kp=ok]');await p.waitForTimeout(150);ok(await ev(()=>S.photos[0].marks[0].v)===2500,'keypad: 2,5 m');
 // save → reload
 await p.waitForTimeout(700);const snap=await ev(()=>JSON.stringify({e:S.els.length,r:S.plan.rooms.length,i:S.plan.items.length,m:S.photos[0].marks.length,v:S.photos[0].marks[0].v}));
 await p.reload();await p.waitForSelector('#canvas');await p.waitForFunction(()=>window.S&&S.photos&&S.photos.length===1,null,{timeout:15000});await p.waitForTimeout(500);
 ok(await ev(()=>JSON.stringify({e:S.els.length,r:S.plan.rooms.length,i:S.plan.items.length,m:S.photos[0].marks.length,v:S.photos[0].marks[0].v}))===snap,'reload keeps scene, plan and photo marks '+snap);
 ok(await ev(()=>!!IMG[S.photos[0].im]),'photo picture restored');
 ok(await ev(()=>UI.mode)==='photo','mode remembered');
 // builders
 ok(await ev(()=>IO.sceneCanvas(800,{dims:true}).then(cv=>cv.width===800)),'scene picture builds');
 ok(await ev(()=>IO.offerCanvas(1).then(cv=>cv.width===1240)),'offer page builds');
 ok(await ev(()=>RP.build(1).then(x=>x.pages.length>=1)),'report builds');
 // menus open
 await ev(()=>PL.setMode('scene'));await p.waitForTimeout(150);ok(await ev(()=>UI.mode)==='scene','back to scene');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
