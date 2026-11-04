/* ===== site.js — only in the stand-alone site (GitHub Pages, like LA CHEF). It stands in for the claude.ai runtime:
   files are saved by the browser itself, projects are kept in this browser and, with a room code, synchronised between
   tablets through the same Firebase Realtime Database that LA CHEF uses (path rooms/<code>/loulou). The room code is the
   only key, so it is long and random. «По фото» needs Claude and stays in the claude.ai version. ===== */
var SITE = {fb:'https://la-chef-bbb7e-default-rtdb.europe-west1.firebasedatabase.app', key:'loulou.sync.v1', last:null};
document.documentElement.classList.add('site');
SITE.code = function(){try{return String(localStorage.getItem(SITE.key)||'').trim()}catch(e){return ''}};
SITE.url = function(path){return SITE.fb+'/rooms/'+encodeURIComponent(SITE.code())+'/loulou/'+path+'.json'};
SITE.req = function(method,path,body){
  return fetch(SITE.url(path),{method:method,headers:body!==undefined?{'Content-Type':'application/json'}:{},body:body!==undefined?JSON.stringify(body):undefined})
    .then(function(r){if(!r.ok){var e=new Error('HTTP '+r.status);e.code=r.status===401||r.status===403?'denied':'unavailable';SITE.last=e;throw e}SITE.last=null;return r.json()},
      function(err){var e=new Error('offline');e.code='offline';SITE.last=e;throw e})};
/* every document is stored as one JSON string: the database itself drops empty lists and turns lists into numbered keys */
SITE.pack = function(d){return {j:JSON.stringify(d)}};
SITE.unpack = function(o){if(!o)return null;if(typeof o.j==='string'){try{return JSON.parse(o.j)}catch(e){return null}}return o};
SITE.db = {collection:function(c){return {
  get:function(){return SITE.req('GET',c).then(function(o){o=o||{};return {docs:Object.keys(o).map(function(k){var v=SITE.unpack(o[k]);return {id:k,data:function(){return v}}}).filter(function(d){return d.data()})}})},
  doc:function(id){return {
    set:function(d){return SITE.req('PUT',c+'/'+id,SITE.pack(d)).then(function(){})},
    get:function(){return SITE.req('GET',c+'/'+id).then(function(o){var v=SITE.unpack(o);return {exists:!!v,data:function(){return v}}})},
    'delete':function(){return SITE.req('DELETE',c+'/'+id).then(function(){})}}}}}};
/* files: the browser saves them itself */
SITE.dl = {save:function(o){var b=o.data instanceof Blob?o.data:new Blob([o.data],{type:/\.csv$/i.test(o.filename)?'text/csv;charset=utf-8':'application/json;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');
  a.href=u;a.download=o.filename;a.rel='noopener';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(u);a.remove()},4000);return Promise.resolve()}};
window.claude = {use:function(n){return Promise.resolve(n==='db'?(SITE.code()?SITE.db:null):n==='downloads'?SITE.dl:null)}};
SITE.newCode = function(){var ch='abcdefghjkmnpqrstuvwxyz23456789',s='',r=new Uint32Array(12);try{crypto.getRandomValues(r)}catch(e){for(var i=0;i<12;i++)r[i]=Math.floor(Math.random()*1e9)}for(var j=0;j<12;j++)s+=ch[r[j]%ch.length];return s};
SITE.connect = function(code){code=String(code||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
  try{if(code)localStorage.setItem(SITE.key,code);else localStorage.removeItem(SITE.key)}catch(e){}
  IO.db=code?SITE.db:null;IO._cloud={};IO._libSynced=0;UI.projects=null;renderModal();
  if(!code)return Promise.resolve(true);
  return IO.listProjects().then(function(l){UI.projects=l||[];if(IO.db){IO._libSynced=1;return IO.libSync().then(function(ch){if(ch){IO.loadImgs(IO.libImgs());render()}})}}).then(function(){renderModal();if(SITE.last)SITE.err()},function(){renderModal();SITE.err()})};
SITE.err = function(){var c=SITE.last&&SITE.last.code;toast(c==='denied'?'База Firebase не пустила: в её правилах нужно разрешить путь rooms/…/loulou (см. README).':c==='offline'?'Нет связи с базой: проверьте интернет. Работа продолжается в этом браузере.':'База не ответила, попробуйте ещё раз.')};
/* the block in «Проекты и шаблоны» */
SITE.block = function(){var c=SITE.code();
  if(!c)return '<p class="muted small">Проекты хранятся в этом браузере и файлами. Чтобы видеть одни и те же проекты на двух планшетах, подключите их к одной «комнате»: на первом нажмите «Создать код», на втором введите этот код.</p>'+
    '<div class="row"><input type="text" id="sync-code" class="synccode" placeholder="код комнаты" autocomplete="off" spellcheck="false" aria-label="Код комнаты"><button type="button" class="btn" data-act="sync-join">Подключить</button><button type="button" class="btn pri" data-act="sync-new">Создать код</button></div>';
  return '<p class="small">Синхронизация включена · комната <b class="mono">'+U.esc(c)+'</b> <button type="button" class="btn sm" data-act="sync-copy">Копировать код</button> <button type="button" class="btn sm" data-act="sync-off">Отключить</button></p>'};
document.addEventListener('click',function(ev){var a=ev.target.closest&&ev.target.closest('[data-act^="sync-"]');if(!a)return;var k=a.dataset.act;
  if(k==='sync-new')SITE.connect(SITE.newCode()).then(function(){if(!SITE.last)toast('Комната создана. Введите этот код на втором планшете: '+SITE.code())});
  else if(k==='sync-join'){var v=(document.getElementById('sync-code')||{}).value||'';if(String(v).replace(/[^a-z0-9]/gi,'').length<6){toast('Код комнаты — не меньше 6 знаков.');return}SITE.connect(v)}
  else if(k==='sync-off'){SITE.connect('');toast('Синхронизация выключена. Проекты остаются в базе, их видно снова после подключения к той же комнате.')}
  else if(k==='sync-copy'){var t=SITE.code();try{navigator.clipboard.writeText(t).then(function(){toast('Код скопирован: '+t)},function(){toast('Код: '+t)})}catch(e){toast('Код: '+t)}}});
/* works offline and installs on the home screen with its own icon */
if('serviceWorker' in navigator&&location.protocol!=='file:')window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})});
