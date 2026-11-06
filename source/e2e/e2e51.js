// v39: random walk through the app — add, select, delete, undo, redo, switch modes, new project, open template — nothing may throw
const {chromium}=require('playwright');const path=require('path');
const FILE=process.env.FILE||'dist/konstruktor-fotozon.html',STEPS=+process.env.STEPS||400,SEED=+process.env.SEED||7;
let fails=0,pass=0;const ok=(c,m)=>{if(c)pass++;else{fails++;console.log('  FAIL: '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:854}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('console: '+m.text().slice(0,200))});
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/,r=>r.abort());
 await p.goto('file://'+path.resolve(FILE));await p.waitForSelector('#canvas');await p.waitForTimeout(300);
 await p.setInputFiles('.fadd input >> nth=0','tmp/hall_test.jpg').catch(()=>{});
 const log=await p.evaluate(async({STEPS,SEED})=>{
   let s=SEED;const rnd=()=>(s=(s*16807)%2147483647)/2147483647,pick=a=>a[Math.floor(rnd()*a.length)];const out=[];
   const A={
    mode:()=>PL.setMode(pick(['scene','plan','photo'])),
    room:()=>{PL.setMode('plan');PL.act('fly-pick',{dataset:{g:'room',v:pick(['rect','L'])}});},
    table:()=>{if(!S.plan.rooms.length)return;const it=PG.makeItem(pick(['t_r150','t_q180','t_r120','z_podium','u_spot']),1000+rnd()*9000,1000+rnd()*6000);S.plan.items.push(it);PL.st.sel={t:'item',i:it.id};UI.nextLabel='План: x';commit()},
    selItem:()=>{const it=pick(S.plan.items);if(it){PL.st.sel={t:'item',i:it.id};render()}},
    selWall:()=>{const r=pick(S.plan.rooms);if(r){PL.st.sel={t:pick(['wall','room','corner']),r:r.id,w:pick(r.walls).id,c:Math.floor(rnd()*r.walls.length)};render()}},
    delSel:()=>{if(PL.st.sel&&PL.st.sel.t==='item')PL.act('it-del',{dataset:{}});},
    dup:()=>{if(PL.st.sel&&PL.st.sel.t==='item')PL.act('it-dup',{dataset:{}});},
    tableUndo:()=>{A.table();act('undo')},
    multi:()=>{PL.setMode('plan');const ids=S.plan.items.filter(()=>rnd()<.6).map(i=>i.id);PL.st.multi=ids;PL.st.sel=null;render()},
    malign:()=>{if(PL.st.multi.length>1)PL.act(pick(['m-align','m-dist','m-rot','m-lock','m-num','m-del','seat-set']),{dataset:{v:pick(['left','cx','right','top','cy','bottom','x','y','rows','cols','dense','normal','comfort','free'])}})},
    renum:()=>PL.act('renum',{dataset:{v:pick(['rows','cols'])}}),
    undo:()=>act('undo'),redo:()=>act('redo'),undo2:()=>{act('undo');act('undo')},
    hgo:()=>{if(UI.hist.length>1){restore(Math.floor(rnd()*UI.hist.length))}},
    newp:()=>{act('new-proj');const b=document.querySelector('[data-act=new-go][data-id='+pick(['scene','plan','photo'])+']');if(b)b.click();else UI.modal=null},
    tpl:()=>loadState(M.template('three')),
    photoOpen:()=>{PL.setMode('photo');const ph=pick(S.photos||[]);if(ph){PF.openPhoto(ph.id);render()}},
    mark:()=>{const ph=(S.photos||[]).find(x=>x.id===PF.st.open);if(ph){const m={id:'m'+Math.floor(rnd()*1e9),t:'dim',a:[rnd()*500,rnd()*500],b:[rnd()*900,rnd()*700],v:rnd()<.7?Math.round(rnd()*5000):null,col:'#FF4D4F'};ph.marks.push(m);PF.st.sel=m.id;UI.nextLabel='Фото: x';commit()}},
    markDel:()=>{if(PF.st.sel)PF.act('m-del',{dataset:{}});},
    gallery:()=>PF.act('gallery',{dataset:{}}),
    selEl:()=>{PL.setMode('scene');const e=pick(S.els);if(e){UI.sel=e.id;render()}},
    moveEl:()=>{const e=UI.sel&&M.find(S,UI.sel);if(e){e.x+=Math.round((rnd()-.5)*400);commit()}},
    tab:()=>act('dtab',{dataset:{id:pick(['layers','hist','checks','props'])}}),
    esc:()=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))},
   };
   const keys=Object.keys(A);
   for(let i=0;i<STEPS;i++){const k=pick(keys);try{A[k]()}catch(e){out.push(i+' '+k+': '+e.message)}
     if((window.__renderErrors||[]).length){out.push(i+' '+k+' render: '+window.__renderErrors.join(' / '));window.__renderErrors=[]}}
   return out},{STEPS,SEED});
 ok(log.length===0,'random walk ('+STEPS+' steps, seed '+SEED+') without errors: '+log.slice(0,6).join(' || '));
 ok(!errs.length,'no page errors: '+errs.slice(0,4).join(' | '));
 // still responsive at the end
 await p.click('#modesw [data-v=plan]');await p.waitForTimeout(100);ok(await p.evaluate(()=>UI.mode)==='plan','still responds to taps');
 console.log(pass+' checks passed, '+fails+' failed');await b.close();process.exit(fails?1:0)})();
