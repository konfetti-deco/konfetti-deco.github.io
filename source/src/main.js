/* ===== main.js — state, history, rendering loop, pointer editing on the scene, actions. ===== */
var S, R, UI = {tab:'con', sel:null, group:'bg', mod:null, ced:null, hist:[], hi:-1, modal:null, projects:null, ph:null, phTall:0, fold:IO.loadFold(), hsv:null, imp:null, multi:null, mmode:false, zoom:{z:1,x:0,y:0}, night:false, analyses:null, anBusy:false, anErr:false, phPaste:false, phText:'', phNoImg:false, histL:[], dtab:'layers', fly:false, tool:null, isec:{}, dock:'', nextLabel:null, scrubbing:false};
(function(){try{var q=localStorage.getItem('fotozona.ws.v1');if(q){q=JSON.parse(q);if(q.dock==='mini')UI.dock='mini';if(/^(layers|hist|checks|scene)$/.test(q.dtab))UI.dtab=q.dtab;if(+q.split>80)UI.dsplit=+q.split;if(q.isec&&typeof q.isec==='object')UI.isec=q.isec}}catch(e){}})();
function wsSave(){try{localStorage.setItem('fotozona.ws.v1',JSON.stringify({dock:UI.dock,dtab:UI.dtab,split:UI.dsplit||0,isec:UI.isec}))}catch(e){}}
var IMG = {};   // pictures loaded from files: id -> {src, w, h}. Kept out of the undo history.
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}

/* text width by real fonts */
(function(){var c;try{c=document.createElement('canvas').getContext('2d')}catch(e){}
  if(c)M.measure=function(line,font,px){c.font=(D.FONT_W[font]||600)+' 100px '+D.FONTS[font];return c.measureText(line).width*px/100}})();

function toast(msg){var t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(toast._t);toast._t=setTimeout(function(){t.classList.remove('on')},3400)}
function openModal(m){UI.modal=m;renderModal()}
function calc(){R=E.calc(S.els.some(function(e){return e.hide||e.type==='person'})?Object.assign({},S,{els:S.els.filter(function(e){return !e.hide&&e.type!=='person'})}):S)}   // hidden elements and the people figures are not counted
function pushHist(){var j=JSON.stringify(S);IO.autosave(j);if(UI.hist[UI.hi]===j){UI.nextLabel=null;return}
  var lab=UI.nextLabel||histLabel(UI.hist[UI.hi],S);UI.nextLabel=null;
  UI.hist=UI.hist.slice(0,UI.hi+1);UI.histL=UI.histL.slice(0,UI.hi+1);UI.hist.push(j);UI.histL.push(lab);
  if(UI.hist.length>80){UI.hist.shift();UI.histL.shift();UI.histL[0]='Самый ранний сохранённый шаг'}UI.hi=UI.hist.length-1;IO.autosave(j)}
/* what one step did, in words, by comparing the state before and after it — the History panel lists these */
function histLabel(prevJ,N){var P=null;try{P=JSON.parse(prevJ)}catch(e){}if(!P)return 'Изменение';
  var nm=function(e){return V.elName(e)},pm={},nmI={},i,e;P.els.forEach(function(x,ix){pm[x.id]=x;nmI[x.id]=ix});
  var add=N.els.filter(function(x){return !pm[x.id]}),nIds={};N.els.forEach(function(x){nIds[x.id]=1});var del=P.els.filter(function(x){return !nIds[x.id]});
  if(add.length&&!del.length)return add.length===1?'Добавлено: '+nm(add[0]):'Добавлено элементов: '+add.length;
  if(del.length&&!add.length)return del.length===1?'Удалено: '+nm(del[0]):'Удалено элементов: '+del.length;
  if(add.length&&del.length)return 'Сцена заменена';
  var ch=[];N.els.forEach(function(x){var o=pm[x.id];if(JSON.stringify(o)!==JSON.stringify(x))ch.push([o,x])});
  var one=function(o,x){var ks={},k;for(k in o)ks[k]=1;for(k in x)ks[k]=1;var dk=Object.keys(ks).filter(function(q){return JSON.stringify(o[q])!==JSON.stringify(x[q])}),has=function(l){return dk.some(function(q){return l.indexOf(q)>=0})},only=function(l){return dk.every(function(q){return l.indexOf(q)>=0})},n=nm(x);
    if(only(['hide']))return (x.hide?'Скрыто: ':'Показано: ')+n;
    if(only(['lock']))return (x.lock?'Закреплено: ':'Откреплено: ')+n;
    if(only(['rot']))return 'Поворот: '+n;
    if(only(['x','y','z','stand','mount']))return 'Перемещение: '+n;
    if(has(['w','h','size','arc','r'])&&only(['w','h','size','x','y','z','arc','r','pts','n']))return 'Размер: '+n;
    if(has(['pts','nodes']))return 'Форма: '+n;
    if(has(['text','font','style']))return 'Надпись: '+n;
    if(has(['color','cols','tone','seq','surf','k','rib','lc','ins','insColor','glow','fin','fins','mix','share','im']))return 'Цвет и покрытие: '+n;
    if(only(['name']))return 'Название: '+n;
    return 'Настройки: '+n};
  if(ch.length===1)return one(ch[0][0],ch[0][1]);
  if(ch.length>1){var mv=ch.every(function(q){var o=q[0],x=q[1];return Object.keys(x).concat(Object.keys(o)).every(function(k){return ['x','y','z'].indexOf(k)>=0||JSON.stringify(o[k])===JSON.stringify(x[k])})});
    var ord=P.els.map(function(x){return x.id}).join()!==N.els.map(function(x){return x.id}).join();
    if(mv)return (ch.length===2&&!ord?'Перемещение: ':'Перемещение группы: ')+(ch.length===2?nm(ch[0][1])+' и ещё 1':ch.length+' эл.');
    if(N.palette!==P.palette)return 'Палитра: '+D.pal(N.palette).name;
    if(N.holiday!==P.holiday)return 'Праздник: '+D.holiday(N.holiday).name;
    if(UI.multi&&ch.every(function(q){return UI.multi.indexOf(q[1].id)>=0})&&ch.some(function(q){return ['w','h','size'].some(function(k){return JSON.stringify(q[0][k])!==JSON.stringify(q[1][k])})}))return 'Размер группы: '+ch.length+' эл.';
    var mine=ch.filter(function(q){return q[1].id===UI.sel})[0];if(mine)return one(mine[0],mine[1])+' и ещё '+(ch.length-1);   // the selected element changed and others followed it (ink, riders)
    return 'Изменено элементов: '+ch.length}
  if(P.els.map(function(x){return x.id}).join()!==N.els.map(function(x){return x.id}).join())return 'Порядок слоёв';
  if(N.palette!==P.palette)return 'Палитра: '+D.pal(N.palette).name;
  if(N.holiday!==P.holiday)return 'Праздник: '+D.holiday(N.holiday).name;
  var J=function(a){return JSON.stringify(a)};
  if(J(N.room)!==J(P.room))return 'Комната';
  if(J(N.floor)!==J(P.floor))return 'Пол';
  if(J(N.balloons)!==J(P.balloons))return 'Гирлянда: настройки';
  if(J(N.show)!==J(P.show))return 'Показ на сцене';
  if(J(N.ref)!==J(P.ref))return 'Фото-образец';
  if(N.name!==P.name)return 'Название: '+N.name;
  if(J(N.prices)!==J(P.prices))return 'Цены';
  if(J(N.eco)!==J(P.eco))return 'Экономика';
  if(J(N.client)!==J(P.client))return 'Для клиента';
  if(N.pid!==P.pid)return 'Сохранено';
  return 'Настройки расчёта'}
function commit(){calc();if(!UI.scrubbing)pushHist();render()}
function restore(i){UI.hi=i;S=JSON.parse(UI.hist[i]);if(UI.sel&&!M.find(S,UI.sel))UI.sel=null;if(UI.multi){UI.multi=UI.multi.filter(function(q){return M.find(S,q)});if(UI.multi.length<2)UI.multi=null}calc();render();IO.autosave(UI.hist[i])}
function loadState(o,keep){
  if(o&&o.images&&typeof o.images==='object'){Object.keys(o.images).forEach(function(id){var im=o.images[id];if(im&&/^data:image\//.test(im.src)&&+im.w>0&&+im.h>0&&/^[a-z0-9]{3,24}$/i.test(id)){IMG[id]={src:im.src,w:+im.w,h:+im.h};IO.saveImg(id)}});delete o.images}
  var n=M.normalize(o);if(!n){toast('Это не файл проекта фотозоны.');return false}
  if(keep){['prices','eco','client','brand'].forEach(function(k){n[k]=S[k]})}
  S=n;UI.sel=null;UI.multi=null;UI.mod=null;UI.ced=null;UI.nextLabel='Открыт: '+(n.name||'проект');if(Object.keys(SC._cache).length>40)SC._cache={};IO.loadImgs(SC.usedImgs(S));syncImgDefs();commit();return true;
}
function syncImgDefs(){var d=$('#imgdefs');if(!d)return;var ids=Object.keys(IMG),key=ids.join(',');if(d._k===key)return;d._k=key;d.innerHTML=SC.imgDefs(ids)}

/* ---------- rendering ---------- */
/* Replacing a section can blur a field with an uncommitted value; the browser then fires `change` in the middle of
   the replacement. Such a nested call only marks the page dirty and one more pass runs afterwards. */
var rendering=false,renderAgain=false;
function render(){
  if(rendering){renderAgain=true;return}
  rendering=true;
  try{renderNow()}finally{rendering=false}
  if(renderAgain){renderAgain=false;render()}
}
function renderSecs(box,T,key){
  if(box.dataset.view!==key){box.innerHTML=T.skel;box.dataset.view=key}
  var act=document.activeElement,fid=act&&act.id&&box.contains(act)?act.id:null,s0,s1;
  try{s0=act.selectionStart;s1=act.selectionEnd}catch(e){}
  $$('[data-sec]',box).forEach(function(n){var f=T.secs[n.dataset.sec];if(!f)return;var h=f();if(n._h!==h){n.innerHTML=h;n._h=h}});
  if(fid&&!box.contains(act)){var n=document.getElementById(fid);if(n){n.focus({preventScroll:true});try{n.setSelectionRange(s0,s1)}catch(e){}}}
}
function renderNow(){
  var pn=$('#pname');if(document.activeElement!==pn)pn.value=S.name;
  document.body.dataset.tab=UI.tab;
  $$('.ctabs .tab').forEach(function(b){b.setAttribute('aria-selected',b.dataset.id===UI.tab)});
  renderSecs($('#view'),V.con,'con');
  var w=$('#wsm');if(w){w.classList.toggle('flyon',!!UI.fly);w.classList.toggle('mini',UI.dock==='mini');w.dataset.dtab=UI.dtab;w.classList.toggle('hand',UI.tool==='hand')}
  var dk=$('#dock');if(dk&&UI.dsplit)dk.style.setProperty('--dsplit',UI.dsplit+'px');
  paintStage();fitStage();placeFly();
  var cw=$('#calcwin');
  if(UI.tab!=='con'&&V[UI.tab]){cw.hidden=false;renderSecs($('#calcview'),V[UI.tab],UI.tab);if(UI.tab==='client')IO.drawOffer($('#offer'))}
  else{cw.hidden=true;if($('#calcview').dataset.view){$('#calcview').innerHTML='';$('#calcview').dataset.view=''}}
  $$('[data-act=undo]').forEach(function(b){b.disabled=UI.hi<=0});$$('[data-act=redo]').forEach(function(b){b.disabled=UI.hi>=UI.hist.length-1});
  renderModal();
}
/* the scene keeps the room's proportions and fits the canvas: as large as the space between the panels allows */
function fitStage(){var c=$('#canvas'),w=$('#stagewrap');if(!c||!w)return;var cw=c.clientWidth-24,ch=c.clientHeight-24;if(cw<50||ch<50)return;
  var ar=S.room.w/(S.room.h+SC.FLOOR),ww=Math.floor(Math.min(cw,ch*ar));if(w._fw!==ww){w._fw=ww;w.style.width=ww+'px';zoomApply();placeOv()}}
function placeFly(){var f=$('#fly');if(!f||!UI.fly)return;var t=$('.tools [data-tool="'+V.toolOf(UI.group)[0]+'"]'),c=$('#canvas');if(!t||!c)return;
  var top=Math.max(4,t.getBoundingClientRect().top-c.getBoundingClientRect().top-4),fh=f.querySelector('.fh'),fl=f.querySelector('.flist'),need=(fh?fh.offsetHeight:0)+(fl?fl.scrollHeight:0)+4;
  top=Math.max(4,Math.min(top,c.clientHeight-need-8));f.style.setProperty('--ft',top+'px')}   // a list opened from a low tool moves up so that all of it shows
var SVGNS='http://www.w3.org/2000/svg';
function setH(n,h){if(n&&n._h!==h){n.innerHTML=h;n._h=h}}
/* the options bar follows every move live; a field being typed into keeps its focus, a label being scrubbed is left alone */
function optPaint(){var ob=$('#optbar');if(!ob||UI.scrubbing)return;var h=V.optbar();if(ob._h===h)return;var act=document.activeElement,fid=act&&ob.contains(act)?act.id:null,s0,s1;try{s0=act.selectionStart;s1=act.selectionEnd}catch(e){}
  ob.innerHTML=h;ob._h=h;if(fid){var n=document.getElementById(fid);if(n){n.focus({preventScroll:true});try{n.setSelectionRange(s0,s1)}catch(e){}}}}
function elStyle(x,top,w,h){var W=S.room.w,HH=S.room.h+SC.FLOOR;return 'left:'+(x/W*100).toFixed(4)+'%;top:'+(top/HH*100).toFixed(4)+'%;width:'+(w/W*100).toFixed(4)+'%;height:'+(h/HH*100).toFixed(4)+'%'}
/* keyed update: every element keeps its own node; only nodes whose markup or place changed are touched */
function paintStage(){
  var box=$('#scn');if(!box)return;
  syncImgDefs();
  var P=SC.parts(S,R,{uid:'s',dims:S.show.dims,grid:S.show.grid,ref:true}),have={},n,i;
  setH($('#scd'),P.defs);setH($('#room'),P.room);setH($('#shadows'),P.shadows);setH($('#scover'),P.over);
  for(n=box.firstChild;n;n=n.nextSibling)have[n.getAttribute('data-id')]=n;
  for(i=0;i<P.els.length;i++){var e=P.els[i];n=have[e.id];
    if(!n){n=document.createElementNS(SVGNS,'svg');n.setAttribute('class','el');n.setAttribute('data-id',e.id);n.setAttribute('preserveAspectRatio','none')}
    delete have[e.id];
    var vb='0 0 '+e.vw+' '+e.vh,st=elStyle(e.x,e.y,e.w,e.h);
    if(n._vb!==vb){n.setAttribute('viewBox',vb);n._vb=vb}
    if(n._st!==st){n.style.cssText=st;n._st=st}
    if(n._h!==e.html){n.innerHTML=e.html;n._h=e.html}
    var se=M.find(S,e.id);n.classList.toggle('lk',!!(se&&se.lock));
    var nsg=se&&se.type==='sym'&&/^n(gift|heart|star|magen|moon)$/.test(se.kind),gl=se&&((se.type==='neon'&&se.glow!==0)||(se.type==='text'&&(se.style==='neon'||se.style==='marquee'))||nsg||(se.type==='prop'&&/^(candles|candelabra|csticks|lantern)$/.test(se.kind)));n.classList.toggle('glow',!!gl);if(gl)n.style.setProperty('--gc',se.type==='neon'?se.color:nsg?(se.color||'#FFE3A6'):se.type==='text'&&se.style==='neon'?(se.color||D.pal(S.palette).ink):'#FFE3A0');
    var cur=box.children[i];if(cur!==n)box.insertBefore(n,cur||null);
  }
  for(var k in have)box.removeChild(have[k]);
  zoomApply();applyNight();placeOv();mvBtns();
  optPaint();setH($('#statbar'),V.statbar());
  $$('.tools [data-act="mv"]').forEach(function(b){b.setAttribute('aria-pressed',UI.tool!=='hand'&&b.dataset.id===(UI.mv||'wall'))});var hb=$('.tools [data-id="hand"]');if(hb)hb.setAttribute('aria-pressed',UI.tool==='hand');var mb=$('#multibtn');if(mb)mb.setAttribute('aria-pressed',!!UI.mmode);
}
function boxStyle(el){var b=SC.proj(S,el);return elStyle(b.x,b.y,b.w,b.h)}
function restyle(e){var n=$('#scn .el[data-id="'+e.id+'"]');if(n){var st=boxStyle(e);n.style.cssText=st;n._st=st}}
/* the box of several elements as they are drawn */
function pboxOf(list){var b={x0:1e9,x1:-1e9,t:1e9,b:-1e9};list.forEach(function(e){var p=SC.proj(S,e);b.x0=Math.min(b.x0,p.x);b.x1=Math.max(b.x1,p.x+p.w);b.t=Math.min(b.t,p.y);b.b=Math.max(b.b,p.y+p.h)});return b}
function stageK(){var z=$('#zoomer'),w=z?z.offsetWidth:0;return w?S.room.w/w:8}
function handlesFor(el){
  if(el.type==='balloon'||el.type==='person')return [];
  if(el.type==='foil')return [];
  if((E.isBg(el)&&el.type!=='circle')||el.type==='neon'||el.type==='garland'||el.type==='cluster'||el.type==='flora'||el.type==='drape'||(el.type==='prop'&&D.FREE_H[el.kind]))return ['w','e','n','ne'];
  return ['w','e','ne'];
}
/* the selection frame: plain HTML over the picture, moved by style only */
function placeOv(){
  var ov=$('#ov');if(!ov)return;var el=V.sel(),ms=V.multi().filter(function(e){return !e.hide});
  $$('#scn .el.on').forEach(function(n){n.classList.remove('on')});
  var mb=$('#multibtn');if(mb)mb.setAttribute('aria-pressed',!!UI.mmode);
  var k=stageK(),show=function(x,top,w,h){ov.style.left=(x/k)+'px';ov.style.top=(top/k)+'px';ov.style.width=(w/k)+'px';ov.style.height=(h/k)+'px'};
  if(ms.length>1){var bb=pboxOf(ms);ms.forEach(function(e){var n=$('#scn .el[data-id="'+e.id+'"]');if(n)n.classList.add('on')});
    show(bb.x0,bb.t,bb.x1-bb.x0,bb.b-bb.t);ov.style.transform='';ov.className='ov grp'+((bb.x1-bb.x0)/k*UI.zoom.z<64||(bb.b-bb.t)/k*UI.zoom.z<64?' tiny':'');$$('.rh,.lh,.dh',ov).forEach(function(q){q.hidden=true});$$('.hd',ov).forEach(function(q){q.hidden=ms.some(function(e){return e.lock})});$('#ovn').innerHTML='';ov.hidden=false;return}
  if(!el||el.hide){ov.hidden=true;return}
  var n=$('#scn .el[data-id="'+el.id+'"]');if(n)n.classList.add('on');
  var pb=SC.proj(S,el),w=pb.w/k,h=pb.h/k,hs=el.lock?[]:handlesFor(el);
  show(pb.x,pb.y,pb.w,pb.h);ov.style.transform=el.rot?'rotate('+el.rot+'deg)':'';
  ov.className='ov'+(w*UI.zoom.z<64||h*UI.zoom.z<64?' tiny':'')+(el.lock?' lk':'')+(M.isPath(el)?' gar':'');
  $$('.hd',ov).forEach(function(q){q.hidden=hs.indexOf(q.dataset.h)<0});
  $('.rh',ov).hidden=el.lock||!M.canRot(el);
  var isG=M.isPath(el)&&!el.lock,nb=$('#ovn'),P=isG?E.garlandNodes(el):[],kids=nb.children;
  if(kids.length!==P.length)nb.innerHTML=P.map(function(_,i){return '<span class="nd" data-n="'+i+'"></span>'}).join('');
  P.forEach(function(q,i){var st='left:'+(q[0]*100).toFixed(2)+'%;top:'+(q[1]*100).toFixed(2)+'%';if(kids[i]._st!==st){kids[i].style.cssText=st;kids[i]._st=st}kids[i].classList.toggle('on',!!(drag&&drag.mode==='node'&&drag.i===i))});
  ov.hidden=false;
  // the row of round buttons above the frame (height, turn, depth) stays on screen near the edges of the picture
  // (from the target geometry, not the drawn frame, which may still be gliding to its new place)
  var wr=$('#stagewrap').getBoundingClientRect(),Z=UI.zoom,c=Z.x+(pb.x+pb.w/2)/k*Z.z,tp=Z.y+pb.y/k*Z.z,bt=Z.y+(pb.y+pb.h)/k*Z.z,hx=0,M0=84;
  if(!el.rot){if(c<M0)hx=M0-c;else if(wr.width-c<M0)hx=-(M0-(wr.width-c))}
  ov.style.setProperty('--hx',(hx/Z.z).toFixed(1)+'px');ov.classList.toggle('hb',!el.rot&&tp<64&&wr.height-bt>64);
}
function bboxOf(list){var b={x0:1e9,x1:-1e9,y0:1e9,y1:-1e9};list.forEach(function(e){b.x0=Math.min(b.x0,e.x);b.x1=Math.max(b.x1,e.x+e.w);b.y0=Math.min(b.y0,e.y);b.y1=Math.max(b.y1,e.y+e.h)});return b}
/* ---------- zoom: the picture and its frame scale together; handles keep their size on screen ---------- */
function zoomApply(){
  var zm=$('#zoomer'),w=$('#stagewrap');if(!zm||!w)return;var Z=UI.zoom,W=zm.offsetWidth,H=zm.offsetHeight;
  Z.z=Math.max(1,Math.min(5,Z.z));Z.x=Math.min(0,Math.max(W-W*Z.z,Z.x));Z.y=Math.min(0,Math.max(H-H*Z.z,Z.y));if(Z.z===1){Z.x=0;Z.y=0}
  var tr=Z.z===1?'':'translate('+Z.x.toFixed(1)+'px,'+Z.y.toFixed(1)+'px) scale('+Z.z.toFixed(4)+')';if(zm._tr!==tr){zm.style.transform=tr;zm._tr=tr}
  zm.style.setProperty('--iz',(1/Z.z).toFixed(4));w.classList.toggle('zoomed',Z.z>1);var l=$('#zoomlbl');if(l){l.textContent=Math.round(Z.z*100)+' %';var sb=$('#statbar');if(sb)sb._h=null}
}
function zoomAt(z,cx,cy){var Z=UI.zoom,nz=Math.max(1,Math.min(5,z)),px=(cx-Z.x)/Z.z,py=(cy-Z.y)/Z.z;Z.x=cx-px*nz;Z.y=cy-py*nz;Z.z=nz;zoomApply();placeOv()}
function zoomBy(f){var zm=$('#zoomer');if(zm)zoomAt(UI.zoom.z*f,zm.offsetWidth/2,zm.offsetHeight/2)}
var pinch=null,tps={};
function zDown(ev){
  if(ev.pointerType!=='touch')return false;var w=$('#stagewrap');if(!w||!w.contains(ev.target)||ev.target.closest('.stage-tools'))return false;
  tps[ev.pointerId]={x:ev.clientX,y:ev.clientY};var ids=Object.keys(tps);if(ids.length!==2)return false;
  if(drag){var d=drag;drag=null;endDrag();restoreDrag(d)}
  var a=tps[ids[0]],b=tps[ids[1]],r=w.getBoundingClientRect();
  pinch={d0:Math.hypot(a.x-b.x,a.y-b.y)||1,m0:[(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top],z0:UI.zoom.z,x0:UI.zoom.x,y0:UI.zoom.y};ev.preventDefault();return true;
}
function zMove(ev){
  if(!tps[ev.pointerId])return false;tps[ev.pointerId]={x:ev.clientX,y:ev.clientY};if(!pinch)return false;var ids=Object.keys(tps);if(ids.length<2)return true;
  var a=tps[ids[0]],b=tps[ids[1]],r=$('#stagewrap').getBoundingClientRect(),d=Math.hypot(a.x-b.x,a.y-b.y),m=[(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top];
  var nz=Math.max(1,Math.min(5,pinch.z0*d/pinch.d0)),px=(pinch.m0[0]-pinch.x0)/pinch.z0,py=(pinch.m0[1]-pinch.y0)/pinch.z0;
  UI.zoom.z=nz;UI.zoom.x=m[0]-px*nz;UI.zoom.y=m[1]-py*nz;zoomApply();placeOv();ev.preventDefault();return true;
}
function zUp(ev){if(!tps[ev.pointerId])return false;delete tps[ev.pointerId];if(pinch){if(Object.keys(tps).length<2)pinch=null;return true}return false}
function applyNight(){var w=$('#stagewrap'),b=$('#nightbtn');if(w)w.classList.toggle('night',!!UI.night);if(b)b.setAttribute('aria-pressed',!!UI.night)}
/* ---------- several elements at once ---------- */
function toggleMulti(id){
  var m=(UI.multi||[]).slice();if(!m.length&&UI.sel&&UI.sel!==id)m=[UI.sel];
  var i=m.indexOf(id);if(i>=0)m.splice(i,1);else m.push(id);
  if(m.length>1){UI.multi=m;UI.sel=null}else{UI.multi=null;UI.sel=m[0]||null}UI.ced=null;render();
}
/* select a set of ids: one becomes the selected element, several a group */
function selectIds(ids){ids=ids.filter(function(id,i){return ids.indexOf(id)===i&&M.find(S,id)});if(ids.length>1){UI.multi=ids;UI.sel=null}else{UI.multi=null;UI.sel=ids[0]||null}UI.ced=null}
function selectAll(){selectIds(S.els.filter(function(e){return !e.hide&&!e.lock}).map(function(e){return e.id}));render()}
function selList(){var L=V.multi();if(L.length<2){var e=V.sel();L=e?[e]:[]}return L}
/* copy and paste: the copy lives in this page and in this browser, so it can be pasted into another project too */
function clipCopy(cut){var L=selList();if(!L.length)return false;UI.clip=JSON.stringify(L);UI.clipN=0;try{localStorage.setItem('fotozona.clip.v1',UI.clip)}catch(e){}
  if(cut){var ids=L.map(function(e){return e.id});S.els=S.els.filter(function(e){return ids.indexOf(e.id)<0});UI.sel=null;UI.multi=null;UI.nextLabel='Вырезано: '+(L.length===1?V.elName(L[0]):L.length+' эл.');commit()}
  toast((cut?'Вырезано':'Скопировано')+': '+(L.length===1?V.elName(L[0]):L.length+' эл.')+'. Вставить — Ctrl+V или «Правка → Вставить».');return true}
function clipPaste(){var j=UI.clip;if(!j){try{j=localStorage.getItem('fotozona.clip.v1')}catch(e){}}var L=null;try{L=JSON.parse(j)}catch(e){}if(!Array.isArray(L)||!L.length){toast('Сначала скопируйте элемент или группу.');return}
  UI.clipN=(UI.clipN||0)+1;var off=150*UI.clipN,ids=[];
  L.forEach(function(o){if(!o||!M.TYPES[o.type])return;var c=JSON.parse(JSON.stringify(o));c.id=M.uid();c.x=Math.round(+c.x+off);delete c.lock;delete c.hide;delete c.kit;M.fit(c);M.clamp(S,c);S.els.push(c);ids.push(c.id)});
  if(!ids.length)return;selectIds(ids);UI.nextLabel='Вставлено: '+(ids.length===1?V.elName(M.find(S,ids[0])):ids.length+' эл.');IO.loadImgs(SC.usedImgs(S));syncImgDefs();commit()}
/* the box of a group in millimetres: left, right, from the floor, top, and the nearest depth */
function gbox(L){var b=bboxOf(L);b.z=Math.min.apply(null,L.map(function(e){return SC.zOf(S,e)}));return b}
/* scale an element from its saved copy o by s about the point (ax, ay): position and size together; balloons, foil shapes and people keep their size */
function scaleEl(e,o,s,ax,ay){var k,fixed=e.type==='balloon'||e.type==='foil'||e.type==='person';for(k in o)e[k]=JSON.parse(JSON.stringify(o[k]));
  var cx=o.x+o.w/2,cy=o.y+o.h/2,ncx=ax+(cx-ax)*s,ncy=ay+(cy-ay)*s,r10=function(v){return Math.max(10,Math.round(v/10)*10)};
  if(!fixed){if(e.type==='text')e.size=Math.max(40,Math.min(600,r10(o.size*s)));else{e.w=r10(o.w*s);if(o.h)e.h=r10(o.h*s);['nw','nh','ny','t','r'].forEach(function(q){if(isFinite(+o[q])&&o[q]!==undefined)e[q]=Math.round(o[q]*s)})}
    if(e.type==='cluster'&&+o.n>0)e.n=Math.max(1,Math.round(o.n*s*s))}
  e._c=false;M.fit(e);delete e._c;e.x=Math.round(ncx-e.w/2);e.y=o.y===0||M.floorOnly(e)?0:Math.max(0,Math.round(ncy-e.h/2));return e}
/* move a group sideways as one: if the wall stops one element, the whole group stops there, so its shape is kept */
function shiftGroupX(L,dx){var d=dx;L.forEach(function(e){var c=JSON.parse(JSON.stringify(e));c.x+=dx;M.clamp(S,c);var got=c.x-e.x;if(dx>0)d=Math.min(d,got);else d=Math.max(d,got)});if(dx>0)d=Math.max(0,d);else d=Math.min(0,d);L.forEach(function(e){e.x+=d});return d}
function scaleGroup(L,O,s,ax,ay){L.forEach(function(e,i){scaleEl(e,O[i],s,ax,ay)});L.forEach(function(e){M.clamp(S,e)})}
function alignGroup(how){
  var L=V.multi();if(L.length<2)return;var b=bboxOf(L);
  if(how==='dist'){var o=L.slice().sort(function(a,c){return (a.x+a.w/2)-(c.x+c.w/2)}),tw=o.reduce(function(t,e){return t+e.w},0),gap=(b.x1-b.x0-tw)/(o.length-1),x=b.x0;o.forEach(function(e){e.x=Math.round(x);x+=e.w+gap})}
  L.forEach(function(e){
    if(how==='left')e.x=b.x0;else if(how==='right')e.x=b.x1-e.w;else if(how==='hc')e.x=Math.round((b.x0+b.x1)/2-e.w/2);
    if(!M.floorOnly(e)){if(how==='bottom')e.y=b.y0;else if(how==='top')e.y=b.y1-e.h;else if(how==='vc')e.y=Math.round((b.y0+b.y1)/2-e.h/2)}
    M.clamp(S,e)});
  commit();
}
/* ---------- guides: while one element is moved its edges and centre stick to those of the others ---------- */
function snapGuides(el,k,noY){
  var ze=SC.zOf(S,el),sc=SC.sc(ze),tol=10*k/sc,lines=[],bx=null,by=null,flo=!!noY,cx0=S.room.w/2,HH=S.room.h+SC.FLOOR;
  S.els.forEach(function(o){if(o===el||o.hide||Math.abs(SC.zOf(S,o)-ze)>150)return;
    [o.x,o.x+o.w,o.x+o.w/2].forEach(function(cx){[el.x,el.x+el.w,el.x+el.w/2].forEach(function(px){var d=cx-px;if(Math.abs(d)<tol&&(!bx||Math.abs(d)<Math.abs(bx.d)))bx={d:d,v:cx}})});
    if(!flo)[o.y,o.y+o.h,o.y+o.h/2].forEach(function(cy){[el.y,el.y+el.h,el.y+el.h/2].forEach(function(py){var d=cy-py;if(Math.abs(d)<tol&&(!by||Math.abs(d)<Math.abs(by.d)))by={d:d,v:cy}})})});
  [S.room.w/2].forEach(function(cx){var d=cx-(el.x+el.w/2);if(Math.abs(d)<tol&&(!bx||Math.abs(d)<Math.abs(bx.d)))bx={d:d,v:cx}});
  if(bx){el.x=Math.round(el.x+bx.d);lines.push('<i class="gv" style="left:'+((cx0+(bx.v-cx0)*sc)/S.room.w*100).toFixed(3)+'%"></i>')}
  if(by){el.y=Math.round(el.y+by.d);lines.push('<i class="gh" style="top:'+((S.room.h-(SC.CAM.h+(by.v-SC.CAM.h)*sc))/HH*100).toFixed(3)+'%"></i>')}
  var g=$('#guides');if(g)g.innerHTML=lines.join('');
}
/* props stand on what is under them: plinths, podiums, tables, boxes. Near the top of one under its centre, the prop lands on it. */
var STANDS={plc:1,plq:1,plinths:1,mframe:1,mglass:1,mcyl:1,mset:1,podr:1,podq:1,table:1,gift:1,giftpile:1};
/* the height a thing stands at on top of o, at x = cx: the middle of a frame's top face, the table top, each frame of a set */
function standTop(o,cx){
  var fr=function(x,w,h){return h-Math.min(w*.18,h*.12)*.5};
  if(o.kind==='mframe'||o.kind==='mglass')return o.y+fr(0,o.w,o.h);
  if(o.kind==='mcyl')return o.y+o.h-Math.min(o.w*.14,o.h*.12);
  if(o.kind==='mset'){var r=null;[[0,.42,.62],[.36,.32,1],[.66,.34,.78]].forEach(function(q){var x0=o.x+o.w*q[0],sw=o.w*q[1],sh=o.h*q[2];if(cx>=x0&&cx<=x0+sw){var t=o.y+fr(0,sw,sh);if(r===null||t>r)r=t}});return r}
  if(o.kind==='table')return o.y+o.h*.66;
  return o.y+o.h;
}
/* only plinths about as deep as the prop count; landing on one puts the prop just in front of its face plane */
function standOn(el,k){var cx=el.x+el.w/2,ze=SC.zOf(S,el),best=null,bo=null,bd=14*k/SC.sc(ze);
  S.els.forEach(function(o){if(o===el||o.hide||o.type!=='prop'||!STANDS[o.kind]||cx<o.x||cx>o.x+o.w||Math.abs(SC.zOf(S,o)-ze)>300)return;var top=standTop(o,cx);if(top===null)return;var d=Math.abs(el.y-top);if(d<bd){bd=d;best=top;bo=o}});
  if(best!==null){el.y=Math.round(best);el.z=Math.min(E.ZMAX,SC.zOf(S,bo)+1);var s2=SC.sc(el.z),g=$('#guides');if(g)g.innerHTML='<i class="gh" style="top:'+((S.room.h-(SC.CAM.h+(best-SC.CAM.h)*s2))/(S.room.h+SC.FLOOR)*100).toFixed(3)+'%"></i>'}return bo}
/* ---------- my library ---------- */
function libItemOf(list,name,kind){
  var it={id:'l'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),kind:kind,name:name,created:new Date().toISOString(),imgs:[]};
  if(kind==='scene'){var o=JSON.parse(JSON.stringify(S));['prices','eco','client','brand','pid','ref'].forEach(function(q){delete o[q]});o.name=name;it.json=JSON.stringify(o);it.n=o.els.length;it.imgs=SC.usedImgs(o)}
  else{var b=bboxOf(list),els=list.map(function(e){var c=JSON.parse(JSON.stringify(e));c.x-=b.x0;delete c.hide;delete c.lock;return c});it.json=JSON.stringify(els);it.n=els.length;
    els.forEach(function(e){[e.im,e.type==='pic'?e.im0:null].forEach(function(id){if(id&&it.imgs.indexOf(id)<0&&IMG[id])it.imgs.push(id)})})}
  return it;
}
function libInsert(it){UI.fly=false;
  var go=function(){
    if(it.kind==='pic'){addPic(it.imgs[0],{name:it.name});return}
    var els=null;try{els=JSON.parse(it.json)}catch(e){}if(!Array.isArray(els)||!els.length){toast('Шаблон повреждён.');return}
    var o=M.normalize({els:els,room:S.room,palette:S.palette});if(!o||!o.els.length){toast('Шаблон повреждён.');return}
    var w=bboxOf(o.els).x1,mn=M.main(S),cx=mn?mn.x+mn.w/2:S.room.w/2,dx=Math.round(cx-w/2),ids=[];
    o.els.forEach(function(e){e.id=M.uid();e.x+=dx;M.clamp(S,e);ids.push(e.id);
      if(E.isBg(e)){var last=-1;S.els.forEach(function(q,qi){if(E.isBg(q))last=qi});S.els.splice(last+1,0,e)}else S.els.push(e)});
    if(ids.length>1){UI.multi=ids;UI.sel=null}else{UI.sel=ids[0];UI.multi=null}UI.ced=null;syncImgDefs();commit();toast('Добавлено из моих: «'+it.name+'»');
  };
  var miss=it.imgs.filter(function(id){return !IMG[id]});IO.loadImgs(miss);miss=miss.filter(function(id){return !IMG[id]});
  if(miss.length&&IO.db)IO.fetchCloudImgs(miss).then(function(){syncImgDefs();go()});else go();
}

/* what this view allows, in one line: the next screenshot of a failure tells exactly which link is missing */
function phDiag(){var ph=UI.ph||{};return 'Диагностика: Claude на странице — '+(IO.sample?'есть':'нет')+' · разрешение — '+(IO.permSample||'нет данных')+' · передача фото — '+(IO.sampleImg===true?'есть':IO.sampleImg===false?'нет':'нет данных')+(ph.code?' · ответ — '+ph.code:'')}
/* descriptions of a photo made outside the page (in the chat with Claude): a list kept in the page's storage, or pasted text */
function phChat(need){
  var L=UI.analyses,paste=UI.phPaste||(need&&!IO.db),h;
  if(!need&&!(L&&L.length)&&!paste)return '<div class="row" style="margin-top:10px"><button type="button" class="btn sm" data-act="ph-paste-open">Есть готовый разбор из чата</button></div>';
  h='<hr><div class="eyebrow">Разбор через чат</div><p class="muted small" style="margin:4px 0 10px">'+(need?'Обходной путь: отправьте':'Отправьте')+' это же фото в чат с Claude и попросите разобрать его для конструктора. Готовый разбор появится в списке ниже; выберите здесь то же фото и нажмите «Собрать сцену».</p>';
  if(!IO.db)h+='<p class="muted small">Список разборов в этой вкладке недоступен. Попросите Claude прислать разбор текстом и вставьте его ниже.</p>';
  else if(L===null)h+='<p class="muted small">Загружаю список разборов…</p>';
  else if(UI.anErr)h+='<p class="muted small">Список разборов сейчас не открывается. Нажмите «Обновить список» или вставьте разбор текстом.</p>';
  else if(!L.length)h+='<p class="muted small">Готовых разборов пока нет.</p>';
  else h+='<div class="plist">'+L.map(function(p){return '<div class="pitem"><span class="nm"><b>'+U.esc(p.name)+'</b><small>'+U.esc((p.created?p.created.slice(0,10)+' · ':'')+'элементов: '+p.n+(p.note?' · '+p.note:''))+'</small></span><button type="button" class="btn sm pri" data-act="ph-an" data-id="'+U.esc(p.id)+'">Собрать сцену</button><button type="button" class="btn sm ic dng" data-act="ph-an-del" data-id="'+U.esc(p.id)+'" aria-label="Удалить разбор">'+U.ico.del+'</button></div>'}).join('')+'</div>';
  h+='<div class="row" style="margin-top:10px">'+(IO.db?'<button type="button" class="btn sm" data-act="ph-refresh">Обновить список</button>':'')+(paste?'':'<button type="button" class="btn sm" data-act="ph-paste-open">Вставить разбор текстом</button>')+'</div>';
  if(paste)h+='<textarea id="ph-json" style="min-height:120px;margin-top:10px" spellcheck="false" autocomplete="off" aria-label="Текст разбора" placeholder="Вставьте сюда текст разбора из чата: он начинается со знака { и заканчивается знаком }">'+U.esc(UI.phText||'')+'</textarea><div class="row" style="margin-top:10px"><button type="button" class="btn pri" data-act="ph-paste">Собрать сцену из текста</button></div>';
  return h;
}
function refreshAnalyses(){
  if(!IO.db||UI.anBusy)return;UI.anBusy=true;
  IO.listAnalyses().then(function(l){UI.anBusy=false;UI.anErr=!l;UI.analyses=l||[];if(UI.modal&&UI.modal.type==='photo')renderModal()});
}
function renderModal(){
  var box=$('#modal'),m=UI.modal,h='';
  if(m){
    var body='';
    if(m.type==='img')body='<p class="muted small">'+m.note+'</p><img src="'+m.src+'" alt="'+U.esc(m.title)+'">';
    else if(m.type==='text')body='<p class="muted small">'+m.note+'</p><textarea id="modal-text" readonly>'+U.esc(m.text)+'</textarea><div class="row" style="margin-top:10px"><button type="button" class="btn pri" data-act="copy-modal">'+U.ico.copy+' Скопировать</button></div>';
    else if(m.type==='photo'){var ph=UI.ph||{},pim=ph.id&&IMG[ph.id];
      body='<p class="muted">Загрузите фото готовой фотозоны. Claude найдёт на нём фоны, шары, надписи и декор и соберёт из них сцену, в которой каждый элемент можно двигать и менять. Фигуры, которых нет в каталоге, вырезаются из фото картинками.</p>';
      if(!ph.busy)body+='<div class="row" style="margin:12px 0">'+V.upBtn('photo',pim?'Выбрать другое фото':'Выбрать фото',pim?'':'pri')+'</div>';
      if(pim){body+='<img class="phprev" src="'+pim.src+'" alt="Выбранное фото">';
        if(ph.busy)body+='<div class="phbusy"><span class="spin"></span><div><b>'+(ph.stage==='perm'?'Жду разрешения обращаться к Claude':ph.stage==='build'?'Собираю сцену':'Claude рассматривает фото')+'</b><span class="muted small" id="phchars">'+(ph.stage==='perm'?'Если появился запрос разрешения, ответьте на него.':ph.stage==='build'?'Вырезаю фигуры из фото.':'Обычно это занимает от 20 секунд до двух минут.')+'</span></div>'+(ph.stage==='build'?'':'<button type="button" class="btn" data-act="ph-stop">Остановить</button>')+'</div>';
        else{body+='<div class="insp-grid">'+U.num('u.phTall','Высота самого высокого фона, мм',UI.phTall||0,{step:50,min:0,max:4000,cls:'full'})+'<p class="muted small full">Оставьте 0, если не знаете: высоту оценит Claude. От этого числа зависит масштаб всей сцены, его можно поправить и после разбора.</p></div>';
          if(ph.err)body+='<p class="pherr">'+U.esc(ph.err)+'</p>';
          var wait=IO.sampleState==='wait',denied=IO.permSample==='denied',has=!!IO.sample&&!denied&&IO.permSample!=='unavailable',noImg=has&&(UI.phNoImg||IO.sampleImg===false),auto=has&&!noImg;
          body+='<div class="row">'+(auto?'<button type="button" class="btn pri" data-act="ph-run">Разобрать фото</button>':'')+(denied&&IO.perm?'<button type="button" class="btn pri" data-act="perm-manage">Открыть разрешения страницы</button>':'')+'<button type="button" class="btn" data-act="ph-under">Только подложить как образец</button></div>';
          if(wait)body+='<p class="muted small" style="margin-top:10px">Проверяю, доступен ли Claude в этой вкладке…</p>';
          else if(denied)body+='<p class="pherr">Этой странице запрещено обращаться к Claude. Откройте разрешения страницы, включите доступ к Claude и вернитесь сюда.</p>';
          else if(noImg)body+='<p class="pherr">Автоматический разбор в этом браузере не запускается: он не передаёт фото со страницы в Claude. Перезагрузка страницы этого не меняет.</p>'+(UI.phNoImg?'':'<div class="row"><button type="button" class="btn sm" data-act="ph-run">Всё же попробовать</button></div>');
          else if(!has)body+='<p class="pherr">В этой вкладке страница не получила доступ к Claude.</p><p class="muted small">Доступ выдаётся в момент загрузки страницы. Если вкладка была открыта до того, как в конструкторе появился разбор по фото, полностью перезагрузите её кнопкой ⟳ в браузере и снова нажмите «По фото»: при первом запуске появится запрос на разрешение. Если после перезагрузки сообщение осталось, значит, обращение к Claude со страниц выключено для вашей учётной записи или не поддерживается этим приложением.</p>';
          if(!wait&&!auto&&!denied)body+='<p class="muted small mono" id="phdiag">'+U.esc(phDiag())+'</p>';
          body+=phChat(!wait&&!auto);
          body+='<p class="muted small" style="margin-top:10px">Разбор заменит текущую сцену; вернуть её можно кнопкой «Отменить». Запрос расходует ваш лимит Claude. Размеры и места оцениваются по фото и получаются приблизительными: сверьте сцену с образцом и поправьте.</p>'}
      }
    }
    else if(m.type==='imp'){var ip=UI.imp||{},c=ip.crop||[0,0,1,1],cs='left:'+(c[0]*100).toFixed(2)+'%;top:'+(c[1]*100).toFixed(2)+'%;width:'+((c[2]-c[0])*100).toFixed(2)+'%;height:'+((c[3]-c[1])*100).toFixed(2)+'%';
      body='<p class="muted">Подрежьте картинку рамкой и уберите фон, чтобы фигура встала на сцену без прямоугольника вокруг.</p>'+
        '<div class="impwrap"><div class="impbox" id="impbox"><canvas id="impcv" width="'+(ip.w||1)+'" height="'+(ip.h||1)+'" aria-label="Картинка: коснитесь участка фона, чтобы убрать его"></canvas><div class="cropclip"><div class="crop" id="impcrop" style="'+cs+'"></div></div>'+
        '<div class="croph" id="impch" style="'+cs+'"><span class="cph tl" data-c="tl"></span><span class="cph tr" data-c="tr"></span><span class="cph bl" data-c="bl"></span><span class="cph br" data-c="br"></span></div></div></div>'+
        '<div class="insp-grid"><div class="fld full"><span class="fl">Убрать фон от краёв рамки</span><div class="seg scroll">'+[[0,'Не убирать'],[14,'Слабо'],[28,'Средне'],[48,'Сильно']].map(function(o){return '<button type="button" data-act="imp-tol" data-id="'+o[0]+'" aria-pressed="'+((ip.tol||0)===o[0])+'">'+o[1]+'</button>'}).join('')+'</div></div>'+
        '<p class="muted small full">Остался кусок фона, например между рукой и телом? Коснитесь его на картинке, и он исчезнет. Белые кружки по углам двигают рамку обрезки.</p>'+
        '<div class="fld full"><div class="row"><button type="button" class="btn sm" data-act="imp-undo"'+((ip.taps||[]).length?'':' disabled')+'>Отменить касание</button><button type="button" class="btn sm" data-act="imp-reset">Сбросить всё</button></div></div></div>'+
        '<div class="row" style="margin-top:6px"><button type="button" class="btn pri" data-act="imp-ok">'+(ip.mode==='edit'?'Готово':'Добавить на сцену')+'</button><button type="button" class="btn" data-act="close">Отмена</button></div>'}
    else if(m.type==='libsave'){
      body='<p class="muted">'+(m.kind==='scene'?'Вся сцена сохранится как шаблон: её можно открыть из меню «Проект» в любом проекте.':'Выбранное сохранится в группу «Мои» в списке элементов и будет доступно в любом проекте.')+(IO.db?' Шаблоны хранятся в облаке этой страницы.':' Шаблоны хранятся в этом браузере.')+'</p>'+
        '<div class="fld" style="margin:12px 0"><label class="fl" for="lib-name">Название</label><input type="text" id="lib-name" maxlength="60" value="'+U.esc(m.name||'')+'" autocomplete="off"></div>'+
        '<div class="row"><button type="button" class="btn pri" data-act="lib-save">'+U.ico.star+' Сохранить</button><button type="button" class="btn" data-act="close">Отмена</button></div>'}
    else if(m.type==='menu'){var myS=IO.lib.filter(function(x){return x.kind==='scene'});
      body=(myS.length?'<div class="eyebrow">Мои шаблоны</div><div class="tpls">'+myS.map(function(t){return '<div class="tilew"><button type="button" class="tpl" data-act="lib-scene-open" data-id="'+t.id+'"><b>'+U.esc(t.name)+'</b><small>элементов: '+t.n+'</small></button><button type="button" class="tilex" data-act="lib-del" data-id="'+t.id+'" aria-label="Удалить шаблон" title="Удалить шаблон">×</button></div>'}).join('')+'</div>':'')+
        '<div class="row" style="margin:0 0 14px"><button type="button" class="btn" data-act="lib-scene">'+U.ico.star+' Сохранить эту сцену как шаблон</button></div>';
      body+='<div class="eyebrow">Начать с шаблона</div><div class="tpls">'+D.TEMPLATES.map(function(t){return '<button type="button" class="tpl" data-act="tpl" data-id="'+t.id+'"><b>'+t.name+'</b><small>'+t.note+'</small></button>'}).join('')+'</div>';
      body+='<div class="eyebrow">'+(window.SITE?'Проекты на всех планшетах':'Проекты в облаке')+'</div><div class="mblock">';
      if(window.SITE)body+=SITE.block();
      if(!IO.db){if(!window.SITE)body+='<p class="muted small">Облачное хранение работает, когда страница открыта на claude.ai под вашей учётной записью. Сейчас оно недоступно: сохраняйте проект файлом.</p>'}
      else{body+='<div class="psave"><div class="fld"><label class="fl" for="menu-name">Название проекта</label><input type="text" id="menu-name" maxlength="80" value="'+U.esc(S.name)+'" autocomplete="off" spellcheck="false"></div>'+
          '<div class="row"><button type="button" class="btn pri" data-act="cloud-save">'+(S.pid?'Сохранить':'Сохранить в облако')+'</button>'+(S.pid?'<button type="button" class="btn" data-act="cloud-save-new">Сохранить как новый</button>':'')+'</div>'+
          (S.pid?'<p class="muted small">«Сохранить» обновит открытый проект, «как новый» — оставит его и создаст ещё один.</p>':'')+'</div>';
        if(UI.projects===null)body+='<p class="muted small">Загружаю список…</p>';
        else if(!UI.projects.length)body+='<p class="muted small">Сохранённых проектов пока нет.</p>';
        else body+='<div class="plist">'+UI.projects.map(function(p){return '<div class="pitem"><span class="nm"><b>'+U.esc(p.name)+'</b><small>'+U.esc(p.updated.slice(0,16).replace('T',' '))+' · элементов: '+p.n+(p.id===S.pid?' · открыт':'')+'</small></span><button type="button" class="btn sm" data-act="cloud-open" data-id="'+U.esc(p.id)+'">Открыть</button><button type="button" class="btn sm ic dng" data-act="cloud-del" data-id="'+U.esc(p.id)+'" aria-label="Удалить проект">'+U.ico.del+'</button></div>'}).join('')+'</div>';
        body+='<p class="muted small" style="margin-top:6px">'+(window.SITE?'Проекты и их картинки видит каждый, у кого есть код комнаты.':'Проекты и их картинки видят все, кому вы открыли доступ к этой странице.')+'</p>'}
      body+='</div><div class="eyebrow">Файлы</div><div class="row" style="margin-top:6px"><button type="button" class="btn" data-act="json">'+U.ico.dl+' Проект файлом</button><label class="btn up">Открыть файл<input type="file" id="file" accept=".json,application/json" aria-label="Открыть файл проекта"></label><button type="button" class="btn" data-act="png">'+U.ico.dl+' Сцена PNG</button></div>';
      body+='<p class="muted small" style="margin-top:12px">Последнее состояние также запоминается в этом браузере и восстановится при следующем открытии.</p>';
    }
    h='<div class="scrim" data-act="close-scrim"><div class="modal" role="dialog" aria-modal="true" aria-label="'+U.esc(m.title||'Проект')+'"><button type="button" class="btn sm x" data-act="close">Закрыть</button><h3>'+U.esc(m.title||'Проект')+'</h3>'+body+'</div></div>';
  }
  if(box._h!==h){box.innerHTML=h;box._h=h}
  if(m&&m.type==='imp')impPaint();
}
function refreshProjects(){IO.listProjects().then(function(l){UI.projects=l||[];renderModal()})}

/* ---------- edits ---------- */
function isColorBind(b){return /\.(color|insColor|wall|floorC|rib|lc)$/.test(b)||/\.cols(\.\d)?$/.test(b)}
/* hex = '' returns the colour to the palette; cmyk keeps the numbers exactly as they were typed */
function setColor(bind,hex,cmyk){
  var p=bind.split('.'),root=p.shift(),o=root==='e'?V.sel():S,key=p.join('.');if(!o)return;
  if(p[0]==='cols'){
    if(p.length===1){delete o.cols;if(o.k)Object.keys(o.k).forEach(function(q){if(q.indexOf('cols.')===0)delete o.k[q]});return}
    if(!o.cols){var pl0=D.pal(S.palette);o.cols=o.type==='flora'?[pl0.bal[3],pl0.c[3],pl0.bal[4],pl0.bal[3],pl0.c[3]]:pl0.bal.slice()}if(hex)o.cols[+p[1]]=hex;
  } else {var t=o;while(p.length>1)t=t[p.shift()];if(hex)t[p[0]]=hex;else if(root==='s')t[p[0]]='';else delete t[p[0]]}
  if(cmyk){o.k=o.k||{};o.k[key]=cmyk}else if(o.k)delete o.k[key];
  if(bind==='e.color'&&hex&&(o.surf==='sequin'||o.surf==='foil'))o.seq='custom';
}
function applyBind(path,val){
  var p=path.split('.'),root=p.shift(),k=p[0];
  if(root==='u'){if(k==='group'){var same=UI.fly&&V.toolOf(UI.group)[0]===V.toolOf(val)[0];UI.group=val;UI.fly=!same;UI.tool=null;render();return}UI[k]=val;render();return}
  if(root==='g'){var L=V.multi().filter(function(e){return !e.lock});if(L.length<1)return;var b=gbox(L),v=+val;if(!isFinite(v))return;
    if(k==='x')shiftGroupX(L,Math.round(v-b.x0));
    else if(k==='y')L.forEach(function(e){if(!M.floorOnly(e))e.y=Math.max(0,e.y+Math.round(v-b.y0))});
    else if(k==='z')L.forEach(function(e){setZ(e,SC.zOf(S,e)+Math.round(v-b.z))});
    else if(k==='w'||k==='h'){var s=v/(k==='w'?b.x1-b.x0:b.y1-b.y0);if(!(s>0))return;s=Math.max(.2,Math.min(5,s));scaleGroup(L,L.map(function(e){return JSON.parse(JSON.stringify(e))}),s,b.x0,b.y0)}
    L.forEach(function(e){M.clamp(S,e)});if(!UI.scrubbing)UI.nextLabel=k==='w'||k==='h'?'Размер группы: '+L.length+' эл.':'Перемещение группы: '+L.length+' эл.';commit();return}
  if(root==='p'){if(val===''||!isFinite(val)||val===D.PRICE[k])delete S.prices[k];else S.prices[k]=Math.max(0,val);commit();return}
  if(path==='s.ref.tall'){rescaleScene(+val);commit();return}
  if(isColorBind(path)){setColor(path,val,null);if(root==='e'){var ce=V.sel();if(ce){M.fit(ce)}}commit();return}
  if(root==='e'){var el=V.sel();if(!el)return;
    if(k==='tone'){el.tone=val;delete el.color;if(el.k)delete el.k.color}
    else if(k==='text'){if(el.type==='text')el.text=String(val).replace(/\r/g,'').split('\n').slice(0,2).join('\n').slice(0,60)||' ';else if(el.type==='prop')el.text=String(val).replace(/\r/g,'').split('\n').slice(0,2).join('\n').slice(0,40);else if(el.type==='foil')el.text=String(val).replace(/[^0-9A-Za-zА-Яа-яЁё&?!]/g,'').slice(0,1).toUpperCase()||(el.kind==='digit'?'1':'A');else el.text=String(val).replace(/[^0-9A-Za-zА-Яа-я]/g,'').slice(0,3)||'1'}
    else if(k==='share'){if(p.length>1){var sa=Array.isArray(el.share)?el.share.slice():E.BAL_SHARE.map(function(x){return Math.round(x*100)});sa[+p[1]]=Math.max(0,Math.min(100,Math.round(+val||0)));el.share=sa}else delete el.share}
    else if(k==='fins'){var fa=E.finsOf(el);if(E.FINS.indexOf(val)>=0)fa[+p[1]]=val;el.fins=fa;if(fa.every(function(x){return x==='latex'}))delete el.fins}
    else if(k==='g24'||k==='g36'){var gv=Math.max(0,Math.min(50,Math.round(+val||0)));if(gv)el[k]=gv;else delete el[k]}
    else if(k==='stand'){if(D.STAND_NAME[val]){el.stand=val;if(val==='floor'&&el.y<600)el.y=Math.max(900,el.y)}else delete el.stand;delete el.z;el.z=M.autoZ(S,el)}
    else if(k==='design'){el.design=val;el.h=Math.round(el.w*(D.EASEL_H[val]||2.7))}
    else if(k==='shape'&&el.type==='prop'&&el.kind==='gift'){el.shape=val;el.h=Math.round(el.w*D.GIFT_SHAPE[val][1])}
    else if(k==='lid'){if(val==='open')delete el.lid;else el.lid=val}
    else if(k==='fab'){el.fab=val;el.sheer=val==='chiffon'}
    else if(k==='n'&&el.type==='prop'){el.n=Math.round(+val)||el.n}
    else if(k==='kind'&&el.type==='foil'){el.kind=val;if((val==='digit'||val==='letter')&&!/^[0-9]$/.test(el.text||'')&&val==='digit')el.text='1';if(val==='letter'&&!/^[A-ZА-ЯЁ&?!]$/.test(el.text||''))el.text='A'}
    else if(k==='name')el.name=String(val).slice(0,40);
    else if(k==='rot'){var rv=((+val||0)+180)%360;rv=(rv+360)%360-180;if(rv&&M.canRot(el))el.rot=Math.round(rv*10)/10;else delete el.rot}
    else if(k==='n'){if(+val>0)el.n=Math.min(600,Math.round(+val));else delete el.n}
    else if(k==='mix'){if(val==='mix'||!E.MIX[val])delete el.mix;else el.mix=val}
    else if(k==='shape'){if(val!=='free'){el.shape=val;delete el.pts}}
    else if(k==='mount'){el.mount=val;if(val==='wall'&&el.y===0){var mn=M.main(S);el.y=mn?Math.round(mn.y+mn.h*.55):1200}if(val==='floor')el.y=0;delete el.z;el.z=M.autoZ(S,el)}
    else if(k==='z'){setZ(el,+val||0)}
    else if(false&&handlesFor(el).indexOf('n')>=0&&el.w&&el.h){var w0=el.w,h0=el.h;el[k]=+val;if(k==='w')el.h=Math.round(h0*el.w/w0/10)*10;else el.w=Math.round(w0*el.h/h0/10)*10}
    else if(k==='surf'){if(val==='paint')delete el.surf;else el.surf=val;if(val==='sequin'&&!D.SEQ[el.seq])el.seq='gold';if(val==='foil'&&!D.SEQ[el.seq])el.seq='silver';UI.ced=null}
    else el[k]=val;
    M.fit(el);M.clamp(S,el);if(k==='surf'||k==='seq')M.autoInk(S);commit();return}
  var o=S;while(p.length>1)o=o[p.shift()];o[p[0]]=val;
  if(path.indexOf('s.room.')===0)S.els.forEach(function(el){M.clamp(S,el)});
  if(path==='s.palette')M.autoInk(S);
  commit();
}
/* depth from a field or a key: what hangs on it or stands on it goes along */
function setZ(el,z){var rid=ridersOf(el),z0=SC.zOf(S,el);el.z=Math.max(0,Math.min(E.ZMAX,Math.round(z)));var dz=el.z-z0;rid.forEach(function(r){r.e.z=Math.max(0,Math.min(E.ZMAX,r.o.z+dz))})}
function inRoom(e){if(e.w<=S.room.w)e.x=Math.max(0,Math.min(S.room.w-e.w,e.x))}
function addEl(ne){UI.multi=null;UI.fly=false;
  if(E.isBg(ne)){M.placeBg(S,ne);M.clamp(S,ne);inRoom(ne);var last=-1;S.els.forEach(function(e,q){if(E.isBg(e))last=q});S.els.splice(last+1,0,ne)}
  else{while(S.els.some(function(e){return e.type===ne.type&&e.x===ne.x&&e.y===ne.y}))ne.x+=ne.type==='balloon'?ne.w+40:150;M.clamp(S,ne);inRoom(ne);S.els.push(ne)}
  UI.sel=ne.id;UI.ced=null;commit();
}
function addPic(id,more){var im=IMG[id];if(!im)return;var mn=M.main(S),w=Math.round(Math.min(1100,Math.max(300,mn?mn.w*.6:800))/50)*50,d={im:id,ar:im.h/im.w,w:w,mount:'wall'};for(var k in (more||{}))d[k]=more[k];addEl(M.make(S,'pic',d))}
function act(name,a){if(a&&a.closest&&a.closest('#mpop')&&name!=='mopen')menuClose();
  var el=V.sel(),i=el?S.els.indexOf(el):-1,id=a&&a.dataset.id;
  switch(name){
    case 'tab':UI.tab=V[id]?id:'con';render();var cv=$('#calcview');if(cv)cv.scrollTop=0;var tb=$('.ctabs .tab[data-id="'+id+'"]');if(tb&&tb.scrollIntoView)tb.scrollIntoView({block:'nearest',inline:'center'});break;
    case 'mopen':menuOpen(id,a);return;
    case 'save':if(IO.db)act('cloud-save',a);else act('menu',a);break;
    case 'dtab':UI.dtab=id;wsSave();render();break;
    case 'dopen':if(id!=='props')UI.dtab=id;UI.dock='';wsSave();render();break;
    case 'dock':UI.dock=UI.dock==='mini'?'':'mini';wsSave();render();setTimeout(function(){fitStage()},0);break;
    case 'flyclose':UI.fly=false;render();break;
    case 'tool':UI.tool=UI.tool===id?null:id;UI.fly=false;render();break;
    case 'hgo':{var hi=+id;if(hi>=0&&hi<UI.hist.length&&hi!==UI.hi)restore(hi);break}
    case 'vt':S.show[id]=!S.show[id];commit();break;
    case 'people':{var pl=S.els.filter(function(e){return e.type==='person'}),vis=pl.some(function(e){return !e.hide});pl.forEach(function(e){if(vis)e.hide=true;else delete e.hide});if(vis&&UI.sel&&pl.some(function(e){return e.id===UI.sel}))UI.sel=null;UI.nextLabel=vis?'Люди скрыты':'Люди показаны';commit();break}
    case 'isec':{UI.isec[id]=!UI.isec[id];wsSave();var g=a.closest('.sec');if(g)g.classList.toggle('open',!UI.isec[id]);var is=a.closest('[data-sec]');if(is)is._h=V.con.secs.insp();break}
    case 'undo':if(UI.hi>0)restore(UI.hi-1);break;
    case 'redo':if(UI.hi<UI.hist.length-1)restore(UI.hi+1);break;
    case 'add':{var it=D.GROUPS[+a.dataset.g].items[+a.dataset.i];addEl(M.make(S,it.t,JSON.parse(JSON.stringify(it.d))));break}
    case 'add-pic':addPic(id);break;
    case 'del':if(el){S.els.splice(i,1);UI.sel=null;UI.multi=null;UI.ced=null;commit()}break;
    case 'dup':if(el){var cp=JSON.parse(JSON.stringify(el));cp.id=M.uid();cp.x+=E.isBg(el)?Math.min(400,el.w*.5):(el.type==='balloon'?el.w+40:150);if(cp.name)cp.name=cp.name.replace(/ \(копия\)$/,'')+' (копия)';M.clamp(S,cp);S.els.splice(i+1,0,cp);UI.sel=cp.id;commit()}break;
    case 'up':case 'down':if(el){var ord=SC.order(S),pi=ord.indexOf(i),nb=S.els[ord[pi+(name==='up'?1:-1)]];if(nb){var nz=SC.zOf(S,nb);
      if(name==='up'?nz>SC.zOf(S,el):nz<SC.zOf(S,el))setZ(el,nz);S.els.splice(i,1);var ni=S.els.indexOf(nb);S.els.splice(name==='up'?ni+1:ni,0,el);commit()}}break;
    case 'flip':if(el){if(E.validPts(el.pts))el.pts=el.pts.map(function(q){return [Math.round((1-q[0])*1e4)/1e4,q[1]]});else el.flip=!el.flip;commit()}break;
    case 'multi':UI.mmode=!UI.mmode;render();   // switching the tool off keeps what is selected
toast(UI.mmode?'Обведите элементы рамкой или касайтесь их по одному. На компьютере то же делает Shift.':'Выбор нескольких выключен.');break;
    case 'night':UI.night=!UI.night;applyNight();break;
    case 'theme':setTheme(themeNow()==='dark'?'light':'dark');break;
    case 'mv':UI.tool=null;setMv(id);paintStage();toast(UI.mv==='floor'?'По полу: тяните вбок и вглубь — вверх к стене, вниз к зрителю. Высота не меняется.':'По стене: тяните вбок и вверх-вниз. Глубина не меняется.');break;
    case 'help':helpTip(a);break;
    case 'zoom-in':zoomBy(1.5);break;
    case 'zoom-out':zoomBy(1/1.5);break;
    case 'zoom-fit':UI.zoom={z:1,x:0,y:0};zoomApply();placeOv();break;
    case 'rot':if(el&&M.canRot(el)){var nr=((el.rot||0)+(+id||0)+180)%360;nr=(nr+360)%360-180;if(nr)el.rot=nr;else delete el.rot;commit()}break;
    case 'lsel':{var mods=UI._mods||{};UI._mods=null;
      if(UI.mmode||mods.ctrl)toggleMulti(id);
      else if(mods.shift&&UI._lanchor&&M.find(S,UI._lanchor)){var lo=SC.order(S).reverse().map(function(q){return S.els[q].id}),i0=lo.indexOf(UI._lanchor),i1=lo.indexOf(id);selectIds(lo.slice(Math.min(i0,i1),Math.max(i0,i1)+1));render()}
      else{UI.sel=id;UI.multi=null;UI.ced=null;render()}
      if(!mods.shift)UI._lanchor=id;break}
    case 'selall':selectAll();break;
    case 'gscale':{var GL=V.multi().filter(function(e){return !e.lock});if(GL.length<2)break;var B=gbox(GL),gs=(+id||100)/100;scaleGroup(GL,GL.map(function(e){return JSON.parse(JSON.stringify(e))}),gs,(B.x0+B.x1)/2,B.y0);UI.nextLabel='Размер группы: '+(+id)+' %';commit();break}
    case 'copy':clipCopy(false);break;
    case 'cut':clipCopy(true);break;
    case 'paste':clipPaste();break;
    case 'ghide':{var gh=V.multi();gh.forEach(function(e){e.hide=true});UI.multi=null;UI.sel=null;UI.nextLabel='Скрыто: '+gh.length+' эл.';commit();break}
    case 'glock':{var gk=V.multi(),all=gk.every(function(e){return e.lock});gk.forEach(function(e){if(all)delete e.lock;else e.lock=true});UI.nextLabel=(all?'Откреплено: ':'Закреплено: ')+gk.length+' эл.';commit();break}
    case 'lhide':{var he=M.find(S,id);if(he){if(he.hide)delete he.hide;else{he.hide=true;if(UI.sel===id&&!a.closest('[data-sec=insp]'))UI.sel=null;if(UI.multi)UI.multi=UI.multi.filter(function(q){return q!==id})}commit()}break}
    case 'llock':{var le=M.find(S,id);if(le){if(le.lock)delete le.lock;else le.lock=true;commit()}break}
    case 'align':alignGroup(id);break;
    case 'gclear':UI.multi=null;UI.sel=null;render();break;
    case 'gdel':{var gd=UI.multi||[];S.els=S.els.filter(function(e){return gd.indexOf(e.id)<0});UI.multi=null;UI.sel=null;commit();break}
    case 'gdup':{var gl=V.multi(),nid=[];gl.forEach(function(e){var c=JSON.parse(JSON.stringify(e));c.id=M.uid();c.x+=150;M.clamp(S,c);S.els.splice(S.els.indexOf(e)+1,0,c);nid.push(c.id)});if(nid.length){UI.multi=nid;commit()}break}
    case 'lib-open':{var lst=V.multi();if(lst.length<2)lst=el?[el]:[];if(!lst.length)break;UI.libPick=lst.map(function(e){return e.id});UI.modal={type:'libsave',title:'В мои шаблоны',kind:'tpl',name:lst.length>1?'Композиция из '+lst.length:V.elName(lst[0])};renderModal();var ln=$('#lib-name');if(ln){ln.focus();ln.select()}break}
    case 'lib-scene':UI.modal={type:'libsave',title:'Сцена в мои шаблоны',kind:'scene',name:S.name};renderModal();break;
    case 'lib-save':{var m0=UI.modal||{},nm=(($('#lib-name')||{}).value||m0.name||'Шаблон').trim().slice(0,60)||'Шаблон',items=m0.kind==='scene'?[]:(UI.libPick||[]).map(function(q){return M.find(S,q)}).filter(Boolean);
      var li=libItemOf(items,nm,m0.kind||'tpl'),okl=IO.libAdd(li);UI.modal=null;renderModal();render();toast(okl?'Сохранено в «Мои»: «'+nm+'»':'Память браузера заполнена: шаблон сохранён только до перезагрузки.');break}
    case 'lib-add':{var lt=IO.lib.filter(function(x){return x.id===id})[0];if(lt)libInsert(lt);break}
    case 'lib-del':if(a.dataset.sure){IO.libDel(id);render()}else{a.dataset.sure='1';a.textContent='Удалить?';a.classList.add('sure')}break;
    case 'lib-scene-open':{var ls=IO.lib.filter(function(x){return x.id===id})[0],lo=null;if(!ls)break;try{lo=JSON.parse(ls.json)}catch(e){}if(!lo){toast('Шаблон повреждён.');break}
      var lmiss=ls.imgs.filter(function(q){return !IMG[q]});IO.loadImgs(lmiss);UI.modal=null;S.pid=null;loadState(lo,true);UI.tab='con';render();window.scrollTo(0,0);
      lmiss=lmiss.filter(function(q){return !IMG[q]});if(lmiss.length&&IO.db)IO.fetchCloudImgs(lmiss).then(function(){syncImgDefs();render()});break}
    case 'node-add':if(el&&M.isPath(el)&&!E.isTie(el)){nodeAdd(el);M.clamp(S,el);commit()}break;
    case 'node-del':if(el&&M.isPath(el)&&!E.isTie(el)){nodeDel(el);M.clamp(S,el);commit()}break;
    case 'fold':{var fo=!UI.fold[id];UI.fold[id]=fo;IO.saveFold(UI.fold);   // the node itself folds, so the movement is smooth; the section's cached markup is brought in line
      var fb=a.closest('[data-fold]');if(fb){fb.classList.toggle('open',fo);a.setAttribute('aria-expanded',fo)}
      var fs=a.closest('[data-sec]'),ft=fs&&fs.closest('#calcview')?V[UI.tab]:V.con;if(fs&&ft&&ft.secs[fs.dataset.sec])fs._h=ft.secs[fs.dataset.sec]();break}
    case 'ced':UI.ced=UI.ced===id?null:id;render();break;
    case 'img-remove':if(el){delete el.im;delete el.surf;commit()}break;
    case 'photo':if(!UI.ph)UI.ph={};UI.ph.err='';UI.modal={type:'photo',title:'Сцена по фото'};UI.analyses=null;renderModal();refreshAnalyses();IO.checkPerm().then(function(){if(UI.modal&&UI.modal.type==='photo')renderModal()});break;
    case 'perm-manage':if(IO.perm&&IO.perm.manage)IO.perm.manage().then(function(){return IO.checkPerm()},function(){toast('Панель разрешений не открылась. Откройте её из меню страницы на claude.ai.')}).then(function(){renderModal()});break;
    case 'ph-run':phRun();break;
    case 'ph-refresh':UI.analyses=null;renderModal();refreshAnalyses();break;
    case 'ph-paste-open':{UI.phPaste=true;renderModal();var pt=$('#ph-json');if(pt)pt.focus();break}
    case 'ph-paste':{var pj=$('#ph-json');if(pj)UI.phText=pj.value;var pa=PH.parse(UI.phText);
      if(!pa){if(UI.ph){UI.ph.err='Это не похоже на разбор. Текст должен начинаться со знака { и заканчиваться знаком }: скопируйте его из чата целиком.';renderModal()}break}
      phFrom(pa);break}
    case 'ph-an':{var an=(UI.analyses||[]).filter(function(x){return x.id===id})[0],aa=an&&PH.parse(an.json);
      if(!aa){if(UI.ph){UI.ph.err='Этот разбор повреждён и не читается. Попросите Claude прислать его заново.';renderModal()}break}
      var api=UI.ph&&IMG[UI.ph.id];if(an.ar>0&&api&&Math.abs(api.w/api.h/an.ar-1)>.06&&!a.dataset.sure){a.dataset.sure='1';a.textContent='Всё равно собрать';toast('Пропорции фото другие: похоже, этот разбор сделан для другого снимка.');break}
      phFrom(aa);break}
    case 'ph-an-del':if(a.dataset.sure){IO.deleteAnalysis(id).then(function(ok){if(ok){UI.analyses=null;refreshAnalyses()}})}else{a.dataset.sure='1';a.classList.remove('ic');a.textContent='Точно удалить?'}break;
    case 'ph-stop':if(UI.ph&&UI.ph.ctl)UI.ph.ctl.abort();break;
    case 'ph-under':if(UI.ph&&IMG[UI.ph.id]){var pi=IMG[UI.ph.id];PH.underlay(S,{id:UI.ph.id,w:pi.w,h:pi.h});UI.modal=null;UI.tab='con';commit();toast('Фото подложено как образец. Собирайте сцену поверх него.')}break;
    case 'ref-toggle':if(S.ref){S.ref.on=!S.ref.on;commit()}break;
    case 'ref-remove':if(S.ref){delete S.ref;commit()}break;
    case 'holiday':UI.nextLabel='Праздник: '+D.holiday(id).name;M.applyHoliday(S,id);S.palette=D.holiday(id).pal;S.els.forEach(function(e){if(e.type==='text')M.fit(e)});M.autoInk(S);UI.sel=null;commit();toast('Праздник: '+D.holiday(id).name);break;
    case 'tpl':UI.modal=null;S.pid=null;loadState(M.template(id),true);UI.tab='con';render();break;
    case 'menu':UI.modal={type:'menu',title:'Проект'};UI.projects=null;renderModal();if(IO.db)refreshProjects();break;
    case 'close':if(UI.modal&&UI.modal.type==='imp')UI.imp=null;UI.modal=null;renderModal();break;
    case 'imp-tol':impChange(function(ip){ip.tol=+id||0});break;
    case 'imp-undo':impChange(function(ip){ip.taps.pop()});break;
    case 'imp-reset':impChange(function(ip){ip.tol=0;ip.taps=[];ip.crop=[0,0,1,1]});break;
    case 'imp-ok':impDone();break;
    case 'imp-edit':if(el&&el.type==='pic'){var sid=el.im0||el.im,si=IMG[sid];if(!si){toast('Исходная картинка не найдена: замените файл.');break}
      var eim=new Image(),eel=el;eim.onerror=function(){toast('Картинку не удалось прочитать.')};eim.onload=function(){impOpen(eim,(/^data:([^;,]+)/.exec(si.src)||[])[1]||'image/png',eel.name||'',"edit",eel.id,sid)};eim.src=si.src}break;
    case 'imp-orig':if(el&&el.type==='pic'&&el.im0&&IMG[el.im0]){el.im=el.im0;delete el.im0;el.cut=0;el.ar=IMG[el.im].h/IMG[el.im].w;M.fit(el);M.clamp(S,el);commit()}break;
    case 'png':IO.exportScene();break;
    case 'csv':IO.exportCsv();break;
    case 'json':IO.exportJson();break;
    case 'export-all':IO.exportAll();break;
    case 'offer-png':IO.exportOfferPng();break;
    case 'offer-pdf':IO.exportOfferPdf();break;
    case 'copy-offer':copyFrom($('#offer-text'));break;
    case 'copy-modal':copyFrom($('#modal-text'));break;
    case 'reset-prices':S.prices={};commit();break;
    case 'cloud-save':case 'cloud-save-new':{var mn=$('#menu-name');if(mn)setName(mn.value);if(name==='cloud-save-new')S.pid=null;IO.saveProject().then(function(ok){if(ok){pushHist();refreshProjects()}});break}
    case 'cloud-open':{var pr=(UI.projects||[]).filter(function(x){return x.id===id})[0];if(!pr)break;var o=null;try{o=JSON.parse(pr.json)}catch(e){}
      if(o){o.pid=pr.id;if(loadState(o)){UI.modal=null;UI.tab='con';render();toast('Открыт проект «'+S.name+'»');IO.fetchCloudImgs(SC.usedImgs(S)).then(function(nw){if(nw){syncImgDefs();render()}})}}else toast('Проект повреждён и не открывается.');break}
    case 'cloud-del':if(a.dataset.sure){IO.deleteProject(id).then(function(ok){if(ok){if(S.pid===id)S.pid=null;refreshProjects()}})}else{a.dataset.sure='1';a.classList.remove('ic');a.textContent='Точно удалить?'}break;
  }
}
function copyFrom(ta){
  if(!ta)return;var t=ta.value,done=function(){toast('Скопировано')};
  var legacy=function(){ta.focus();ta.select();try{document.execCommand('copy')?done():toast('Текст выделен: скопируйте его вручную.')}catch(e){toast('Текст выделен: скопируйте его вручную.')}};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,legacy);else legacy();
}

/* ---------- colour editor: live while the finger moves, one history step when it lets go ---------- */
function colorLive(panel,hex,k){
  [0,1,2,3].forEach(function(i){var n=panel.querySelector('[data-chn="'+i+'"]');if(n)n.value=k[i]});
  var hx=panel.querySelector('[data-hex]');if(hx)hx.value=hex;
  var ced=panel.closest('.ced'),btn=ced&&ced.querySelector('.cmyk-btn');if(btn){btn.querySelector('i').style.background=hex;btn.querySelector('span').textContent=E.cmykText(k)}
  var sw=ced&&ced.querySelector('.sw.big[aria-pressed="true"]');if(sw)sw.style.setProperty('--c',hex);
  if(!colorLive.raf)colorLive.raf=requestAnimationFrame(function(){colorLive.raf=0;paintStage()});
}
function wheelSet(panel,h,s,v,done){
  var bind=panel.dataset.cmyk,hex=E.hsvHex([h,s,v]);
  UI.hsv={bind:bind,h:h,s:s,v:v,hex:hex};setColor(bind,hex,null);
  if(done){commit();return}
  panel.dataset.h=h;panel.dataset.s=s;panel.dataset.v=v;
  var wh=panel.querySelector('.wh'),a=h*Math.PI/180,r=s/2,th=wh.querySelector('.wht'),ln=wh.querySelector('.whl'),br=panel.querySelector('[data-hv]');
  wh.style.setProperty('--v',(v/100).toFixed(3));th.style.left=(50+Math.cos(a)*r).toFixed(2)+'%';th.style.top=(50-Math.sin(a)*r).toFixed(2)+'%';th.style.background=hex;
  ln.style.width=r.toFixed(2)+'%';ln.style.transform='rotate('+(-h).toFixed(2)+'deg)';
  if(br){br.style.setProperty('--g1',E.hsvHex([h,s,100]));if(document.activeElement!==br)br.value=Math.round(v)}
  colorLive(panel,hex,E.cmyk(hex));
}
var wdrag=null;
function wheelAt(ev,wd){
  var r=wd.wh.getBoundingClientRect(),dx=ev.clientX-(r.left+r.width/2),dy=(r.top+r.height/2)-ev.clientY,s=Math.min(1,Math.hypot(dx,dy)/(r.width/2))*100,h=Math.atan2(dy,dx)*180/Math.PI;
  if(h<0)h+=360;if(s<1.5){s=0;h=+wd.panel.dataset.h||0}   // the very centre is white: keep the hue the thumb came from
  return [h,s];
}
function wheelDown(ev){
  var wh=ev.target.closest&&ev.target.closest('[data-wheel]');if(!wh||wdrag||(ev.button!==undefined&&ev.button>0))return;
  wdrag={wh:wh,panel:wh.closest('[data-cmyk]'),pid:ev.pointerId};try{wh.setPointerCapture(ev.pointerId)}catch(e){}
  var q=wheelAt(ev,wdrag);wheelSet(wdrag.panel,q[0],q[1],+wdrag.panel.dataset.v,false);ev.preventDefault();
}
function wheelMove(ev){if(!wdrag||ev.pointerId!==wdrag.pid)return;var q=wheelAt(ev,wdrag);wheelSet(wdrag.panel,q[0],q[1],+wdrag.panel.dataset.v,false);ev.preventDefault()}
function wheelUp(ev){if(!wdrag||ev.pointerId!==wdrag.pid)return;var d=wdrag;wdrag=null;wheelSet(d.panel,+d.panel.dataset.h,+d.panel.dataset.s,+d.panel.dataset.v,true)}
function wheelKey(ev){
  var wh=ev.target.closest&&ev.target.closest('[data-wheel]'),d={ArrowLeft:[4,0],ArrowRight:[-4,0],ArrowUp:[0,4],ArrowDown:[0,-4]}[ev.key];if(!wh||!d)return false;
  var p=wh.closest('[data-cmyk]');wheelSet(p,((+p.dataset.h+d[0])%360+360)%360,Math.max(0,Math.min(100,+p.dataset.s+d[1])),+p.dataset.v,true);
  var nw=$('[data-cmyk="'+p.dataset.cmyk+'"] [data-wheel]');if(nw)nw.focus({preventScroll:true});ev.preventDefault();return true;
}
function cmykRead(panel){return [0,1,2,3].map(function(i){var v=Math.round(+panel.querySelector('[data-chn="'+i+'"]').value);return Math.max(0,Math.min(100,isFinite(v)?v:0))})}

/* ---------- pictures from files ---------- */
function encodeImage(im,type){
  var alpha=/png|webp|gif|svg/i.test(type),iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,side=Math.max(iw,ih),max=1280,out,w,h;
  if(!side)return null;
  for(var t=0;t<8;t++){var sc=Math.min(1,max/side);w=Math.max(1,Math.round(iw*sc));h=Math.max(1,Math.round(ih*sc));
    var cv=document.createElement('canvas');cv.width=w;cv.height=h;var c=cv.getContext('2d');if(!alpha){c.fillStyle='#fff';c.fillRect(0,0,w,h)}c.drawImage(im,0,0,w,h);
    out=cv.toDataURL(alpha?'image/webp':'image/jpeg',.86);if(alpha&&out.indexOf('data:image/webp')!==0)out=cv.toDataURL('image/png');
    if(out.length<=236000)break;max=Math.round(Math.min(max,side)*.8)}
  return {src:out,w:w,h:h};
}
function newImgId(){return 'i'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function readImage(file,asPhoto){return new Promise(function(res,rej){
  if(!file||!/^image\//.test(file.type)){rej(new Error('type'));return}
  var fr=new FileReader();fr.onerror=function(){rej(new Error('read'))};
  fr.onload=function(){var im=new Image();im.onerror=function(){rej(new Error('decode'))};im.onload=function(){var r=null;try{r=encodeImage(im,asPhoto?'image/jpeg':file.type)}catch(e){}r?res({enc:r,full:im}):rej(new Error('encode'))};im.src=fr.result};
  fr.readAsDataURL(file)})}
function onUpload(input){
  var kind=input.dataset.up,file=input.files&&input.files[0];input.value='';if(!file)return;
  readImage(file,kind==='photo').then(function(o){
    if(kind==='pic'||kind==='swap'){var sel=V.sel(),sw=kind==='swap'&&sel&&sel.type==='pic';impOpen(o.full,file.type,String(file.name||'').replace(/\.[a-z0-9]{2,5}$/i,''),sw?'edit':'new',sw?sel.id:null,null);return}
    var im=o.enc,id=newImgId();IMG[id]=im;IO.saveImg(id);syncImgDefs();
    if(kind==='photo'){ // keep the full-size picture for this session: Claude gets a sharper copy and cut-outs come from it
      var ph=UI.ph={id:id,err:'',full:o.full,send:null},fw=o.full.naturalWidth,fh=o.full.naturalHeight,sc=Math.min(1,1600/Math.max(fw,fh)),cv=document.createElement('canvas');
      cv.width=Math.round(fw*sc);cv.height=Math.round(fh*sc);var cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height);cx.drawImage(o.full,0,0,cv.width,cv.height);
      try{cv.toBlob(function(b){if(b&&UI.ph===ph)ph.send=b},'image/jpeg',.9)}catch(e){}
      renderModal();return}
    var el=V.sel();
    if(kind==='bg'&&el&&E.isBg(el)){el.im=id;el.surf='image';if(!el.imFit)el.imFit='cover';commit()}
  },function(e){toast(e&&e.message==='type'?'Это не картинка. Подойдёт JPG, PNG или WebP.':'Картинку не удалось прочитать. Попробуйте JPG или PNG.')});
}

/* ---------- a photo of a real zone -> an editable scene ---------- */
var PH_ERR={not_granted:'Страница не получила разрешение обращаться к Claude. Разбор по фото без этого не работает; фото можно подложить как образец.',images_unavailable:'',
  sampling_disabled:'Для вашей учётной записи обращение к Claude с этой страницы выключено.',rate_limited:'Лимит запросов к Claude сейчас исчерпан. Попробуйте позже.',session_expired:'Сеанс истёк: войдите в claude.ai заново и повторите.',
  image_rejected:'Claude не принял этот файл. Попробуйте другое фото в формате JPG или PNG.',refused:'Claude отказался разбирать это фото. Попробуйте другое.',invalid_json:'Ответ пришёл в непонятном виде. Нажмите «Разобрать фото» ещё раз.',
  empty:'На фото не нашлось элементов фотозоны. Попробуйте снимок, где зона видна целиком и спереди.',empty2:'В этом разборе не нашлось элементов фотозоны. Попросите Claude прислать его заново.',other:'Разбор не удался. Попробуйте ещё раз чуть позже.'};
/* consent first (the dialog also says the page may send pictures), then the view's limits are read again, then the photo goes to Claude */
function phRun(){
  var ph=UI.ph,im=ph&&IMG[ph.id];if(!im||!IO.sample||ph.busy)return;
  var id=ph.id,blob=ph.send;if(!blob){try{blob=IO.dataUrlBlob(im.src)}catch(e){ph.err=PH_ERR.other;renderModal();return}}
  ph.busy=true;ph.err='';ph.code='';ph.stage='perm';ph.ctl=new AbortController();renderModal();
  var sig=ph.ctl.signal,stop=new Promise(function(_,rej){sig.addEventListener('abort',function(){rej({code:'cancelled'})})});stop.catch(function(){});
  var ask=IO.perm&&IO.perm.request?IO.perm.request(['sample']).then(function(r){var st=r&&r.sample;if(st==='granted'||st==='denied')IO.permSample=st},function(){}):Promise.resolve();
  Promise.race([ask,stop]).then(function(){
      if(IO.permSample==='denied')return Promise.reject({code:'not_granted'});
      return IO.sample.limits?Promise.race([IO.sample.limits(),stop]).then(function(l){IO.sampleImg=!!(l&&l.images)},function(e){if(e&&e.code==='cancelled')throw e}):null})
    .then(function(){ph.stage='send';renderModal();
      return IO.sample.json(PH.prompt(),{images:blob,modelTier:'complex',signal:sig,cache:{gcTime:3600000},onText:function(u){var n=$('#phchars');if(n)n.textContent='Пишет описание: '+u.text.length+' знаков'}})})
    .then(function(A){IO.sampleImg=true;ph.stage='build';return phApply(A,id)})
    .then(function(){ph.busy=false;renderModal()},function(e){var c=e&&e.code;ph.busy=false;ph.code=c==='cancelled'?'':String(c||'other');
      ph.err=c==='cancelled'?'':(PH_ERR[c]===undefined?PH_ERR.other:PH_ERR[c]);
      if(c==='not_granted')IO.permSample='denied';
      if(c==='images_unavailable'){IO.sampleImg=false;UI.phNoImg=true}   // permanent for this view: the dialog switches to the way through the chat
      renderModal()});
}
/* a description that came from the chat (the list or pasted text) builds the scene from the chosen photo, with no call to Claude */
function phFrom(A){
  var ph=UI.ph,id=ph&&ph.id;if(!id||!IMG[id]||ph.busy)return;
  ph.busy=true;ph.err='';ph.stage='build';renderModal();
  phApply(A,id).then(function(){ph.busy=false;UI.phText='';UI.phPaste=false;renderModal()},function(e){ph.busy=false;ph.err=e&&e.code==='empty'?PH_ERR.empty2:PH_ERR.other;renderModal()});
}
function cropAll(photo,crops,full){
  if(!crops.length)return Promise.resolve({});
  return new Promise(function(res,rej){
    var go=function(im){var map={},k=(im.naturalWidth||im.width)/photo.w;   // boxes are in pixels of the stored photo; the full picture is k times larger
      crops.forEach(function(c){var x=Math.round(c.box[0]*k),y=Math.round(c.box[1]*k),w=Math.round((c.box[2]-c.box[0])*k),h=Math.round((c.box[3]-c.box[1])*k);if(w<8||h<8)return;
        var cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(im,x,y,w,h,0,0,w,h);var r=encodeImage(cv,'image/jpeg');if(r){var id=newImgId();IMG[id]=r;IO.saveImg(id);map[c.id]=id}});
      res(map)};
    if(full){go(full);return}
    var im=new Image();im.onerror=function(){rej({code:'other'})};im.onload=function(){go(im)};im.src=photo.src});
}
function phApply(A,id){
  var photo=IMG[id];if(!photo)return Promise.reject({code:'other'});
  var out=PH.build(A,{id:id,w:photo.w,h:photo.h},{tall:+UI.phTall||0});if(!out)return Promise.reject({code:'empty'});
  return cropAll(photo,out.crops,UI.ph&&UI.ph.id===id?UI.ph.full:null).then(function(map){
    var N=out.S;N.els.forEach(function(e){if(e.type==='pic'&&map[e.id])e.im=map[e.id]});N.els=N.els.filter(function(e){return e.type!=='pic'||e.im});
    N.ref.info={stats:out.stats,notes:out.notes,tallMm:out.scale.tallMm,given:out.scale.given};
    ['prices','eco','client','brand'].forEach(function(k){N[k]=S[k]});
    N=M.normalize(N);if(!N||!N.els.length)return Promise.reject({code:'empty'});
    S=N;UI.sel=null;UI.ced=null;UI.mod=null;UI.modal=null;UI.tab='con';syncImgDefs();commit();window.scrollTo(0,0);
    toast('Сцена собрана: '+S.els.length+' элементов. Сверьте с фото и поправьте размеры.');
  });
}
/* the real height of the tallest background fixes the scale: changing it resizes everything around the floor line */
function rescaleScene(newTall){
  var inf=S.ref&&S.ref.info;if(!inf||!(newTall>0)||!(inf.tallMm>0))return;var f=newTall/inf.tallMm;if(Math.abs(f-1)<.004)return;
  S.room.w=12000;S.room.h=6000;
  S.els.forEach(function(e){var big=E.isBg(e)||e.type==='garland'||e.type==='cluster',q=big?50:10,cx=(e.x+e.w/2)*f,cy=(e.y+e.h/2)*f;
    if(e.type==='text'){e.size=Math.max(40,Math.min(600,Math.round(e.size*f/10)*10));M.fit(e);e.x=Math.round(cx-e.w/2);e.y=Math.round(Math.max(0,cy-e.h/2))}
    else if(e.type==='balloon'){e.size=PH.nearestBalloon(e.w*f);M.fit(e);e.x=Math.round(cx-e.w/2);e.y=Math.round(Math.max(0,cy-e.h/2))}
    else{e.w=Math.round(e.w*f/q)*q;if(e.h!==undefined)e.h=Math.round(e.h*f/q)*q;['r','nw','nh','ny','t'].forEach(function(k){if(typeof e[k]==='number')e[k]=Math.round(e[k]*f/10)*10});
      var y0=e.y*f;M.fit(e);e.x=Math.round(cx-e.w/2);e.y=Math.round(y0/q)*q}});
  var rf=S.ref;rf.x=Math.round(rf.x*f);rf.y=Math.round(rf.y*f);rf.w=Math.round(rf.w*f);rf.h=Math.round(rf.h*f);inf.tallMm=newTall;inf.given=true;
  var mx=Math.max.apply(null,S.els.map(function(e){return e.x+e.w})),mn=Math.min.apply(null,S.els.map(function(e){return e.x})),top=Math.max.apply(null,S.els.map(function(e){return e.y+e.h}));
  var pc=rf.x+rf.w/2,roomW=Math.max(3000,Math.min(12000,Math.ceil((2*Math.max(mx-pc,pc-mn)+700)/100)*100)),sh=Math.round(roomW/2-pc);   // the camera looks at the room centre, so the photo centre goes there
  S.els.forEach(function(e){e.x+=sh});rf.x+=sh;S.room.w=roomW;S.room.h=Math.max(2600,Math.min(6000,Math.ceil((top+250)/100)*100));
  S.els.forEach(function(e){M.clamp(S,e)});
}
/* ---------- importing a figure: crop frame, background removed from the frame's edges and by taps ---------- */
/* d: RGBA of the working copy, w x h. Returns a mask (1 = removed) and how much of the frame is left. Only pixels inside the frame are touched. */
function impMask(d,w,h,crop,tol,taps){
  var x0=Math.max(0,Math.min(w-2,Math.round(crop[0]*w))),y0=Math.max(0,Math.min(h-2,Math.round(crop[1]*h))),x1=Math.max(x0+1,Math.min(w-1,Math.round(crop[2]*w)-1)),y1=Math.max(y0+1,Math.min(h-1,Math.round(crop[3]*h)-1));
  var N=w*h,seen=new Uint8Array(N),seed=new Int32Array(N),q=new Int32Array(N),qh=0,qt=0,i,j,k,gone=0;
  function push(p,s){if(seen[p])return;seen[p]=1;seed[p]=s;q[qt++]=p;gone++}
  function run(T2){while(qh<qt){var p=q[qh++],s=seed[p],x=p%w,y=(p-x)/w,nb=[x>x0?p-1:-1,x<x1?p+1:-1,y>y0?p-w:-1,y<y1?p+w:-1];
    for(k=0;k<4;k++){var n=nb[k];if(n<0||seen[n])continue;var a=n*4,b=s*4,dr=d[a]-d[b],dg=d[a+1]-d[b+1],db=d[a+2]-d[b+2];if(d[a+3]<12||dr*dr+dg*dg+db*db<=T2)push(n,s)}}}
  if(tol>0){for(i=x0;i<=x1;i++){push(y0*w+i,y0*w+i);push(y1*w+i,y1*w+i)}for(j=y0+1;j<y1;j++){push(j*w+x0,j*w+x0);push(j*w+x1,j*w+x1)}run(Math.pow(tol*2.2,2))}
  (taps||[]).forEach(function(t){var tx=Math.round(t[0]*w),ty=Math.round(t[1]*h);if(tx<x0||tx>x1||ty<y0||ty>y1)return;var p=ty*w+tx;if(seen[p])return;push(p,p);run(Math.pow((t[2]||28)*2.2,2))});
  return {m:seen,gone:gone,area:(x1-x0+1)*(y1-y0+1),box:[x0,y0,x1,y1]};
}
function impOpen(full,type,name,mode,eid,srcId){
  var iw=full.naturalWidth||full.width,ih=full.naturalHeight||full.height;if(!iw||!ih){toast('Картинку не удалось прочитать.');return}
  var sc=Math.min(1,900/Math.max(iw,ih)),w=Math.max(2,Math.round(iw*sc)),h=Math.max(2,Math.round(ih*sc)),cv=document.createElement('canvas');cv.width=w;cv.height=h;
  var c=cv.getContext('2d');c.drawImage(full,0,0,w,h);var src;try{src=c.getImageData(0,0,w,h)}catch(e){toast('Картинку не удалось обработать.');return}
  UI.imp={full:full,type:type||'image/jpeg',name:String(name||'').slice(0,40),mode:mode,eid:eid,srcId:srcId,w:w,h:h,src:src,out:null,mask:null,crop:[0,0,1,1],tol:0,taps:[]};
  UI.modal={type:'imp',title:mode==='edit'?'Обрезка и фон':'Импорт фигуры'};impApply();renderModal();
}
/* recompute what is removed; refuses a step that would erase the whole picture */
function impApply(){
  var ip=UI.imp;if(!ip)return true;
  if(!ip.tol&&!ip.taps.length){ip.out=null;ip.mask=null;return true}
  var r=impMask(ip.src.data,ip.w,ip.h,ip.crop,ip.tol,ip.taps);if(r.gone>r.area*.97)return false;
  var o=new ImageData(new Uint8ClampedArray(ip.src.data),ip.w,ip.h),d=o.data,m=r.m,w=ip.w,h=ip.h,i,j;
  for(i=0;i<w*h;i++)if(m[i])d[i*4+3]=0;
  for(j=r.box[1];j<=r.box[3];j++)for(i=r.box[0];i<=r.box[2];i++){var p=j*w+i;if(m[p])continue;if((i>0&&m[p-1])||(i<w-1&&m[p+1])||(j>0&&m[p-w])||(j<h-1&&m[p+w]))d[p*4+3]=Math.round(d[p*4+3]*.55)}
  ip.out=o;ip.mask=r;return true;
}
function impPaint(){var ip=UI.imp,cv=$('#impcv');if(!ip||!cv)return;if(cv.width!==ip.w||cv.height!==ip.h){cv.width=ip.w;cv.height=ip.h}cv.getContext('2d').putImageData(ip.out||ip.src,0,0)}
function impCropStyle(){var ip=UI.imp,c=ip.crop,cs='left:'+(c[0]*100).toFixed(2)+'%;top:'+(c[1]*100).toFixed(2)+'%;width:'+((c[2]-c[0])*100).toFixed(2)+'%;height:'+((c[3]-c[1])*100).toFixed(2)+'%';var a=$('#impcrop'),b=$('#impch');if(a)a.style.cssText=cs;if(b)b.style.cssText=cs}
function impChange(fn){ // one change of the settings; if it would erase everything, it is taken back
  var ip=UI.imp;if(!ip)return;var keep={tol:ip.tol,taps:ip.taps.slice(),crop:ip.crop.slice()};fn(ip);
  if(!impApply()){ip.tol=keep.tol;ip.taps=keep.taps;ip.crop=keep.crop;impApply();toast('Так исчезает вся картинка: фон и фигура слишком похожи по цвету. Попробуйте слабее или уберите фон касаниями.')}
  renderModal();
}
function impDone(){
  var ip=UI.imp;if(!ip)return;var full=ip.crop[0]<.004&&ip.crop[1]<.004&&ip.crop[2]>.996&&ip.crop[3]>.996,cut=!!ip.out,cv=document.createElement('canvas'),r=null,c;
  try{
    if(cut){ // the cut-out is trimmed to what is left of the figure
      var b=ip.mask.box,m=ip.mask.m,x0=b[2],x1=b[0],y0=b[3],y1=b[1],i,j;
      for(j=b[1];j<=b[3];j++)for(i=b[0];i<=b[2];i++)if(!m[j*ip.w+i]){if(i<x0)x0=i;if(i>x1)x1=i;if(j<y0)y0=j;if(j>y1)y1=j}
      if(x1<x0||y1<y0){toast('От картинки ничего не осталось.');return}
      var tmp=document.createElement('canvas');tmp.width=ip.w;tmp.height=ip.h;tmp.getContext('2d').putImageData(ip.out,0,0);
      cv.width=x1-x0+1;cv.height=y1-y0+1;cv.getContext('2d').drawImage(tmp,x0,y0,cv.width,cv.height,0,0,cv.width,cv.height);r=encodeImage(cv,'image/png');
    } else if(!full){var iw=ip.full.naturalWidth||ip.full.width,ih=ip.full.naturalHeight||ip.full.height,sx=Math.round(ip.crop[0]*iw),sy=Math.round(ip.crop[1]*ih),sw=Math.max(2,Math.round((ip.crop[2]-ip.crop[0])*iw)),sh=Math.max(2,Math.round((ip.crop[3]-ip.crop[1])*ih));
      cv.width=sw;cv.height=sh;c=cv.getContext('2d');c.drawImage(ip.full,sx,sy,sw,sh,0,0,sw,sh);r=encodeImage(cv,ip.type);
    }
  }catch(e){r=null;toast('Картинку не удалось обработать.');return}
  var changed=cut||!full,srcId=ip.srcId;
  if(!srcId){var o=encodeImage(ip.full,ip.type);if(!o){toast('Картинку не удалось прочитать.');return}srcId=newImgId();IMG[srcId]=o;IO.saveImg(srcId)}
  var id=srcId;if(changed){if(!r){toast('Картинку не удалось обработать.');return}id=newImgId();IMG[id]=r;IO.saveImg(id)}
  var im=IMG[id],el=ip.mode==='edit'?M.find(S,ip.eid):null;syncImgDefs();
  if(el&&el.type==='pic'){el.im=id;if(changed)el.im0=srcId;else delete el.im0;el.cut=ip.tol||0;el.ar=im.h/im.w;M.fit(el);M.clamp(S,el);UI.modal=null;UI.imp=null;commit()}
  else{var more={};if(changed)more.im0=srcId;if(ip.name)more.name=ip.name;if(ip.tol)more.cut=ip.tol;UI.modal=null;UI.imp=null;addPic(id,more);
    if(!IO.lib.some(function(x){return x.kind==='pic'&&x.imgs[0]===id}))IO.libAdd({id:'l'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),kind:'pic',name:ip.name||'Фигура',created:new Date().toISOString(),imgs:[id],json:'',n:1})}
  if(IO._imgFull)toast('Память браузера для картинок заполнена: сохраните проект файлом, иначе после перезагрузки картинка может пропасть.');
}
var idrag=null;
function impPt(ev){var r=$('#impcv').getBoundingClientRect();return [Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height))]}
function impDown(ev){
  var box=ev.target.closest&&ev.target.closest('#impbox');if(!box||idrag||!UI.imp||(ev.button!==undefined&&ev.button>0))return;
  var hd=ev.target.closest('.cph');idrag={c:hd?hd.dataset.c:null,p:[ev.clientX,ev.clientY],pid:ev.pointerId,crop:UI.imp.crop.slice(),moved:false};
  try{box.setPointerCapture(ev.pointerId)}catch(e){}ev.preventDefault();
}
function impMove(ev){
  if(!idrag||ev.pointerId!==idrag.pid||!UI.imp)return;if(Math.hypot(ev.clientX-idrag.p[0],ev.clientY-idrag.p[1])>6)idrag.moved=true;
  if(!idrag.c||!idrag.moved)return;var q=impPt(ev),c=UI.imp.crop,mn=.06;
  if(idrag.c.charAt(1)==='l')c[0]=Math.min(q[0],c[2]-mn);else c[2]=Math.max(q[0],c[0]+mn);
  if(idrag.c.charAt(0)==='t')c[1]=Math.min(q[1],c[3]-mn);else c[3]=Math.max(q[1],c[1]+mn);
  impCropStyle();ev.preventDefault();
}
function impUp(ev){
  if(!idrag||ev.pointerId!==idrag.pid)return;var d=idrag;idrag=null;if(!UI.imp)return;
  if(d.c){if(d.moved){var nc=UI.imp.crop.slice();UI.imp.crop=d.crop;impChange(function(ip){ip.crop=nc})}return}
  if(d.moved)return;var q=impPt(ev),c=UI.imp.crop;if(q[0]<c[0]||q[0]>c[2]||q[1]<c[1]||q[1]>c[3])return;
  var ip=UI.imp,px=Math.round(q[1]*ip.h)*ip.w+Math.round(q[0]*ip.w);if(ip.mask&&ip.mask.m[px]){toast('Здесь фон уже убран.');return}
  impChange(function(ip2){ip2.taps.push([q[0],q[1],ip2.tol||28])});
}

/* ---------- the shape of a garland: points in scene millimetres (x from the left wall, y down from the ceiling) ---------- */
function garAbs(el){var top=S.room.h-el.y-el.h;return E.garlandNodes(el).map(function(q){return [el.x+q[0]*el.w,top+q[1]*el.h]})}
/* the box of the garland is always the box of its line, never less than 200 mm a side; the points are kept as fractions of that box */
function setGarAbs(el,A){
  var sp=E.spline(A,12),x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;sp.forEach(function(q){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1])});
  if(x1-x0<200){var cx=(x0+x1)/2;x0=cx-100;x1=cx+100}if(y1-y0<200){var cy=(y0+y1)/2;y0=cy-100;y1=cy+100}
  if(y1>S.room.h){y0-=y1-S.room.h;y1=S.room.h}
  x0=Math.round(x0);y0=Math.round(y0);var w=Math.round(x1-x0),h=Math.round(y1-y0);
  el.x=x0;el.w=w;el.h=h;el.y=S.room.h-(y0+h);if(el.type!=='neon'){el.shape='free';delete el.flip}
  el.pts=A.map(function(q){return [Math.round((q[0]-x0)/w*1e4)/1e4,Math.round((q[1]-y0)/h*1e4)/1e4]});
}
function nodeAdd(el){
  var A=garAbs(el);if(A.length>=8)return;var sp=E.spline(A,12),bi=0,bl=-1;
  for(var j=0;j<A.length-1;j++){var l=E.polyLen(sp.slice(j*12,j*12+13));if(l>bl){bl=l;bi=j}}
  A.splice(bi+1,0,sp[bi*12+6].slice());setGarAbs(el,A);
}
function nodeDel(el){
  var A=garAbs(el);if(A.length<=2)return;var bi=1,bd=1e18;
  for(var j=1;j<A.length-1;j++){var a=A[j-1],b=A[j+1],p=A[j],L=Math.hypot(b[0]-a[0],b[1]-a[1])||1,d=Math.abs((b[0]-a[0])*(a[1]-p[1])-(a[0]-p[0])*(b[1]-a[1]))/L;if(d<bd){bd=d;bi=j}}
  A.splice(bi,1);setGarAbs(el,A);
}

/* ---------- pointer editing on the scene ---------- */
var drag=null;
function pt(ev){var r=$('#stage').getBoundingClientRect(),k=S.room.w/r.width;return {x:(ev.clientX-r.left)*k,y:(ev.clientY-r.top)*k,k:k}}
function snapOf(el){return (E.isBg(el)||el.type==='garland'||el.type==='cluster'||el.type==='flora'||el.type==='drape')?50:10}
function picked(ev){var ov=$('#ov');ov.style.pointerEvents='none';var t=document.elementFromPoint(ev.clientX,ev.clientY);ov.style.pointerEvents='';var eln=t&&t.closest?t.closest('#scn .el'):null;return eln?eln.dataset.id:null}
function onDown(ev){
  var wrap=$('#stagewrap');if(!wrap||!wrap.contains(ev.target)||(ev.button!==undefined&&ev.button>0)||drag||pinch)return;
  if(UI.tool==='hand'||UI.spaceHand){drag={mode:'bg',hand:true,p:pt(ev),c0:[ev.clientX,ev.clientY],z0:{x:UI.zoom.x,y:UI.zoom.y},pid:ev.pointerId,touch:ev.pointerType==='touch'};try{wrap.setPointerCapture(ev.pointerId)}catch(e){}ev.preventDefault();return}
  var ov=$('#ov'),p=pt(ev),el,touch=ev.pointerType==='touch',ms=V.multi(),many=UI.mmode||ev.shiftKey;
  if(ov.contains(ev.target)&&ms.length>1){var ghd=ev.target.closest('.hd');
    if(ghd&&!ghd.hidden){var gb=gbox(ms);drag={mode:'gsize',h:ghd.dataset.h,els:ms,O:ms.map(function(e){return JSON.parse(JSON.stringify(e))}),snaps:ms.map(function(e){return JSON.stringify(e)}),gb:gb,pb:pboxOf(ms),p:p,pid:ev.pointerId,inOv:true,touch:touch};try{ov.setPointerCapture(ev.pointerId)}catch(e){}ev.preventDefault();return}
    drag={mode:'gmove',els:ms,o:ms.map(snap0),p:p,pid:ev.pointerId,inOv:true,touch:touch};try{ov.setPointerCapture(ev.pointerId)}catch(e){}ev.preventDefault();return}
  if(ov.contains(ev.target)&&(el=V.sel())&&!el.lock){
    var hd=ev.target.closest('.hd'),nd=ev.target.closest('.nd'),rh=ev.target.closest('.rh');
    if(nd&&M.isPath(el)){drag={mode:'node',i:+nd.dataset.n,el:el,p:p,A:garAbs(el),snap:JSON.stringify(el),pid:ev.pointerId,inOv:true,touch:touch};
      try{ov.setPointerCapture(ev.pointerId)}catch(e){}ev.preventDefault();return}
    if(rh){var r=ov.getBoundingClientRect(),c=[r.left+r.width/2,r.top+r.height/2];
      drag={mode:'rot',el:el,p:p,c:c,a0:Math.atan2(ev.clientY-c[1],ev.clientX-c[0]),r0:el.rot||0,snap:JSON.stringify(el),pid:ev.pointerId,inOv:true,touch:touch};
      try{ov.setPointerCapture(ev.pointerId)}catch(e){}ev.preventDefault();return}
    drag={mode:hd?'size':'move',h:hd?hd.dataset.h:null,el:el,p:p,o:snap0(el),rid:hd?[]:ridersOf(el),pid:ev.pointerId,inOv:true,touch:touch,many:many};
    try{ov.setPointerCapture(ev.pointerId)}catch(e){}
    ev.preventDefault();return;
  }
  var eln=ev.target.closest('.el');
  if(eln){var id=eln.dataset.id;el=M.find(S,id);if(!el)return;
    if(many){drag={mode:'mtap',id:id,p:p,c0:[ev.clientX,ev.clientY],pid:ev.pointerId,touch:touch,add:true};try{wrap.setPointerCapture(ev.pointerId)}catch(e){}ev.preventDefault();return}
    if(touch){drag={mode:'tap',id:id,p:p,pid:ev.pointerId,touch:true};return}
    if(UI.sel!==id||UI.multi){UI.sel=id;UI.multi=null;UI.ced=null;paintStage()}
    drag={mode:'move',el:el,p:p,o:snap0(el),rid:ridersOf(el),pid:ev.pointerId};
    try{wrap.setPointerCapture(ev.pointerId)}catch(e){}
    ev.preventDefault();return;
  }
  // an empty spot: a frame is drawn to select what is inside it; a finger on an enlarged picture moves the view instead
  if(touch&&UI.zoom.z>1){drag={mode:'bg',p:p,c0:[ev.clientX,ev.clientY],z0:{x:UI.zoom.x,y:UI.zoom.y},pid:ev.pointerId,touch:touch};try{wrap.setPointerCapture(ev.pointerId)}catch(e){}ev.preventDefault();return}
  drag={mode:'marq',p:p,c0:[ev.clientX,ev.clientY],pid:ev.pointerId,touch:touch,add:many};try{wrap.setPointerCapture(ev.pointerId)}catch(e){}ev.preventDefault()
}
function snap0(e){return {x:e.x,y:e.y,z:SC.zOf(S,e),w:e.w,h:e.h,size:e.size}}
function ridersOf(el){return M.riders(S,el,standTop).map(function(e){return {e:e,o:snap0(e)}})}
/* the pointer moved the drawn element by dx, dy (picture mm). Something standing on the floor slides over it: sideways
   and in depth, its foot under the finger. Something raised moves sideways and up or down at its own depth. */
/* the pointer moved the drawn element by dx, dy (picture mm). «По стене»: sideways and up or down at its own depth.
   «По полу»: sideways and in depth at its own height, the point of the floor under it following the finger. */
function moveBy(e,o,dx,dy,k,sn){
  var s0=SC.sc(o.z),pc=S.room.w/2+(o.x+o.w/2-S.room.w/2)*s0+dx;
  if(UI.mv==='floor'){var dead=Math.max(10*k,Math.abs(dx)*.25),ey=Math.abs(dy)<dead?0:dy-(dy>0?dead:-dead),z=SC.zAtFloorY(S,SC.floorY(S,o.z)+ey);
    z=Math.round(z/(E.isBg(e)?50:10))*(E.isBg(e)?50:10);
    S.els.forEach(function(q){if(q!==e&&!q.hide&&(E.isBg(q)===E.isBg(e))){var qz=SC.zOf(S,q);if(Math.abs(qz-z)<=E.PLANE*1.5)z=qz}});   // same plane as a neighbour
    e.z=Math.max(0,Math.min(E.ZMAX,Math.round(z)));e.y=o.y;var s1=SC.sc(e.z);e.x=Math.round((SC.unX(S,pc,s1)-e.w/2)/sn)*sn}
  else{e.x=Math.round((SC.unX(S,pc,s0)-e.w/2)/sn)*sn;e.y=Math.round((o.y-dy/s0)/sn)*sn}
}
function carry(d,el){if(!d.rid||!d.rid.length)return;var dz=SC.zOf(S,el)-d.o.z,dxx=el.x-d.o.x,dyy=el.y-d.o.y,full=!E.isBg(el)&&!E.isBackdrop(el);
  d.rid.forEach(function(r){r.e.z=Math.max(0,Math.min(E.ZMAX,Math.round(r.o.z+dz)));if(full){r.e.x=r.o.x+dxx;r.e.y=Math.max(0,r.o.y+dyy)}restyle(r.e)})}
function paintLater(){if(!drag.raf)drag.raf=requestAnimationFrame(function(){if(drag)drag.raf=0;if(Object.keys(SC._cache).length>80)SC._cache={};paintStage()})}
function onMove(ev){
  if(!drag||ev.pointerId!==drag.pid)return;
  var p=pt(ev),dx=p.x-drag.p.x,dy=p.y-drag.p.y;
  if(!drag.moved){if(Math.hypot(dx,dy)/p.k<(drag.touch?7:4))return;drag.moved=true;if(drag.mode==='mtap')drag.mode='marq';if(drag.el||drag.els){$('#stagewrap').classList.add('drag');$('#ov').classList.add('live')}}
  if(drag.mode==='marq'){marqDraw(drag,ev);return}
  if(drag.mode==='bg'){if(UI.zoom.z>1){UI.zoom.x=drag.z0.x+(ev.clientX-drag.c0[0]);UI.zoom.y=drag.z0.y+(ev.clientY-drag.c0[1]);zoomApply();placeOv()}
    else if(drag.touch){var ly=drag.ly==null?drag.c0[1]:drag.ly;window.scrollBy(0,ly-ev.clientY);drag.ly=ev.clientY}   // the picture itself takes all touches (for pinching), so a swipe over an empty spot scrolls the page by hand
    return}
  if(drag.mode==='move'){var el=drag.el,sn=snapOf(el),fl=UI.mv==='floor';
    moveBy(el,drag.o,dx,dy,p.k,sn);if(!ev.altKey)snapGuides(el,p.k,fl);if(el.type==='prop'&&!fl){standOn(el,p.k);if(el.y<90){el.y=0}}M.clamp(S,el);
    gapGuides(el,p.k,!ev.altKey);M.clamp(S,el);restyle(el);carry(drag,el);placeOv();tip(el,fl?'слева '+U.n(el.x)+' · от стены '+U.n(SC.zOf(S,el))+' мм':'слева '+U.n(el.x)+' · от пола '+U.n(el.y)+' мм')}
  else if(drag.mode==='gsize'){var g=drag.gb,pb=drag.pb,pw=pb.x1-pb.x0,ph=pb.b-pb.t,h=drag.h,s=1,ax=g.x0,ay=g.y0;
    if(h==='e')s=(pw+dx)/pw;else if(h==='w'){s=(pw-dx)/pw;ax=g.x1}else if(h==='n'){s=(ph-dy)/ph;ax=(g.x0+g.x1)/2}else s=Math.max((pw+dx)/pw,(ph-dy)/ph);
    s=Math.max(.2,Math.min(5,Math.round(s*100)/100));drag.s=s;scaleGroup(drag.els,drag.O,s,ax,ay);paintLater();placeOv();var nb=bboxOf(drag.els);tip(null,Math.round(s*100)+' % · '+U.n(nb.x1-nb.x0)+' × '+U.n(nb.y1-nb.y0)+' мм')}
  else if(drag.mode==='gmove'){
    drag.els.forEach(function(e,i){moveBy(e,drag.o[i],dx,dy,p.k,10);M.clamp(S,e);restyle(e)});placeOv();var e0=drag.els[0],o0=drag.o[0];
    tip(null,UI.mv==='floor'?'сдвиг '+U.n(e0.x-o0.x)+' · глубже на '+U.n(SC.zOf(S,e0)-o0.z)+' мм':'сдвиг '+U.n(e0.x-o0.x)+' × '+U.n(e0.y-o0.y)+' мм')}
  else if(drag.mode==='rot'){var ra=Math.atan2(ev.clientY-drag.c[1],ev.clientX-drag.c[0]),deg=drag.r0+(ra-drag.a0)*180/Math.PI;deg=((deg+180)%360+360)%360-180;
    var sq=Math.round(deg/90)*90;deg=Math.abs(deg-sq)<5?sq:(ev.shiftKey?Math.round(deg/15)*15:Math.round(deg));if(deg===-180)deg=180;
    if(deg)drag.el.rot=deg;else delete drag.el.rot;placeOv();paintLater();tip(drag.el,(deg||0)+'°')}
  else if(drag.mode==='node'&&E.isTie(drag.el)){var te=drag.el,ti=drag.i,ts=SC.sc(SC.zOf(S,te)),q0=drag.A[ti],top=S.room.h-te.y-te.h,role=ti%3;
    var fx=Math.max(0,Math.min(1,(q0[0]+dx/ts-te.x)/te.w)),fy=Math.max(0,Math.min(role===1?.95:.85,(q0[1]+dy/ts-top)/te.h));if(role===2)fy=1;
    te.pts[ti]=[Math.round(fx*1e3)/1e3,Math.round(fy*1e3)/1e3];placeOv();paintLater();tip(te,['край свеса','подхват','конец шлейфа'][role]+' · '+U.n(fx*te.w)+' / '+U.n(fy*te.h)+' мм')}
  else if(drag.mode==='node'){var ge=drag.el,A=drag.A.map(function(q){return q.slice()}),gi=drag.i,ns=SC.sc(SC.zOf(S,ge));dx/=ns;dy/=ns;
    A[gi][0]=Math.max(-300,Math.min(S.room.w+300,Math.round((drag.A[gi][0]+dx)/10)*10));A[gi][1]=Math.max(0,Math.min(S.room.h,Math.round((drag.A[gi][1]+dy)/10)*10));
    setGarAbs(ge,A);placeOv();paintLater();tip(ge,'длина '+U.n((ge.type==='neon'?E.neonLen(ge):E.polyLen(E.garlandPts(ge)))/1000,2)+' м')}
  else if(drag.mode==='size'){var e=drag.el,o=drag.o,h=drag.h,s=snapOf(e),zs=SC.sc(o.z);dx/=zs;dy/=zs;var rr=(e.rot||0)*Math.PI/180,lx=dx*Math.cos(rr)+dy*Math.sin(rr),ly=-dx*Math.sin(rr)+dy*Math.cos(rr);
    if(e.type==='text'){var f=(o.w+(h==='w'?-lx:lx)*2)/o.w;e.size=Math.max(40,Math.min(600,Math.round(o.size*f/10)*10));M.fit(e)}
    else{
      if(h==='e'||h==='ne')e.w=Math.round((o.w+lx)/s)*s;
      if(h==='w')e.w=Math.round((o.w-lx)/s)*s;
      if((h==='n'||h==='ne')&&handlesFor(e).indexOf('n')>=0)e.h=Math.round((o.h-ly)/s)*s;
      e.w=Math.max(60,e.w);e.h=Math.max(60,e.h||60);M.fit(e);
      if(e.rot){e.x=Math.round(o.x+o.w/2-e.w/2);if(!M.floorOnly(e))e.y=Math.max(0,Math.round(o.y+o.h/2-e.h/2))}   // turned elements grow around their centre
      else if(h==='w')e.x=o.x+o.w-e.w;
    }
    if(e.rot&&e.type==='text'){e.x=Math.round(o.x+o.w/2-e.w/2);if(!M.floorOnly(e))e.y=Math.max(0,Math.round(o.y+o.h/2-e.h/2))}
    placeOv();paintLater();tip(e,e.type==='text'?'буквы '+e.size+' мм':e.type==='circle'?'Ø '+U.n(e.w)+' мм':U.n(e.w)+' × '+U.n(e.h)+' мм')}
}
/* the selection frame drawn over the picture: what has its centre inside the frame is selected (hidden and locked elements are skipped) */
function marqHits(d,ev){var x0=Math.min(d.c0[0],ev.clientX),x1=Math.max(d.c0[0],ev.clientX),y0=Math.min(d.c0[1],ev.clientY),y1=Math.max(d.c0[1],ev.clientY),out=[];
  S.els.forEach(function(e){if(e.hide||e.lock)return;var n=$('#scn .el[data-id="'+e.id+'"]');if(!n)return;var r=n.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;if(cx>=x0&&cx<=x1&&cy>=y0&&cy<=y1)out.push(e.id)});
  d.box=[x0,y0,x1,y1];return out}
function marqDraw(d,ev){var w=$('#stagewrap'),m=$('#marq');if(!m){m=document.createElement('div');m.id='marq';m.className='marq';w.appendChild(m)}var wr=w.getBoundingClientRect(),hits=marqHits(d,ev),b=d.box;
  m.hidden=false;m.style.cssText='left:'+(b[0]-wr.left)+'px;top:'+(b[1]-wr.top)+'px;width:'+(b[2]-b[0])+'px;height:'+(b[3]-b[1])+'px';d.hits=hits;d.ev=[ev.clientX,ev.clientY];
  $$('#scn .el.mq').forEach(function(n){if(hits.indexOf(n.dataset.id)<0)n.classList.remove('mq')});hits.forEach(function(id){var n=$('#scn .el[data-id="'+id+'"]');if(n)n.classList.add('mq')});
  tip(null,hits.length?'в рамке: '+hits.length+' эл.':'обведите элементы рамкой')}
function marqEnd(d){var m=$('#marq');if(m)m.hidden=true;$$('#scn .el.mq').forEach(function(n){n.classList.remove('mq')});
  if(!d.moved){if(d.id){toggleMulti(d.id);return}if(!d.add&&(UI.sel||UI.multi)){UI.sel=null;UI.multi=null;UI.ced=null;render()}return}
  var base=d.add?selList().map(function(e){return e.id}):[];selectIds(base.concat(d.hits||[]));render()}
function endDrag(){var w=$('#stagewrap'),ov=$('#ov'),g=$('#guides'),t=$('#dragtip');if(w)w.classList.remove('drag');if(ov)ov.classList.remove('live');if(g)g.innerHTML='';if(t)t.hidden=true}
/* the live reading during a gesture: a label just above the frame */
function tip(el,text){var t=$('#dragtip'),w=$('#stagewrap');if(!t||!w)return;t.textContent=text;t.hidden=false;var wr=w.getBoundingClientRect(),o=$('#ov').getBoundingClientRect(),tw=t.offsetWidth;
  var x=Math.max(6,Math.min(wr.width-tw-6,o.left-wr.left+o.width/2-tw/2)),y=o.top-wr.top-40;if(y<6)y=Math.min(wr.height-34,o.bottom-wr.top+10);t.style.left=x+'px';t.style.top=y+'px'}
/* gaps to the nearest neighbours left and right (about as deep, overlapping in height); equal gaps snap and are marked */
function gapGuides(el,k,snap){
  var ze=SC.zOf(S,el),sc=SC.sc(ze),cx0=S.room.w/2,HH=S.room.h+SC.FLOOR,L=null,Rr=null;
  S.els.forEach(function(o){if(o===el||o.hide||Math.abs(SC.zOf(S,o)-ze)>150||o.y>=el.y+el.h||o.y+o.h<=el.y||(drag&&drag.rid&&drag.rid.some(function(r){return r.e===o})))return;
    var gl=el.x-(o.x+o.w),gr=o.x-(el.x+el.w);if(gl>=0&&gl<3000&&(!L||gl<L.g))L={g:gl,o:o};if(gr>=0&&gr<3000&&(!Rr||gr<Rr.g))Rr={g:gr,o:o}});
  var eq=false;if(snap&&L&&Rr&&Math.abs(L.g-Rr.g)<10*k/sc){var sh=Math.round((Rr.g-L.g)/2);el.x+=sh;L.g+=sh;Rr.g-=sh;eq=true}
  var yc=S.room.h-(SC.CAM.h+(el.y+el.h/2-SC.CAM.h)*sc),P=function(X){return (cx0+(X-cx0)*sc)/S.room.w*100},html='';
  [[L,el.x-(L?L.g:0),el.x],[Rr,el.x+el.w,el.x+el.w+(Rr?Rr.g:0)]].forEach(function(q){if(!q[0]||q[0].g<1)return;var a=P(q[1]),b=P(q[2]);
    html+='<i class="gd'+(eq?' eq':'')+'" style="left:'+a.toFixed(3)+'%;width:'+(b-a).toFixed(3)+'%;top:'+(yc/HH*100).toFixed(3)+'%"><b>'+(eq?'= ':'')+U.n(q[0].g)+'</b></i>'});
  var g=$('#guides');if(g&&html)g.innerHTML+=html}
/* a «?» opens its hint in a small bubble next to it; a tap anywhere else closes it */
function helpTip(b){var t=$('#tipbox');if(!t){t=document.createElement('div');t.id='tipbox';t.className='tipbox';t.setAttribute('role','tooltip');document.body.appendChild(t)}
  if(!t.hidden&&t._b===b){t.hidden=true;t._b=null;return}
  t.innerHTML=b.getAttribute('data-tip');t.hidden=false;t._b=b;t._sy=window.scrollY;var r=b.getBoundingClientRect(),tw=Math.min(300,innerWidth-24);t.style.width=tw+'px';
  var x=Math.max(12,Math.min(innerWidth-tw-12,r.left+r.width/2-tw/2)),y=r.bottom+8;t.style.left=x+'px';t.style.top=(y+window.scrollY)+'px';
  if(r.bottom+8+t.offsetHeight>innerHeight-8)t.style.top=(r.top-8-t.offsetHeight+window.scrollY)+'px'}
function helpClose(ev){var t=$('#tipbox');if(t&&!t.hidden&&!(ev.target.closest&&(ev.target.closest('.hq')||ev.target.closest('#tipbox')))){t.hidden=true;t._b=null}}
/* ---------- layers: drag a row by its grip to put the element nearer or farther ---------- */
var ldrag=null;
function lyDown(ev){var g=ev.target.closest&&ev.target.closest('.lgrip');if(!g||ldrag)return false;var row=g.closest('.lyr'),list=row.parentNode;
  var sc=row.closest('.dbody')||list;ldrag={id:g.dataset.id,row:row,list:list,sc:sc,y0:ev.clientY,s0:sc.scrollTop,pid:ev.pointerId,rows:Array.prototype.slice.call(list.children),ti:null};row.classList.add('lift');try{g.setPointerCapture(ev.pointerId)}catch(e){}ev.preventDefault();return true}
function lyMove(ev){if(!ldrag||ev.pointerId!==ldrag.pid)return false;var L=ldrag,lr=L.sc.getBoundingClientRect();
  if(ev.clientY<lr.top+28)L.sc.scrollTop-=10;else if(ev.clientY>lr.bottom-28)L.sc.scrollTop+=10;   // the list scrolls when the row reaches its edge
  L.row.style.transform='translateY('+(ev.clientY-L.y0+L.sc.scrollTop-L.s0)+'px)';
  var others=L.rows.filter(function(r){return r!==L.row}),ti=others.length;for(var i=0;i<others.length;i++){var r=others[i].getBoundingClientRect();if(ev.clientY<r.top+r.height/2){ti=i;break}}
  var cur=L.rows.indexOf(L.row);L.ti=ti===cur?null:ti;   // dropping where it was changes nothing
  others.forEach(function(r,i){r.classList.toggle('dropb',L.ti!==null&&i===ti);r.classList.toggle('dropa',L.ti!==null&&ti===others.length&&i===others.length-1)});ev.preventDefault();return true}
function lyUp(ev,cancel){if(!ldrag||ev.pointerId!==ldrag.pid)return false;var L=ldrag;ldrag=null;L.row.classList.remove('lift');L.row.style.transform='';L.rows.forEach(function(r){r.classList.remove('dropb','dropa')});
  if(cancel||L.ti===null)return true;var others=L.rows.filter(function(r){return r!==L.row}),id=function(r){return r?r.querySelector('.lgrip').dataset.id:null};
  layerMove(L.id,id(others[L.ti-1]),id(others[L.ti]));return true}
/* the list runs from the viewer to the wall: `above` is drawn after the element, `below` before it */
function layerMove(id,aboveId,belowId){
  var el=M.find(S,id),A=aboveId?M.find(S,aboveId):null,B=belowId?M.find(S,belowId):null;if(!el)return;
  var z=SC.zOf(S,el),zA=A?SC.zOf(S,A):Infinity,zB=B?SC.zOf(S,B):-Infinity;if(z>zA)z=zA;if(z<zB)z=zB;if(z!==SC.zOf(S,el))setZ(el,z);
  S.els.splice(S.els.indexOf(el),1);
  if(A&&SC.zOf(S,A)===z)S.els.splice(S.els.indexOf(A),0,el);else if(B&&SC.zOf(S,B)===z)S.els.splice(S.els.indexOf(B)+1,0,el);else if(A)S.els.splice(S.els.indexOf(A),0,el);else S.els.push(el);
  commit()}
/* light or dark: the saved choice, else what the device asks for. The scene itself stays as it will look in the room. */
function themeNow(){var t=document.documentElement.getAttribute('data-theme');return t==='light'?'light':'dark'}
/* menus: a word in the bar opens its list under it; while one is open, moving to the next word opens that one, as in Photoshop */
function menuOpen(id,b){var m=$('#mpop');if(!m)return;if(!m.hidden&&m.dataset.id===id){menuClose();return}
  m.innerHTML=V.mmenu(id);m.dataset.id=id;m.hidden=false;var r=b.getBoundingClientRect();m.style.left=Math.max(4,Math.min(innerWidth-m.offsetWidth-4,r.left))+'px';m.style.top=(r.bottom+2)+'px';
  $$('.mbar .mb').forEach(function(x){x.setAttribute('aria-expanded',x.dataset.id===id)})}
/* a transfer file from the other version: on the site a room is made first if there is none, so the projects have somewhere to live */
function transferIn(B){var go=function(){toast('Переношу данные…');return IO.importAll(B).then(function(c){
    if(B.current&&B.current.els&&!S.els.length){var cur=JSON.parse(JSON.stringify(B.current));cur.pid=null;loadState(cur)}
    UI.projects=null;render();if(IO.db)refreshProjects();
    toast('Перенесено: проектов '+c.projects+', шаблонов '+c.lib+', картинок '+c.images+(c.analyses?', разборов фото '+c.analyses:'')+(IO.db?'':'. Проекты появятся в списке после подключения к комнате.'));
    if(UI.modal&&UI.modal.type==='menu')renderModal();else openModal({type:'menu',title:'Проект'});
  },function(){toast('Перенос не удался: база не ответила. Попробуйте ещё раз — уже перенесённое не задвоится.')})};
  if(window.SITE&&!SITE.code())return SITE.connect(SITE.newCode()).then(go);return go()}
function openTab(id){act('tab',{dataset:{id:id}})}
function menuClose(){var m=$('#mpop');if(m&&!m.hidden){m.hidden=true;m.dataset.id='';m.innerHTML=''}$$('.mbar .mb').forEach(function(x){x.setAttribute('aria-expanded','false')})}
/* scrub: drag a label in the options bar sideways to change its number, as in Photoshop; one step goes into the history at the end */
var scrub=null;
function scrubDown(ev){var b=ev.target.closest&&ev.target.closest('[data-scrub]');if(!b||(ev.button!==undefined&&ev.button>0))return false;var inp=b.parentNode.querySelector('input');if(!inp)return false;
  scrub={b:b,inp:inp,bind:b.dataset.scrub,st:+b.dataset.sstep||10,v0:parseFloat(inp.value)||0,x0:ev.clientX,pid:ev.pointerId,moved:false};try{b.setPointerCapture(ev.pointerId)}catch(e){}ev.preventDefault();return true}
function scrubMove(ev){if(!scrub||ev.pointerId!==scrub.pid)return false;var dx=ev.clientX-scrub.x0;if(!scrub.moved&&Math.abs(dx)<3)return true;
  if(!scrub.moved){scrub.moved=true;UI.scrubbing=true;document.body.classList.add('scrubbing')}
  var v=scrub.v0+Math.round(dx/4)*scrub.st,inp=scrub.inp;if(inp.min!=='')v=Math.max(+inp.min,v);if(inp.max!=='')v=Math.min(+inp.max,v);
  if(String(v)!==inp.value){inp.value=v;applyBind(scrub.bind,v)}ev.preventDefault();return true}
function scrubUp(ev){if(!scrub||ev.pointerId!==scrub.pid)return false;var d=scrub;scrub=null;document.body.classList.remove('scrubbing');
  if(d.moved){UI.scrubbing=false;pushHist();render()}else{d.inp.focus();try{d.inp.select()}catch(e){}}return true}
/* the splitter between «Свойства» and the tabs below */
var dsp=null;
function dspDown(ev){var t=ev.target;if(!t||t.id!=='dsplit')return false;var dk=$('#dock'),top=dk.querySelector('.dtop');dsp={pid:ev.pointerId,y0:ev.clientY,h0:top.getBoundingClientRect().height,H:dk.getBoundingClientRect().height};try{t.setPointerCapture(ev.pointerId)}catch(e){}ev.preventDefault();return true}
function dspMove(ev){if(!dsp||ev.pointerId!==dsp.pid)return false;var h=Math.round(Math.max(90,Math.min(dsp.H-110,dsp.h0+ev.clientY-dsp.y0)));UI.dsplit=h;$('#dock').style.setProperty('--dsplit',h+'px');ev.preventDefault();return true}
function dspUp(ev){if(!dsp||ev.pointerId!==dsp.pid)return false;dsp=null;wsSave();return true}
function setTheme(t){document.documentElement.setAttribute('data-theme',t);try{localStorage.setItem('fotozona.theme.v1',t)}catch(e){}themeBtn();if(UI.tab==='client')IO.drawOffer($('#offer'));V._timg={};V._tiles={};render()}
function themeBtn(){var b=$('#thm');if(!b)return;var d=themeNow()==='dark';b.innerHTML=d?U.ico.sun:U.ico.moon;b.setAttribute('aria-pressed',d);b.title=b.ariaLabel=d?'Светлая тема':'Тёмная тема';b.setAttribute('aria-label',b.title)}
/* the project name from the field in the «Проект» window: no redraw while typing, the header follows */
function setName(v){v=String(v||'').trim().slice(0,80)||'Фотозона';if(v===S.name)return;S.name=v;var pn=$('#pname');if(pn&&document.activeElement!==pn)pn.value=v;IO.autosave(JSON.stringify(S))}
function setMv(m){UI.mv=m==='floor'?'floor':'wall';try{localStorage.setItem('fotozona.move.v1',UI.mv)}catch(e){}mvBtns()}
function mvBtns(){$$('[data-act="mv"]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.id===(UI.mv||'wall'))})}   // only shows the choice; never writes it
function onUp(ev){
  if(!drag||ev.pointerId!==drag.pid)return;var d=drag;drag=null;endDrag();
  if(d.mode==='tap'){if(!d.moved){UI.sel=d.id;UI.multi=null;UI.ced=null;render()}return}
  if(d.mode==='mtap'){if(!d.moved)toggleMulti(d.id);return}
  if(d.mode==='marq'){marqEnd(d);return}
  if(d.mode==='gsize'){if(d.moved){UI.nextLabel='Размер группы: '+Math.round((d.s||1)*100)+' %';commit()}return}
  if(d.mode==='bg'){if(!d.moved&&!d.hand&&(UI.sel||UI.multi)){UI.sel=null;UI.multi=null;UI.ced=null;render()}return}
  if(d.mode==='gmove'){if(d.moved){commit();return}var gid=picked(ev);if(gid)toggleMulti(gid);return}
  if(d.moved){M.clamp(S,d.el);if(d.rid)d.rid.forEach(function(r){M.clamp(S,r.e)});commit();return}
  if(d.inOv){ // a tap inside the frame: pick what is really under the finger
    var id=picked(ev);
    if(d.many&&id){toggleMulti(id);return}
    if(id!==UI.sel){UI.sel=id;UI.multi=null;UI.ced=null;render()}
    return;
  }
  render();
}
function restoreDrag(d){
  if(!d.moved)return;
  if(d.rid)d.rid.forEach(function(r){r.e.x=r.o.x;r.e.y=r.o.y;r.e.z=r.o.z});
  if(d.snaps){d.els.forEach(function(e,i){var o0=JSON.parse(d.snaps[i]);Object.keys(e).forEach(function(k){delete e[k]});for(var k0 in o0)e[k0]=o0[k0]});paintStage();return}
  if(d.els){d.els.forEach(function(e,i){e.x=d.o[i].x;e.y=d.o[i].y;e.z=d.o[i].z});paintStage();return}
  if(d.el&&d.snap){var o0=JSON.parse(d.snap);Object.keys(d.el).forEach(function(k){delete d.el[k]});for(var k0 in o0)d.el[k0]=o0[k0];paintStage();return}
  if(d.el&&d.o){for(var k in d.o)if(d.o[k]!==undefined)d.el[k]=d.o[k];M.fit(d.el);paintStage()}
}
function onCancel(ev){if(!drag||ev.pointerId!==drag.pid)return;var d=drag;drag=null;endDrag();restoreDrag(d)}

/* ---------- wiring ---------- */
function readInput(n){
  if(n.type==='checkbox')return n.checked;
  if(n.type==='number'){var v=parseFloat(String(n.value).replace(',','.'));if(!isFinite(v))return null;if(n.min!==''&&v<+n.min)v=+n.min;if(n.max!==''&&v>+n.max)v=+n.max;return v}
  return n.value;
}
function init(){
  $('#tabs').innerHTML=V.TABS.slice(1).map(function(t,i){return '<button type="button" class="tab" role="tab" data-act="tab" data-id="'+t[0]+'"><span class="n">'+(i+1)+'</span>'+t[1]+'</button>'}).join('');
  $('#undo').innerHTML=U.ico.undo;$('#redo').innerHTML=U.ico.redo;$('#burger').innerHTML='<img src="'+U.LOGO+'" alt="" width="24" height="24" draggable="false">';try{var fi=document.createElement('link');fi.rel='icon';fi.type='image/png';fi.href=U.LOGO;document.head.appendChild(fi)}catch(e){}$('#photobtn').innerHTML=U.ico.cam+'<span>По фото</span>';$('#savebtn').innerHTML=U.ico.save+'<span>Сохранить</span>';$('.tclose').innerHTML=U.ico.x+'<span>К сцене</span>';themeBtn();
  try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',themeBtn)}catch(e){}
  try{UI.mv=localStorage.getItem('fotozona.move.v1')==='floor'?'floor':'wall';localStorage.removeItem('fotozona.keepar.v1')}catch(e){UI.mv='wall'}
  var saved=IO.loadAuto();S=(saved&&M.normalize(saved))||M.template('three');
  IO.libInit();IO.loadImgs(SC.usedImgs(S));IO.sweepImgs(SC.usedImgs(S).concat(IO.libImgs()));syncImgDefs();
  calc();UI.hist=[JSON.stringify(S)];UI.histL=['Исходное состояние'];UI.hi=0;render();

  document.addEventListener('click',function(ev){
    var a=ev.target.closest('[data-step],[data-set],[data-act]');if(!a||a.disabled)return;
    // keep the tapped block where it is when something above it appears or disappears (iOS has no scroll anchoring)
    if(a.dataset.step){var inp=a.parentNode.querySelector('input'),v=(parseFloat(inp.value)||0)+parseFloat(a.dataset.step);v=Math.round(v*1000)/1000;if(inp.min!==''&&v<+inp.min)v=+inp.min;if(inp.max!==''&&v>+inp.max)v=+inp.max;inp.value=v;applyBind(inp.dataset.bind,v);return}
    if(a.dataset.set){applyBind(a.dataset.set,a.dataset.n?+a.dataset.val:a.dataset.val);return}
    UI._mods={shift:ev.shiftKey,ctrl:ev.ctrlKey||ev.metaKey};
    if(a.dataset.act==='close-scrim'){if(ev.target===a&&!(UI.modal&&UI.modal.type==='imp')){UI.modal=null;renderModal()}return}
    act(a.dataset.act,a);
  });
  document.addEventListener('input',function(ev){var n=ev.target,panel=n.closest&&n.closest('[data-cmyk]');if(n.id==='ph-json'){UI.phText=n.value;return}if(panel&&n.dataset.hv)wheelSet(panel,+panel.dataset.h,+panel.dataset.s,+n.value,false)});
  document.addEventListener('change',function(ev){
    var n=ev.target,panel=n.closest&&n.closest('[data-cmyk]');
    if(n.id==='menu-name'){setName(n.value);return}
    if(n.id==='file'||n.id==='mfile'||n.id==='mfile2'){menuClose();var f=n.files&&n.files[0];n.value='';if(!f)return;var fr=new FileReader();fr.onload=function(){var o=null;try{o=JSON.parse(fr.result)}catch(e){}
        if(o&&o.kind===IO.TRANSFER){transferIn(o);return}
        if(o){o.pid=null;UI.nextLabel=null;if(loadState(o)){UI.modal=null;UI.tab='con';render();toast('Открыт проект «'+S.name+'»')}}else toast('Файл не читается как проект.')};fr.readAsText(f);return}
    if(n.dataset&&n.dataset.up){onUpload(n);return}
    if(panel){
      if(n.dataset.hv){wheelSet(panel,+panel.dataset.h,+panel.dataset.s,+n.value,true);return}
      if(n.dataset.chn!==undefined){n.value=Math.max(0,Math.min(100,Math.round(parseFloat(n.value)||0)));var ck=cmykRead(panel);UI.hsv=null;setColor(panel.dataset.cmyk,E.cmykHex(ck),ck);commit();return}
      if(n.dataset.hex){var hx=String(n.value).trim().replace(/^#?/,'#');if(/^#[0-9a-fA-F]{6}$/.test(hx)){setColor(n.dataset.hex,hx.toUpperCase(),null);commit()}else{toast('HEX — это шесть знаков, например #E9C4CF.');render()}return}
    }
    if(n.dataset&&n.dataset.pick){if(n.value==='')return;applyBind(n.dataset.pick,n.dataset.n?+n.value:n.value);return}
    if(!n.dataset||!n.dataset.bind)return;var val=readInput(n);if(val===null){render();return}
    if(n.dataset.bind==='s.name')val=String(val).trim().slice(0,80)||'Фотозона';
    applyBind(n.dataset.bind,val);
  });
  document.addEventListener('pointerover',function(ev){var b=ev.target.closest&&ev.target.closest('.mbar .mb'),m=$('#mpop');if(b&&m&&!m.hidden&&m.dataset.id!==b.dataset.id)menuOpen(b.dataset.id,b)});
  document.addEventListener('pointerdown',function(ev){helpClose(ev);var t=ev.target;
    if(!(t.closest&&(t.closest('#mpop')||t.closest('.mbar'))))menuClose();
    if(UI.fly&&!(t.closest&&(t.closest('#fly')||t.closest('.tools [data-tool]')||t.closest('#modal')))){UI.fly=false;render()}
    if(scrubDown(ev)||dspDown(ev))return;if(lyDown(ev))return;wheelDown(ev);impDown(ev);if(zDown(ev))return;onDown(ev)});
  document.addEventListener('pointermove',function(ev){if(scrubMove(ev)||dspMove(ev))return;if(lyMove(ev))return;wheelMove(ev);impMove(ev);if(zMove(ev)&&pinch)return;onMove(ev)});
  document.addEventListener('pointerup',function(ev){if(scrubUp(ev)||dspUp(ev))return;if(lyUp(ev))return;wheelUp(ev);impUp(ev);if(zUp(ev))return;onUp(ev)});
  document.addEventListener('pointercancel',function(ev){if(scrubUp(ev)||dspUp(ev))return;if(lyUp(ev,true))return;wheelUp(ev);if(idrag&&ev.pointerId===idrag.pid){if(UI.imp)UI.imp.crop=idrag.crop;idrag=null;impCropStyle()}zUp(ev);onCancel(ev)});
  document.addEventListener('wheel',function(ev){var w=$('#stagewrap');if(!w||!w.contains(ev.target)||!(ev.ctrlKey||ev.metaKey))return;ev.preventDefault();var r=w.getBoundingClientRect();zoomAt(UI.zoom.z*Math.exp(-ev.deltaY*.01),ev.clientX-r.left,ev.clientY-r.top)},{passive:false});
  document.addEventListener('keyup',function(ev){if(ev.key===' '&&UI.spaceHand){UI.spaceHand=false;var wsm=$('#wsm');if(wsm)wsm.classList.toggle('hand',UI.tool==='hand')}});   // Space held down: the hand moves the view
  window.addEventListener('resize',function(){menuClose();fitStage();zoomApply();placeFly()});
  document.addEventListener('scroll',function(ev){var n=ev.target;if(!n||n===document||n.nodeType!==1)return;var t=$('#tipbox');if(t&&!t.hidden&&!t.contains(n)){t.hidden=true;t._b=null}},true);   // a panel that scrolls takes its hint away
  window.addEventListener('scroll',function(){var t=$('#tipbox');if(t&&!t.hidden&&Math.abs(window.scrollY-(t._sy||0))>40){t.hidden=true;t._b=null}},{passive:true});   // a real scroll closes the hint, the page settling after a tap does not
  // older iPads start scrolling before touch-action is honoured: stop it for gestures that begin on the frame
  document.addEventListener('touchstart',function(ev){if(ev.target.closest&&(ev.target.closest('#ov')||ev.target.closest('.lgrip')))ev.preventDefault()},{passive:false});
  document.addEventListener('touchmove',function(ev){if(drag&&drag.el)ev.preventDefault()},{passive:false});
  document.addEventListener('keydown',function(ev){
    var t=ev.target,typing=t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable);
    if(wheelKey(ev))return;
    if(ev.key==='Escape'&&UI.modal){if(UI.modal.type==='imp')UI.imp=null;UI.modal=null;renderModal();return}
    if(ev.key==='Escape'){var mp=$('#mpop');if(mp&&!mp.hidden){menuClose();return}if(UI.fly){UI.fly=false;render();return}if(UI.tab!=='con'){act('tab',{dataset:{id:'con'}});return}}
    if(ev.key==='Enter'&&t&&t.tagName==='INPUT'&&t.closest&&t.closest('#optbar')){t.blur();return}
    if(ev.key===' '&&!typing&&UI.tab==='con'&&!UI.modal){ev.preventDefault();if(!UI.spaceHand){UI.spaceHand=true;var wsm=$('#wsm');if(wsm)wsm.classList.add('hand')}return}   // Enter takes the value and gives the keys back to the scene
    if((ev.ctrlKey||ev.metaKey)&&(ev.key==='s'||ev.key==='S'||ev.key==='ы'||ev.key==='Ы')){ev.preventDefault();act('save');return}
    if(!typing&&!UI.modal&&!ev.ctrlKey&&!ev.metaKey&&!ev.altKey){var kk=ev.key.toLowerCase();
      if(UI.tab==='con'&&(kk==='v'||kk==='м')){setMv('wall');UI.tool=null;paintStage();return}
      if(UI.tab==='con'&&(kk==='f'||kk==='а')){setMv('floor');UI.tool=null;paintStage();return}
      if(UI.tab==='con'&&(kk==='h'||kk==='р')){act('tool',{dataset:{id:'hand'}});return}
      if(UI.tab==='con'&&(kk==='m'||kk==='ь')){act('multi');return}
      if(kk==='+'||kk==='='){zoomBy(1.5);return}if(kk==='-'||kk==='_'){zoomBy(1/1.5);return}if(kk==='0'){act('zoom-fit');return}
      if(/^[1-7]$/.test(kk)){act('tab',{dataset:{id:V.TABS[+kk][0]}});return}}
    if((ev.ctrlKey||ev.metaKey)&&!typing&&(ev.key==='z'||ev.key==='Z'||ev.key==='я'||ev.key==='Я')){ev.preventDefault();act(ev.shiftKey?'redo':'undo');return}
    if((ev.ctrlKey||ev.metaKey)&&!typing&&(ev.key==='y'||ev.key==='Y')){ev.preventDefault();act('redo');return}
    if(typing||UI.tab!=='con'||UI.modal)return;if(ev.key==='Escape'&&(UI.sel||UI.multi)){act('gclear');return}
    if(ev.ctrlKey||ev.metaKey){var ck=ev.key.toLowerCase();
      if(ck==='a'||ck==='ф'){ev.preventDefault();selectAll();return}
      if(ck==='c'||ck==='с'){if(clipCopy(false))ev.preventDefault();return}
      if(ck==='x'||ck==='ч'){if(clipCopy(true))ev.preventDefault();return}
      if(ck==='v'||ck==='м'){ev.preventDefault();clipPaste();return}
      if(ck==='d'||ck==='в'){ev.preventDefault();act(V.multi().length>1?'gdup':'dup');return}}
    var gm=V.multi();if(gm.length>1){
      if(ev.key==='Delete'||ev.key==='Backspace'){ev.preventDefault();act('gdel');return}
      var gd={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[ev.key];
      if(gd){ev.preventDefault();var gs=ev.shiftKey?10:50,gu=gm.filter(function(e){return !e.lock});if(gd[0])shiftGroupX(gu,gd[0]*gs);gu.forEach(function(e){if(gd[1]){if(UI.mv==='floor')setZ(e,SC.zOf(S,e)-gd[1]*gs);else if(!M.floorOnly(e))e.y=Math.max(0,e.y+gd[1]*gs)}});UI.nextLabel='Перемещение группы: '+gu.length+' эл.';commit()}
      return}
    var el=V.sel();if(!el)return;
    if(ev.key==='Delete'||ev.key==='Backspace'){ev.preventDefault();act('del');return}
    var d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[ev.key];
    if(d){ev.preventDefault();var s=ev.shiftKey?10:50;el.x+=d[0]*s;if(d[1]){if(UI.mv==='floor')setZ(el,SC.zOf(S,el)-d[1]*s);else el.y+=d[1]*s}M.clamp(S,el);commit()}
  });
  window.addEventListener('resize',function(){placeOv()});
  IO.init(function(){if(IO.db&&!IO._libSynced){IO._libSynced=1;IO.libSync().then(function(ch){if(ch){IO.loadImgs(IO.libImgs());render()}})}if(UI.modal&&UI.modal.type==='menu'){renderModal();refreshProjects()}else if(UI.modal){renderModal();if(UI.modal.type==='photo'&&IO.db&&UI.analyses===null)refreshAnalyses()}});
  IO.fonts().then(function(){var ch=false;S.els.forEach(function(e){if(e.type==='text'){var w=e.w;M.fit(e);if(e.w!==w)ch=true}});V._tiles={};if(ch){calc();UI.hist[UI.hi]=JSON.stringify(S)}render()});
}
init();
