/* ===== io.js — pictures, files, cloud projects, autosave. Everything here may be unavailable; the page works without it. ===== */
var IO = {dl:null, db:null, sample:null, sampleState:'wait', sampleImg:null, perm:null, permSample:null, _sc:null, _ot:0, _scripts:{}, _cloud:{}};
IO.init = function(onChange){
  if(!window.claude||!window.claude.use){IO.sampleState='none';return}
  try{window.claude.use('downloads').then(function(d){IO.dl=d||null}).catch(function(){})}catch(e){}
  try{window.claude.use('db').then(function(d){IO.db=d||null;if(onChange)onChange()}).catch(function(){})}catch(e){}
  // asking Claude about a photo: needs the page to be allowed to send images
  // Whether Claude can be asked is decided when the page is LOADED: a tab that was already open when this feature
  // was published keeps the old answer until it is reloaded. The button depends only on the function being there;
  // whether images may be sent is reported by the call itself.
  try{window.claude.use('sample').then(function(s){IO.sample=s||null;IO.sampleState=s?'ok':'none';if(onChange)onChange();
      if(s&&s.limits)s.limits().then(function(l){IO.sampleImg=!!(l&&l.images);if(onChange)onChange()},function(){})},function(){IO.sampleState='none';if(onChange)onChange()})}catch(e){IO.sampleState='none'}
  try{window.claude.use('permissions').then(function(p){IO.perm=p||null;return IO.checkPerm()}).then(function(){if(onChange)onChange()},function(){})}catch(e){}
};
IO.checkPerm = function(){if(!IO.perm||!IO.perm.state)return Promise.resolve(null);return IO.perm.state('sample').then(function(st){IO.permSample=st;return st},function(){return null})};
IO.fname = function(ext,prefix){return ((prefix?prefix+' ':'')+String(S.name||'Фотозона').replace(/[\\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,60)||'Фотозона')+'.'+ext};

/* ---------- autosave in this browser (a convenience only) ---------- */
IO.KEY = 'fotozona.autosave.v1';
IO.autosave = function(json){clearTimeout(IO._at);IO._at=setTimeout(function(){try{window.localStorage.setItem(IO.KEY,json)}catch(e){}},400)};
IO.loadAuto = function(){try{var j=window.localStorage.getItem(IO.KEY);return j?JSON.parse(j):null}catch(e){return null}};
/* pictures are remembered one per key; a full browser store only means they will not survive a reload */
/* which groups of settings are open: a convenience of this browser only */
IO.FKEY = 'fotozona.fold.v1';
IO.loadFold = function(){var d={scene:true,ref:true,layers:true},o=null;try{o=JSON.parse(window.localStorage.getItem(IO.FKEY))}catch(e){}if(o&&typeof o==='object')Object.keys(o).forEach(function(k){if(/^[a-z]{2,12}$/.test(k))d[k]=!!o[k]});return d};
IO.saveFold = function(f){try{window.localStorage.setItem(IO.FKEY,JSON.stringify(f))}catch(e){}};
IO.IKEY = 'fotozona.img.';
IO.saveImg = function(id){try{window.localStorage.setItem(IO.IKEY+id,JSON.stringify(IMG[id]))}catch(e){IO._imgFull=true}};
IO.loadImgs = function(ids){ids.forEach(function(id){if(IMG[id])return;try{var j=window.localStorage.getItem(IO.IKEY+id);if(j){var im=JSON.parse(j);if(im&&/^data:image\//.test(im.src)&&+im.w>0&&+im.h>0)IMG[id]={src:im.src,w:+im.w,h:+im.h}}}catch(e){}})};
IO.sweepImgs = function(keep){try{var ls=window.localStorage,drop=[];for(var i=0;i<ls.length;i++){var k=ls.key(i);if(k&&k.indexOf(IO.IKEY)===0&&keep.indexOf(k.slice(IO.IKEY.length))<0)drop.push(k)}drop.forEach(function(k){ls.removeItem(k)})}catch(e){}};

/* ---------- saving a generated file ---------- */
IO.dataUrlBlob = function(url){var i=url.indexOf(','),mime=(url.slice(5,i).split(';')[0])||'image/jpeg',bin=atob(url.slice(i+1)),u=new Uint8Array(bin.length);for(var k=0;k<bin.length;k++)u[k]=bin.charCodeAt(k);return new Blob([u],{type:mime})};
IO.blobToDataURL = function(blob){return new Promise(function(res,rej){var fr=new FileReader();fr.onload=function(){res(fr.result)};fr.onerror=rej;fr.readAsDataURL(blob)})};
IO.save = function(filename,data,kind){
  var fallback=function(){
    if(kind==='img')return IO.blobToDataURL(data).then(function(url){openModal({type:'img',title:filename,src:url,note:'Сохранение файлов в этом окне недоступно. Нажмите на картинку и удерживайте (или правой кнопкой) → «Сохранить изображение».'})});
    if(kind==='text')return openModal({type:'text',title:filename,text:String(data).replace(/^\ufeff/,''),note:'Сохранение файлов в этом окне недоступно. Скопируйте текст и вставьте в файл с таким именем.'});
    toast('Сохранение файлов в этом окне недоступно. Откройте страницу на claude.ai.');
  };
  if(!IO.dl){fallback();return Promise.resolve(false)}
  return IO.dl.save({filename:filename,data:data}).then(function(){toast('Сохранено: '+filename);return true},function(e){
    var c=e&&e.code;
    if(c==='declined'){toast('Сохранение отменено');return false}
    if(c==='rate_limited'){toast('Окно сохранения уже открыто. Повторите через пару секунд.');return false}
    if(c==='too_large'){toast('Файл слишком большой для сохранения.');return false}
    if(c==='rejected_extension'||c==='extension_not_enabled'){toast('Этот формат здесь сохранить нельзя.');return false}
    fallback();return false;
  });
};

/* ---------- fonts for canvas drawing ---------- */
IO.fonts = function(){
  if(IO._fonts)return IO._fonts;
  var want=['700 40px "Cormorant Garamond"','400 20px "Onest"','700 20px "Onest"'].concat(D.FONT_LIST.map(function(f){return f[3]+' 40px "'+f[1]+'"'}));
  var all=(document.fonts&&document.fonts.load)?Promise.all(want.map(function(f){return document.fonts.load(f,'AБЯ ab 12').catch(function(){})})):Promise.resolve();
  IO._fonts=Promise.race([all,new Promise(function(r){setTimeout(r,2500)})]);
  return IO._fonts;
};
IO.svgImage = function(svg){return new Promise(function(res,rej){var im=new Image();im.onload=function(){res(im)};im.onerror=function(){rej(new Error('svg image'))};im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)})};

/* ---------- the scene as a bitmap. Inscriptions are drawn with canvas text so that web fonts survive. ---------- */
IO.drawText = function(c,el,k){
  var pal=D.pal(S.palette),px=el.size/0.66,lines=String(el.text||'').split('\n'),mq=el.style==='marquee',col=el.color||(el.style==='flat'?'#1B1F1D':mq?'#F5EFE3':pal.ink),lh=px*1.04,x0=0,y0=0,cx=el.w/2,pb=SC.proj(S,el);
  c.save();c.scale(k,k);c.translate(pb.x,pb.y);c.scale(pb.s,pb.s);k*=pb.s;if(el.rot){var ccx=x0+el.w/2,ccy=y0+el.h/2;c.translate(ccx,ccy);c.rotate(el.rot*Math.PI/180);c.translate(-ccx,-ccy)}c.textAlign='center';c.textBaseline='alphabetic';
  c.font=(mq?700:(D.FONT_W[el.font]||600))+' '+px+'px '+(mq?D.FONTS.sans:D.FONTS[el.font]);
  var ls=(el.style==='neon'&&!D.FONT_SCRIPT[el.font])||mq;
  try{if('letterSpacing' in c)c.letterSpacing=ls?(px*(mq?.08:.06))+'px':'0px'}catch(e){}
  lines.forEach(function(l,i){var ty=y0+lh*(i+.78);
    if(mq){c.fillStyle=SC.dark(col,.35);c.fillText(l,cx+px*.04,ty+px*.04);c.fillStyle=col;c.fillText(l,cx,ty);c.save();c.setLineDash([0,px*.115]);c.lineCap='round';c.lineWidth=px*.05;c.strokeStyle='#FFF1C4';c.shadowColor='#FFE3A0';c.shadowBlur=18*k;c.strokeText(l,cx,ty);c.restore()}
    else if(el.style==='neon'){c.shadowColor=col;c.shadowBlur=34*k;c.fillStyle=SC.lite(col,SC.lum(col)>.6?.6:.2);c.fillText(l,cx,ty);c.shadowBlur=14*k;c.fillText(l,cx,ty)}
    else if(el.style==='gold'){var g=c.createLinearGradient(x0,y0,x0+el.w,y0+el.h);g.addColorStop(0,'#F0DDA0');g.addColorStop(.5,'#C9A857');g.addColorStop(1,'#9C7B34');
      c.shadowColor='rgba(27,20,8,.35)';c.shadowBlur=18*k;c.shadowOffsetX=10*k;c.shadowOffsetY=8*k;c.fillStyle=g;c.fillText(l,cx,ty)}
    else{c.fillStyle=col;c.fillText(l,cx,ty)}
  });
  c.restore();
};
IO.sceneCanvas = function(px,opt){
  opt=opt||{};
  var used=SC.usedImgs(S),idefs=SC.imgDefs(used);
  var key=px+'|'+JSON.stringify([S.els,S.palette,S.room,S.floor,S.balloons,opt.dims?S.show:0,used.map(function(id){return IMG[id]?1:0})]);
  if(IO._sc&&IO._sc.key===key)return Promise.resolve(IO._sc.cv);
  // the picture ends a little below the nearest thing on the floor: no empty floor at the bottom
  var zm=E.zMap(S),zn=0;S.els.forEach(function(e){if(!e.hide)zn=Math.max(zn,zm[e.id]||0)});
  var W=S.room.w,H=Math.round(Math.min(S.room.h+SC.FLOOR,Math.max(SC.floorY(S,Math.min(SC.ZMAX,zn+400))+80,S.room.h+300))),k=px/W,cv=document.createElement('canvas');cv.width=px;cv.height=Math.round(H*k);
  var c=cv.getContext('2d'),n=S.els.length,runs=[],i=0,first=true,ord=SC.order(S);   // runs follow the drawing order: far to near
  while(first||i<n){var j=i;while(j<n&&S.els[ord[j]].type!=='text')j++;
    if(first||j>i)runs.push({svg:[i,j,first]});
    if(j<n){var tj=S.els[ord[j]];if(!tj.hide){if(tj.stand)runs.push({svg:[j,j+1,false],base:true});runs.push({text:tj})}j++}
    first=false;i=j}
  var showDims=!!opt.dims&&S.show.dims;if(showDims)runs.push({svg:[n,n,false],dims:true});
  var uidn=0,chain=IO.fonts();
  runs.forEach(function(r){chain=chain.then(function(){
    if(r.text){IO.drawText(c,r.text,k);return}
    var svg='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="'+cv.width+'" height="'+cv.height+'" viewBox="0 0 '+W+' '+H+'">'+(idefs?'<defs>'+idefs+'</defs>':'')+SC.render(S,R,{uid:'x'+(uidn++),from:r.svg[0],to:r.svg[1],noRoom:!r.svg[2],dims:!!r.dims,grid:!!opt.dims&&S.show.grid,base:!!r.base})+'</svg>';
    return IO.svgImage(svg).then(function(im){c.drawImage(im,0,0,cv.width,cv.height)})})});
  return chain.then(function(){IO._sc={key:key,cv:cv};return cv});
};
IO.canvasBlob = function(cv,type,q){return new Promise(function(res,rej){try{cv.toBlob(function(b){b?res(b):rej(new Error('blob'))},type||'image/png',q)}catch(e){rej(e)}})};
IO.exportScene = function(){
  toast('Готовлю картинку…');
  return IO.sceneCanvas(2600,{dims:true}).then(function(cv){return IO.canvasBlob(cv)}).then(function(b){return IO.save(IO.fname('png'),b,'img')}).catch(function(){toast('Не получилось собрать картинку в этом браузере.')});
};

/* ---------- the client offer, one A4 page drawn on a canvas (1240 x 1754 at scale 1) ---------- */
IO.wrap = function(c,text,maxW){var out=[];String(text).split('\n').forEach(function(par){var words=par.split(/\s+/),line='';
  words.forEach(function(w){var t=line?line+' '+w:w;if(c.measureText(t).width>maxW&&line){out.push(line);line=w}else line=t});out.push(line)});return out};
IO.drawOffer = function(cv,scale){
  if(!cv)return Promise.resolve();
  var tok=++IO._ot,o=V.offer(),k=scale||1,W=1240,Hh=1754,mx=84,cw=W-2*mx;
  return IO.sceneCanvas(2144).then(function(sc){
    if(tok!==IO._ot)return cv;
    if(cv.width!==W*k||cv.height!==Hh*k){cv.width=W*k;cv.height=Hh*k}
    var c=cv.getContext('2d');c.setTransform(k,0,0,k,0,0);
    var disp="'Cormorant Garamond', Georgia, serif",body="'Onest', Arial, sans-serif",ink='#1E2420',mu='#69685E',brass='#8F6D1F',em='#1F4D3F';
    function sp(v){try{if('letterSpacing' in c)c.letterSpacing=v}catch(e){}}
    function eyebrow(t,x,y,al){c.font='600 15px '+body;c.fillStyle=brass;c.textAlign=al||'left';sp('2px');c.fillText(t.toUpperCase(),x,y);sp('0px')}
    c.fillStyle='#fff';c.fillRect(0,0,W,Hh);c.textBaseline='alphabetic';
    c.font='600 52px '+disp;c.fillStyle=em;c.textAlign='left';c.fillText(o.brand,mx,128);
    eyebrow('Коммерческое предложение',W-mx,106,'right');c.font='400 18px '+body;c.fillStyle=mu;c.textAlign='right';c.fillText('от '+o.today,W-mx,132);
    c.fillStyle='#DDD3BF';c.fillRect(mx,150,cw,1);
    // scene
    var ih=Math.min(600,cw*sc.height/sc.width),iw=ih*sc.width/sc.height,ix=mx+(cw-iw)/2,iy=174,rr=14;
    c.save();c.beginPath();c.moveTo(ix+rr,iy);c.arcTo(ix+iw,iy,ix+iw,iy+ih,rr);c.arcTo(ix+iw,iy+ih,ix,iy+ih,rr);c.arcTo(ix,iy+ih,ix,iy,rr);c.arcTo(ix,iy,ix+iw,iy,rr);c.closePath();c.clip();c.drawImage(sc,ix,iy,iw,ih);c.restore();
    var y=iy+ih+62;
    c.font='600 46px '+disp;c.fillStyle=ink;c.textAlign='left';var tl=IO.wrap(c,o.title,cw).slice(0,2);tl.forEach(function(l){c.fillText(l,mx,y);y+=50});
    c.font='500 21px '+body;c.fillStyle=brass;c.fillText(o.sub,mx,y-10);y+=46;
    // columns
    var lx=mx,lw=440,rx=mx+490,rw=cw-490,yl=y,yr=y;
    function rows(list,x,w,y0,bullet){c.font='400 21px '+body;c.fillStyle=ink;c.textAlign='left';list.forEach(function(t){var ls=IO.wrap(c,t,w-(bullet?24:0));ls.forEach(function(l,i){if(bullet&&i===0){c.fillStyle=em;c.beginPath();c.arc(x+6,y0-7,4,0,6.3);c.fill();c.fillStyle=ink}c.fillText(l,x+(bullet?24:0),y0);y0+=30});y0+=7});return y0}
    var who=[];if(o.who)who.push('Для: '+o.who);if(o.date)who.push('Дата: '+o.date);if(o.place)who.push('Место: '+o.place);
    if(who.length){eyebrow('Мероприятие',lx,yl);yl=rows(who,lx,lw,yl+34)+18}
    eyebrow('Что нужно на площадке',lx,yl);yl=rows(o.site,lx,lw,yl+34,true);
    eyebrow('Что входит',rx,yr);var incl=o.incl.length>9?o.incl.slice(0,8).concat(['и другое по эскизу']):o.incl;yr=rows(incl,rx,rw,yr+34,true);
    // price block
    var by=Math.min(Math.max(Math.max(yl,yr)+20,1300),1400),bh=176;
    c.fillStyle='#F5F0E6';c.beginPath();c.moveTo(mx+rr,by);c.arcTo(mx+cw,by,mx+cw,by+bh,rr);c.arcTo(mx+cw,by+bh,mx,by+bh,rr);c.arcTo(mx,by+bh,mx,by,rr);c.arcTo(mx,by,mx+cw,by,rr);c.closePath();c.fill();
    eyebrow('Стоимость',mx+30,by+42);
    c.font='600 78px '+disp;c.fillStyle=ink;c.textAlign='left';c.fillText(U.n(o.price,o.price%1?2:0).replace(/\u00a0/g,' ')+' €',mx+30,by+116);
    c.font='400 17px '+body;c.fillStyle=mu;c.fillText(o.vatNote,mx+30,by+150);
    c.textAlign='right';c.font='400 21px '+body;c.fillStyle=ink;var ty=by+70;
    if(o.depositPct){c.fillText('Предоплата '+o.depositPct+' %: '+U.n(o.deposit,2).replace(/\u00a0/g,' ')+' €',mx+cw-30,ty);ty+=36}
    c.fillText('Предложение действует до '+o.until,mx+cw-30,ty);
    // note and contacts
    var ny=by+bh+40;c.textAlign='left';c.font='400 18px '+body;c.fillStyle=mu;
    if(o.note)IO.wrap(c,o.note,cw).slice(0,3).forEach(function(l){if(ny<Hh-126){c.fillText(l,mx,ny);ny+=26}});
    c.fillStyle='#DDD3BF';c.fillRect(mx,Hh-112,cw,1);
    c.font='400 18px '+body;c.fillStyle=ink;var cl=o.contacts?IO.wrap(c,o.contacts,cw).slice(0,2):[o.brand];cl.forEach(function(l,i){c.fillText(l,mx,Hh-80+i*25)});
    return cv;
  }).catch(function(){var c=cv.getContext('2d');c.setTransform(1,0,0,1,0,0);c.fillStyle='#fff';c.fillRect(0,0,cv.width,cv.height);c.fillStyle='#69685E';c.font='28px sans-serif';c.textAlign='center';c.fillText('Предпросмотр недоступен в этом браузере',cv.width/2,200);return cv});
};
IO.offerCanvas = function(scale){var cv=document.createElement('canvas');cv.width=1240*scale;cv.height=1754*scale;return IO.drawOffer(cv,scale)};
IO.exportOfferPng = function(){toast('Готовлю предложение…');return IO.offerCanvas(2).then(function(cv){return IO.canvasBlob(cv)}).then(function(b){return IO.save(IO.fname('png','Предложение'),b,'img')}).catch(function(){toast('Не получилось собрать картинку.')})};
IO.script = function(url){if(!IO._scripts[url])IO._scripts[url]=new Promise(function(res,rej){var s=document.createElement('script');s.src=url;s.onload=res;s.onerror=function(){delete IO._scripts[url];rej(new Error('script'))};document.head.appendChild(s)});return IO._scripts[url]};
IO.exportOfferPdf = function(){
  toast('Готовлю PDF…');
  return IO.script('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js').then(function(){return IO.offerCanvas(2)}).then(function(cv){
    var doc=new window.jspdf.jsPDF({unit:'mm',format:'a4',compress:true});doc.addImage(cv.toDataURL('image/jpeg',.93),'JPEG',0,0,210,297);
    return IO.save(IO.fname('pdf','Предложение'),doc.output('blob'),'bin')}).catch(function(){toast('PDF собрать не удалось. Сохраните предложение картинкой PNG.')});
};

/* ---------- estimate as CSV (semicolon, decimal comma: opens correctly in Excel with German or Russian locale) ---------- */
IO.csv = function(){
  var q=function(v){v=String(v==null?'':v).replace(/\u00a0/g,' ');return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v},num=function(v){return String(Math.round(v*100)/100).replace('.',',')};
  var L=[['Группа','Позиция','Описание','Кол-во','Ед.','Цена, EUR','Сумма, EUR'].join(';')];
  R.bom.forEach(function(g){g.rows.forEach(function(r){L.push([q(g.name),q(r.name),q(r.spec),num(r.qty),q(r.unit),num(r.price),num(r.sum)].join(';'))});L.push([q(g.name),'Итого по группе','','','','',num(g.sum)].join(';'))});
  L.push(['','Конструкция','','','','',num(R.cost.constr)].join(';'));L.push(['','Шары и гирлянда','','','','',num(R.cost.bal)].join(';'));L.push(['','Набор декора','','','','',num(R.cost.kit)].join(';'));L.push(['','ИТОГО','','','','',num(R.cost.all)].join(';'));
  return '\ufeff'+L.join('\r\n');
};
IO.exportCsv = function(){return IO.save(IO.fname('csv','Смета'),IO.csv(),'text')};
IO.projectJson = function(){var o=JSON.parse(JSON.stringify(S)),im={};SC.usedImgs(S).forEach(function(id){if(IMG[id])im[id]=IMG[id]});if(Object.keys(im).length)o.images=im;return JSON.stringify(o,null,1)};
IO.exportJson = function(){return IO.save(IO.fname('json'),IO.projectJson(),'text')};

/* ---------- cloud projects: one document per project, shared with everyone who can use this page ---------- */
IO.dbErr = function(e){var c=e&&e.code;toast(c==='quota_exceeded'?'Хранилище заполнено: удалите старые проекты.':c==='invalid_argument'?'Нет прав на запись в хранилище этой страницы.':'Облачное хранилище сейчас недоступно.')};
IO.listProjects = function(){
  if(!IO.db)return Promise.resolve(null);
  return IO.db.collection('projects').get().then(function(q){return q.docs.map(function(d){var x=d.data()||{};return {id:d.id,name:String(x.name||'Без названия'),updated:String(x.updated||''),n:+x.n||0,json:x.json}}).sort(function(a,b){return a.updated<b.updated?1:-1})},function(e){IO.dbErr(e);return null});
};
IO.saveProject = function(){
  if(!IO.db)return Promise.resolve(false);
  if(!S.pid)S.pid='p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  // pictures first, one document each and only once per session, then the project itself
  var chain=Promise.resolve();
  SC.usedImgs(S).forEach(function(id){var im=IMG[id];if(!im||IO._cloud[id])return;chain=chain.then(function(){return IO.db.collection('images').doc(id).set({src:im.src,w:im.w,h:im.h}).then(function(){IO._cloud[id]=1})})});
  return chain.then(function(){return IO.db.collection('projects').doc(S.pid).set({name:S.name,updated:new Date().toISOString(),n:S.els.length,json:JSON.stringify(S)})}).then(function(){toast('Проект «'+S.name+'» сохранён');return true},function(e){IO.dbErr(e);return false});
};
IO.fetchCloudImgs = function(ids){
  var need=ids.filter(function(id){return !IMG[id]});if(!IO.db||!need.length)return Promise.resolve(0);
  return Promise.all(need.map(function(id){return IO.db.collection('images').doc(id).get().then(function(d){var x=d.exists&&d.data();if(x&&/^data:image\//.test(x.src)&&+x.w>0&&+x.h>0){IMG[id]={src:String(x.src),w:+x.w,h:+x.h};IO._cloud[id]=1;IO.saveImg(id);return 1}return 0},function(){return 0})})).then(function(r){return r.reduce(function(a,b){return a+b},0)});
};
/* descriptions of photos prepared in the chat with Claude: collection "analyses", one document per photo {name,note,created,n,json} */
IO.listAnalyses = function(){
  if(!IO.db)return Promise.resolve(null);
  return IO.db.collection('analyses').get().then(function(q){return q.docs.map(function(d){var x=d.data()||{};return {id:d.id,name:String(x.name||'Разбор фото').slice(0,80),note:String(x.note||'').slice(0,140),created:String(x.created||''),n:+x.n||0,ar:+x.ar||0,json:x.json}}).sort(function(a,b){return a.created<b.created?1:-1})},function(){return null});
};
IO.deleteAnalysis = function(id){return IO.db?IO.db.collection('analyses').doc(id)['delete']().then(function(){return true},function(e){IO.dbErr(e);return false}):Promise.resolve(false)};
/* ---------- my library: templates (elements or a whole scene) and figures, kept in this browser and, when the page can, in its cloud storage ---------- */
IO.LKEY = 'fotozona.lib.v1';
IO.lib = [];
IO.libOk = function(x){return x&&typeof x.id==='string'&&/^[a-z0-9_-]{2,40}$/i.test(x.id)&&(x.kind==='tpl'||x.kind==='scene'||x.kind==='pic')&&Array.isArray(x.imgs)&&x.imgs.every(function(i){return typeof i==='string'&&/^[a-z0-9]{3,24}$/i.test(i)})};
IO.libClean = function(x){return {id:x.id,kind:x.kind,name:String(x.name||'Без названия').slice(0,60),created:String(x.created||''),n:+x.n||0,json:typeof x.json==='string'?x.json.slice(0,240000):'',imgs:x.imgs.slice(0,40)}};
IO.libRead = function(){try{var a=JSON.parse(window.localStorage.getItem(IO.LKEY));return Array.isArray(a)?a.filter(IO.libOk).map(IO.libClean):[]}catch(e){return []}};
IO.libWrite = function(){try{window.localStorage.setItem(IO.LKEY,JSON.stringify(IO.lib));return true}catch(e){return false}};
IO.libImgs = function(){var u=[];IO.lib.forEach(function(it){it.imgs.forEach(function(id){if(u.indexOf(id)<0)u.push(id)})});return u};
IO.libInit = function(){IO.lib=IO.libRead();IO.loadImgs(IO.libImgs())};
IO.libSync = function(){
  if(!IO.db)return Promise.resolve(false);
  return IO.db.collection('lib').get().then(function(q){var have={},add=0;IO.lib.forEach(function(it){have[it.id]=1});
    q.docs.forEach(function(d){var x=d.data()||{};x.id=d.id;if(!have[d.id]&&IO.libOk(x)){IO.lib.push(IO.libClean(x));add++}});
    if(add){IO.lib.sort(function(a,b){return a.created<b.created?1:-1});IO.libWrite()}return add>0},function(){return false});
};
IO.libAdd = function(it){
  it=IO.libClean(it);IO.lib.unshift(it);var ok=IO.libWrite();
  if(IO.db){var ch=Promise.resolve();it.imgs.forEach(function(id){var im=IMG[id];if(im&&!IO._cloud[id])ch=ch.then(function(){return IO.db.collection('images').doc(id).set({src:im.src,w:im.w,h:im.h}).then(function(){IO._cloud[id]=1})})});
    ch.then(function(){return IO.db.collection('lib').doc(it.id).set(it)}).then(null,function(){});ok=true}
  return ok;
};
IO.libDel = function(id){IO.lib=IO.lib.filter(function(x){return x.id!==id});IO.libWrite();if(IO.db)IO.db.collection('lib').doc(id)['delete']().then(null,function(){})};
IO.deleteProject = function(id){return IO.db?IO.db.collection('projects').doc(id)['delete']().then(function(){return true},function(e){IO.dbErr(e);return false}):Promise.resolve(false)};
/* ---------- moving everything between the claude.ai version and the stand-alone site: one transfer file ----------
   It carries the saved projects, «Мои шаблоны», photo analyses, every picture they use, and the scene now open. */
IO.TRANSFER = 'konfetti-deco-transfer';
IO.exportAll = function(){
  var B={kind:IO.TRANSFER,v:1,created:new Date().toISOString(),from:window.SITE?'site':'claude.ai',projects:[],lib:IO.lib.slice(),analyses:[],images:{},current:JSON.parse(JSON.stringify(S))};
  var get=function(c){return IO.db?IO.db.collection(c).get().then(function(q){return q.docs.map(function(d){var x=d.data()||{};x.id=d.id;return x})},function(){return []}):Promise.resolve([])};
  toast('Собираю данные для переноса…');
  return Promise.all([get('projects'),get('lib'),get('analyses')]).then(function(r){
    B.projects=r[0].filter(function(p){return typeof p.json==='string'}).map(function(p){return {id:p.id,name:String(p.name||'Без названия'),updated:String(p.updated||''),n:+p.n||0,json:p.json}});
    var have={};B.lib.forEach(function(x){have[x.id]=1});r[1].forEach(function(x){if(!have[x.id]&&IO.libOk(x))B.lib.push(IO.libClean(x))});
    B.analyses=r[2];
    var ids=SC.usedImgs(S).concat(IO.libImgs());B.lib.forEach(function(x){x.imgs.forEach(function(i){ids.push(i)})});
    B.projects.concat(B.analyses).forEach(function(p){try{var o=JSON.parse(p.json);if(o&&o.els)SC.usedImgs(o).forEach(function(i){ids.push(i)})}catch(e){}if(p.ph)ids.push(p.ph)});
    ids=ids.filter(function(id,i){return id&&ids.indexOf(id)===i});
    return IO.fetchCloudImgs(ids).then(function(){ids.forEach(function(id){if(IMG[id])B.images[id]=IMG[id]})});
  }).then(function(){var n=Object.keys(B.images).length;
    return IO.save('Konfetti Deco — перенос '+B.created.slice(0,10)+'.json',JSON.stringify(B),'text').then(function(ok){if(ok!==false)toast('Файл переноса: проектов '+B.projects.length+', шаблонов '+B.lib.length+', картинок '+n+'.');return B})});
};
/* loads a transfer file: pictures and templates into this browser, and — when the page has a shared store (claude.ai, or a room on the site) — projects, templates and analyses into it */
IO.importAll = function(B){
  if(!B||B.kind!==IO.TRANSFER)return Promise.reject(new Error('not a transfer file'));
  var cnt={projects:0,lib:0,images:0,analyses:0,skipped:0},imgs=B.images&&typeof B.images==='object'?B.images:{};
  Object.keys(imgs).forEach(function(id){var im=imgs[id];if(/^[a-z0-9]{3,24}$/i.test(id)&&im&&/^data:image\//.test(im.src)&&+im.w>0&&+im.h>0){IMG[id]={src:String(im.src),w:+im.w,h:+im.h};IO.saveImg(id);cnt.images++}});
  var have={};IO.lib.forEach(function(x){have[x.id]=1});
  (Array.isArray(B.lib)?B.lib:[]).forEach(function(x){if(IO.libOk(x)&&!have[x.id]){IO.lib.push(IO.libClean(x));cnt.lib++}});
  IO.lib.sort(function(a,b){return a.created<b.created?1:-1});IO.libWrite();
  if(!IO.db)return Promise.resolve(cnt);
  var ch=Promise.resolve(),put=function(c,id,d){ch=ch.then(function(){return IO.db.collection(c).doc(id).set(d)})};
  Object.keys(imgs).forEach(function(id){if(IMG[id]){put('images',id,{src:IMG[id].src,w:IMG[id].w,h:IMG[id].h});IO._cloud[id]=1}});
  (Array.isArray(B.projects)?B.projects:[]).forEach(function(p){if(p&&/^[a-z0-9_-]{2,40}$/i.test(p.id)&&typeof p.json==='string'){put('projects',p.id,{name:String(p.name||'Без названия').slice(0,80),updated:String(p.updated||''),n:+p.n||0,json:p.json});cnt.projects++}else cnt.skipped++});
  IO.lib.forEach(function(x){put('lib',x.id,x)});
  (Array.isArray(B.analyses)?B.analyses:[]).forEach(function(a){if(a&&/^[a-z0-9_-]{2,40}$/i.test(a.id)){var d={};for(var k in a)if(k!=='id')d[k]=a[k];put('analyses',a.id,d);cnt.analyses++}});
  return ch.then(function(){return cnt});
};
