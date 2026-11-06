// v52: voice input on the keypad (a fake recognizer), table labels upright on turned tables, align section closed by default
const {chromium}=require('playwright');const path=require('path');
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.addInitScript(()=>{window.__recs=[];class FakeSR{constructor(){this.started=0;window.__recs.push(this)}start(){this.started++;this.live=true}abort(){this.live=false;this.aborted=true}stop(){this.live=false}}window.webkitSpeechRecognition=FakeSR;window.SpeechRecognition=FakeSR;
   window.__say=(alts,fin=true)=>{const r=window.__recs[window.__recs.length-1];const res=alts.map(t=>({transcript:t}));res.isFinal=fin;const e={resultIndex:0,results:[res]};r.onresult(e);if(fin){r.live=false;r.onend&&r.onend()}};
   window.__err=(er)=>{const r=window.__recs[window.__recs.length-1];r.onerror({error:er});r.onend&&r.onend()}});
 await p.goto('file://'+path.resolve('dist/konstruktor-fotozon.html'));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 const ev=(f,a)=>p.evaluate(f,a);
 await p.click('#modesw [data-v=plan]');await p.waitForTimeout(200);
 // a 4-wall room, its first wall chosen
 await ev(()=>{S.plan.rooms=[PG.makeRoom('Зал',0,0,[[6000,0],[4000,90],[6000,180],[4000,270]])];S.plan.items=[];const r=S.plan.rooms[0];PL.st.sel={t:'wall',r:r.id,w:r.walls[0].id};commit();render()});await p.waitForTimeout(150);
 ok(await p.isVisible('.kp [data-kp=mic]'),'mic button on the keypad');
 await p.click('.kp [data-kp=mic]');await p.waitForTimeout(80);
 ok(await ev(()=>window.__recs.length===1&&window.__recs[0].lang==='ru-RU'&&window.__recs[0].started===1),'recognizer started, Russian');
 ok(await p.getAttribute('.kp [data-kp=mic]','aria-pressed')==='true','mic shows it listens');
 ok(/Слушаю/.test(await p.textContent('#kvs-pl-wlen')),'status: listening');
 // a sure reading: entered, wall measured, next wall chosen, still listening
 await ev(()=>__say(['три запятая четыреста пятьдесят семь']));await p.waitForTimeout(250);
 ok(await ev(()=>{const w=S.plan.rooms[0].walls[0];return w.len===3457&&w.m}),'wall A–B = 3457 mm, measured');
 ok(await ev(()=>PL.st.sel.w===S.plan.rooms[0].walls[1].id),'moved on to the next wall');
 ok(/✓/.test(await p.textContent('#kvs-pl-wlen'))&&await p.getAttribute('.kp [data-kp=mic]','aria-pressed')==='true','status ✓, still listening after the panel was redrawn');
 ok(await ev(()=>window.__recs[0].started>=2),'listening round restarted');
 // an unsure one waits for «да»
 await ev(()=>__say(['пять']));await p.waitForTimeout(150);
 ok(await ev(()=>!S.plan.rooms[0].walls[1].m)&&(await p.inputValue('#pl-wlen'))==='5','unsure: in the field, not entered');
 ok(/Проверьте/.test(await p.textContent('#kvs-pl-wlen')),'asks to confirm');
 await ev(()=>__say(['да']));await p.waitForTimeout(250);
 ok(await ev(()=>{const w=S.plan.rooms[0].walls[1];return w.len===5000&&w.m}),'«да» enters it');
 // refused: bare 345 in metres
 await ev(()=>__say(['345']));await p.waitForTimeout(150);
 ok(/запятая/.test(await p.textContent('#kvs-pl-wlen'))&&await ev(()=>!S.plan.rooms[0].walls[2].m),'345: asks where the comma is, nothing entered');
 // alternatives: the first usable one is taken
 await ev(()=>__say(['привет','6 метров']));await p.waitForTimeout(250);
 ok(await ev(()=>S.plan.rooms[0].walls[2].len===6000),'second alternative used');
 // назад / дальше
 await ev(()=>__say(['назад']));await p.waitForTimeout(200);ok(await ev(()=>PL.st.sel.w===S.plan.rooms[0].walls[2].id),'«назад» — previous wall');
 await ev(()=>__say(['дальше']));await p.waitForTimeout(200);ok(await ev(()=>PL.st.sel.w===S.plan.rooms[0].walls[3].id),'«дальше» — next wall');
 // interim text shown
 await ev(()=>__say(['четыре'],false));ok(/… четыре/.test(await p.textContent('#kvs-pl-wlen')),'interim words shown');
 // стоп
 await ev(()=>__say(['стоп']));await p.waitForTimeout(150);
 ok(await p.getAttribute('.kp [data-kp=mic]','aria-pressed')==='false'&&await p.isHidden('#kvs-pl-wlen'),'«стоп» switches it off');
 // the mic button switches off too; a denied microphone stops with a message
 await p.click('.kp [data-kp=mic]');await p.waitForTimeout(50);await p.click('.kp [data-kp=mic]');await p.waitForTimeout(50);
 ok(await ev(()=>window.__recs[window.__recs.length-1].aborted===true),'second tap stops');
 await p.click('.kp [data-kp=mic]');await p.waitForTimeout(50);await ev(()=>__err('not-allowed'));await p.waitForTimeout(100);
 ok(/микрофон/i.test(await p.textContent('#toast'))&&await p.getAttribute('.kp [data-kp=mic]','aria-pressed')==='false','no microphone: message, off');
 // leaving the wall: listening stops at the next round
 await p.click('.kp [data-kp=mic]');await p.waitForTimeout(50);await ev(()=>{PL.st.sel=null;render()});await p.waitForTimeout(80);
 await ev(()=>{const r=window.__recs[window.__recs.length-1];r.onend()});await p.waitForTimeout(250);
 ok(await ev(()=>window.__recs[window.__recs.length-1].aborted===true),'field gone: recognizer stopped');
 // photo dims take voice too
 await p.click('#modesw [data-v=photo]');await p.setInputFiles('.fadd input >> nth=0','tmp/hall_test.jpg');await p.waitForFunction(()=>(S.photos||[]).length===1);await p.waitForTimeout(200);
 await ev(()=>{S.photos[0].marks.push({id:'m1',t:'dim',a:[100,100],b:[400,100],v:null});PF.st.sel='m1';render()});await p.waitForTimeout(150);
 if(await p.isVisible('#pf-val')){await p.click('.kp [data-kp=mic]');await p.waitForTimeout(50);await ev(()=>__say(['2 метра 40']));await p.waitForTimeout(250);ok(await ev(()=>S.photos[0].marks[0].v===2400),'photo size by voice: 2400');}
 else ok(false,'photo keypad visible');
 // the table labels: number above the seats, also on a turned table
 await p.click('#modesw [data-v=plan]');await p.waitForTimeout(150);
 for(const rot of [0,90,45]){
   await ev((rot)=>{const it=PG.makeItem('t_q180',3000,3000);it.rot=rot;it.num=12;S.plan.items=[it];PL.st.sel=null;PL.st.v={s:0.25,x:1500,y:1800,user:true};commit();PL.paint()},rot);await p.waitForTimeout(100);
   const r=await ev(()=>{const a=document.querySelector('#pitems .ptn').getBoundingClientRect(),b=document.querySelector('#pitems .pts').getBoundingClientRect();return [a.left+a.width/2,a.top+a.height/2,b.left+b.width/2,b.top+b.height/2,a.bottom,b.top]});
   ok(Math.abs(r[0]-r[2])<2&&r[3]>r[1]+8,'turned '+rot+'°: number above «N м.», same column ('+r.map(Math.round)+')');
 }
 // align section: closed until opened, remembered
 await ev(()=>{S.plan.items=[PG.makeItem('t_q180',3000,3000),PG.makeItem('t_q180',6000,3400)];PL.st.multi=S.plan.items.map(i=>i.id);PL.st.sel=null;commit();render()});await p.waitForTimeout(150);
 const sec=()=>ev(()=>{const h=[...document.querySelectorAll('.igl.sh')].find(n=>/Выровнять и распределить/.test(n.textContent));return h?h.closest('.sec').classList.contains('open'):null});
 ok(await sec()===false,'«Выровнять и распределить» closed at first');
 await p.click('.igl.sh:has-text("Выровнять и распределить")');await p.waitForTimeout(100);ok(await sec()===true,'opens on a tap');
 await ev(()=>render());await p.waitForTimeout(80);ok(await sec()===true,'stays open after a redraw');
 await p.click('[data-pact=m-align][data-v=top]');await p.waitForTimeout(120);ok(await ev(()=>{const a=S.plan.items;return Math.abs(PG.fullBox(a[0]).y0-PG.fullBox(a[1]).y0)<1}),'align still works');
 ok(!errs.length,'no page errors: '+errs.join(' | '));
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
