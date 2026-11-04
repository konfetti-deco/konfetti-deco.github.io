/* ===== views.js — every tab is a skeleton with [data-sec] slots and one render function per slot.
   Reads the globals S (scene), R (calculation), UI (view state). Returns HTML strings only. ===== */
var V = {};
V.TABS = [['con','Конструктор'],['frame','Каркас и чертежи'],['sup','Упоры и крепления'],['bom','Материалы и смета'],['ovl','Накладки и фоны'],['asm','Сборка'],['eco','Экономика'],['client','Для клиента']];
V.sel = function(){return UI.sel?M.find(S,UI.sel):null};
V.multi = function(){return (UI.multi||[]).map(function(id){return M.find(S,id)}).filter(Boolean)};
V.mod = function(id){for(var i=0;i<R.mods.length;i++)if(R.mods[i].id===id)return R.mods[i];return null};
V.curMod = function(){return V.mod(UI.mod)||V.mod(UI.sel)||(function(){var mm=M.main(S);return mm?V.mod(mm.id):null})()||R.mods[0]||null};
V.elName = function(el){
  if(E.isBg(el)){var m=V.mod(el.id);return (m?m.label+' · ':'')+(el.name||D.TYPE_NAME[el.type])}
  if(el.type==='text')return D.STYLE_NAME[el.style]+(el.stand?' на подставке':'')+' «'+String(el.text).replace(/\n/g,' ')+'»';
  if(el.type==='garland')return 'Гирлянда · '+D.GSHAPE_NAME[el.shape].toLowerCase();
  if(el.type==='person'){var pd=D.PERSON[el.kind]||D.PERSON.man;return pd.name+' · '+Math.round(pd.h/10)+' см'}
  if(el.type==='sym'||el.type==='prop')return D.KIND_NAME[el.kind]+(el.kind==='digit'?' «'+el.text+'»':'');
  if(el.type==='balloon')return 'Шар '+el.size+'″ · '+D.FIN_NAME[el.fin].toLowerCase();
  if(el.type==='pic')return el.name||'Картинка';
  if(el.type==='foil')return 'Фольга · '+D.FOIL_NAME[el.kind]+(el.text&&(el.kind==='digit'||el.kind==='letter')?' «'+el.text+'»':'')+' '+el.size+'″';
  if(el.type==='flora')return (el.kind==='greens'?'Зелень':'Цветы')+' · '+(el.shape==='pile'?'букет':D.GSHAPE_NAME[el.shape].toLowerCase());
  if(el.type==='drape'){if(el.kind==='tie'&&E.validPts(el.pts))return D.DRAPE_NAME.tie+(el.pts[1][0]>el.pts[0][0]?' справа':' слева');return D.DRAPE_NAME[el.kind]}
  if(el.type==='neon')return 'Неон · '+(el.kind==='ring'&&(+el.arc||360)<360?'дуга':D.NEON_KIND[el.kind].toLowerCase());
  return D.TYPE_NAME[el.type];
};
V.modChips = function(){var cur=V.curMod();return '<div class="chips" style="margin-bottom:12px">'+R.mods.map(function(m){return '<button type="button" class="chip" data-set="u.mod" data-val="'+m.id+'" aria-pressed="'+(cur===m)+'"><i class="dot" style="background:'+m.color+';margin:0"></i>'+m.label+' · '+U.esc(m.name)+'</button>'}).join('')+'</div>'};
V.empty = function(t){return U.card('',t,'<p class="muted">На сцене пока нет фонов. Добавьте арку, панель или круг во вкладке «Конструктор» — здесь появятся чертежи и расчёт.</p><button type="button" class="btn pri" data-act="tab" data-id="con">Открыть конструктор</button>')};

/* =================================== 1. constructor =================================== */
V.con = {skel:'<div class="con"><div class="con-l"><div data-sec="stage"></div></div><div class="con-r"><div data-sec="insp"></div><div data-sec="layers"></div><div data-sec="checks"></div><div data-sec="pal"></div><div data-sec="scene"></div></div></div>',secs:{}};
/* The scene is a stack of layers: the room, then one small <svg> per element, then overlays. An edit touches only
   the layer of the element that changed; the rest of the picture is never redrawn, so nothing flickers.
   The frame and its handles are ordinary HTML on top: created once and only moved, so a finger that is holding
   one never loses it to a re-render. */
V.con.secs.stage = function(){var vb=SC.viewBox(S);return '<div class="stagebox"><div class="stagewrap" id="stagewrap"><div class="zoomer" id="zoomer"><svg id="stage" xmlns="http://www.w3.org/2000/svg" viewBox="'+vb+'" role="img" aria-label="Сцена фотозоны"><g id="room"></g><g id="shadows"></g></svg>'+
  '<svg id="scdefs" width="0" height="0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs id="scd"></defs></svg><div id="scn"></div><svg id="scover" viewBox="'+vb+'" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"></svg><div id="guides" aria-hidden="true"></div>'+
  '<div id="ov" class="ov" hidden><span id="ovn"></span><span class="rh" data-h="rot" title="Повернуть"></span><span class="hd w" data-h="w"></span><span class="hd e" data-h="e"></span><span class="hd n" data-h="n"></span><span class="hd ne" data-h="ne"></span></div></div>'+
  '<div class="stage-tools"><button type="button" class="gbtn" data-act="undo" title="Отменить" aria-label="Отменить">'+U.ico.undo+'</button><button type="button" class="gbtn" data-act="redo" title="Вернуть" aria-label="Вернуть">'+U.ico.redo+'</button></div>'+
  '<div class="stage-tools r"><button type="button" class="gbtn" id="refbtn" data-act="ref-toggle" title="Показать или скрыть фото-образец" aria-label="Показать или скрыть фото-образец" hidden>'+U.ico.eye+'</button><button type="button" class="gbtn wide" data-act="photo" title="Собрать сцену по фото">'+U.ico.cam+'<span>По фото</span></button></div>'+
  '<div class="stage-tools b"><button type="button" class="gbtn" id="multibtn" data-act="multi" aria-pressed="false" title="Выбрать несколько" aria-label="Выбрать несколько элементов">'+U.ico.multi+'</button></div>'+
  '<div class="stage-tools m" role="group" aria-label="Как двигать"><button type="button" class="gbtn wide mv" data-act="mv" data-id="wall" aria-pressed="true" title="Тянуть вбок и вверх-вниз"><span class="mvi">↔↕</span><span>По стене</span></button><button type="button" class="gbtn wide mv" data-act="mv" data-id="floor" aria-pressed="false" title="Тянуть вбок и вглубь"><span class="mvi">↔⤢</span><span>По полу</span></button></div>'+
  '<div id="dragtip" class="dragtip" hidden aria-live="polite"></div>'+
  '<div class="stage-tools b r"><button type="button" class="gbtn" data-act="zoom-out" title="Уменьшить" aria-label="Уменьшить">−</button><button type="button" class="gbtn wide zl" id="zoomlbl" data-act="zoom-fit" title="Показать всю сцену">100 %</button><button type="button" class="gbtn" data-act="zoom-in" title="Увеличить" aria-label="Увеличить">+</button></div>'+
  '</div><div class="selbar" id="selbar"></div></div>'};
V.selbar = function(){
  var ms=V.multi();
  if(ms.length>1)return '<span class="nm">Выбрано: '+ms.length+'<small>тяните рамку, чтобы двигать вместе; касание добавляет или убирает</small></span>'+
    '<button type="button" class="btn ic" data-act="lib-open" title="Сохранить в мои шаблоны" aria-label="Сохранить в мои шаблоны">'+U.ico.star+'</button>'+
    '<button type="button" class="btn ic" data-act="gdup" title="Дублировать" aria-label="Дублировать">'+U.ico.copy+'</button>'+
    '<button type="button" class="btn ic dng" data-act="gdel" title="Удалить выбранные" aria-label="Удалить выбранные">'+U.ico.del+'</button>';
  var el=V.sel();
  if(!el)return '<span class="hint">'+(S.els.length?'Коснитесь элемента, чтобы выбрать. Переключатель над сценой решает, куда он тянется: «По стене» — вбок и вверх-вниз, «По полу» — вбок и вглубь. Точные размеры и место — в свойствах элемента. Двумя пальцами сцену можно увеличить и сдвинуть.':'Сцена пустая. Добавьте фон из списка «Элементы» или откройте шаблон в меню «Проект».')+'</span>';
  var ord=SC.order(S),i=ord.indexOf(S.els.indexOf(el)),sub=E.isBg(el)||el.type==='garland'||el.type==='pic'||(el.type==='prop'&&D.FREE_H[el.kind])?U.n(el.w)+' × '+U.n(el.h)+' мм':(el.type==='text'?'буквы '+el.size+' мм':el.type==='balloon'?el.size+'″ · Ø '+el.w+' мм':'ширина '+U.n(el.w)+' мм');
  return '<span class="nm">'+U.esc(V.elName(el))+'<small>'+sub+(el.y>0?' · от пола '+U.n(el.y)+' мм':'')+' · от стены '+U.n(SC.zOf(S,el))+' мм</small></span>'+
    '<button type="button" class="btn ic" data-act="down" title="На слой назад" aria-label="На слой назад"'+(i<=0?' disabled':'')+'>'+U.ico.down+'</button>'+
    '<button type="button" class="btn ic" data-act="up" title="На слой вперёд" aria-label="На слой вперёд"'+(i>=S.els.length-1?' disabled':'')+'>'+U.ico.up+'</button>'+
    '<button type="button" class="btn ic" data-act="dup" title="Дублировать" aria-label="Дублировать">'+U.ico.copy+'</button>'+
    '<button type="button" class="btn ic" data-act="lib-open" title="Сохранить в мои шаблоны" aria-label="Сохранить в мои шаблоны">'+U.ico.star+'</button>'+
    '<button type="button" class="btn ic dng" data-act="del" title="Удалить" aria-label="Удалить">'+U.ico.del+'</button>';
};

/* ---------- colour: quick swatches plus exact CMYK ---------- */
V.kOf = function(bind){var p=bind.split('.'),root=p.shift(),h=root==='e'?V.sel():S;return (h&&h.k&&h.k[p.join('.')])||null};
V.CH = [['C','Голубой'],['M','Пурпурный'],['Y','Жёлтый'],['K','Чёрный']];
/* the colour wheel: hue runs round the circle, saturation grows from the centre to the rim, brightness has its own slider.
   While a colour is being edited its hue and saturation are remembered apart from the hex, so grey and black keep their place on the wheel. */
V.hsvOf = function(bind,hex){var u=UI.hsv;return (u&&u.bind===bind&&u.hex===hex)?[u.h,u.s,u.v]:E.hsv(hex)};
V.cmykPanel = function(bind,hex){
  hex=hex.toUpperCase();var k=V.kOf(bind)||E.cmyk(hex),q=V.hsvOf(bind,hex),id='c-'+bind.replace(/\./g,'-'),a=q[0]*Math.PI/180,r=q[1]/2;
  return '<div class="cmyk wheelp" data-cmyk="'+bind+'" data-h="'+q[0].toFixed(2)+'" data-s="'+q[1].toFixed(2)+'" data-v="'+q[2].toFixed(2)+'">'+
    '<div class="wh" data-wheel tabindex="0" role="group" aria-label="Цветовой круг: оттенок по кругу, насыщенность от центра к краю. Стрелки меняют оттенок и насыщенность." style="--v:'+(q[2]/100).toFixed(3)+'"><i class="whd"></i><i class="whl" style="width:'+r.toFixed(2)+'%;transform:rotate('+(-q[0]).toFixed(2)+'deg)"></i><i class="wht" style="left:'+(50+Math.cos(a)*r).toFixed(2)+'%;top:'+(50-Math.sin(a)*r).toFixed(2)+'%;background:'+hex+'"></i></div>'+
    '<div class="whside"><label class="whrow" for="'+id+'-v"><b>Яркость</b><input type="range" min="0" max="100" step="1" value="'+Math.round(q[2])+'" data-hv="1" id="'+id+'-v" style="--g0:#000000;--g1:'+E.hsvHex([q[0],q[1],100])+'"></label>'+
    '<div class="kn">'+V.CH.map(function(ch,i){return '<label><b>'+ch[0]+'</b><input type="number" min="0" max="100" step="1" inputmode="numeric" value="'+k[i]+'" data-chn="'+i+'" id="'+id+'-n'+i+'" aria-label="'+ch[1]+', процент"></label>'}).join('')+'</div>'+
    '<div class="hexrow"><label class="hex" for="'+id+'-hex"><span>HEX</span><input type="text" data-hex="'+bind+'" id="'+id+'-hex" value="'+hex+'" maxlength="7" spellcheck="false" autocomplete="off"></label><span class="muted small">CMYK можно ввести числами. На экране он показан приближённо, без профиля печати.</span></div></div></div>';
};
/* sw: [[bind, value, shown colour, title, pressed]] */
V.color = function(bind,label,hex,sw){
  hex=(hex||'#888888').toUpperCase();var open=UI.ced===bind,k=V.kOf(bind)||E.cmyk(hex);
  return '<div class="fld full ced"><span class="fl">'+label+'</span><div class="sws">'+(sw||[]).map(function(p){return '<button type="button" class="sw" style="--c:'+p[2]+'" data-set="'+p[0]+'" data-val="'+p[1]+'"'+(typeof p[1]==='number'?' data-n="1"':'')+' aria-pressed="'+!!p[4]+'" title="'+p[3]+'" aria-label="'+p[3]+'"></button>'}).join('')+
    '<button type="button" class="cmyk-btn" data-act="ced" data-id="'+bind+'" aria-expanded="'+open+'" title="Точная настройка цвета"><i style="background:'+hex+'"></i><span class="mono">'+E.cmykText(k)+'</span></button></div>'+(open?V.cmykPanel(bind,hex):'')+'</div>';
};
V.plain = function(bind,cur,list){return list.map(function(c){return [bind,c[0],c[1]||c[0],c[2]||c[0],(cur||'')===c[0]]})};
/* a group that folds: the header is a button with the current value on the right; what is open is remembered per viewer */
/* every font as a button that shows the element's own text in that font; fonts without Cyrillic say so */
V.fontPicker = function(el){
  var sample=String(el.text||'Aa').split('\n')[0].slice(0,14)||'Aa',cyr=/[А-Яа-яЁё]/.test(el.text||''),h='';
  ['script','serif','sans'].forEach(function(g){
    h+='<div class="fl full">'+D.FONT_GROUP[g]+'</div><div class="fonts full">'+D.FONT_LIST.filter(function(f){return f[4]===g}).map(function(f){var on=el.font===f[0],bad=cyr&&!f[5];
      return '<button type="button" class="fontb'+(bad?' nocyr':'')+'" data-set="e.font" data-val="'+f[0]+'" aria-pressed="'+on+'" title="'+f[2]+(f[5]?'':' — только латиница')+'"><span style="font-family:'+D.FONTS[f[0]].replace(/"/g,"'")+';font-weight:'+f[3]+'">'+U.esc(sample)+'</span><small>'+f[2]+(f[5]?'':' · лат.')+'</small></button>'}).join('')+'</div>'});
  if(cyr&&!D.FONT_CYR[el.font])h+='<p class="pherr full">В шрифте «'+D.FONT_NAME[el.font]+'» нет русских букв: они будут показаны другим шрифтом. Для русского текста выберите шрифт без пометки «лат.».</p>';
  return h};
V.chev='<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
V.fold = function(key,title,sum,html,note){var on=!!UI.fold[key];
  return '<div class="igrp fold'+(on?' open':'')+'" data-fold="'+key+'"><button type="button" class="foldh" data-act="fold" data-id="'+key+'" aria-expanded="'+on+'" aria-controls="fold-'+key+'"><span class="igl">'+title+'</span><span class="folds">'+U.esc(sum||'')+'</span>'+V.chev+'</button>'+
    '<div class="foldb" id="fold-'+key+'"><div class="foldi">'+(note?'<div class="foldn">'+U.help(note)+'</div>':'')+'<div class="insp-grid">'+html+'</div></div></div></div>'};
V.NOTE = /<p class="muted small(?: full)?"(?: style="[^"]*")?>([\s\S]*?)<\/p>/g;
V.group = function(title,html){var notes=[];html=html.replace(V.NOTE,function(m,t){notes.push(t);return ''});
  return '<div class="igrp"><div class="igl">'+title+(notes.length?U.help(notes.join('<br><br>')):'')+'</div><div class="insp-grid">'+html+'</div></div>'};
V.upBtn = function(kind,label,cls){return '<label class="btn up'+(cls?' '+cls:'')+'">'+U.ico.img+' '+label+'<input type="file" accept="image/*" data-up="'+kind+'" aria-label="'+label+'"></label>'};

V.con.secs.insp = function(){
  var ms=V.multi();
  if(ms.length>1){var bt=function(id,ic,t){return '<button type="button" class="btn ic" data-act="align" data-id="'+id+'" title="'+t+'" aria-label="'+t+'">'+U.ico[ic]+'</button>'};
    var n10=ms.length%10,n100=ms.length%100,word=n10===1&&n100!==11?'элемент':n10>=2&&n10<=4&&(n100<12||n100>14)?'элемента':'элементов';
    return '<div class="card insp"><div class="eyebrow">Группа</div><h3>'+ms.length+' '+word+'</h3>'+
      V.group('Размер группы','<div class="fld full"><span class="fl">Масштаб</span><div class="row">'+[50,75,90,110,125,150].map(function(q){return '<button type="button" class="btn sm" data-act="gscale" data-id="'+q+'">'+q+' %</button>'}).join('')+'</div></div><p class="muted small full">Размер и место всей группы — в строке параметров сверху: Ш, В, X, ↑, ⤢. На сцене группу растягивают ручки золотой рамки: пропорции сохраняются, шары, фольгированные фигуры и люди только расходятся, их размер настоящий.</p>')+
      V.group('Выровнять','<div class="row full">'+bt('left','aL','По левому краю')+bt('hc','aC','По центру')+bt('right','aR','По правому краю')+bt('dist','aD','Расставить на равных расстояниях')+'</div><div class="row full">'+bt('bottom','aB','По низу')+bt('vc','aM','По середине')+bt('top','aT','По верху')+'</div>')+
      V.group('Действия','<div class="row full"><button type="button" class="btn" data-act="copy">'+U.ico.clip+' Копировать</button><button type="button" class="btn" data-act="gdup">'+U.ico.copy+' Дублировать</button><button type="button" class="btn" data-act="lib-open">'+U.ico.star+' В мои шаблоны</button><button type="button" class="btn" data-act="glock">'+U.ico.lock+' Закрепить</button><button type="button" class="btn" data-act="ghide">'+U.ico.eyeoff+' Скрыть</button><button type="button" class="btn dng" data-act="gdel">'+U.ico.del+' Удалить</button><button type="button" class="btn" data-act="gclear">Снять выделение</button></div><p class="muted small full">Выделить: инструмент «Выбрать несколько» слева — обведите рамкой или касайтесь по одному; мышью — рамка с пустого места или с Shift, Ctrl+A — всё. В «Слоях»: Ctrl — добавить слой, Shift — от одного до другого. Копировать Ctrl+C, вставить Ctrl+V, дублировать Ctrl+D.</p>')+'</div>'}
  var el=V.sel();if(!el)return '';
  var pal=D.pal(S.palette),G=[],f='',m=V.mod(el.id),stats='';
  var xy=U.num('e.x','От левой стены, мм',el.x,{step:50})+U.num('e.y','От пола, мм',el.y,{step:50,min:0})+U.num('e.z','От стены вглубь, мм',SC.zOf(S,el),{step:50,min:0,max:E.ZMAX});
  if(E.isBg(el)){
    f=U.text('e.name','Название',el.name||D.TYPE_NAME[el.type],{cls:'full'})+U.num('e.w',el.type==='circle'?'Диаметр, мм':'Ширина, мм',el.w,{step:50});
    if(el.type!=='circle')f+=U.num('e.h','Высота, мм',el.h,{step:50});
    f+=xy;
    if(el.type==='uarch')f+=U.num('e.t','Ширина полосы, мм',el.t,{step:10});
    if(el.type==='rect')f+=U.num('e.r','Скругление углов, мм',el.r||0,{step:20});
    if(el.type==='harch')f+=U.num('e.r','Радиус скругления, мм',el.r,{step:50})+'<div class="fld"><span class="fl">Сторона скругления</span><button type="button" class="btn" data-act="flip">'+U.ico.flip+' '+(el.flip?'Слева':'Справа')+'</button></div>';
    G.push(['Размер и место',f]);
    if(el.type==='portal')G.push(['Ниша',U.num('e.nw','Ширина, мм',el.nw,{step:50})+U.num('e.nh','Высота, мм',el.nh,{step:50})+U.num('e.ny','От пола, мм',el.ny,{step:50})+
      U.segf('Вставка',U.seg('e.insert',el.insert,[['slats','Рейки'],['smooth','Гладкая'],['mirror','Зеркало'],['none','Сквозная']],{scroll:true}),'full')+
      (el.insert==='none'||el.insert==='mirror'?'':V.color('e.insColor','Цвет вставки',el.insColor||pal.ins,[['e.insColor','',pal.ins,'Как в палитре',!el.insColor]]))]);
    var surf=el.surf||'paint',im=SC.img(el.im),c='';
    c=U.segf('Чем покрыт фон',U.seg('e.surf',surf,[['paint','Краска'],['sequin','Пайетки'],['foil','Фольга'],['greens','Зелень'],['image','Изображение']],{scroll:true}),'full');
    var tones=pal.c.map(function(tc,i){return ['e.tone',i,tc,'Тон '+(i+1)+' палитры',!el.color&&(el.tone||0)%4===i]});
    if(surf==='paint')c+=V.color('e.color','Цвет',el.color||pal.c[(el.tone||0)%4],tones);
    if(surf==='foil')c+=U.segf('Цвет фольги','<div class="chips">'+['silver','gold','pink','cham'].map(function(q){return '<button type="button" class="chip" data-set="e.seq" data-val="'+q+'" aria-pressed="'+(el.seq===q)+'"><i class="dot'+(q==='cham'?' cham':'')+'" style="background:'+D.SEQ[q].c+';margin:0"></i>'+(q==='cham'?'Голография':D.SEQ[q].name)+'</button>'}).join('')+'</div>','full')+
      (el.seq==='cham'?'':V.color('e.color','Свой оттенок фольги',SC.seqColor(el),[]))+'<p class="muted small full">Мятая металлизированная плёнка на ПВХ. В смете площадь × 1,4 на смятие и 10 % на подрезку.</p>';
    if(surf==='sequin')c+=U.segf('Цвет пайеток','<div class="chips">'+['gold','silver','pink','cham'].map(function(q){return '<button type="button" class="chip" data-set="e.seq" data-val="'+q+'" aria-pressed="'+(el.seq===q)+'"><i class="dot'+(q==='cham'?' cham':'')+'" style="background:'+D.SEQ[q].c+';margin:0"></i>'+D.SEQ[q].name+'</button>'}).join('')+'</div>','full')+
      (el.seq==='cham'?'':V.color('e.color','Свой оттенок пайеток',SC.seqColor(el),[]));
    if(surf==='image'){
      c+='<div class="fld full"><span class="fl">Файл изображения</span><div class="row">'+V.upBtn('bg',im?'Заменить файл':'Выбрать файл',im?'':'pri')+(im?'<button type="button" class="btn dng" data-act="img-remove">Убрать</button>':'')+'</div></div>';
      if(im)c+=U.segf('Как вписать',U.seg('e.imFit',el.imFit||'cover',[['cover','Заполнить фон'],['contain','Показать целиком']]),'full')+U.num('e.imZ','Масштаб, %',el.imZ||100,{step:10,min:20,max:400})+U.num('e.imX','Сдвиг вправо, %',el.imX||0,{step:5,min:-100,max:100})+U.num('e.imY','Сдвиг вниз, %',el.imY||0,{step:5,min:-100,max:100});
      else c+='<p class="muted small full">Подойдёт JPG, PNG или WebP. Картинка обрезается по форме фона; у PNG с прозрачностью сквозь неё виден цвет фона.</p>';
      c+=V.color('e.color','Цвет под изображением',el.color||pal.c[(el.tone||0)%4],tones);
    }
    G.push(['Покрытие',c]);
    if(m)stats='<div class="grid stats">'+U.stat(U.n(m.area,2)+' м²','лицевая площадь')+U.stat('≈ '+U.n(m.weight,1)+' кг','вес с упорами')+U.stat(m.row?'ряд '+(m.row+1)+' · +'+m.depth+' мм':'задний ряд','положение в глубину')+
      U.stat(m.sup.n?m.sup.n+' × '+S.stab.bag+' кг':'на проставках','упоры и груз')+U.stat(U.n(m.group.safe,1),m.group.mods.length>1?'запас в связке':'запас отдельно',m.group.safe>=S.stab.req?'ok':'bad')+'</div>';
  } else if(el.type==='garland'||el.type==='cluster'){
    var isG=el.type==='garland',plan=(R.balPlans&&R.balPlans[el.id])||E.balPlan(el,S);
    if(isG){var free=E.validPts(el.pts),nn=E.garlandNodes(el).length;
      G.push(['Форма и размер',U.segf('Форма',U.seg('e.shape',free?'free':el.shape,[['asym','Асимметрия'],['arc','Арка'],['corner','Угол'],['column','Колонна']].concat(free?[['free','Своя']]:[]),{scroll:true}),'full')+
      '<p class="muted small full">Зелёные точки на гирлянде тянутся пальцем: так её изгиб меняется прямо на сцене. Готовая форма возвращает гирлянду к шаблону.</p>'+
      '<div class="fld"><span class="fl">Точек изгиба</span><div class="stp"><button type="button" class="sb" data-act="node-del" aria-label="Убрать точку"'+(nn<=2?' disabled':'')+'>−</button><input type="text" readonly value="'+nn+'" aria-label="Точек изгиба" id="f-nodes"><button type="button" class="sb" data-act="node-add" aria-label="Добавить точку"'+(nn>=8?' disabled':'')+'>+</button></div></div>'+
      '<div class="fld"><span class="fl">Сторона</span><button type="button" class="btn" data-act="flip">'+U.ico.flip+' Отразить</button></div>'+
      U.num('e.w','Ширина, мм',el.w,{step:100})+U.num('e.h','Высота, мм',el.h,{step:100})+xy]);
      stats='<div class="grid stats">'+U.stat(U.n(E.polyLen(E.garlandPts(el))/1000,2)+' м','длина по оси')}
    else{G.push(['Размер и место',U.num('e.w','Ширина, мм',el.w,{step:50})+U.num('e.h','Высота, мм',el.h,{step:50})+xy+'<p class="muted small full">Кластер можно поднять с пола и растянуть ручками в любую сторону: на полу он лежит горкой, в воздухе собирается облаком.</p>']);stats='<div class="grid stats">'}
    stats+=E.SIZES.map(function(sz,i){return plan.bySize[i]?U.stat(plan.bySize[i]+' шт',sz[0]):''}).join('')+'</div>';
    var auto=!(+el.n>0);
    G.push(['Шары',U.num('e.n','Количество шаров'+(plan.reg!==plan.n?' (без гигантов)':''),plan.reg,{step:isG?5:1,min:1,max:600})+
      '<div class="fld"><span class="fl">'+(auto?'Сейчас считается само':'Задано вручную')+'</span>'+(auto?'<span class="muted small autohint">'+(isG?'по длине гирлянды и плотности':'по размеру кластера')+'</span>':'<button type="button" class="btn" data-set="e.n" data-val="0" data-n="1">Считать само</button>')+'</div>'+
      U.segf('Размер шаров',U.seg('e.mix',el.mix||'mix',Object.keys(D.MIX_NAME).map(function(k){return [k,D.MIX_NAME[k]]}),{scroll:true}),'full')]);
    var cols=el.cols||pal.bal,ci=UI.ced&&UI.ced.indexOf('e.cols.')===0?+UI.ced.slice(7):-1;
    G.push(['Цвета шаров','<div class="fld full ced balcols"><span class="fl">Пять цветов: нажмите на любой, чтобы настроить; под цветом — его доля</span><div class="sws">'+cols.map(function(cc,i){return '<button type="button" class="sw big" style="--c:'+cc+'" data-act="ced" data-id="e.cols.'+i+'" aria-pressed="'+(ci===i)+'" aria-label="Цвет '+(i+1)+': '+cc+'"></button>'}).join('')+
      (el.cols?'<button type="button" class="btn sm" data-set="e.cols" data-val="">Как в палитре</button>':'')+'</div>'+
      '<div class="shares">'+E.shareOf(el).map(function(v,i){var raw=Array.isArray(el.share)?el.share[i]:Math.round(E.BAL_SHARE[i]*100);return '<label><i class="dot" style="background:'+cols[i]+'"></i><input type="number" min="0" max="100" step="1" inputmode="numeric" data-bind="e.share.'+i+'" id="f-e-share-'+i+'" value="'+raw+'" aria-label="Доля цвета '+(i+1)+', %"><small>'+Math.round(v*100)+' %</small></label>'}).join('')+'</div>'+
      '<p class="muted small" style="margin:2px 0 6px">Под цветами — доли в шарах. Числа считаются относительно друг друга: 0 убирает цвет, 50 при остальных 10 даёт ему больше половины.'+(Array.isArray(el.share)?' <button type="button" class="btn sm" data-set="e.share" data-val="">Обычные доли</button>':'')+'</p>'+
      (ci>=0?U.segf('Вид шаров этого цвета',U.seg('e.fins.'+ci,E.finsOf(el)[ci],[['latex','Матовые'],['chrome','Хром'],['pearl','Перламутр'],['confetti','С конфетти']],{scroll:true}),'full')+V.cmykPanel('e.cols.'+ci,cols[ci]):'')+'</div>']);
    G.push(['Гиганты',U.num('e.g24','Шары 24″ (60 см), шт',el.g24||0,{step:1,min:0,max:50})+U.num('e.g36','Шары 36″ (90 см), шт',el.g36||0,{step:1,min:0,max:50})+'<p class="muted small full">Добавляются к обычным шарам. Цвета гигантов распределяются по тем же долям.</p>']);
  } else if(el.type==='foil'){
    G.push(['Фольгированный шар',U.segf('Форма',U.seg('e.kind',el.kind,[['digit','Цифра'],['letter','Буква'],['star','Звезда'],['heart','Сердце'],['round','Сфера']],{scroll:true}),'full')+
      (el.kind==='digit'||el.kind==='letter'?U.text('e.text',el.kind==='digit'?'Цифра':'Буква',el.text||''):'')+
      U.segf('Размер',U.seg('e.size',el.size,D.FOIL_SIZES[el.kind].map(function(z){return [z,z+'″ · '+D.FOIL_H[z]/10+' см']}),{scroll:true}),'full')+xy+
      (el.size>16?'<div class="fld"><span class="fl">Гелий</span>'+U.tog('e.string',!!el.string,'На нитке с грузиком')+'</div>':'<p class="muted small full">Шары 16″ гелием не держатся: их надувают воздухом и ставят на палочки или крепят к фону.</p>')]);
    G.push(['Цвет',V.color('e.color','Цвет фольги',el.color||'#D4AF37',V.plain('e.color',el.color,[['#D4AF37','#D4AF37','Золото'],['#C4C8CF','#C4C8CF','Серебро'],['#E8B4A0','#E8B4A0','Розовое золото'],['#E0607E','#E0607E','Розовый'],['#5B8FD6','#5B8FD6','Синий'],['#1B1F1D','#1B1F1D','Чёрный']]))]);
    stats='<div class="grid stats">'+U.stat(el.size+'″','размер')+U.stat(D.FOIL_H[el.size]+' мм','высота')+'</div>';
  } else if(el.type==='flora'){
    var fq=E.floraPlan(el),pile=el.shape==='pile',ffree=E.validPts(el.pts),fnn=pile?0:E.garlandNodes(el).length,fcols=el.cols||[pal.bal[3],pal.c[3],pal.bal[4],pal.bal[3],pal.c[3]],fci=UI.ced&&UI.ced.indexOf('e.cols.')===0?+UI.ced.slice(7):-1;
    G.push(['Форма и размер',U.segf('Что',U.seg('e.kind',el.kind,[['flowers','Цветы с зеленью'],['greens','Только зелень']],{scroll:true}),'full')+
      (el.kind==='greens'?'':U.segf('Цветы',U.seg('e.fl',D.FL_NAME[el.fl]?el.fl:'mix',[['mix','Розы и пионы'],['rose','Розы'],['peony','Пионы'],['hydrangea','Гортензии']],{scroll:true}),'full'))+
      U.segf('Листья',U.seg('e.leaf',D.LEAF_NAME[el.leaf]?el.leaf:(el.kind==='greens'?'euca':'green'),[['green','Зелёные'],['euca','Эвкалипт'],['fern','Папоротник'],['gold','Золотые'],['goldmix','Зелёные и золотые']],{scroll:true}),'full')+
      U.segf('Форма',U.seg('e.shape',ffree?'free':el.shape,[['corner','Угол'],['arc','Арка'],['asym','Асимметрия'],['column','Колонна'],['pile','Букет']].concat(ffree?[['free','Своя']]:[]),{scroll:true}),'full')+
      (pile?'<p class="muted small full">Букет растягивается ручками рамки.</p>':'<p class="muted small full">Зелёные точки на сцене гнут линию, как у гирлянды.</p><div class="fld"><span class="fl">Точек изгиба</span><div class="stp"><button type="button" class="sb" data-act="node-del" aria-label="Убрать точку"'+(fnn<=2?' disabled':'')+'>−</button><input type="text" readonly value="'+fnn+'" aria-label="Точек изгиба"><button type="button" class="sb" data-act="node-add" aria-label="Добавить точку"'+(fnn>=8?' disabled':'')+'>+</button></div></div><div class="fld"><span class="fl">Сторона</span><button type="button" class="btn" data-act="flip">'+U.ico.flip+' Отразить</button></div>')+
      U.num('e.w','Ширина, мм',el.w,{step:50})+U.num('e.h','Высота, мм',el.h,{step:50})+xy+
      U.num('e.n',el.kind==='greens'?'Веток зелени':'Цветов',el.kind==='greens'?fq.sprigs:fq.flowers,{step:1,min:1,max:400})+(+el.n>0?'<div class="fld"><span class="fl">Задано вручную</span><button type="button" class="btn" data-set="e.n" data-val="0" data-n="1">Считать само</button></div>':'')]);
    if(el.kind!=='greens')G.push(['Цвета цветов','<div class="fld full ced"><span class="fl">Три цвета: основной, второй и акцент</span><div class="sws">'+fcols.slice(0,3).map(function(cc,i){return '<button type="button" class="sw big" style="--c:'+cc+'" data-act="ced" data-id="e.cols.'+i+'" aria-pressed="'+(fci===i)+'" aria-label="Цвет '+(i+1)+': '+cc+'"></button>'}).join('')+'</div>'+(fci>=0&&fci<3?V.cmykPanel('e.cols.'+fci,fcols[fci]):'')+'</div>']);
    stats='<div class="grid stats">'+(fq.flowers?U.stat(fq.flowers+' шт','цветов'):'')+U.stat(fq.sprigs+' шт','веток зелени')+(pile?'':U.stat(U.n(fq.len,2)+' м','длина по линии'))+'</div>';
  } else if(el.type==='drape'){
    G.push(['Ткань',U.segf('Вид',U.seg('e.kind',el.kind,[['backdrop','Фон на стойке'],['swag','Драпировка сверху'],['curtain','Шторы по бокам'],['veil','Вуаль на фон'],['tie','Штора с подхватом'],['tie2','Две шторы с подхватами']],{scroll:true}),'full')+
      (E.isTie(el)?U.segf('Подхват',U.seg('e.tb',el.tb||'band',Object.keys(D.TIE_NAME).map(function(k){return [k,D.TIE_NAME[k]]})),'full')+(el.kind==='tie'?'<div class="fld"><span class="fl">Сторона</span><button type="button" class="btn" data-act="flip">'+U.ico.flip+' Отразить</button></div>':'')+'<div class="fld full">'+U.tog('e.bst',el.bst!==false,'На своей стойке')+'</div><p class="muted small full">Зелёные точки на сцене меняют форму: край свеса (по верху или по боку), подхват и конец шлейфа на полу. Ручки рамки меняют ширину и высоту, форма растягивается вместе с ними.</p>':'')+
      U.segf('Ткань',U.seg('e.fab',E.fabOf(el),[['velvet','Бархат'],['satin','Атлас'],['chiffon','Шифон, вуаль']],{scroll:true}),'full')+U.num('e.w','Ширина, мм',el.w,{step:100})+U.num('e.h','Высота, мм',el.h,{step:100})+xy]);
    G.push(['Цвет',V.color('e.color','Цвет ткани',el.color||'#F4E9EC',V.plain('e.color',el.color,[['#FFFFFF','#FFFFFF','Белый'],['#F4E9EC','#F4E9EC','Пудра'],['#E9D9C4','#E9D9C4','Айвори'],['#D9CFEA','#D9CFEA','Лаванда'],['#CFE6DD','#CFE6DD','Мята'],['#1E2B63','#1E2B63','Тёмно-синий'],['#6B1F2E','#6B1F2E','Бордо'],['#1F4D3F','#1F4D3F','Изумруд'],['#C9A857','#C9A857','Золото']]))]);
    stats='<div class="grid stats">'+U.stat(U.n(E.fabricLen(el),1)+' м','ткани в рулоне '+String(D.FAB[E.fabOf(el)][1]).replace('.',',')+' м')+(E.isBackdrop(el)?U.stat(Math.ceil(el.w/3000-1e-9)+' шт','стоек для фона'):'')+'</div>';
  } else if(el.type==='balloon'){
    G.push(['Шар',U.segf('Размер',U.seg('e.size',el.size,[[5,'5″'],[10,'10″'],[12,'12″'],[18,'18″'],[24,'24″'],[36,'36″']],{scroll:true}),'full')+
      U.segf('Вид',U.seg('e.fin',el.fin,[['latex','Матовый'],['chrome','Хром'],['clear','Прозрачный']],{scroll:true}),'full')+xy+'<div class="fld"><span class="fl">Гелий</span>'+U.tog('e.string',!!el.string,'На нитке с грузиком')+'</div>']);
    if(el.fin!=='clear')G.push(['Цвет',V.color('e.color','Цвет шара',el.color||pal.bal[0],V.plain('e.color',el.color,[['',pal.bal[0],'Как в палитре'],['#D4AF37','#D4AF37','Золото'],['#C4C8CF','#C4C8CF','Серебро'],['#B76E79','#B76E79','Розовое золото']].concat(pal.bal.slice(1).map(function(b){return [b,b,b]})).concat([['#FFFFFF','#FFFFFF','Белый'],['#1B1F1D','#1B1F1D','Чёрный']])))]);
    stats='<div class="grid stats">'+U.stat('Ø '+el.w+' мм','диаметр надутого шара')+'</div>';
  } else if(el.type==='pic'){
    var pim=SC.img(el.im);
    G.push(['Картинка',U.text('e.name','Название',el.name||'Картинка',{cls:'full'})+U.num('e.w','Ширина, мм',el.w,{step:50})+xy+U.segf('Установка',U.seg('e.mount',el.mount,[['wall','На фоне'],['floor','На полу']]),'full')+
      '<div class="fld full"><span class="fl">Обрезка и фон</span><div class="row"><button type="button" class="btn pri" data-act="imp-edit">'+U.ico.img+' Обрезать и убрать фон</button>'+(el.im0?'<button type="button" class="btn" data-act="imp-orig">Вернуть исходную</button>':'')+V.upBtn('swap',pim?'Заменить файл':'Выбрать файл')+'</div></div>'+
      '<p class="muted small full">В окне обрезки картинку можно подрезать рамкой и убрать фон: от краёв целиком и касанием по оставшимся участкам.</p>']);
    stats='<div class="grid stats">'+U.stat(U.n(el.w)+' × '+U.n(el.h)+' мм','размер фигуры')+U.stat(U.n(el.w*el.h/1e6,2)+' м²','площадь печати')+'</div>';
  } else if(el.type==='text'){
    G.push(['Надпись',U.area('e.text','Текст (до двух строк)',el.text,{cls:'full'})+U.num('e.size','Высота букв, мм',el.size,{step:10,min:40})+U.num('e.y','От пола, мм',el.y,{step:50})+
      U.segf('Исполнение',U.seg('e.style',el.style,[['neon','Неон'],['gold','Золото'],['flat','Плоская'],['marquee','Светящиеся буквы']],{scroll:true}),'full')+U.segf('Подставка',U.seg('e.stand',el.stand||'none',[['none','Нет'],['floor','Стойка до пола'],['table','Настольная']],{scroll:true}),'full')]);
    if(el.style!=='marquee')G.push(['Шрифт',V.fontPicker(el)]);
    var auto=el.style==='flat'?'#1B1F1D':el.style==='marquee'?'#F5EFE3':(el.style==='gold'?SC.GOLD:pal.ink);
    G.push(['Цвет',V.color('e.color','Цвет букв',el.color||auto,V.plain('e.color',el.color,[['',auto,'Как в палитре'],['#FFFFFF','#FFFFFF','Белый'],['#F6D58A','#F6D58A','Тёплый'],['#FF8FB1','#FF8FB1','Розовый'],['#8FD3FF','#8FD3FF','Голубой'],['#B76E79','#B76E79','Розовое золото'],['#1B1F1D','#1B1F1D','Чёрный']]))]);
    stats='<div class="grid stats">'+U.stat(U.n(el.w)+' × '+U.n(el.h)+' мм','габарит надписи')+'</div>';
  } else if(el.type==='neon'){
    var nlen=E.neonLen(el)/1000;
    f=U.segf('Форма',U.seg('e.kind',el.kind,[['ring','Круг'],['rect','Прямоугольник'],['line','Полоса']]),'full')+U.num('e.w','Ширина, мм',el.w,{step:50})+U.num('e.h','Высота, мм',el.h,{step:50});
    if(el.kind==='ring')f+=U.num('e.arc','Дуга, ° (360 — замкнутый круг)',el.arc||360,{step:15,min:30,max:360})+'<div class="fld"><span class="fl">Быстро</span><div class="row">'+[[360,'Круг'],[180,'Полукруг'],[270,'¾']].map(function(q){return '<button type="button" class="btn" data-set="e.arc" data-val="'+q[0]+'" data-n="1">'+q[1]+'</button>'}).join('')+'</div></div>';
    if(el.kind==='rect')f+=U.num('e.r','Скругление углов, мм',el.r||0,{step:20,min:0});
    if(el.kind==='line')f+='<p class="muted small full">Зелёные точки на сцене гнут полосу: тяните их, добавляйте и убирайте.</p><div class="fld"><span class="fl">Точек изгиба</span><div class="stp"><button type="button" class="sb" data-act="node-del" aria-label="Убрать точку"'+(el.pts.length<=2?' disabled':'')+'>−</button><output>'+el.pts.length+'</output><button type="button" class="sb" data-act="node-add" aria-label="Добавить точку"'+(el.pts.length>=8?' disabled':'')+'>+</button></div></div>';
    G.push(['Форма и размер',f+xy]);
    G.push(['Свет',U.segf('Свечение',U.seg('e.glow',String(el.glow===undefined?2:el.glow),D.NEON_GLOW.map(function(n,i){return [String(i),n]}),{scroll:true}),'full')+
      U.segf('Неон',U.seg('e.tube',el.tube||'l',[['s','6×12 мм'],['l','8×16 мм']]),'full')+U.segf('Крепление',U.seg('e.base',el.base||'clips',[['clips','Клипсы на фон'],['acrylic','На прозрачном акриле']]),'full')]);
    G.push(['Цвет',V.color('e.color','Цвет неона',el.color,V.plain('e.color',el.color,D.NEON_COLS.map(function(c){return [c[0],c[0],c[1]]})))]);
    stats='<div class="grid stats">'+U.stat(U.n(nlen,2)+' м','длина неона по форме')+U.stat('≈ '+Math.ceil(nlen*(el.tube==='s'?7:10))+' Вт','мощность, 12 В')+'</div>';
  } else if(el.type==='person'){
    G.push(['Фигура',U.segf('Кто',U.seg('e.kind',el.kind,Object.keys(D.PERSON).map(function(k){return [k,D.PERSON[k].name+' · '+Math.round(D.PERSON[k].h/10)+' см']})),'full')+xy+
      '<p class="muted small full">Фигура показывает масштаб: рост настоящий, поэтому растянуть её нельзя. В смету, проверки и зону она не входит. Перетащите её вверх на тумбу или подиум — она встанет на верх. Спрятать всех людей сразу: «Вид → Люди для масштаба».</p>']);
    G.push(['Цвет',V.color('e.color','Цвет фигуры',el.color||D.PERSON_COL,V.plain('e.color',el.color,[['',D.PERSON_COL,'Серый'],['#2B2F33','#2B2F33','Тёмный'],['#B8BEC4','#B8BEC4','Светлый'],['#FFFFFF','#FFFFFF','Белый']]))]);
  } else if(el.type==='sym'){
    f=U.num('e.w','Ширина, мм',el.w,{step:20})+xy;
    if(el.kind==='digit')f+=U.text('e.text','Цифры',el.text);
    f+=U.segf('Установка',U.seg('e.mount',el.mount,[['wall','На фоне'],['floor','На полу']]),'full');
    G.push(['Размер и место',f]);
    var sd={ngift:'#FFE3A6',nheart:'#FF8FB1',nstar:'#FFE3A6',nmagen:'#8FD3FF',nmoon:'#FFE3A6',heart:'#C24A63',snow:'#F4F7FA',cloud:'#FFFFFF',tree:'#2F6B55',pumpkin:'#D9681F',shell:'#FBF7F0',starfish:'#F3D9A4'}[el.kind]||SC.GOLD;
    if(el.kind!=='hanukkiah')G.push(['Цвет',V.color('e.color','Цвет',el.color||sd,V.plain('e.color',el.color,[['',sd,'Обычный'],['#FFFFFF','#FFFFFF','Белый'],['#D4AF37','#D4AF37','Золото'],['#C9CED6','#C9CED6','Серебро'],[pal.c[1],pal.c[1],'Тон палитры'],['#1B1F1D','#1B1F1D','Чёрный']]))]);
  } else {
    var fh=D.FREE_H[el.kind],pd={gift:pal.c[1],giftpile:pal.c[1],mframe:'#C9A857',mglass:'#C9A857',mcyl:'#C9A857',mset:'#C9A857',candelabra:'#C9A857',csticks:'#C9A857',lantern:'#C9A857',gifts:pal.c[1],candles:'#FBF6EA',dreidel:pal.bal[3],plinths:pal.c[0],pampas:pal.bal[3],podr:pal.bal[3],podq:pal.bal[3],plc:pal.bal[3],plq:pal.bal[3],easel:'#FFFFFF',table:'#FFFFFF'}[el.kind];
    G.push(['Размер и место',U.num('e.w',el.kind==='podr'||el.kind==='plc'?'Диаметр, мм':'Ширина, мм',el.w,{step:fh?50:20})+(fh?U.num('e.h','Высота, мм',el.h,{step:el.kind==='gift'?10:50,min:80}):'')+xy+'<p class="muted small full">Реквизит можно поднять на тумбу или подиум: перетащите его вверх, и он прилипнет к верху тумбы.</p>']);
    var opt='';
    if(el.kind==='easel')opt=U.segf('Мольберт',U.seg('e.design',el.design||'wood',[['wood','Деревянный'],['gold','Золотой'],['black','Чёрный'],['table','Настольный']],{scroll:true}),'full')+U.segf('Табличка',U.seg('e.board',el.board||'rect',[['rect','Прямая'],['arch','Арка'],['round','Круглая']],{scroll:true}),'full')+
      '<div class="fld full">'+U.tog('e.flw',!!el.flw,'Цветы по углам таблички')+'</div>'+U.area('e.text','Надпись на табличке',el.text||'',{cls:'full'});
    if(el.kind==='gift')opt=U.segf('Форма',U.seg('e.shape',el.shape||'cube',Object.keys(D.GIFT_SHAPE).map(function(k){return [k,D.GIFT_SHAPE[k][0]]}),{scroll:true}),'full')+U.segf('Узор',U.seg('e.pat',el.pat||'plain',Object.keys(D.GIFT_PAT).map(function(k){return [k,D.GIFT_PAT[k]]}),{scroll:true}),'full');
    if(/^m(frame|glass|cyl|set)$/.test(el.kind))opt=U.segf('Верх',U.seg('e.lid',el.lid||'open',Object.keys(D.LID_NAME).map(function(k){return [k,D.LID_NAME[k]]}),{scroll:true}),'full')+(el.lid==='panel'?V.color('e.lc','Цвет крышки',el.lc||'#F4EFE6',V.plain('e.lc',el.lc,[['#FFFFFF','#FFFFFF','Белая'],['#F4EFE6','#F4EFE6','Айвори'],['#1B1D1F','#1B1D1F','Чёрная'],['#C9A857','#C9A857','Золото'],['#1E2B63','#1E2B63','Тёмно-синяя']])):'')+'<p class="muted small full">'+(el.lid?'На крышку можно ставить свечи, цветы, мольберт: перетащите их на тумбу, и они встанут на верх.':'Открытая рама — это витрина: внутрь кладут подарки или цветы. Чтобы ставить сверху, выберите крышку.')+'</p>';
    if(el.kind==='giftpile')opt=U.num('e.n','Коробок',el.n||12,{step:1,min:3,max:30})+'<p class="muted small full">Коробки разных форм и размеров раскладываются горкой; цвета чередуются: основной цвет и цвет ленты меняются местами.</p>';
    if(el.kind==='candelabra')opt=U.segf('Свечей',U.seg('e.n',+el.n===3?3:5,[[3,'3'],[5,'5']]),'full');
    if(el.kind==='csticks')opt=U.num('e.n','Подсвечников',el.n||5,{step:1,min:2,max:9});
    if(opt)G.push([el.kind==='easel'?'Вид мольберта':el.kind==='gift'?'Коробка':/^m(frame|glass|cyl)$/.test(el.kind)?'Верх тумбы':'Набор',opt]);
    G.push(['Цвет',V.color('e.color',{gifts:'Цвет большой коробки',plinths:'Цвет высокой тумбы',pampas:'Цвет вазы',easel:'Цвет таблички',table:'Цвет скатерти',gift:'Цвет коробки',giftpile:'Основной цвет',mframe:'Цвет металла',mglass:'Цвет металла',mcyl:'Цвет металла',mset:'Цвет металла',candelabra:'Цвет металла',csticks:'Цвет металла',lantern:'Цвет металла'}[el.kind]||'Цвет',el.color||pd,V.plain('e.color',el.color,[['',pd,'Как в палитре'],['#FFFFFF','#FFFFFF','Белый'],['#D4AF37','#D4AF37','Золото'],['#C4C8CF','#C4C8CF','Серебро'],['#1E2B63','#1E2B63','Тёмно-синий'],[pal.c[0],pal.c[0],'Тон палитры'],['#1B1F1D','#1B1F1D','Чёрный']]))]);
    if(el.kind==='gift'||el.kind==='giftpile')G.push(['Лента',V.color('e.rib','Цвет ленты',el.rib||'#C9A857',V.plain('e.rib',el.rib,[['#C9A857','#C9A857','Золото'],['#C4C8CF','#C4C8CF','Серебро'],['#FFFFFF','#FFFFFF','Белая'],['#1E2B63','#1E2B63','Тёмно-синяя'],['#B9314F','#B9314F','Красная']]))]);
  }
  if(M.canRot(el))G.push(['Поворот',U.num('e.rot','Угол, °',el.rot||0,{step:5,min:-180,max:180})+'<div class="fld"><span class="fl">Быстро</span><div class="row"><button type="button" class="btn sm" data-set="e.rot" data-val="0" data-n="1">0°</button><button type="button" class="btn sm" data-act="rot" data-id="-15">−15°</button><button type="button" class="btn sm" data-act="rot" data-id="15">+15°</button></div></div><p class="muted small full">На сцене угол меняет золотая ручка над рамкой.</p>']);
  if(el.hide||el.lock)G.unshift(['Состояние','<p class="small full">'+(el.hide?'Элемент скрыт: его нет на картинке и в смете. ':'')+(el.lock?'Элемент закреплён: на сцене его не сдвинуть, касание проходит к элементам за ним.':'')+'</p><div class="row full">'+(el.hide?'<button type="button" class="btn" data-act="lhide" data-id="'+el.id+'">'+U.ico.eye+' Показать</button>':'')+(el.lock?'<button type="button" class="btn" data-act="llock" data-id="'+el.id+'">'+U.ico.unlock+' Открепить</button>':'')+'</div>']);
  return '<div class="card insp"><div class="eyebrow">Выбранный элемент</div><h3>'+U.esc(V.elName(el))+'</h3>'+G.map(function(g){return V.group(g[0],g[1])}).join('')+stats+'</div>';
};

V.elColor = function(el){var pal=D.pal(S.palette);
  if(E.isBg(el))return SC.bgColor(el,pal);if(el.type==='garland'||el.type==='cluster')return (el.cols||pal.bal)[0];
  if(el.type==='text')return el.color||(el.style==='gold'?SC.GOLD:el.style==='flat'?'#1B1F1D':pal.ink);if(el.type==='pic')return '#B9B4A8';if(el.type==='flora')return el.kind==='greens'?'#5C7F68':(el.cols||[pal.bal[3]])[0];if(el.type==='drape')return el.color||'#F4E9EC';if(el.type==='neon')return el.color;
  if(el.type==='person')return el.color||D.PERSON_COL;
  return el.color||(el.type==='balloon'?pal.bal[0]:SC.GOLD)};
V.con.secs.layers = function(){
  if(!S.els.length)return '';
  var on=!!UI.fold.layers,ms=UI.multi||[],nh=S.els.filter(function(e){return e.hide}).length;
  var rows=SC.order(S).reverse().map(function(i){var el=S.els[i];var sel=UI.sel===el.id||ms.indexOf(el.id)>=0;
    return '<div class="lyr'+(sel?' on':'')+(el.hide?' hid':'')+'"><span class="lgrip" data-id="'+el.id+'" title="Перетащить выше или ниже" aria-label="Перетащить слой «'+U.esc(V.elName(el))+'»" role="button">⠿</span><button type="button" class="lyrsel" data-act="lsel" data-id="'+el.id+'" aria-pressed="'+sel+'"><i class="dot" style="background:'+V.elColor(el)+'"></i><span>'+U.esc(V.elName(el))+'</span>'+(el.lock?'<small>закреплён</small>':'')+'</button>'+
      '<button type="button" class="btn ic sm" data-act="lhide" data-id="'+el.id+'" aria-pressed="'+!!el.hide+'" title="'+(el.hide?'Показать':'Скрыть')+'" aria-label="'+(el.hide?'Показать':'Скрыть')+'">'+(el.hide?U.ico.eyeoff:U.ico.eye)+'</button>'+
      '<button type="button" class="btn ic sm" data-act="llock" data-id="'+el.id+'" aria-pressed="'+!!el.lock+'" title="'+(el.lock?'Открепить':'Закрепить')+'" aria-label="'+(el.lock?'Открепить':'Закрепить')+'">'+(el.lock?U.ico.lock:U.ico.unlock)+'</button></div>'}).join('');
  return '<div class="card fold cardfold'+(on?' open':'')+'" data-fold="layers"><h3 class="foldt"><button type="button" class="foldh" data-act="fold" data-id="layers" aria-expanded="'+on+'" aria-controls="fold-layers"><span class="ftx"><span class="eyebrow">Сверху — ближние к зрителю</span><span class="ftt">Слои</span></span><span class="folds">'+S.els.length+' эл.'+(nh?' · скрыто '+nh:'')+'</span>'+V.chev+'</button></h3>'+
    '<div class="foldb" id="fold-layers"><div class="foldi"><div class="lyrs">'+rows+'</div><p class="lyrhelp">'+U.help('Перетащите слой за «⠿» выше или ниже: выше — ближе к зрителю. Глаз прячет элемент с картинки и из сметы. Замок не даёт сдвинуть его на сцене, а касание проходит к тому, что за ним.')+'</p></div></div></div>';
};
V._tiles = {};
/* preview of an item of my library */
V.libPrev = function(it,ix){
  if(it.kind==='pic'){var im=IMG[it.imgs[0]];return im?'<svg viewBox="0 0 '+im.w+' '+im.h+'" aria-hidden="true"><use href="#im-'+it.imgs[0]+'"/></svg>':'<span class="pv">?</span>'}
  var els=null;try{els=JSON.parse(it.json)}catch(e){}if(!Array.isArray(els)||!els.length)return '<span class="pv">?</span>';
  var w=1,h=1;els.forEach(function(e){w=Math.max(w,e.x+e.w);h=Math.max(h,e.y+e.h)});
  els.forEach(function(e){e.z=0});   // a flat preview: no perspective inside a tile
  var T={room:{w:w,h:h,moldings:false},palette:S.palette,balloons:S.balloons,els:els},pad=Math.max(w,h)*.06,vb=[-pad,-pad,w+2*pad,h+2*pad].map(r1).join(' '),key='lib|'+it.id+'|'+S.palette+'|'+S.balloons.density;
  if(V._timg[key])return '<img class="timg" src="'+V._timg[key]+'" alt="" aria-hidden="true" draggable="false">';
  var inner=SC.render(T,null,{uid:'lb'+ix,noRoom:true});if(V._timg[key]!==null&&!(it.imgs&&it.imgs.length))V.tileQueue(key,vb,inner);   // previews with photos stay live: their pictures live in the page
  return '<svg viewBox="'+vb+'" aria-hidden="true">'+inner+'</svg>';
};
V.tile = function(gi,ii){
  var it=D.GROUPS[gi].items[ii];
  if(it.t==='text'){var st=it.d.style,css='font-family:'+D.FONTS[it.d.font].replace(/"/g,"'")+';font-weight:'+(D.FONT_W[it.d.font]||600)+';'+(st==='neon'?'text-shadow:0 0 8px #F3D98A;':st==='gold'?'color:#D9B966;font-weight:700;':st==='marquee'?'color:#F5EFE3;font-weight:700;text-shadow:0 0 6px #FFE7A8;letter-spacing:.08em;':'color:#fff;font-weight:600;');
    return '<span class="pv" style="'+css+'">'+U.esc(String(it.d.text).split('\n')[0].slice(0,9))+'</span>'}
  var T={room:{w:100,h:100,moldings:false},palette:S.palette,balloons:S.balloons,els:[]},el={id:'tile'+gi+'_'+ii,type:it.t,x:0,y:0};
  for(var k in it.d)el[k]=it.d[k];if(E.isBg(el))el.tone=ii%4;if(el.type==='balloon')el.string=false;M.fit(el);el.z=0;el.y=0;T.room.w=el.w;T.room.h=el.h;T.els.push(el);
  var pad=Math.max(el.w,el.h)*(el.type==='balloon'?.22:.09),vb=[-pad,-pad,el.w+2*pad,el.h+2*pad].map(r1).join(' '),dark=el.type==='balloon'&&el.fin==='clear';
  var key=gi+'|'+ii+'|'+S.palette+'|'+S.balloons.density+'|'+S.balloons.greens;
  if(V._timg[key])return '<img class="timg'+(dark?' onDark':'')+'" src="'+V._timg[key]+'" alt="" aria-hidden="true" draggable="false">';
  var inner=SC.render(T,null,{uid:'t'+gi+'_'+ii,noRoom:true});if(V._timg[key]!==null)V.tileQueue(key,vb,inner);
  return '<svg viewBox="'+vb+'" aria-hidden="true"'+(dark?' class="onDark"':'')+'>'+inner+'</svg>';
};
/* Catalog previews are drawn once as small pictures: a few hundred live SVG shapes per tile (sequins, foil, shadows) made
   scrolling the side panel slow on tablets, where parts of it stayed blank until redrawn. A picture costs nothing to scroll. */
V._timg={};V._tq=[];V._tbusy=false;
V.tileQueue = function(key,vb,inner){if(V._tq.some(function(q){return q.key===key}))return;V._tq.push({key:key,vb:vb,inner:inner});if(!V._tbusy){V._tbusy=true;setTimeout(V.tileRun,60)}};
V.tileRun = function(){var q=V._tq.shift();if(!q){if(drag||ldrag){setTimeout(V.tileRun,400);return}V._tbusy=false;V._tiles={};var n=document.querySelector('#view [data-sec=pal]');if(n){var h=V.con.secs.pal();if(n._h!==h){n.innerHTML=h;n._h=h}}return}   // only the catalog changes: nothing else is redrawn or moves   // never redraw under a finger
  var p=q.vb.split(' ').map(Number),h=120,w=Math.max(40,Math.min(240,Math.round(h*p[2]/p[3])));if(w===240)h=Math.round(240*p[3]/p[2]);
  var svg='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="'+w+'" height="'+h+'" viewBox="'+q.vb+'">'+q.inner+'</svg>';
  IO.svgImage(svg).then(function(im){var cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(im,0,0,w,h);V._timg[q.key]=cv.toDataURL('image/png')})
    .catch(function(){V._timg[q.key]=null}).then(function(){setTimeout(V.tileRun,0)})};
V.con.secs.pal = function(){
  var gi=0;D.GROUPS.forEach(function(g,i){if(g.id===UI.group)gi=i});
  var tiles,groups=D.GROUPS.map(function(g){return [g.id,g.name]}).concat([['mine','Мои']]);
  if(UI.group==='mine'){
    tiles=IO.lib.filter(function(it){return it.kind!=='scene'}).map(function(it,ix){return '<div class="tilew"><button type="button" class="tile" data-act="lib-add" data-id="'+it.id+'">'+V.libPrev(it,ix)+'<span>'+U.esc(it.name)+'</span></button><button type="button" class="tilex" data-act="lib-del" data-id="'+it.id+'" aria-label="Удалить «'+U.esc(it.name)+'» из моих" title="Удалить из моих">×</button></div>'}).join('')||
      '<p class="muted small tiles-note">Здесь будут ваши шаблоны и фигуры. Выделите элемент или несколько и нажмите звёздочку «В мои шаблоны»; импортированные фигуры попадают сюда сами. Шаблоны доступны в любом проекте'+(IO.db?' и сохраняются в облаке страницы.':' этого браузера.')+'</p>';
  } else if(D.GROUPS[gi].id==='pic'){var ids=Object.keys(IMG);
    tiles='<label class="tile up"><span class="pv plus">+</span><span>Загрузить картинку</span><input type="file" accept="image/*" data-up="pic" aria-label="Загрузить картинку"></label>'+
      ids.map(function(id){var im=IMG[id];return '<button type="button" class="tile" data-act="add-pic" data-id="'+id+'"><svg viewBox="0 0 '+im.w+' '+im.h+'" aria-hidden="true"><use href="#im-'+id+'"/></svg><span>Поставить ещё раз</span></button>'}).join('')+
      '<p class="tiles-note">'+U.help('Картинка из файла ставится отдельной фигурой: персонаж, логотип, фото. Чтобы натянуть изображение на фон, выберите фон и в блоке «Покрытие» нажмите «Изображение». Лучше всего подходит PNG с прозрачным фоном.')+' Картинка из файла</p>';
  } else {
    var key=S.palette+'|'+S.balloons.density+'|'+S.balloons.greens+'|'+gi;
    if(!V._tiles[key])V._tiles[key]=D.GROUPS[gi].items.map(function(it,ii){return '<button type="button" class="tile'+(it.t==='text'?' txt':'')+'" data-act="add" data-g="'+gi+'" data-i="'+ii+'">'+V.tile(gi,ii)+'<span>'+it.name+'</span></button>'}).join('');
    tiles=V._tiles[key];
  }
  return '<div class="card"><div class="eyebrow">Нажмите, чтобы добавить на сцену</div><h3>Элементы</h3>'+U.seg('u.group',UI.group,groups,{scroll:true})+'<div class="tiles">'+tiles+'</div></div>';
};
V.palBtn = function(p){return '<button type="button" class="pal" data-set="s.palette" data-val="'+p.id+'" aria-pressed="'+(S.palette===p.id)+'"><i>'+p.c.concat([p.bal[4]]).map(function(c){return '<b style="background:'+c+'"></b>'}).join('')+'</i>'+p.name+'</button>'};
V.con.secs.scene = function(){U.inDock=true;try{return V.sceneBody()}finally{U.inDock=false}};
V.sceneBody = function(){
  var h='';
  h+=V.fold('holiday','Праздник',D.holiday(S.holiday).name,'<div class="chips full">'+D.HOLIDAYS.map(function(x){return '<button type="button" class="chip" data-act="holiday" data-id="'+x.id+'" aria-pressed="'+(S.holiday===x.id)+'">'+x.name+'</button>'}).join('')+'</div>','Меняет надпись и набор декора, фоны остаются.');
  h+=V.fold('pal','Палитра',D.pal(S.palette).name,'<div class="pals full">'+D.PALETTES.map(V.palBtn).join('')+'</div>');
  var fl=S.floor.color,wl=S.room.wall;
  h+=V.fold('floor','Пол и стена',(S.floor.mat?'фон на полу '+String(fl||'').toUpperCase():'без фона на полу')+' · стена '+(wl?String(wl).toUpperCase():'светлая'),'<div class="fld full">'+U.tog('s.floor.mat',S.floor.mat,'Напольный фон под зоной: винил или ковролин')+'</div>'+
    (S.floor.mat?V.color('s.floor.color','Цвет напольного фона',fl,V.plain('s.floor.color',fl,[['#E9C4CF','#E9C4CF','Розовый'],['#FFFFFF','#FFFFFF','Белый'],['#CFE6DD','#CFE6DD','Мятный'],['#D9CFEA','#D9CFEA','Сиреневый'],['#C9CED6','#C9CED6','Серый'],['#D8B56A','#D8B56A','Золотистый'],['#1E1F22','#1E1F22','Чёрный']])):'')+
    V.color('s.room.wall','Цвет стены',wl||'#EEECE6',V.plain('s.room.wall',wl,[['','#EEECE6','Светлая, как сейчас'],['#F3DDE2','#F3DDE2','Розовая'],['#DDE8E3','#DDE8E3','Мятная'],['#E4E0EE','#E4E0EE','Сиреневая'],['#D9D2C5','#D9D2C5','Песочная'],['#3A3B3E','#3A3B3E','Графит']])));
  if(S.ref){var rf=S.ref,inf=rf.info||null,ri='';
    if(inf&&inf.stats)ri='<p class="small full">Распознано: фонов '+inf.stats.bg+', шаров и гирлянд '+inf.stats.air+', надписей '+inf.stats.text+', символов и реквизита '+inf.stats.decor+', вырезок из фото '+inf.stats.pic+'.</p>'+(inf.notes?'<p class="muted small full">Claude: «'+U.esc(inf.notes)+'»</p>':'');
    h+=V.fold('ref','Фото-образец',rf.on?'показан · '+rf.op+' %':'скрыт','<div class="fld full">'+U.tog('s.ref.on',rf.on,'Показывать фото поверх сцены')+'</div>'+U.segf('Прозрачность фото',U.seg('s.ref.op',rf.op,[[25,'25 %'],[45,'45 %'],[70,'70 %'],[100,'100 %']],{scroll:true}),'full')+
      (inf?U.num('s.ref.tall','Высота самого высокого фона, мм',inf.tallMm,{step:50,min:800,max:4000,cls:'full'})+'<p class="muted small full">От этого числа зависит масштаб всей сцены: '+(inf.given?'его задали вы.':'его оценил Claude по фото.')+' Измените, если знаете настоящую высоту, и все элементы пересчитаются.</p>':'')+ri+
      '<div class="fld full"><div class="row"><button type="button" class="btn" data-act="photo">'+U.ico.cam+' Другое фото</button><button type="button" class="btn dng" data-act="ref-remove">Убрать образец</button></div></div>')}
  h+=V.fold('garland','Гирлянда',({light:'лёгкая',std:'стандарт',lush:'пышная'})[S.balloons.density]+' · запас '+S.balloons.reserve+' %'+(S.balloons.greens?' · зелень':''),U.segf('Плотность',U.seg('s.balloons.density',S.balloons.density,[['light','Лёгкая'],['std','Стандарт'],['lush','Пышная']],{scroll:true}),'full')+
    U.num('s.balloons.reserve','Запас шаров, %',S.balloons.reserve,{step:5,min:0,max:50})+'<div class="fld"><span class="fl">Зелень</span>'+U.tog('s.balloons.greens',S.balloons.greens,'Эвкалипт')+'</div>');
  h+=V.fold('room','Комната',U.n(S.room.w,0)+' × '+U.n(S.room.h,0)+' мм',U.num('s.room.w','Стена: ширина, мм',S.room.w,{step:100,min:2000,max:12000})+U.num('s.room.h','Потолок, мм',S.room.h,{step:50,min:2200,max:6000})+
    '<div class="fld full"><span class="fl">Показать на сцене</span><div class="row togs">'+U.tog('s.show.dims',S.show.dims,'Размеры')+U.tog('s.show.grid',S.show.grid,'Точки накладок')+U.tog('s.room.moldings',S.room.moldings,'Молдинги')+'</div></div>');
  return '<div class="scenep">'+h+'</div>';
};
V.con.secs.checks = function(){
  var z=R.zone,bad=R.checks.filter(function(c){return !c.ok&&c.level!=='info'}),st='',rank={bad:0,warn:1,info:2,ok:3};
  if(S.els.length)st+=U.stat(U.n(z.w/1000,1)+' × '+U.n(z.d/1000,1)+' м','зона: ширина × глубина')+U.stat('от '+U.n(z.ceil/1000,1)+' м','высота потолка');
  if(R.mods.length)st+=U.stat(R.mods.length+' шт · '+U.n(R.weight,0)+' кг','фоны')+U.stat(U.n(R.sysSafe,1),'запас устойчивости',R.sysSafe>=S.stab.req?'ok':'bad');
  if(R.balN||R.singleN)st+=U.stat(U.n(R.balN+R.singleN),'шаров'+(R.garLen?' · гирлянда '+U.n(R.garLen,1)+' м':''));
  st+=U.stat(U.eur0(R.cost.all),'материалы на всё')+U.stat(U.eur0(R.eco.cur.gross),'цена клиенту, расчёт');
  // a folding card in the side panel, like the layers: the title says how it stands, the list opens on a tap
  var on=!!UI.fold.checks,nb=bad.filter(function(c){return c.level==='bad'}).length,title=bad.length?'Проверки: '+bad.length+' замечани'+(bad.length===1?'е':bad.length<5?'я':'й'):'Проверки пройдены';
  return '<div class="card fold cardfold chkcard'+(on?' open':'')+(nb?' hasbad':bad.length?' haswarn':' allok')+'" data-fold="checks"><h3 class="foldt"><button type="button" class="foldh" data-act="fold" data-id="checks" aria-expanded="'+on+'" aria-controls="fold-checks"><span class="ftx"><span class="eyebrow">Считается после каждого изменения</span><span class="ftt">'+title+'</span></span><span class="folds"><i class="chkdot" aria-hidden="true"></i>'+(nb?nb+' важн.':bad.length?'есть советы':'всё в порядке')+'</span>'+V.chev+'</button></h3>'+
    '<div class="foldb" id="fold-checks"><div class="foldi"><ul class="chk">'+R.checks.slice().sort(function(a,b){return rank[a.level]-rank[b.level]}).map(function(c){return '<li class="'+c.level+'">'+U.ru(c.text)+'</li>'}).join('')+'</ul><div class="grid stats">'+st+'</div></div></div></div>';
};

/* =================================== 2. frames and drawings =================================== */
V.frame = {skel:'<div class="cols"><div data-sec="set" class="wide"></div><div data-sec="over" class="wide"></div><div data-sec="mod" class="wide"></div><div data-sec="pvc"></div><div data-sec="cut"></div><div data-sec="rules" class="wide"></div></div>',secs:{}};
V.frame.secs.set = function(){
  var wood=R.frame==='wood',arcs=E.sum(R.mods,function(m){return m.arcLen})/1000;
  var h='<div class="row" style="gap:14px;align-items:flex-end">'+U.segf('Материал каркаса',U.seg('s.frame',S.frame,[['wood','Дерево 40×40'],['metal','Металл 40×20']]))+U.segf('Шаг слоёв в глубину, мм',U.seg('s.layout.step',S.layout.step,[[200,'200'],[250,'250'],[300,'300']]))+'</div>';
  h+='<p class="muted small" style="margin-top:10px">'+(wood?'Брус строганый 40×40, дуги из двух слоёв фанеры 18 мм. Обшивка — вспененный ПВХ 10 мм, толщина модуля 50 мм.':'Профильная труба 40×20×1,5 (20 мм в плоскости обшивки, 40 мм в глубину), дуги гнутся одной деталью. Обшивка — вспененный ПВХ 10 мм, толщина модуля 50 мм.')+'</p>';
  if(!R.mods.length)return U.card('Конструкция','Каркас',h);
  h+='<div class="grid" style="margin-top:12px">'+U.stat(R.mods.length,'модулей')+U.stat(U.n(R.area,1)+' м²','лицевая площадь')+U.stat(R.sheets.length+' л.','ПВХ 2050×3050')+
    U.stat(R.cut.length+' × '+(E.stock(R.frame)/1000)+' м',wood?'бруса 40×40':'трубы 40×20')+U.stat(U.n(R.cutTotal/1000,1)+' м',wood?'прямых деталей':'деталей с дугами')+(wood?U.stat(U.n(arcs,1)+' м','дуг из фанеры'):'')+
    U.stat(U.n(R.screws),'точек крепления обшивки')+U.stat('≈ '+U.n(R.weight,0)+' кг','вес всех модулей')+'</div>';
  return U.card('Конструкция','Каркас',h);
};
V.frame.secs.over = function(){
  if(!R.mods.length)return V.empty('Чертежей пока нет');
  return U.card('Общие виды','Вид спереди и план','<div class="dwrow"><div>'+DR.front(S,R)+'<div class="dwcap">Спереди: габариты и нахлёсты фонов, мм</div></div><div>'+DR.plan(S,R)+'<div class="dwcap">План: упоры с мешками, проставки (зелёные), отступ от стены</div></div></div>'+
    '<p class="muted small" style="margin-top:10px">Нумерация M1…M'+R.mods.length+' идёт от заднего слоя к переднему, как в списке слоёв сцены. Фон, который перекрывает другой минимум на 80 мм, автоматически встаёт на '+S.layout.step+' мм ближе к зрителю и связывается с ним проставками.</p>');
};
V.frame.secs.mod = function(){
  var m=V.curMod();if(!m)return '';
  var rows=[],nb=0,lb=0,na=0,la=0;
  m.parts.concat(m.supParts).forEach(function(p){var arc=p.k==='arc';if(arc){na+=p.qty;la+=p.len*p.qty}else{nb+=p.qty;lb+=p.len*p.qty}
    rows.push(U.tr(['<span class="pos">'+p.pos+'</span>',p.name+(p.note?'<span class="spec">'+p.note+(arc&&R.frame==='wood'?' · фанера 18 мм, 2 слоя':'')+'</span>':''),{r:U.n(p.len)},{r:p.qty},{r:U.n(p.len*p.qty/1000,2)}]))});
  var foot=U.tr([{span:3,h:'Прямые детали'},{r:nb},{r:U.n(lb/1000,2)}],'sum')+(na?U.tr([{span:3,h:'Дуги (по оси)'},{r:na},{r:U.n(la/1000,2)}],'sum'):'');
  var ok=Math.abs(lb-(m.barLen+m.supLen))<1&&Math.abs(la-m.arcLen)<1;
  var st='<div class="grid" style="margin:12px 0">'+U.stat(U.n(m.area,2)+' м²','лицевая площадь')+U.stat('≈ '+U.n(m.weight,1)+' кг','вес с упорами')+U.stat(m.screws,'саморезов в обшивку')+U.stat(m.joints,'узлов каркаса')+U.stat(m.mag.length,'магнитов сетки')+U.stat(m.row?'+'+m.depth+' мм':'задний ряд','положение в глубину')+'</div>';
  return U.card('Модуль: каркас и детали',U.esc(m.label+' · '+m.name)+' · '+U.n(m.el.w)+' × '+U.n(m.el.h),V.modChips()+'<div class="dwrow"><div>'+DR.module(m,R)+'<div class="dwcap">Вид спереди, обшивка условно снята. Буква — позиция, число — длина детали, мм. ▲ упор, ⌀ ось проставки</div></div></div>'+st+
    U.table(['Поз.','Деталь','>Длина, мм','>Шт','>Итого, м'],rows,foot)+(ok?U.check('Таблица сходится с раскроем: длины деталей в таблице равны длинам, которые ушли в раскрой '+(R.frame==='wood'?'бруса':'трубы')+' и в смету.'):''));
};
V.frame.secs.pvc = function(){
  if(!R.mods.length)return '';
  var a=E.sum(R.sheets,function(s){return E.sum(s.items,function(i){return i.area})})/1e6,tot=R.sheets.length*E.PVC.w*E.PVC.h/1e6;
  return U.card('Обшивка','Раскрой ПВХ 10 мм','<div class="dwrow">'+R.sheets.map(function(sh,i){return DR.sheet(sh,R,i)}).join('')+'</div>'+
    '<p class="muted small" style="margin-top:10px">Листов: '+R.sheets.length+' × 2050×3050 мм = '+U.n(tot,1)+' м². Деталей на '+U.n(a,1)+' м², использование '+Math.round(a/tot*100)+' %. Раскладка по габаритным прямоугольникам с зазором 20 мм: на ЧПУ плотная укладка может сэкономить лист, это стоит проверить у резчика.</p>');
};
V.frame.secs.cut = function(){
  if(!R.mods.length)return '';
  var st=E.stock(R.frame),metal=R.frame==='metal';
  var bars=R.cut.map(function(c){return '<div class="cutbar'+(metal?' metal':'')+'">'+c.cuts.map(function(l){return '<i style="flex:'+l+' 1 0">'+(l>=st*.07?l:'')+'</i>'}).join('')+(c.waste>0?'<i class="w" style="flex:'+c.waste+' 1 0">'+(c.waste>=st*.09?c.waste:'')+'</i>':'')+'</div>'}).join('');
  var used=E.sum(R.cut,function(c){return E.sum(c.cuts)});
  return U.card('Каркас','Раскрой '+(metal?'трубы 40×20, хлыст 6 м':'бруса 40×40, хлыст 3 м'),bars+
    '<p class="muted small" style="margin-top:8px">Хлыстов: '+R.cut.length+'. Деталей: '+R.cutLens.length+' шт, '+U.n(used/1000,2)+' м. Остаток '+U.n(R.cutWaste/1000,2)+' м ('+Math.round(R.cutWaste/(R.cut.length*st)*100)+' %), пропил 3 мм учтён.'+(metal?'':' Дуги деревянного каркаса идут из фанеры и в этот раскрой не входят.')+'</p>'+
    U.check('Сумма деталей в раскрое '+U.n(used/1000,2)+' м = сумме по таблицам модулей, упоров и проставок '+U.n(R.cutTotal/1000,2)+' м.'));
};
V.frame.secs.rules = function(){return U.card('Правила','Что заложено в каркас','<ul class="pl">'+D.FRAME_RULES.map(function(t){return '<li>'+t+'</li>'}).join('')+'</ul>')};

/* =================================== 3. supports and joints =================================== */
V.sup = {skel:'<div class="cols"><div data-sec="set" class="wide"></div><div data-sec="tab" class="wide"></div><div data-sec="draw"></div><div data-sec="sp"></div></div>',secs:{}};
V.sup.secs.set = function(){
  if(!R.mods.length)return V.empty('Упоров пока нет');
  var ok=R.sysSafe>=S.stab.req,F=S.stab.F*(S.stab.outdoor?2:1);
  var h='<div class="row" style="gap:18px;align-items:center;margin-bottom:14px"><div><div class="big" style="color:var(--'+(ok?'ok':'bad')+')">'+U.n(R.sysSafe,1)+'</div><div class="small muted">запас устойчивости системы</div></div>'+
    '<div style="flex:1;min-width:220px"><span class="badge'+(ok?'':' bad')+'">'+(ok?'Достаточно: требуется '+S.stab.req:'Мало: требуется '+S.stab.req)+'</span><p class="small muted" style="margin-top:6px">'+
    (ok?'Минимальный груз, при котором запас сохраняется: мешки по '+(R.bagNeed||'—')+' кг.':(R.bagNeed?'Запас появится с мешками по '+R.bagNeed+' кг.':'Мешков до 30 кг не хватает: нужно крепление к стене или полу.'))+'</p></div></div>';
  h+='<div class="insp-grid">'+U.num('s.stab.F','Толчок, Н',S.stab.F,{step:10,min:10})+U.num('s.stab.h','Высота толчка, м',S.stab.h,{step:0.1,min:0.5,max:2.2})+U.num('s.stab.req','Требуемый запас',S.stab.req,{step:0.1,min:1})+
    U.segf('Мешок на упор, кг',U.seg('s.stab.bag',S.stab.bag,[[5,'5'],[10,'10'],[15,'15'],[20,'20']]))+'<div class="fld"><span class="fl">Условия</span>'+U.tog('s.stab.outdoor',S.stab.outdoor,'Улица или сквозняк (×2)')+'</div></div>';
  h+='<details><summary>Как это считается и чего расчёт не учитывает</summary><div><p>Модель: фон толкают сзади или тянут на себя спереди (гость взялся за гирлянду, ребёнок повис на накладке) с силой '+F+' Н на высоте '+U.n(S.stab.h,1)+' м, и он опрокидывается вперёд, на зрителя, вокруг нижней передней кромки. Назад фон не падает: его держит треугольник упора. Опрокидывающий момент = сила × высота. Удерживающий момент = число упоров × вес мешка × 9,81 × (И2 − 100 мм) + вес модуля × 9,81 × 25 мм. Запас = удерживающий ÷ опрокидывающий. Фоны, связанные проставками, считаются как одна система: моменты складываются.</p>'+
    '<p>Это оценка, а не статический расчёт: не учтены ветер, неровный пол, скользкое покрытие и рывок. Толчок 60 Н соответствует лёгкой опоре рукой; для детских праздников и проходных мест разумно задать 100–150 Н. Перед сдачей площадки обязателен тест толчком рукой.</p></div></details>';
  return U.card('Проверка','Устойчивость',h);
};
V.sup.secs.tab = function(){
  if(!R.mods.length)return '';
  var req=S.stab.req,rows=R.mods.map(function(m){var alone=m.group.mods.length===1;
    return U.tr(['<span class="pos">'+m.label+'</span> '+U.esc(m.name),{r:m.sup.n},{r:m.sup.i1},{r:m.sup.i2},{r:m.sup.i3},{r:U.n(m.restore,1)},{r:U.n(m.over,1)},{r:'<span style="color:var(--'+(m.safe>=req?'ok':(alone?'bad':'warn'))+')">'+U.n(m.safe,2)+'</span>'},{r:alone?'—':'<span style="color:var(--'+(m.group.safe>=req?'ok':'bad')+')">'+U.n(m.group.safe,2)+'</span>'}])});
  var rs=E.sum(R.mods,function(m){return m.restore});
  return U.card('По модулям','Упоры и моменты',U.table(['Модуль','>Упоров','>И1 стойка','>И2 основание','>И3 раскос','>Удерж., Н·м','>Опрок., Н·м','>Запас сам','>В связке'],rows,
    U.tr(['Всего',{r:R.nSup},{r:'',span:3},{r:U.n(rs,1)},{r:'',span:3}],'sum'))+
    '<p class="muted small" style="margin-top:8px">И1 = 0,6 × высота фона, И2 = 0,24 × высота (не меньше 450 мм), И3 — раскос между ними. Два упора ставятся на фоны шире 1300 мм, на открытые арки и на отдельно стоящие фоны шире 900 мм.</p>'+
    U.check('Упоров всего '+R.nSup+' = сумма по строкам; столько же петель ×2, крючков-фиксаторов и мешков в смете.'));
};
V.sup.secs.draw = function(){
  var m=V.curMod();if(!m)return '';
  return U.card('Узел','Складной упор',V.modChips()+'<div class="dwrow"><div>'+DR.support(m,S,R)+'<div class="dwcap">'+m.label+', вид сбоку. Упор на двух карточных петлях складывается вдоль фона</div></div></div>'+
    '<ul class="pl small" style="margin-top:10px"><li>Стойка упора крепится к боковой стойке каркаса на 2 петлях 75 мм, ось петель вертикальна.</li><li>В раскрытом положении упор держит крючок-фиксатор 100 мм.</li><li>Под основание клеится резиновая накладка, сверху кладётся мешок '+S.stab.bag+' кг.</li><li>От стены до заднего ряда нужно не меньше '+R.wallGap+' мм: И2 самого высокого заднего фона + 100 мм.</li></ul>');
};
V.sup.secs.sp = function(){
  if(!R.mods.length)return '';
  var h;
  if(!R.pairs.length)h='<p class="muted">Проставок нет: фоны не перекрываются. Чтобы связать два фона в одну устойчивую систему, сдвиньте их с нахлёстом от 80 мм — передний автоматически встанет на '+S.layout.step+' мм ближе к зрителю.</p>';
  else{var rows=R.pairs.map(function(p){return U.tr(['<span class="pos">'+p.front.label+'</span> → <span class="pos">'+p.rear.label+'</span>',{r:U.n(Math.round(p.gx-R.zone.x0-100))},{r:p.heights.join(' / ')},{r:p.len},{r:p.heights.length}])});
    h='<div class="dwrow"><div>'+DR.spacer(R.pairs[0].len,R)+'<div class="dwcap">Сечение в плане. Проставка '+(R.frame==='wood'?'из бруса 40×40':'из трубы 40×20')+'</div></div></div>'+
      U.table(['Пара','>Ось X, мм','>Высоты, мм','>Длина, мм','>Шт'],rows,U.tr([{span:4,h:'Всего проставок'},{r:R.nSpacer}],'sum'))+
      '<p class="muted small" style="margin-top:8px">Ось X отсчитывается от левого края зоны. Длина = шаг слоёв × разница рядов − 50 мм толщины модуля. Стойки каркасов обоих фонов выставлены на эту ось, поэтому барашек попадает в брус, а не в обшивку.</p>'+
      U.check('В смете: футорок M8 и барашков по '+R.nSpacer+', уголков '+(2*R.nSpacer)+' (по 2 на проставку).')}
  if(R.notes.length)h+='<ul class="chk" style="margin-top:10px">'+R.notes.map(function(n){return '<li class="warn">'+U.ru(n)+'</li>'}).join('')+'</ul>';
  return U.card('Узел','Проставки между фонами',h);
};

/* =================================== 4. bill of materials =================================== */
V.bom = {skel:'<div class="col"><div data-sec="sum"></div><div data-sec="tab"></div><div data-sec="bal"></div><div data-sec="tools"></div></div>',secs:{}};
V.bom.secs.sum = function(){
  var custom=Object.keys(S.prices||{}).length;
  return U.card('Смета на изготовление',U.eur(R.cost.all),'<div class="grid">'+U.stat(U.eur(R.cost.constr),'конструкция, многоразовая')+U.stat(U.eur(R.cost.bal),'шары и гирлянда, на 1 раз')+U.stat(U.eur(R.cost.kit),'набор декора «'+D.holiday(S.holiday).name+'»')+'</div>'+
    U.check('Конструкция + шары + декор = '+U.eur(R.cost.constr)+' + '+U.eur(R.cost.bal)+' + '+U.eur(R.cost.kit)+' = '+U.eur(R.cost.all)+'; сумма групп ниже даёт то же число.')+
    '<p class="muted small" style="margin-top:10px">Количество считается из сцены. Цены — стартовые ориентиры по розничным ценам в Германии, не котировки: впишите цены своих поставщиков прямо в таблицу, всё пересчитается.'+(custom?' Изменено цен: '+custom+'.':'')+'</p>'+
    '<div class="row" style="margin-top:10px"><button type="button" class="btn pri" data-act="csv">'+U.ico.dl+' Смета в CSV для Excel</button>'+(custom?'<button type="button" class="btn" data-act="reset-prices">Вернуть цены по умолчанию</button>':'')+'</div>',{h:'h2'});
};
V.bom.secs.tab = function(){
  var rows=[],pi=0;
  R.bom.forEach(function(g){
    rows.push(U.tr([{span:3,h:g.name},{r:U.eur(g.sum)}],'grp'));
    g.rows.forEach(function(r){rows.push(U.tr([(r.color?'<i class="dot" style="background:'+r.color+'"></i>':'')+U.esc(r.name)+(r.spec?'<span class="spec">'+U.ru(r.spec)+'</span>':''),{r:U.n(r.qty,r.qty%1?1:0)+' '+r.unit},
      {r:'<input class="pin" type="number" step="any" inputmode="decimal" id="p-'+(pi++)+'-'+r.key+'" data-bind="p.'+r.key+'" value="'+r.price+'" aria-label="Цена: '+U.esc(r.name)+'">'},{r:U.n(r.sum,2)}]))});
  });
  return U.card('Все позиции','Материалы',U.table(['Позиция','>Кол-во','>Цена, €','>Сумма, €'],rows,U.tr([{span:3,h:'Итого'},{r:U.n(R.cost.all,2)}],'sum')));
};
V.bom.secs.bal = function(){
  if(!R.balN)return '';
  var FL={chrome:'Х',pearl:'П',confetti:'К'},head=['Размер'].concat(R.balColors.map(function(c,j){var f=R.balFins[j];return '><i class="dot" style="background:'+c+';margin:0" title="'+c+' · '+D.BFIN_NAME[f]+'"></i>'+(FL[f]?'<small class="finl">'+FL[f]+'</small>':'')})).concat(['>Всего']);
  var nC=R.balNC,rows=E.SIZES.map(function(sz,i){if(!R.balRow[i])return '';return U.tr([sz[0]].concat(R.balBuy.slice(i*nC,i*nC+nC).map(function(v){return {r:v}})).concat([{r:'<b>'+R.balRow[i]+'</b>'}]))});
  return U.card('Закупка по размерам и цветам','Шары',U.table(head,rows,U.tr(['Всего'].concat(R.balCol.map(function(v){return {r:v}})).concat([{r:R.balBuyN}]),'sum'))+
    U.check('В зоне '+R.balN+' шаров (гирлянды '+R.garN+' + кластеры '+R.cluN+') + запас '+S.balloons.reserve+' % = '+R.balReserve+' шт → к закупке '+R.balBuyN+'. Суммы по строкам и по столбцам совпадают.')+
    '<p class="muted small" style="margin-top:8px">Таблица складывается из настроек каждой гирлянды и каждого кластера: количество, размеры и цвета те же, что нарисованы на сцене. Столбцы — цвета, которые используются; буква у кружка — вид шара: Х — хром, П — перламутр, К — с конфетти. Там, где количество не задано вручную, гирлянда считается по '+(E.DENS[S.balloons.density])+' шаров на метр, а кластер по своей площади.</p>');
};
V.bom.secs.tools = function(){return U.card('Не входит в смету','Инструмент','<ul class="pl">'+D.TOOLS.map(function(t){return '<li>'+t+'</li>'}).join('')+'</ul>')};

/* =================================== 5. overlays and backgrounds =================================== */
V.ovl = {skel:'<div class="col"><div data-sec="hol"></div><div data-sec="kit"></div><div data-sec="pal"></div><div data-sec="grid"></div><div data-sec="mount"></div><div data-sec="ways"></div></div>',secs:{}};
V._thumbs = {};
V.ovl.secs.hol = function(){
  var key=JSON.stringify(S.els.filter(function(e){return !e.kit&&e.type!=='text'}))+JSON.stringify(S.balloons)+S.room.w+'x'+S.room.h;
  if(V._thumbs.key!==key){V._thumbs={key:key,html:{}};
    D.HOLIDAYS.forEach(function(h){var T=JSON.parse(JSON.stringify(S));M.applyHoliday(T,h.id);T.palette=h.pal;T.els.forEach(function(e){if(e.type==='text')M.fit(e)});M.autoInk(T);T.room.moldings=false;
      V._thumbs.html[h.id]='<svg viewBox="'+SC.viewBox(T)+'" aria-hidden="true">'+SC.render(T,null,{uid:'h'+h.id})+'</svg>'})}
  return U.card('Один каркас на весь год','Праздники','<p class="lead">Фоны и гирлянда остаются, меняются палитра, надпись и набор накладок. Нажмите на вариант, чтобы применить его к сцене.</p><div class="thumbs">'+
    D.HOLIDAYS.map(function(h){return '<button type="button" class="thumb" data-act="holiday" data-id="'+h.id+'" aria-pressed="'+(S.holiday===h.id)+'">'+V._thumbs.html[h.id]+'<span>'+h.name+'</span></button>'}).join('')+'</div>',{h:'h2'});
};
V.ovl.secs.kit = function(){
  var g=R.bom.filter(function(x){return x.id==='kit'})[0];
  if(!g)return U.card('Набор декора','Накладок на сцене нет','<p class="muted">Добавьте надпись, символы или реквизит в конструкторе либо выберите праздник выше.</p>');
  var rows=g.rows.map(function(r){return U.tr([U.esc(r.name)+'<span class="spec">'+U.esc(r.spec)+'</span>',r.mount,{r:r.qty},{r:U.n(r.price,2)},{r:U.n(r.sum,2)}])});
  return U.card('Набор декора «'+D.holiday(S.holiday).name+'»','Что входит в набор',U.table(['Накладка','Крепление','>Шт','>Цена, €','>Сумма, €'],rows,U.tr([{span:4,h:'Набор целиком'},{r:U.n(g.sum,2)}],'sum'))+
    '<p class="muted small" style="margin-top:8px">Набор хранится в подписанном кофре с эталонным фото и служит '+S.eco.kitUses+' раз: в цену одного мероприятия попадает '+U.eur(R.eco.kit)+'. Срок службы набора меняется во вкладке «Экономика».</p>');
};
V.ovl.secs.pal = function(){return U.card('Цвет фонов и шаров','Палитры','<div class="pals">'+D.PALETTES.map(V.palBtn).join('')+'</div><p class="muted small" style="margin-top:10px">Палитра задаёт четыре тона фонов, цвет вставки, цвет надписи и пять цветов шаров. Любой фон можно перекрасить отдельно в конструкторе.</p>')};
V.ovl.secs.grid = function(){
  if(!R.mods.length)return '';
  var T=JSON.parse(JSON.stringify(S));T.els=T.els.filter(E.isBg);T.room.moldings=false;
  var rows=R.mods.map(function(m){return U.tr(['<span class="pos">'+m.label+'</span> '+U.esc(m.name),{r:m.mag.length},m.mag.length?'сетка 200×200, от '+(m.mag.length?Math.min.apply(null,m.mag.map(function(p){return p[1]})):0)+' мм от пола':(m.g.type==='uarch'?'нет: полоса слишком узкая':'нет: фон меньше 1,4 м²')])});
  return U.card('Система накладок','Магнитная сетка на фонах','<svg class="dw" viewBox="'+SC.viewBox(T)+'" style="width:100%;max-width:640px;border-radius:10px" role="img" aria-label="Точки магнитов на фонах">'+SC.render(T,E.calc(T),{uid:'mg',grid:true})+'</svg>'+
    U.table(['Фон','>Магнитов','Где'],rows,U.tr(['Всего',{r:R.magnets},'+ 10 % запаса в смете'],'sum'))+
    '<p class="muted small" style="margin-top:8px">Магниты N42 15×3 мм вклеиваются заподлицо в ПВХ с лица (сверло Форстнера 15 мм, глубина 3 мм), шпаклюются и красятся вместе с фоном. Снаружи их не видно; на тыле каждой накладки стоят стальные шайбы. Сетка начинается выше зоны напольного реквизита и не подходит к краю ближе 140 мм.</p>');
};
V.ovl.secs.mount = function(){return U.card('Справочник','Шесть способов крепления','<div class="grid w">'+D.MOUNTS.map(function(r){return '<div class="mcard"><b>'+r[0]+'</b><span class="badge">'+r[1]+'</span><dl><dt>На фоне</dt><dd>'+r[2]+'</dd><dt>На накладке</dt><dd>'+r[3]+'</dd><dt>Смена</dt><dd>'+r[4]+'</dd><dt>Для чего</dt><dd>'+r[5]+'</dd></dl></div>'}).join('')+'</div>')};
V.ovl.secs.ways = function(){return U.card('Справочник','Как сменить цвет и фактуру фона',U.table(['Способ','Материал','Время','Цена','Когда выбирать'],D.BG_WAYS.map(function(r){return U.tr(['<b>'+r[0]+'</b>',r[1],r[2],r[3],r[4]])}))+'<p class="muted small" style="margin-top:8px">Цены и время — ориентиры из практики оформителей, а не расчёт этой программы.</p>')};

/* =================================== 6. assembly =================================== */
V.asm = {skel:'<div class="cols"><div data-sec="steps"></div><div data-sec="tr"></div><div data-sec="safe" class="wide"></div></div>',secs:{}};
V.asm.secs.steps = function(){
  return U.card('На площадке','Порядок сборки · ≈ '+R.asmMin+' мин','<ol class="steps">'+R.steps.map(function(s){return '<li><div><b>'+U.esc(s.name)+'</b><span class="small muted">'+U.ru(s.text)+'</span></div><span class="tm">'+s.t+' мин</span></li>'}).join('')+'</ol>'+
    U.check('Сумма шагов '+R.asmMin+' мин для бригады из двух человек. Гирлянда считается по 5 мин на метр при заранее собранных секциях; надувание шаров в это время не входит.'));
};
V.asm.secs.tr = function(){
  if(!R.mods.length)return '';
  var rows=R.mods.map(function(m){var fit=m.el.w<=1250&&m.el.h<=2000;return U.tr(['<span class="pos">'+m.label+'</span> '+U.esc(m.name),{r:m.el.w+' × '+m.el.h+' × 50'},{r:U.n(m.weight,1)},fit?'<span class="badge">универсал</span>':'<span class="badge warn">фургон</span>'])});
  var pack=[[R.mods.length,'модулей с упорами (упоры сложены)'],[R.nSpacer,'проставок с барашками'],[R.nSup,'мешков по '+S.stab.bag+' кг'],[S.els.filter(function(e){return e.type==='text'||e.type==='sym'||e.type==='prop'||e.type==='pic'}).length,'предметов декора: надписи, символы, фигуры, реквизит'],[R.balBuyN,'шаров для гирлянд (с запасом)'],[R.singleN,'отдельных шаров'+(R.stringN?', из них на гелии '+R.stringN:'')],[R.floorArea?1:0,'рулон напольного фона '+U.n(R.floorArea,1)+' м²']].filter(function(p){return p[0]>0});
  return U.card('Логистика','Перевозка и комплект',U.table(['Модуль','>Габарит, мм','>Вес, кг','Машина'],rows,U.tr(['Всего',{r:''},{r:U.n(R.weight,1)},''],'sum'))+
    '<p class="muted small" style="margin:8px 0">«Универсал» — модуль не больше 1250 × 2000 мм: входит в багажник со сложенными сиденьями. Крупнее — нужен фургон с проёмом от 1,6 м либо разъёмное исполнение.</p>'+
    '<h3 style="font-size:17px;margin:12px 0 6px">Чек-лист погрузки</h3><ul class="pl">'+pack.map(function(p){return '<li><span class="mono">'+p[0]+'</span> — '+p[1]+'</li>'}).join('')+'<li>шуруповёрт, уровень, насос, хомуты, малярный скотч, удлинитель</li></ul>');
};
V.asm.secs.safe = function(){return '<div class="cols"><div>'+U.card('Обязательно','Безопасность','<ul class="pl">'+D.SAFETY.map(function(t){return '<li>'+t+'</li>'}).join('')+'</ul>')+'</div><div>'+U.card('Между мероприятиями','Хранение','<ul class="pl">'+D.STORAGE.map(function(t){return '<li>'+t+'</li>'}).join('')+'</ul>')+'</div></div>'};

/* =================================== 7. economics =================================== */
V.eco = {skel:'<div class="cols"><div data-sec="in"></div><div data-sec="cost"></div><div data-sec="price" class="wide"></div></div>',secs:{}};
V.eco.secs['in'] = function(){
  var e=S.eco;
  return U.card('Исходные данные','Как работает зона','<div class="insp-grid">'+U.num('s.eco.events','Мероприятий в год',e.events,{step:5,min:1})+U.num('s.eco.years','Срок службы, лет',e.years,{step:1,min:1})+U.num('s.eco.repair','Ремонт, % в год',e.repair,{step:5,min:0})+
    U.num('s.eco.kitUses','Набор декора служит, раз',e.kitUses,{step:1,min:1})+U.num('s.eco.people','Человек на монтаже',e.people,{step:1,min:1})+U.num('s.eco.hours','Часов на площадке',e.hours,{step:0.5,min:0})+
    U.num('s.eco.prep','Подготовка, ч',e.prep,{step:0.5,min:0})+U.num('s.eco.rate','Ставка, € / ч',e.rate,{step:1,min:0})+U.num('s.eco.transport','Транспорт, € за рейс',e.transport,{step:5,min:0})+
    U.num('s.eco.trips','Рейсов',e.trips,{step:1,min:0})+U.num('s.eco.misc','Мелочи, €',e.misc,{step:5,min:0})+U.num('s.eco.markup','Наценка, %',e.markup,{step:5,min:0})+
    '<div class="fld full">'+U.tog('s.eco.vat',e.vat,'Начислять НДС 19 % (если не Kleinunternehmer)')+'</div></div>'+
    '<p class="muted small" style="margin-top:8px">«Часов на площадке» — монтаж и демонтаж на одного человека. «Подготовка» — надувание шаров и сборка секций гирлянды накануне. Рейсов по умолчанию два: привезти и забрать.</p>');
};
V.eco.secs.cost = function(){
  var X=R.eco;
  return U.card('На одно мероприятие','Себестоимость · '+U.eur(X.cost),'<div class="stack">'+X.rows.map(function(r){return '<i style="flex:'+Math.max(r[1],.001)+';background:'+r[2]+'" title="'+r[0]+'"></i>'}).join('')+'</div>'+
    X.rows.map(function(r){return '<div class="lg"><i style="background:'+r[2]+'"></i><span>'+r[0]+'</span><b>'+U.eur(r[1])+'</b></div>'}).join('')+
    U.check('Сумма семи строк = '+U.eur(X.cost)+'.')+
    '<details><summary>Откуда берётся каждая строка</summary><div><p>Амортизация = конструкция '+U.eur(R.cost.constr)+' ÷ ('+S.eco.events+' мероприятий × '+S.eco.years+' лет). Ремонт = '+S.eco.repair+' % от конструкции в год ÷ '+S.eco.events+'. Набор декора = '+U.eur(R.cost.kit)+' ÷ '+S.eco.kitUses+' раз. Шары — расходник, целиком. Работа = '+S.eco.people+' чел × '+U.n(S.eco.hours,1)+' ч × '+S.eco.rate+' € + подготовка '+U.n(S.eco.prep,1)+' ч × '+S.eco.rate+' €. Транспорт = '+S.eco.transport+' € × '+S.eco.trips+' рейса.</p></div></details>');
};
V.eco.secs.price = function(){
  var X=R.eco,c=X.cur,e=S.eco,mk=[40,60,80,100];if(mk.indexOf(e.markup)<0){mk.push(e.markup);mk.sort(function(a,b){return a-b})}
  var rows=mk.map(function(k){var p=X.price(k),cur=k===e.markup;return U.tr([(cur?'<b>':'')+k+' %'+(cur?' · сейчас</b>':''),{r:U.n(p.gross,2)},{r:U.n(p.profit,2)},{r:U.n(p.year,0)},{r:p.payback===null?'—':p.payback}],cur?'grp':'')});
  var pb=c.payback;
  var h='<div style="margin-bottom:12px"><div class="big">'+U.eur(c.gross)+'</div><div class="small muted">цена для клиента'+(e.vat?', с НДС':'')+'</div></div>'+
    '<div class="grid" style="margin-bottom:12px">'+U.stat(U.eur(c.profit),'прибыль с заказа')+U.stat(U.eur0(c.year),'прибыль в год')+U.stat(pb===null?'—':pb+' заказ'+(pb%10===1&&pb!==11?'':pb%10>=2&&pb%10<=4&&(pb<10||pb>20)?'а':'ов'),'окупаемость вложений')+'</div>';
  h+='<div class="lg"><span>Себестоимость</span><b>'+U.eur(X.cost)+'</b></div><div class="lg"><span>Наценка '+e.markup+' %</span><b>'+U.eur(c.profit)+'</b></div><div class="lg"><span>Цена без НДС</span><b>'+U.eur(c.net)+'</b></div>'+
    '<div class="lg"><span>'+(e.vat?'НДС 19 %':'НДС не начисляется (§ 19 UStG)')+'</span><b>'+U.eur(c.vat)+'</b></div><div class="lg"><span style="font-weight:600">Цена для клиента</span><b style="font-weight:700">'+U.eur(c.gross)+'</b></div>';
  h+=U.check('Вложения '+U.eur(X.invest)+' (конструкция + набор декора) ÷ прибыль '+U.eur(c.profit)+' = '+(c.profit>0?U.n(X.invest/c.profit,2):'—')+' → округлено вверх до целого заказа: '+(pb===null?'—':pb)+'.'+(pb!==null?' При '+e.events+' заказах в год это ≈ '+U.n(Math.max(1,Math.ceil(pb/e.events*12)))+' мес.':''));
  h+='<h3 style="font-size:18px;margin:16px 0 6px">Сценарии наценки</h3>'+U.table(['Наценка','>Цена, €','>Прибыль с заказа, €','>В год, €','>Окупаемость, заказов'],rows);
  h+='<p class="muted small" style="margin-top:8px">НДС выключен по умолчанию: для Kleinunternehmer по § 19 UStG он не начисляется и в счёте не выделяется. Если статус другой, включите галочку слева. Налог на прибыль и взносы в расчёт не входят.</p>';
  return U.card('Результат','Цена и окупаемость',h,{h:'h2'});
};

/* =================================== 8. client offer =================================== */
V.client = {skel:'<div class="cols"><div data-sec="form"></div><div data-sec="prev"></div><div data-sec="text" class="wide"></div></div>',secs:{}};
V.fdate = function(iso){if(!iso)return '';var p=String(iso).split('-');return p.length===3?p[2]+'.'+p[1]+'.'+p[0]:iso};
V.offer = function(){
  var c=S.client,X=R.eco.cur,step=+c.round||0,price=step?Math.ceil((X.gross-1e-9)/step)*step:Math.round(X.gross*100)/100,z=R.zone,pal=D.pal(S.palette),hol=D.holiday(S.holiday);
  var incl=[],bg=R.mods.length;
  if(bg)incl.push(bg+' декоративн'+(bg===1?'ый фон':bg<5?'ых фона':'ых фонов')+' высотой до '+U.n(Math.max.apply(null,R.mods.map(function(m){return m.el.y+m.el.h}))/1000,1)+' м, палитра «'+pal.name+'»');
  var sq=R.mods.filter(function(m){return m.surf==='sequin'});if(sq.length)incl.push('Пайеточн'+(sq.length===1?'ая панель':'ые панели')+': '+sq.map(function(m){return (D.SEQ[m.el.seq]||D.SEQ.custom).name.toLowerCase()}).filter(function(v,i,a){return a.indexOf(v)===i}).join(', '));
  if(R.garLen>0)incl.push('Гирлянда из шаров '+U.n(R.garLen,1)+' м, около '+U.n(Math.round(R.balN/10)*10)+' шаров'+(S.balloons.greens?', с зеленью':''));
  else if(R.balN)incl.push('Композиции из шаров, около '+U.n(Math.round(R.balN/10)*10)+' шт');
  S.els.filter(function(e){return e.type==='text'}).forEach(function(t){incl.push({neon:'Неоновая надпись',gold:'Объёмные золотые буквы',flat:'Надпись'}[t.style]+' «'+String(t.text).replace(/\n/g,' ')+'»')});
  var kn={};S.els.forEach(function(e){if(e.type==='sym'||e.type==='prop'){var kn0=D.KIND_NAME[e.kind],n=(/[A-ZА-Я]/.test(kn0.charAt(1))?kn0:kn0.charAt(0).toLowerCase()+kn0.slice(1))+(e.kind==='digit'?' «'+e.text+'»':'');kn[n]=(kn[n]||0)+1}});
  var kl=Object.keys(kn).map(function(n){return n+(kn[n]>1?' × '+kn[n]:'')});if(kl.length)incl.push('Декор: '+kl.join(', '));
  var np=S.els.filter(function(e){return e.type==='pic'}).length;if(np)incl.push('Фигуры по вашим изображениям: '+np+' шт');
  if(R.singleN)incl.push('Отдельные шары: '+R.singleN+' шт'+(R.stringN?', на гелии '+R.stringN:''));
  if(R.floorArea)incl.push('Напольный фон '+U.n(R.floorArea,1)+' м²');
  incl.push('Доставка, монтаж и демонтаж');
  var today=new Date(),until=new Date(today.getTime()+(+c.valid||14)*864e5),fd=function(d){return ('0'+d.getDate()).slice(-2)+'.'+('0'+(d.getMonth()+1)).slice(-2)+'.'+d.getFullYear()};
  var hrs=Math.max(1,Math.ceil(R.asmMin/30)/2);
  return {brand:S.brand||'Konfetti Deco',title:'Фотозона «'+S.name+'»',sub:hol.name+' · '+pal.name,who:c.name,date:V.fdate(c.date),place:c.place,incl:incl,
    site:['Площадь под зону: '+U.n(z.w/1000,1)+' × '+U.n(z.d/1000,1)+' м','Высота потолка: от '+U.n(z.ceil/1000,1)+' м','Монтаж на месте: около '+U.n(hrs,hrs%1?1:0)+' ч'].concat(R.hooks?['Розетка 230 В рядом с зоной']:[]),
    calc:X.gross,price:price,step:step,vat:S.eco.vat,vatNote:S.eco.vat?'Цена включает НДС 19 %':'НДС не начисляется (§ 19 UStG)',deposit:Math.round(price*(+c.deposit||0))/100,depositPct:+c.deposit||0,until:fd(until),today:fd(today),note:c.note,contacts:c.contacts};
};
V.offerText = function(){
  var o=V.offer(),L=[o.brand,'',o.title,o.sub,''];
  if(o.who)L.push('Для: '+o.who);if(o.date)L.push('Дата: '+o.date);if(o.place)L.push('Место: '+o.place);if(o.who||o.date||o.place)L.push('');
  L.push('В стоимость входит:');o.incl.forEach(function(i){L.push('• '+i)});L.push('');
  L.push('Что нужно на площадке:');o.site.forEach(function(i){L.push('• '+i)});L.push('');
  L.push('Стоимость: '+U.n(o.price,o.price%1?2:0)+' €');L.push(o.vatNote);
  if(o.depositPct)L.push('Предоплата '+o.depositPct+' %: '+U.n(o.deposit,2)+' €');
  L.push('Предложение действует до '+o.until);if(o.note){L.push('');L.push(o.note)}if(o.contacts){L.push('');L.push(o.contacts)}
  return L.join('\n').replace(/\u00a0/g,' ');
};
V.client.secs.form = function(){
  var c=S.client,o=V.offer();
  return U.card('Данные для предложения','Клиент и условия','<div class="insp-grid">'+U.text('s.brand','Ваше название в шапке',S.brand,{cls:'full'})+U.text('s.client.name','Клиент',c.name,{cls:'full',ph:'Имя или компания'})+
    U.text('s.client.date','Дата мероприятия',c.date,{type:'date'})+U.text('s.client.place','Место',c.place,{ph:'Город, зал'})+
    U.num('s.client.deposit','Предоплата, %',c.deposit,{step:10,min:0,max:100})+U.num('s.client.valid','Действует, дней',c.valid,{step:1,min:1})+
    U.segf('Округлять цену вверх до',U.seg('s.client.round',c.round,[[0,'нет'],[5,'5 €'],[10,'10 €'],[50,'50 €']]),'full')+
    U.area('s.client.note','Примечание',c.note,{cls:'full',rows:3})+U.area('s.client.contacts','Контакты в подвале',c.contacts,{cls:'full',rows:2})+'</div>'+
    U.check('Расчётная цена '+U.eur(o.calc)+(o.step?' → в предложении '+U.eur(o.price)+' (округление вверх до '+o.step+' €)':' → в предложении без округления')+(o.depositPct?'; предоплата '+o.depositPct+' % = '+U.eur(o.deposit):'')+'.')+
    '<p class="muted small" style="margin-top:8px">Цена приходит из вкладки «Экономика». В предложение не попадают себестоимость, наценка и техническая часть.</p>');
};
V.client.secs.prev = function(){
  return U.card('Одна страница A4','Предложение клиенту','<canvas id="offer" class="offer" width="1240" height="1754" role="img" aria-label="Предпросмотр предложения"></canvas>'+
    '<div class="row" style="margin-top:12px;justify-content:center"><button type="button" class="btn pri" data-act="offer-pdf">'+U.ico.dl+' PDF</button><button type="button" class="btn" data-act="offer-png">'+U.ico.dl+' Картинка PNG</button><button type="button" class="btn" data-act="png">'+U.ico.dl+' Только сцена</button></div>',{h:'h2'});
};
V.client.secs.text = function(){
  return U.card('Для мессенджера или письма','Текстом','<textarea id="offer-text" readonly rows="14" style="width:100%;border:1px solid var(--line);border-radius:10px;background:var(--surface);padding:10px;line-height:1.45">'+U.esc(V.offerText())+'</textarea><div class="row" style="margin-top:10px"><button type="button" class="btn" data-act="copy-offer">'+U.ico.copy+' Скопировать текст</button></div>');
};

/* =================================== workspace (v20): Photoshop-style =================================== */
V.TOOLS = [['bg','tbg','Фоны','арки, панели, круг, покрытия',['bg']],['air','tair','Шары','гирлянды, кластеры, одиночные, фольга',['air']],['flora','tflora','Цветы и ткань','цветы, зелень, ткань',['flora']],
  ['text','ttext','Надписи','неон, золото, рукописные',['text']],['neon','tneon','Неон','круг, дуга, прямоугольник, полоса',['neon']],['deco','tdeco','Декор','символы, тумбы, подарки, реквизит',['sym','stand','gift','prop']],
  ['pic','tpic','Картинки','свои файлы: персонажи, логотипы',['pic']],['mine','tmine','Мои шаблоны','сохранённые фигуры и наборы',['mine']],
  ['people','tpeople','Люди для масштаба','мужчина 180, женщина 160, ребёнок 116 см',['people']]];
V.toolOf = function(g){for(var i=0;i<V.TOOLS.length;i++)if(V.TOOLS[i][0]===g||V.TOOLS[i][4].indexOf(g)>=0)return V.TOOLS[i];return V.TOOLS[0]};
V.con.skel='<div class="wsm" id="wsm"><div class="tools" data-sec="tools"></div><div class="canvas" id="canvas"><div class="stagehost" data-sec="stage"></div><div class="fly" id="fly" data-sec="pal"></div></div>'+
  '<div class="dock" id="dock"><div class="dg dtop"><div class="dtabs"><span class="dt on">Свойства</span><span class="sp"></span><button type="button" class="dcol" data-act="dock" title="Свернуть панели" aria-label="Свернуть панели">'+U.ico.collapse+'</button></div><div class="dbody" data-sec="insp"></div></div>'+
  '<div class="dsplit" id="dsplit" title="Тяните, чтобы поделить место"></div><div class="dg dbot"><div class="dtabs" data-sec="dtabs"></div><div class="dbody"><div class="dpane" data-pane="layers" data-sec="layers"></div><div class="dpane" data-pane="hist" data-sec="hist"></div><div class="dpane" data-pane="checks" data-sec="checks"></div><div class="dpane" data-pane="scene" data-sec="scene"></div></div></div>'+
  '<div class="dstrip" data-sec="dstrip"></div></div></div>';
V.con.secs.stage = function(){var vb=SC.viewBox(S);return '<div class="stagebox"><div class="stagewrap" id="stagewrap"><div class="zoomer" id="zoomer"><svg id="stage" xmlns="http://www.w3.org/2000/svg" viewBox="'+vb+'" role="img" aria-label="Сцена фотозоны"><g id="room"></g><g id="shadows"></g></svg>'+
  '<svg id="scdefs" width="0" height="0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs id="scd"></defs></svg><div id="scn"></div><svg id="scover" viewBox="'+vb+'" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"></svg><div id="guides" aria-hidden="true"></div>'+
  '<div id="ov" class="ov" hidden><span id="ovn"></span><span class="rh" data-h="rot" title="Повернуть"></span><span class="hd w" data-h="w"></span><span class="hd e" data-h="e"></span><span class="hd n" data-h="n"></span><span class="hd ne" data-h="ne"></span></div></div>'+
  '<div id="dragtip" class="dragtip" hidden aria-live="polite"></div></div></div>'};
V.con.secs.tools = function(){
  var b=function(attrs,ico,title,on,fly){return '<button type="button" class="tb'+(fly?' hasfly':'')+'" '+attrs+' aria-pressed="'+!!on+'" title="'+title+'" aria-label="'+title+'">'+U.ico[ico]+(fly?'<i class="tri" aria-hidden="true"></i>':'')+'</button>'};
  var t=V.toolOf(UI.group),h=b('data-act="mv" data-id="wall"','mvw','По стене: вбок и вверх-вниз (V)',UI.mv!=='floor'&&UI.tool!=='hand')+b('data-act="mv" data-id="floor"','mvf','По полу: вбок и вглубь (F)',UI.mv==='floor'&&UI.tool!=='hand')+
    b('id="multibtn" data-act="multi"','multi','Выбрать несколько: рамкой или по одному (M)',UI.mmode)+b('data-act="tool" data-id="hand"','hand','Рука: двигать вид (H)',UI.tool==='hand')+'<hr>';
  V.TOOLS.forEach(function(x){h+=b('data-set="u.group" data-val="'+x[0]+'" data-tool="'+x[0]+'"',x[1],x[2],UI.fly&&t[0]===x[0],true)});
  return h};
V.flyRow = function(gi,ii){var it=D.GROUPS[gi].items[ii];return '<button type="button" class="tile frow'+(it.t==='text'?' txt':'')+'" data-act="add" data-g="'+gi+'" data-i="'+ii+'">'+V.tile(gi,ii)+'<span>'+it.name+'</span></button>'};
V.con.secs.pal = function(){
  var t=V.toolOf(UI.group),rows='';
  if(t[0]==='mine'){
    rows=IO.lib.filter(function(it){return it.kind!=='scene'}).map(function(it,ix){return '<div class="tilew"><button type="button" class="tile frow" data-act="lib-add" data-id="'+it.id+'">'+V.libPrev(it,ix)+'<span>'+U.esc(it.name)+'</span></button><button type="button" class="tilex" data-act="lib-del" data-id="'+it.id+'" aria-label="Удалить «'+U.esc(it.name)+'» из моих" title="Удалить из моих">×</button></div>'}).join('')||
      '<p class="fnote">Здесь будут ваши шаблоны и фигуры. Выделите элемент и нажмите ☆ «В мои шаблоны» в строке параметров; импортированные фигуры попадают сюда сами.</p>';
  } else if(t[0]==='pic'){var ids=Object.keys(IMG);
    rows='<label class="tile frow up"><span class="pv plus">+</span><span>Загрузить картинку</span><input type="file" accept="image/*" data-up="pic" aria-label="Загрузить картинку"></label>'+
      ids.map(function(id){var im=IMG[id];return '<button type="button" class="tile frow" data-act="add-pic" data-id="'+id+'"><svg viewBox="0 0 '+im.w+' '+im.h+'" aria-hidden="true"><use href="#im-'+id+'"/></svg><span>Поставить ещё раз</span></button>'}).join('')+
      '<p class="fnote">Картинка ставится отдельной фигурой. Чтобы натянуть изображение на фон, выберите фон и в «Свойствах» выберите покрытие «Изображение».</p>';
  } else {
    var key=S.palette+'|'+S.balloons.density+'|'+S.balloons.greens+'|'+t[0];
    if(!V._tiles[key]){var gs=t[4];V._tiles[key]=gs.map(function(g){var gi=0;D.GROUPS.forEach(function(x,i){if(x.id===g)gi=i});
      return (gs.length>1?'<div class="fsub">'+D.GROUPS[gi].name+'</div>':'')+D.GROUPS[gi].items.map(function(it,ii){return V.flyRow(gi,ii)}).join('')}).join('')}
    rows=V._tiles[key];
  }
  return '<div class="fh"><b>'+t[2]+'</b><small>'+t[3]+'</small><button type="button" class="fx" data-act="flyclose" title="Закрыть" aria-label="Закрыть">'+U.ico.x+'</button></div><div class="flist">'+rows+'</div>'};
V.con.secs.dtabs = function(){var bad=R.checks.filter(function(c){return !c.ok&&c.level!=='info'}),nb=bad.filter(function(c){return c.level==='bad'}).length;
  return [['layers','Слои'],['hist','История'],['checks','Проверки'],['scene','Сцена']].map(function(q){return '<button type="button" class="dt'+(UI.dtab===q[0]?' on':'')+'" data-act="dtab" data-id="'+q[0]+'">'+q[1]+(q[0]==='checks'?'<i class="cdot '+(nb?'bad':bad.length?'warn':'ok')+'" aria-hidden="true"></i>':'')+'</button>'}).join('')};
V.con.secs.dstrip = function(){return [['props','props','Свойства'],['layers','layers','Слои'],['hist','hist','История'],['checks','check','Проверки'],['scene','scene','Сцена']].map(function(q){return '<button type="button" class="tb" data-act="dopen" data-id="'+q[0]+'" title="'+q[2]+'" aria-label="'+q[2]+'">'+U.ico[q[1]]+'</button>'}).join('')+'<button type="button" class="tb" data-act="dock" title="Развернуть панели" aria-label="Развернуть панели">'+U.ico.expand+'</button>'};
V.con.secs.layers = function(){
  if(!S.els.length)return '<p class="fnote">На сцене пока ничего нет: добавьте фон инструментом слева.</p>';
  var ms=UI.multi||[];
  var rows=SC.order(S).reverse().map(function(i){var el=S.els[i];var sel=UI.sel===el.id||ms.indexOf(el.id)>=0;
    return '<div class="lyr'+(sel?' on':'')+(el.hide?' hid':'')+'"><span class="lgrip" data-id="'+el.id+'" title="Перетащить выше или ниже" aria-label="Перетащить слой «'+U.esc(V.elName(el))+'»" role="button">⠿</span><button type="button" class="lyrsel" data-act="lsel" data-id="'+el.id+'" aria-pressed="'+sel+'"><i class="dot" style="background:'+V.elColor(el)+'"></i><span>'+U.esc(V.elName(el))+'</span>'+(el.lock?'<small>закреплён</small>':'')+'</button>'+
      '<button type="button" class="btn ic sm" data-act="lhide" data-id="'+el.id+'" aria-pressed="'+!!el.hide+'" title="'+(el.hide?'Показать':'Скрыть')+'" aria-label="'+(el.hide?'Показать':'Скрыть')+'">'+(el.hide?U.ico.eyeoff:U.ico.eye)+'</button>'+
      '<button type="button" class="btn ic sm" data-act="llock" data-id="'+el.id+'" aria-pressed="'+!!el.lock+'" title="'+(el.lock?'Открепить':'Закрепить')+'" aria-label="'+(el.lock?'Открепить':'Закрепить')+'">'+(el.lock?U.ico.lock:U.ico.unlock)+'</button></div>'}).join('');
  var nh=S.els.filter(function(e){return e.hide}).length;return '<div class="lyrs">'+rows+'</div><div class="pfoot"><span class="folds">'+S.els.length+' эл.'+(nh?' · скрыто '+nh:'')+' · сверху ближние к зрителю</span>'+U.help('Перетащите слой за «⠿» выше или ниже: выше — ближе к зрителю. Глаз прячет элемент с картинки и из сметы. Замок не даёт сдвинуть его на сцене, а касание проходит к тому, что за ним.')+'</div>'};
V.con.secs.checks = function(){
  var z=R.zone,bad=R.checks.filter(function(c){return !c.ok&&c.level!=='info'}),st='',rank={bad:0,warn:1,info:2,ok:3};
  if(S.els.length)st+=U.stat(U.n(z.w/1000,1)+' × '+U.n(z.d/1000,1)+' м','зона: ширина × глубина')+U.stat('от '+U.n(z.ceil/1000,1)+' м','высота потолка');
  if(R.mods.length)st+=U.stat(R.mods.length+' шт · '+U.n(R.weight,0)+' кг','фоны')+U.stat(U.n(R.sysSafe,1),'запас устойчивости',R.sysSafe>=S.stab.req?'ok':'bad');
  if(R.balN||R.singleN)st+=U.stat(U.n(R.balN+R.singleN),'шаров'+(R.garLen?' · гирлянда '+U.n(R.garLen,1)+' м':''));
  st+=U.stat(U.eur0(R.cost.all),'материалы на всё')+U.stat(U.eur0(R.eco.cur.gross),'цена клиенту, расчёт');
  var title=bad.length?'Проверки: '+bad.length+' замечани'+(bad.length===1?'е':bad.length<5?'я':'й'):'Проверки пройдены';
  return '<div class="ptitle">'+title+'</div><ul class="chk">'+R.checks.slice().sort(function(a,b){return rank[a.level]-rank[b.level]}).map(function(c){return '<li class="'+c.level+'">'+U.ru(c.text)+'</li>'}).join('')+'</ul><div class="grid stats">'+st+'</div>'};
V.con.secs.hist = function(){
  var L=UI.hist.length;if(!L)return '';
  return '<div class="hlist">'+UI.hist.map(function(_,i){var lab=UI.histL[i]||'Изменение';return '<button type="button" class="hrow'+(i===UI.hi?' cur':i>UI.hi?' fut':'')+'" data-act="hgo" data-id="'+i+'" title="'+(i>UI.hi?'Вернуть до этого шага':'Вернуться к этому шагу')+'"><i class="hic" aria-hidden="true">'+(i===0?'◆':'•')+'</i><span>'+U.esc(lab)+'</span></button>'}).join('')+'</div>'+
    '<div class="pfoot"><span>'+(UI.hi+1)+' из '+L+' · до 80 шагов</span>'+U.help('Касание строки возвращает сцену к этому шагу. Шаги ниже серой линии можно вернуть, пока вы не сделали новое изменение: тогда они исчезнут, как в Photoshop.')+'</div>'};
/* the moved numbers: size and place live in the options bar, so the properties do not repeat them */
V.MOVED = /<label class="fld(?: [^"]*)?"><span class="fl">[^<]*<\/span><span class="stp"><button type="button" class="sb" data-step="[^"]*" aria-label="Меньше">−<\/button><input [^>]*data-bind="e\.(?:w|h|x|y|z|rot|size)"[^>]*><button type="button" class="sb" data-step="[^"]*" aria-label="Больше">\+<\/button><\/span><\/label>/g;
V.group = function(title,html){var notes=[];html=html.replace(V.NOTE,function(m,t){notes.push(t);return ''}).replace(V.MOVED,'');
  if(!/<(input|button|select|textarea|label|svg|canvas)|class="(pherr|stat|chips|sws|fpick)/.test(html)&&!notes.length)return '';   // nothing left to set here
  var shut=UI.isec&&UI.isec[title];
  return '<div class="igrp sec'+(shut?'':' open')+'"><div class="igl sh" data-act="isec" data-id="'+U.esc(title)+'"><i class="car" aria-hidden="true"></i><span>'+title+'</span>'+(notes.length?U.help(notes.join('<br><br>')):'')+'</div><div class="insp-grid sbody">'+html+'</div></div>'};
(function(){var inner=V.con.secs.insp;V.con.secs.insp=function(){U.inDock=true;var h;try{h=inner()}finally{U.inDock=false}
  if(!h){return '<div class="pempty"><b>Ничего не выбрано</b><span>Коснитесь элемента на сцене или добавьте его инструментами слева.</span></div>'}
  return h.replace('<div class="eyebrow">Выбранный элемент</div><h3>','<div class="phead"><h3>').replace(/<\/h3>/,'</h3></div>')}})();
/* options bar: what is selected, its size and place; scrub a label sideways to change the value */
V.optbar = function(){
  var ms=V.multi(),el=V.sel(),ib=function(act,ico,t,cls,dis){return '<button type="button" class="ib s'+(cls?' '+cls:'')+'" data-act="'+act+'" title="'+t+'" aria-label="'+t+'"'+(dis?' disabled':'')+'>'+U.ico[ico]+'</button>'};
  var f=function(bind,lab,v,step,t,min,max){return '<label class="nf" title="'+t+'"><b data-scrub="'+bind+'" data-sstep="'+step+'">'+lab+'</b><input type="number" inputmode="decimal" step="any" id="ob-'+bind.replace('.','')+'" data-bind="'+bind+'" value="'+Math.round(v*10)/10+'"'+(min!=null?' min="'+min+'"':'')+(max!=null?' max="'+max+'"':'')+'></label>'};
  if(ms.length>1){var gb=bboxOf(ms),gz=Math.min.apply(null,ms.map(function(e){return SC.zOf(S,e)})),lk=ms.some(function(e){return e.lock});
    return '<span class="onm">Группа: '+ms.length+' эл.</span><span class="sep"></span>'+(lk?'<span class="ohint">в группе есть закреплённые — они стоят на месте</span>':f('g.w','Ш',gb.x1-gb.x0,50,'Ширина группы, мм: меняет размер всей группы',100)+f('g.h','В',gb.y1-gb.y0,50,'Высота группы, мм: меняет размер всей группы',100))+
      f('g.x','X',gb.x0,50,'Левый край группы от стены, мм')+f('g.y','↑',gb.y0,50,'Низ группы от пола, мм',0)+f('g.z','⤢',gz,50,'Ближняя к стене часть группы, мм',0,E.ZMAX)+
      '<span class="sp"></span>'+ib('copy','clip','Копировать (Ctrl+C)')+ib('gdup','copy','Дублировать (Ctrl+D)')+ib('lib-open','star','В мои шаблоны')+ib('glock','lock','Закрепить или открепить группу')+ib('ghide','eyeoff','Скрыть группу')+ib('gdel','del','Удалить выбранные (Del)','dng')+ib('gclear','x','Снять выделение (Esc)')}
  if(!el)return '<span class="ohint">Ничего не выбрано — коснитесь элемента на сцене или добавьте его инструментами слева</span>';
  var big=E.isBg(el)||el.type==='garland'||el.type==='cluster'||el.type==='flora'||el.type==='drape',st=big?50:10,free=(E.isBg(el)&&el.type!=='circle')||el.type==='neon'||el.type==='garland'||el.type==='cluster'||el.type==='flora'||el.type==='drape'||(el.type==='prop'&&D.FREE_H[el.kind]);
  f=function(bind,lab,v,step,t,min,max){return '<label class="nf" title="'+t+'"><b data-scrub="'+bind+'" data-sstep="'+step+'">'+lab+'</b><input type="number" inputmode="decimal" step="any" id="ob-'+bind.slice(2)+'" data-bind="'+bind+'" value="'+Math.round(v*10)/10+'"'+(min!=null?' min="'+min+'"':'')+(max!=null?' max="'+max+'"':'')+'></label>'};
  var h='<span class="onm" title="'+U.esc(V.elName(el))+'">'+U.esc(V.elName(el))+'</span><span class="sep"></span>';
  if(el.type==='text')h+=f('e.size','Буквы',el.size,10,'Высота букв, мм',40,600);
  else if(el.type==='circle')h+=f('e.w','Ø',el.w,st,'Диаметр, мм',60);
  else if(el.type==='person')h+='<span class="ohint">рост '+Math.round(el.h/10)+' см</span>';
  else if(el.type!=='balloon'&&el.type!=='foil'){h+=f('e.w','Ш',el.w,st,'Ширина, мм',60);if(free)h+=f('e.h','В',el.h,st,'Высота, мм',60)}
  h+=f('e.x','X',el.x,st,'От левой стены, мм')+f('e.y','↑',el.y,st,'От пола, мм',0)+f('e.z','⤢',SC.zOf(S,el),50,'От стены вглубь, мм',0,E.ZMAX);
  if(M.canRot(el))h+=f('e.rot','⟳',el.rot||0,5,'Поворот, °',-180,180);
  var ord=SC.order(S),i=ord.indexOf(S.els.indexOf(el));
  return h+'<span class="ohint om">мм · тяните подпись</span><span class="sp"></span>'+ib('down','down','На слой назад','',i<=0)+ib('up','up','На слой вперёд','',i>=S.els.length-1)+ib('dup','copy','Дублировать')+ib('lib-open','star','В мои шаблоны')+ib('del','del','Удалить','dng')};
V.statbar = function(){var z=R.zone,bad=R.checks.filter(function(c){return !c.ok&&c.level!=='info'}),nb=bad.filter(function(c){return c.level==='bad'}).length;
  return '<span class="zm"><button type="button" class="ib s" data-act="zoom-out" title="Отдалить" aria-label="Отдалить">'+U.ico.zout+'</button><button type="button" class="zl" id="zoomlbl" data-act="zoom-fit" title="Вписать сцену">'+Math.round(UI.zoom.z*100)+' %</button><button type="button" class="ib s" data-act="zoom-in" title="Приблизить" aria-label="Приблизить">'+U.ico.zin+'</button><button type="button" class="ib s" data-act="zoom-fit" title="Вписать сцену" aria-label="Вписать сцену">'+U.ico.fit+'</button></span>'+
    (S.els.length?'<span>зона '+U.n(z.w/1000,1)+' × '+U.n(z.d/1000,1)+' м</span>':'')+'<span>'+S.els.length+' эл.</span><button type="button" class="sck" data-act="dopen" data-id="checks"><i class="cdot '+(nb?'bad':bad.length?'warn':'ok')+'"></i>'+(bad.length?'проверки: '+bad.length:'проверки пройдены')+'</button><span class="sp"></span><span>цена клиенту '+U.eur0(R.eco.cur.gross)+'</span>'};
V.hasClip = function(){if(UI.clip)return true;try{return !!localStorage.getItem('fotozona.clip.v1')}catch(e){return false}};
V.MENUS = {file:'Файл',edit:'Правка',view:'Вид',calc:'Расчёты'};
V.mmenu = function(id){var it=function(act,lab,o){o=o||{};return '<button type="button" class="mi'+(o.on?' on':'')+'" data-act="'+act+'"'+(o.id?' data-id="'+o.id+'"':'')+(o.dis?' disabled':'')+'><i class="mck" aria-hidden="true">'+(o.on?'✓':'')+'</i><span>'+lab+'</span>'+(o.k?'<kbd>'+o.k+'</kbd>':'')+'</button>'},hr='<hr>',el=V.sel(),ms=V.multi().length>1;
  if(id==='file')return it('menu','Проекты и шаблоны…')+hr+it('save','Сохранить',{k:'Ctrl+S'})+it('cloud-save-new','Сохранить как новый',{dis:!IO.db||!S.pid})+hr+it('json','Скачать проект файлом')+'<label class="mi"><i class="mck"></i><span>Открыть файл проекта…</span><input type="file" id="mfile" accept=".json,application/json" aria-label="Открыть файл проекта"></label>'+it('png','Скачать сцену картинкой PNG')+hr+it('export-all',window.SITE?'Выгрузить всё для переноса':'Перенести всё на сайт: выгрузить файл')+'<label class="mi"><i class="mck"></i><span>'+(window.SITE?'Загрузить перенос из claude.ai…':'Загрузить файл переноса…')+'</span><input type="file" id="mfile2" accept=".json,application/json" aria-label="Файл переноса"></label>'+hr+it('photo','Собрать сцену по фото…');
  if(id==='edit')return it('undo','Отменить',{k:'Ctrl+Z',dis:UI.hi<=0})+it('redo','Вернуть',{k:'Ctrl+Y',dis:UI.hi>=UI.hist.length-1})+it('dopen','История шагов',{id:'hist'})+hr+it(ms?'gdup':'dup','Дублировать',{k:'Ctrl+D',dis:!el&&!ms})+it(ms?'gdel':'del','Удалить',{k:'Del',dis:!el&&!ms})+it('lib-open','В мои шаблоны',{dis:!el&&!ms})+hr+it('copy','Копировать',{k:'Ctrl+C',dis:!el&&!ms})+it('cut','Вырезать',{k:'Ctrl+X',dis:!el&&!ms})+it('paste','Вставить',{k:'Ctrl+V',dis:!V.hasClip()})+hr+it('selall','Выделить всё',{k:'Ctrl+A',dis:!S.els.length})+it('multi','Выбирать несколько',{on:UI.mmode})+it('gclear','Снять выделение',{k:'Esc',dis:!el&&!ms});
  if(id==='view')return it('vt','Размеры на сцене',{id:'dims',on:S.show.dims})+it('vt','Точки накладок',{id:'grid',on:S.show.grid})+(S.ref?it('ref-toggle','Фото-образец поверх сцены',{on:S.ref.on}):'')+it('night','Вечерний вид',{on:UI.night})+(S.els.some(function(e){return e.type==='person'})?it('people','Люди для масштаба',{on:S.els.some(function(e){return e.type==='person'&&!e.hide})}):'')+hr+it('zoom-in','Приблизить',{k:'+'})+it('zoom-out','Отдалить',{k:'−'})+it('zoom-fit','Вписать сцену',{k:'0'})+hr+it('dock','Панели справа',{on:UI.dock!=='mini'})+it('theme','Тёмная тема',{on:themeNow()==='dark'});
  if(id==='calc')return V.TABS.slice(1).map(function(t,i){return it('tab',t[1],{id:t[0],k:String(i+1),on:UI.tab===t[0]})}).join('');
  return ''};
