/* ===== model.js — scene state, element construction, templates, holiday kits. No DOM. ===== */
var M = {};
M._n = 0;
M.uid = function(){M._n++;return 'e'+M._n.toString(36)+Math.random().toString(36).slice(2,6)};

M.defaults = function(){return {
  v:1, name:'Новая фотозона', brand:'Konfetti Deco',
  room:{w:5200,h:3000,moldings:true,wall:''},
  floor:{mat:false,color:'#E9C4CF'}, k:{},
  frame:'wood', holiday:'hanukkah', palette:'emerald',
  layout:{step:250},
  stab:{F:60,h:1.5,req:1.5,bag:10,outdoor:false},
  balloons:{density:'std',reserve:10,greens:true},
  eco:{events:40,years:3,repair:10,kitUses:12,misc:15,people:2,hours:3.5,prep:2,rate:25,transport:30,trips:2,markup:60,vat:false},
  prices:{},
  client:{name:'',date:'',place:'',contacts:'',note:'Монтаж и демонтаж включены. Площадка: ровный пол по размеру зоны, розетка 230 В рядом с зоной.',deposit:30,valid:14,round:5},
  show:{dims:false,grid:false},
  els:[]
}};

/* text box size. In the browser M.measure is replaced by a canvas measurement. */
M.measure = function(line,font,px){return line.length*px*(D.FONT_K[font]||.5)};
M.textSize = function(el){
  var px=el.size/0.66, lines=String(el.text||' ').split('\n'), w=0;
  lines.forEach(function(l){w=Math.max(w,M.measure(l,el.font,px)+(el.style==='neon'?px*0.06*l.length:0))});
  return {w:Math.max(60,Math.round(w)),h:Math.round(lines.length*px*1.04)};
};
/* keep derived sizes consistent after any change */
M.fit = function(el){
  if(el.type==='prop'&&D.FREE_H[el.kind]){el.w=Math.max(el.kind==='gift'||el.kind==='easel'?100:200,Math.round(el.w));el.h=Math.max(80,Math.round(el.h||el.w*(el.kind==='easel'?(D.EASEL_H[el.design]||2.7):el.kind==='gift'?(D.GIFT_SHAPE[el.shape]||D.GIFT_SHAPE.cube)[1]:D.ASPECT[el.kind])))}
  else if(el.type==='sym'||el.type==='prop'){el.w=Math.max(80,Math.round(el.w));el.h=Math.round(el.w*(D.ASPECT[el.kind]||1));
    if(el.kind==='digit'){var n=Math.max(1,String(el.text||'1').length);el.h=Math.round(el.w/n*1.5)}}
  if(el.type==='balloon'){if(!D.BSIZE[el.size])el.size=12;el.w=el.h=D.BSIZE[el.size]}
  if(el.type==='person'){if(!D.PERSON[el.kind])el.kind='man';var pp=D.PERSON[el.kind];el.h=pp.h;el.w=Math.round(pp.h*pp.ar)}   // real height, never stretched
  if(el.type==='pic'){el.w=Math.max(80,Math.round(el.w));el.h=Math.max(40,Math.round(el.w*(el.ar||1)))}
  if(el.type==='harch'){el.w=Math.max(300,el.w);el.h=Math.max(400,el.h);el.r=Math.max(100,Math.min(el.r||el.w,el.w,el.h))}
  if(el.type==='cluster'){el.w=Math.max(200,Math.round(el.w));el.h=Math.max(150,Math.round(el.h||el.w*0.7))}
  if(el.type==='circle'){el.w=Math.max(600,el.w);el.h=el.w}
  if(el.type==='arch'){el.w=Math.max(300,el.w);el.h=Math.max(Math.round(el.w/2),el.h)}
  if(el.type==='rect'){el.w=Math.max(300,el.w);el.h=Math.max(300,el.h);el.r=Math.max(0,Math.min(el.r||0,300,el.w/2,el.h/2))}
  if(el.type==='portal'){el.w=Math.max(700,el.w);el.h=Math.max(Math.round(el.w/2)+300,el.h);el.nw=Math.max(300,Math.min(el.nw,el.w-300));el.ny=Math.max(0,Math.min(el.ny,400));el.nh=Math.max(Math.round(el.nw/2)+100,Math.min(el.nh,el.h-el.ny-160-Math.round((el.w-el.nw)/4)))}
  if(el.type==='uarch'){el.w=Math.max(500,el.w);el.h=Math.max(Math.round(el.w/2)+200,el.h);el.t=Math.max(100,Math.min(el.t,Math.round(el.w/2)-120,320))}
  if(el.type==='foil'){if(!D.FOIL_NAME[el.kind])el.kind='digit';var zs=D.FOIL_SIZES[el.kind];if(zs.indexOf(+el.size)<0)el.size=zs[zs.length-1];el.size=+el.size;if(el.size<=16)el.string=false;
    var fh=D.FOIL_H[el.size];el.h=fh;el.w=Math.round(el.kind==='digit'||el.kind==='letter'?fh*.64:el.kind==='heart'?fh*1.06:fh)}
  if(el.type==='flora'){if(!D.FLORA_NAME[el.kind])el.kind='flowers';if(el.shape==='pile'){delete el.pts;el.w=Math.max(200,Math.round(el.w));el.h=Math.max(150,Math.round(el.h||el.w*.7))}
    else{var fq=E.validPts(el.pts);el.w=Math.max(fq?200:250,Math.round(el.w));el.h=Math.max(fq?200:300,Math.round(el.h||el.w))}}
  if(el.type==='drape'){if(!D.DRAPE_NAME[el.kind])el.kind='swag';el.w=Math.max(400,Math.round(el.w));el.h=Math.max(300,Math.round(el.h||el.w*.6));
    if(E.isTie(el)){var tn=D.TIE_PTS[el.kind].length;if(!E.validPts(el.pts)||el.pts.length!==tn)el.pts=D.TIE_PTS[el.kind].map(function(q){return q.slice()});else el.pts=el.pts.map(function(q,i){var r=i%3;return [Math.max(0,Math.min(1,+q[0])),r===2?1:Math.max(0,Math.min(r===1?.95:.85,+q[1]))]});if(!D.TIE_NAME[el.tb])el.tb='band'}
    else{delete el.pts;delete el.tb}}
  if(el.type==='neon')M.neonFit(el);
  if(el.type==='garland'){var fp=E.validPts(el.pts);el.w=Math.max(fp?200:300,Math.round(el.w));el.h=Math.max(fp?200:600,Math.round(el.h))}
  if(el.type==='text'){var c=el.x+(el.w||0)/2,s=M.textSize(el);el.w=s.w;el.h=s.h;if(isFinite(c)&&el._c!==false)el.x=Math.round(c-el.w/2)}
  return el;
};
M.neonFit = function(el){
  if(!D.NEON_KIND[el.kind])el.kind='ring';if(!D.NEON_TUBE[el.tube])el.tube='l';el.glow=el.glow===undefined?2:Math.max(0,Math.min(3,Math.round(+el.glow)||0));if(!D.NEON_BASE[el.base])el.base='clips';
  if(!/^#[0-9a-fA-F]{6}$/.test(el.color||''))el.color='#FF5FA2';
  if(el.kind==='line'){if(!E.validPts(el.pts))el.pts=[[0,.5],[.34,.5],[.67,.5],[1,.5]];el.pts=el.pts.map(function(q){return [+q[0],+q[1]]});el.w=Math.max(100,Math.round(el.w||1500));el.h=Math.max(60,Math.round(el.h||200));delete el.r;delete el.arc}
  else{delete el.pts;el.w=Math.max(150,Math.round(el.w||900));el.h=Math.max(150,Math.round(el.h||el.w));
    if(el.kind==='rect'){el.r=Math.max(0,Math.min(Math.round(Math.min(el.w,el.h)/2),Math.round(+el.r||0)));delete el.arc}
    else{el.arc=Math.max(30,Math.min(360,Math.round((+el.arc||360)/5)*5));delete el.r}}
  return el};
M.canRot = function(el){return !E.isBg(el)&&el.type!=='person'&&!(el.type==='neon'&&el.kind==='line')&&el.type!=='garland'&&el.type!=='flora'&&el.type!=='drape'};
M.isPath = function(el){return E.isTie(el)||el.type==='garland'||(el.type==='flora'&&el.shape!=='pile')||(el.type==='neon'&&el.kind==='line')};
M.floorOnly = function(el){return false};   // since version 13 everything moves freely: height and depth are the element's own
/* depth of a new element from the scene around it */
M.autoZ = function(S,el){return Math.round(E.zRule(S,el,E.zMap(S)))};
M.ensureZ = function(S){var Z=E.zMap(S);S.els.forEach(function(e){if(!(isFinite(e.z)&&e.z!==null&&e.z!==''))e.z=Z[e.id];e.z=Math.max(0,Math.min(E.ZMAX,Math.round(+e.z)))})};
/* what rides along when an element moves in depth: decor hung on a background, things standing on a plinth or table */
M.riders = function(S,el,top){
  var z=isFinite(el.z)?el.z:0,bg=E.isBg(el)||E.isBackdrop(el);
  return S.els.filter(function(e){if(e===el||E.isBg(e)||E.isBackdrop(e))return false;var ez=isFinite(e.z)?e.z:0,cx=e.x+e.w/2;
    if(ez<z-1||ez>z+30||cx<el.x||cx>el.x+el.w)return false;
    if(bg)return false;
    return el.type==='prop'&&top&&e.y>0&&Math.abs(e.y-top(el,cx))<25}).concat(bg?M.hung(S,el):[])};
/* decor hung on a background: its centre is on it, and of the backgrounds behind the decor this one is the nearest */
M.hung = function(S,el){
  var Z=E.zMap(S),z=Z[el.id]||0,hosts=S.els.filter(function(b){return E.isBg(b)||E.isBackdrop(b)}),inn=function(b,x,y){return x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h};
  return S.els.filter(function(e){if(E.isBg(e)||E.isBackdrop(e)||E.isFloorish(e))return false;var ez=Z[e.id]||0,cx=e.x+e.w/2,cy=e.y+e.h/2;
    if(ez<z-1||ez>z+E.SP_MAX+60||!inn(el,cx,cy))return false;
    var best=null;hosts.forEach(function(b){if(inn(b,cx,cy)&&Z[b.id]<=ez+1&&(!best||Z[b.id]>Z[best.id]))best=b});return best===el})};


M.make = function(S,type,d,at){
  var el={id:M.uid(),type:type,x:0,y:0};
  for(var k in d)el[k]=d[k];
  if(E.isBg(el))el.tone=S.els.filter(E.isBg).length%4;
  if(el.type==='text'){el.w=0;el._c=false}
  M.fit(el);delete el._c;
  var main=M.main(S), cx=at&&at.cx!=null?at.cx:(main?main.x+main.w/2:S.room.w/2);
  el.x=Math.round(cx-el.w/2);
  if(at&&at.y!=null)el.y=at.y;
  else if((E.isBg(el)&&el.type!=='circle')||((el.type==='sym'||el.type==='pic')&&el.mount==='floor')||el.type==='prop'||el.type==='person'||el.type==='garland'||el.type==='cluster'||el.type==='flora'||(el.type==='foil'&&!el.string)||(el.type==='text'&&(el.style==='marquee'||el.stand==='floor')))el.y=el.type==='text'&&el.stand==='floor'?Math.max(900,Math.round((main?main.h*.45:1200))):0;
  else if(el.type==='drape'&&(el.kind==='backdrop'||E.isTie(el)))el.y=0;
  else if(el.type==='drape')el.y=main?Math.max(0,main.y+main.h-el.h+100):Math.max(0,S.room.h-el.h-300);
  else el.y=main?Math.round(main.y+main.h*0.6-el.h/2):Math.round(S.room.h*0.5);
  M.clamp(S,el);el.z=M.autoZ(S,el);
  return el;
};
M.clamp = function(S,el){
  // the picture is what the camera sees: things in front are drawn bigger around the room centre, so near the side
  // walls they would leave the frame. Keep at least three quarters of every element in the picture.
  var sc=typeof SC!=='undefined'&&isFinite(el.z)&&el.z!==null?SC.sc(el.z):1,cx=S.room.w/2;
  el.x=Math.max(cx+(-el.w*sc*0.25-cx)/sc,Math.min(cx+(S.room.w-el.w*sc*0.75-cx)/sc,el.x));
  el.y=Math.max(0,Math.min(S.room.h-el.h*0.5,el.y));
  el.x=Math.round(el.x);el.y=Math.round(el.y);
  if(el.z!==undefined){el.z=+el.z;if(!isFinite(el.z))delete el.z;else el.z=Math.max(0,Math.min(E.ZMAX,Math.round(el.z)))}
};
M.main = function(S){var best=null,ba=0;S.els.forEach(function(el){if(E.isBg(el)){var a=E.geom(el).area*(el.type==='uarch'?0.3:1);if(a>ba){ba=a;best=el}}});return best};
M.find = function(S,id){for(var i=0;i<S.els.length;i++)if(S.els[i].id===id)return S.els[i];return null};

/* swap the holiday kit: the backgrounds stay, inscriptions and props change */
M.applyHoliday = function(S,id){
  var H=D.holiday(id), main=M.main(S);
  S.holiday=id;
  S.els=S.els.filter(function(e){return !e.kit});
  var cx=main?main.x+main.w/2:S.room.w/2, hw=main?main.w/2:750, my=main?main.y:0, mh=main?main.h:2200;
  var lastBg=-1;S.els.forEach(function(e,i){if(E.isBg(e))lastBg=i});
  var wall=[],floor=[];
  var tx=S.els.filter(function(e){return e.type==='text'})[0];
  var fitTx=function(t){while(t.w>hw*2-220&&t.size>80){t.size-=10;M.fit(t)}};
  if(tx){tx.text=H.text;M.fit(tx);if(main&&tx.x+tx.w/2>main.x&&tx.x+tx.w/2<main.x+main.w)fitTx(tx)}
  else{var mc=main?(main.color||D.pal(S.palette).c[(main.tone||0)%4]):'#888888',lum=(parseInt(mc.slice(1,3),16)*.299+parseInt(mc.slice(3,5),16)*.587+parseInt(mc.slice(5,7),16)*.114)/255;
    var t=M.make(S,'text',{text:H.text,size:Math.max(90,Math.min(170,Math.round(hw*2*0.1/10)*10)),style:lum>.62?'gold':'neon',font:'serif'},{cx:cx,y:Math.round(my+mh*0.57)});fitTx(t);t.x=Math.round(cx-t.w/2);wall.push(t)}
  H.kit.forEach(function(k){
    var el;
    if(k[0]==='sym'&&k[3]==='wall'){el=M.make(S,'sym',{kind:k[1],w:k[2],mount:'wall'},{cx:cx+k[4]*hw,y:0});el.y=Math.round(my+k[5]*mh-el.h/2);el.kit=true;wall.push(el)}
    else if(k[0]==='sym'){var d={kind:k[1],w:k[2],mount:'floor'};if(k[1]==='digit')d.text=id==='grad'?'27':'5';el=M.make(S,'sym',d,{cx:cx+k[4]*hw,y:0});el.kit=true;floor.push(el)}
    else{el=M.make(S,'prop',{kind:k[1],w:k[2]},{cx:cx+k[3]*hw,y:0});el.kit=true;floor.push(el)}
  });
  S.els.splice.apply(S.els,[lastBg+1,0].concat(wall));
  S.els=S.els.concat(floor);
  return S;
};

/* neon needs a dark background and gold letters a light one: switch between the two when the palette changes */
M.autoInk = function(S){
  S.els.forEach(function(t){if(t.type!=='text'||t.color||t.style==='flat')return;
    var host=null,cx=t.x+t.w/2,cy=t.y+t.h/2;S.els.forEach(function(b){if(E.isBg(b)&&cx>b.x&&cx<b.x+b.w&&cy>b.y&&cy<b.y+b.h)host=b});
    if(!host)return;var c=(host.surf==='sequin'||host.surf==='foil')?(D.SEQ[host.seq]&&host.seq!=='custom'?D.SEQ[host.seq].c:(host.color||D.SEQ.gold.c)):(host.color||D.pal(S.palette).c[(host.tone||0)%4]),lum=(parseInt(c.slice(1,3),16)*.299+parseInt(c.slice(3,5),16)*.587+parseInt(c.slice(5,7),16)*.114)/255;
    var want=lum>.62?'gold':'neon';if(t.style!==want){t.style=want;M.fit(t)}});
};
/* bring a loaded project to the current shape: fill missing settings, drop what cannot be drawn */
M.TYPES = {person:1,neon:1,arch:1,portal:1,uarch:1,harch:1,rect:1,circle:1,garland:1,cluster:1,text:1,sym:1,prop:1,balloon:1,pic:1,foil:1,flora:1,drape:1};
M.normalize = function(o){
  var d=M.defaults(),k,j;if(!o||typeof o!=='object'||!Array.isArray(o.els))return null;
  for(k in d){if(o[k]===undefined||o[k]===null)o[k]=d[k];
    else if(typeof d[k]==='object'&&!Array.isArray(d[k])){if(typeof o[k]!=='object')o[k]=d[k];else for(j in d[k])if(o[k][j]===undefined||o[k][j]===null||(typeof d[k][j]==='number'&&!isFinite(+o[k][j])))o[k][j]=d[k][j]}}
  o.els=o.els.filter(function(e){return e&&M.TYPES[e.type]&&isFinite(+e.x)&&isFinite(+e.y)&&isFinite(+e.w)&&((e.type!=='sym'&&e.type!=='prop')||D.ASPECT[e.kind])&&(e.type!=='garland'||D.GSHAPE_NAME[e.shape])&&(e.type!=='flora'||D.GSHAPE_NAME[e.shape]||e.shape==='pile')&&(e.type!=='text'||(D.STYLE_NAME[e.style]&&D.FONTS[e.font]))});
  o.els.forEach(function(e){if(!e.id)e.id=M.uid();e.x=+e.x;e.y=+e.y;e.w=+e.w;if(e.h!==undefined)e.h=+e.h||e.w;
    if(e.type==='portal'){e.nw=+e.nw||e.w*.6;e.nh=+e.nh||e.h*.7;e.ny=+e.ny||0;e.insert=e.insert||'slats'}
    if(e.type==='uarch')e.t=+e.t||160;if(e.type==='balloon'){e.size=+e.size;if(!D.FIN_NAME[e.fin])e.fin='latex'}if(e.type==='pic'){e.ar=+e.ar>0?+e.ar:1;e.im=String(e.im||'');if(e.im0!==undefined)e.im0=String(e.im0);if(e.cut!==undefined)e.cut=+e.cut||0;if(e.name!==undefined)e.name=String(e.name).slice(0,40)}
    ['color','insColor'].forEach(function(c){if(e[c]!==undefined&&!/^#[0-9a-fA-F]{6}$/.test(e[c]))delete e[c]});if(e.cols&&(!Array.isArray(e.cols)||e.cols.length!==5||!e.cols.every(function(c){return /^#[0-9a-fA-F]{6}$/.test(c)})))delete e.cols;
    ['hide','lock'].forEach(function(k){if(e[k])e[k]=true;else delete e[k]});
    if(e.rot!==undefined){e.rot=Math.round(+e.rot*10)/10;if(!isFinite(e.rot)||!e.rot||!M.canRot(e))delete e.rot;else e.rot=((e.rot+180)%360+360)%360-180}
    if(e.type==='garland'||e.type==='cluster'){if(e.n!==undefined){e.n=Math.round(+e.n);if(!(e.n>0))delete e.n;else e.n=Math.min(600,e.n)}if(e.mix!==undefined&&!E.MIX[e.mix])delete e.mix}
    if(e.type==='garland'||e.type==='cluster'){if(e.share!==undefined&&!(Array.isArray(e.share)&&e.share.length===5&&e.share.every(function(v){return isFinite(+v)&&+v>=0&&+v<=1000})))delete e.share;if(e.share)e.share=e.share.map(function(v){return Math.round(+v*10)/10});
      if(e.fins!==undefined&&!(Array.isArray(e.fins)&&e.fins.length===5&&e.fins.every(function(f){return E.FINS.indexOf(f)>=0})))delete e.fins;
      ['g24','g36'].forEach(function(k){if(e[k]!==undefined){e[k]=Math.max(0,Math.min(50,Math.round(+e[k]||0)));if(!e[k])delete e[k]}})}
    if(e.type==='foil'){e.text=String(e.text||'').replace(/[^0-9A-Za-zА-Яа-яЁё&?!]/g,'').slice(0,1).toUpperCase();if(!e.text&&(e.kind==='digit'||e.kind==='letter'))e.text=e.kind==='digit'?'1':'A';e.string=!!e.string}
    if(e.type==='flora'||e.type==='drape'||e.type==='foil'){if(e.cols&&!(Array.isArray(e.cols)&&e.cols.every(function(c){return /^#[0-9a-fA-F]{6}$/.test(c)})))delete e.cols;if(e.n!==undefined){e.n=Math.round(+e.n);if(!(e.n>0))delete e.n;else e.n=Math.min(400,e.n)}}
    if(e.type==='flora'){if(e.pts!==undefined&&(!E.validPts(e.pts)||e.shape==='pile'))delete e.pts;if(e.pts)e.pts=e.pts.map(function(q){return [+q[0],+q[1]]});if(e.shape==='free'&&!e.pts)e.shape='corner'}
    if(e.type==='drape'){e.fab=E.fabOf(e);e.sheer=e.fab==='chiffon'}
    if(e.type==='flora'){if(e.fl!==undefined&&!D.FL_NAME[e.fl])delete e.fl;if(e.leaf!==undefined&&!D.LEAF_NAME[e.leaf])delete e.leaf}
    if(e.type==='prop'){
      if(e.kind==='easel'){if(!D.EASEL_NAME[e.design])e.design='wood';if(['rect','arch','round'].indexOf(e.board)<0)e.board='rect';e.flw=!!e.flw}
      if(e.kind==='gift'){if(!D.GIFT_SHAPE[e.shape])e.shape='cube';if(!D.GIFT_PAT[e.pat])e.pat='plain'}
      if(e.kind==='giftpile')e.n=Math.max(3,Math.min(30,Math.round(+e.n||12)));
      if(e.kind==='candelabra')e.n=+e.n===3?3:5;
      if(e.kind==='csticks')e.n=Math.max(2,Math.min(9,Math.round(+e.n||5)));
      if(e.rib!==undefined&&!/^#[0-9a-fA-F]{6}$/.test(e.rib))delete e.rib;
      if(e.lid!==undefined&&(!/^m(frame|glass|cyl|set)$/.test(e.kind)||!D.LID_NAME[e.lid]||e.lid==='open'))delete e.lid;if(e.lc!==undefined&&!/^#[0-9a-fA-F]{6}$/.test(e.lc))delete e.lc}
    if(e.type==='text'&&e.stand!==undefined&&!D.STAND_NAME[e.stand])delete e.stand;
    if(e.type==='prop'&&e.text!==undefined)e.text=String(e.text).replace(/\r/g,'').split('\n').slice(0,2).join('\n').slice(0,40);
    if(e.type==='garland'){if(e.pts!==undefined&&!E.validPts(e.pts))delete e.pts;if(e.pts)e.pts=e.pts.map(function(q){return [+q[0],+q[1]]});if(e.shape==='free'&&!e.pts)e.shape='asym'}
    if(e.k&&typeof e.k!=='object')delete e.k;if(e.surf&&e.surf!=='sequin'&&e.surf!=='image'&&e.surf!=='greens'&&e.surf!=='foil')delete e.surf;if(e.type==='text'){e.size=+e.size||150;e.text=String(e.text||' ')}
    if(e.z!==undefined&&!(e.z!==null&&e.z!==''&&isFinite(+e.z)))delete e.z;
    M.fit(e);M.clamp(o,e)});
  M.ensureZ(o);o.els.forEach(function(e){M.clamp(o,e)});
  if(!/^#[0-9a-fA-F]{6}$/.test(o.floor.color))o.floor.color='#E9C4CF';if(o.room.wall&&!/^#[0-9a-fA-F]{6}$/.test(o.room.wall))o.room.wall='';if(o.room.floorC&&!/^#[0-9a-fA-F]{6}$/.test(o.room.floorC))delete o.room.floorC;
  if(o.ref){var rf=o.ref;if(typeof rf!=='object'||!rf.im||!(+rf.w>0)||!(+rf.h>0)||!isFinite(+rf.x)||!isFinite(+rf.y))delete o.ref;else{rf.im=String(rf.im);rf.x=+rf.x;rf.y=+rf.y;rf.w=+rf.w;rf.h=+rf.h;rf.on=rf.on!==false;rf.z=isFinite(+rf.z)&&rf.z!==null&&rf.z!==''?Math.max(0,Math.min(E.ZMAX,+rf.z)):M.refZ(o);rf.op=Math.max(10,Math.min(100,+rf.op||45));if(rf.info&&typeof rf.info!=='object')delete rf.info}}
  if(o.frame!=='metal')o.frame='wood';if(!E.DENS[o.balloons.density])o.balloons.density='std';
  o.palette=D.pal(o.palette).id;o.holiday=D.holiday(o.holiday).id;o.name=String(o.name).slice(0,80);
  return o;
};
/* the plane the photo underlay was measured in: the rear backgrounds */
M.refZ = function(S){var b=S.els.filter(E.isBg);if(!b.length)b=S.els.filter(E.isBackdrop);var Z=E.zMap(S);return b.length?Math.min.apply(null,b.map(function(e){return Z[e.id]})):0};
/* where a freshly added background lands: overlapping the outermost one by 300 mm, one step forward, so the layers link up */
M.placeBg = function(S,el){
  var bgs=S.els.filter(function(b){return E.isBg(b)&&b!==el});if(!bgs.length){el.x=Math.round((S.room.w-el.w)/2/50)*50;el.z=M.autoZ(S,el);return}
  var x1=Math.max.apply(null,bgs.map(function(b){return b.x+b.w})),x0=Math.min.apply(null,bgs.map(function(b){return b.x}));
  if(x1-300+el.w<=S.room.w-100)el.x=x1-300;else if(x0+300-el.w>=100)el.x=x0+300-el.w;else el.x=Math.round((S.room.w-el.w)/2/50)*50;
  el.z=M.autoZ(S,el);
};

M.template = function(id){
  var S=M.defaults(), add=function(type,d,x,y,extra){var el=M.make(S,type,d,{cx:0,y:y||0});el.x=x;for(var k in (extra||{}))el[k]=extra[k];M.fit(el);S.els.push(el);return el};
  if(id==='three'){
    S.name='Три арки';
    add('arch',{w:1400,h:2200},3100,0,{name:'Задняя арка',tone:2});
    add('arch',{w:1500,h:2400},1900,0,{name:'Главная арка',tone:1});
    add('portal',{w:1200,h:2000,nw:700,nh:1500,ny:150,insert:'slats'},1000,0,{name:'Портал с нишей',tone:0});
    add('arch',{w:600,h:1200},650,0,{name:'Малая арка',tone:3});
    M.applyHoliday(S,'hanukkah');
    add('cluster',{w:900},330,0);
    add('garland',{w:2900,h:2700,shape:'asym'},1820,0);
  } else if(id==='circle'){
    S.name='Круг и арки'; S.palette='bordeaux';
    add('circle',{w:1900},1900,250,{name:'Круг',tone:1});
    add('arch',{w:900,h:2100},1300,0,{name:'Арка левая',tone:0});
    add('arch',{w:700,h:1400},3450,0,{name:'Арка правая',tone:3});
    M.applyHoliday(S,'birthday');
    add('cluster',{w:800},3800,0);
    add('garland',{w:2000,h:2450,shape:'asym',flip:true},1000,0);
  } else if(id==='panel'){
    S.name='Панель и открытые арки'; S.palette='pastel';
    add('rect',{w:2000,h:2300,r:0},1600,0,{name:'Панель',tone:0});
    add('uarch',{w:1100,h:2100,t:160},950,0,{name:'Открытая арка левая',tone:1});
    add('uarch',{w:900,h:1700,t:150},3300,0,{name:'Открытая арка правая',tone:3});
    M.applyHoliday(S,'wedding');
    add('garland',{w:520,h:2100,shape:'column'},3780,0);
  } else if(id==='solo'){
    S.name='Одна арка'; S.palette='navy'; S.stab.bag=15;
    add('arch',{w:1500,h:2300},1850,0,{name:'Арка',tone:1});
    M.applyHoliday(S,'hanukkah');
    add('garland',{w:2100,h:2600,shape:'asym'},1800,0);
  } else if(id==='shine'){
    S.name='Пайетки и полуарка'; S.palette='pastel'; S.holiday='birthday'; S.floor.mat=true; S.floor.color='#EBC9D3';
    add('rect',{w:1000,h:2300,r:0},1000,0,{name:'Панель левая',tone:1});
    add('rect',{w:1200,h:2400,r:0,surf:'sequin',seq:'pink'},1750,0,{name:'Пайеточная панель'});
    add('harch',{w:1100,h:2000,r:1000},2700,0,{name:'Полуарка',tone:1});
    add('sym',{kind:'shell',w:820,mount:'wall'},1940,1500,{color:'#FBF7F0'});
    add('text',{text:'Nicole',size:150,style:'gold',font:'script'},2040,1640);
    add('text',{text:'happy\nbirthday',size:120,style:'gold',font:'script'},2900,1050);
    add('sym',{kind:'shell',w:1150,mount:'floor'},3350,0,{color:'#FBF7F0'});
    add('sym',{kind:'shell',w:760,mount:'floor'},3080,0,{color:'#FFFFFF'});
    add('sym',{kind:'digit',w:330,mount:'floor',text:'1'},2760,0);
    add('sym',{kind:'starfish',w:520,mount:'floor'},1330,0);
    add('prop',{kind:'podr',w:900,h:330},1900,0,{color:'#FFFFFF'});
    add('garland',{w:1500,h:2450,shape:'column'},180,0);
    add('garland',{w:1500,h:1950,shape:'corner'},3300,650);
    [[980,2050,24],[2480,2250,24],[4500,1500,24],[640,1300,18],[4450,620,18],[2600,1180,12],[1540,620,12]].forEach(function(b){add('balloon',{size:b[2],fin:'clear'},b[0],b[1])});
    add('balloon',{size:18,fin:'chrome',color:'#D4AF37'},4250,2380);add('balloon',{size:12,fin:'chrome',color:'#C4C8CF'},4700,2120);
  } else { S.name='Новая фотозона' }
  S.els.forEach(function(e){delete e.z});M.ensureZ(S);S.els.forEach(function(e){M.clamp(S,e)});   // depth as the layout implies, once every element is in place
  return S;
};
