/* ===== photo.js — a photo of a real photo zone becomes an editable scene. No DOM here.
   Claude describes what it sees as a list of boxes (0..1000 across the picture); PH.build turns the list into
   scene elements in millimetres. The one number that fixes the scale is the real height of the tallest background. ===== */
var PH = {};
PH.BG = {arch:1,rect:1,harch:1,uarch:1,portal:1,circle:1};
PH.SYM = {hanukkiah:1,magen:1,star:1,heart:1,rings:1,moon:1,snow:1,cloud:1,tree:1,pumpkin:1,digit:1,shell:1,starfish:1,ngift:1,nheart:1,nstar:1,nmagen:1,nmoon:1};
PH.PROP = {gifts:1,candles:1,dreidel:1,plinths:1,pampas:1,podr:1,podq:1,plc:1,plq:1,mframe:1,mglass:1,mcyl:1,mset:1,gift:1,giftpile:1,candelabra:1,csticks:1,lantern:1,easel:1,table:1};
PH.prompt = function(){return [
'This is a photo of an event photo zone (a decorated backdrop for taking pictures). Break it down into its separate physical parts so that a decorator can rebuild it in a flat front-view editor.',
'',
'Coordinates are integers 0..1000 relative to the picture: x from the LEFT edge, y from the TOP edge. For every part give "box":[x0,y0,x1,y1] of its whole outline, including what is hidden behind other parts (estimate the hidden part; background panels normally stand on the floor).',
'',
'Reply with ONLY one JSON object of this shape:',
'{"floorY":850,"tallestMm":2200,"wall":"#EDEAE4","floor":"#D9D3C8","floorMat":false,"elements":[...],"notes":"..."}',
'- floorY: y of the line where the background panels stand on the floor.',
'- tallestMm: your estimate of the real height in millimetres of the tallest background panel (most are 1800-2400).',
'- wall, floor: colours of the room wall and of the floor as #RRGGBB. floorMat: true if a separate coloured floor covering lies under the zone.',
'- notes: one or two short sentences IN RUSSIAN about what you could not see well or were unsure of.',
'- elements: 3 to 45 parts, listed from the BACK to the FRONT. Each is one of:',
'  {"t":"arch","box":[..],"color":"#RRGGBB"}  panel with a semicircular top',
'  {"t":"rect","box":[..],"color":"#RRGGBB","round":false}  rectangular panel; round:true if its corners are rounded',
'  {"t":"harch","box":[..],"color":"#RRGGBB","side":"right"}  panel with ONE top corner rounded by a large radius; side = which top corner is rounded',
'  {"t":"uarch","box":[..],"color":"#RRGGBB"}  open arch: only a frame, you can see through the middle',
'  {"t":"portal","box":[..],"color":"#RRGGBB"}  arch panel with an arched niche or opening in the middle',
'  {"t":"circle","box":[..],"color":"#RRGGBB"}  round panel',
'  Any of these six may add "surf":"sequin" with "seq":"gold"|"silver"|"pink"|"cham" when the panel is a shimmering sequin wall, or "surf":"foil" with "seq":"silver"|"gold"|"pink"|"cham" when it is covered with crumpled metallic foil (cham = holographic).',
'  {"t":"neon","kind":"ring"|"rect"|"line","box":[..],"color":"#RRGGBB","arc":360}  a glowing neon tube shape that is not lettering: ring (circle or oval; arc = degrees of it that are lit, 180 for a half circle), rect (rectangle frame), line (a straight or wavy strip).',
'  {"t":"garland","box":[..],"shape":"asym","flip":false,"colors":["#..","#.."]}  one continuous organic balloon garland; colors = up to 5 main balloon colours. May add "chrome":["#.."] = which of those colours are shiny chrome or metallic, and "giants":4 = how many extra-large balloons (60-90 cm) it has.',
'     shape "arc": rises from the floor, goes over the top and comes down to the floor on the other side. "asym": runs along the top and comes down the RIGHT side (flip:true = down the LEFT side). "corner": a short piece around the upper RIGHT corner (flip:true = upper left). "column": a vertical column.',
'  {"t":"cluster","box":[..],"colors":[..]}  a compact bunch of balloons: a pile on the floor or a bunch fixed higher up',
'  {"t":"balloon","box":[..],"fin":"latex"|"chrome"|"clear","color":"#RRGGBB","string":false}  one separate balloon; clear = transparent bubble; string:true if it floats on a ribbon. At most 14, the most visible ones.',
'  {"t":"text","box":[..],"text":"HAPPY\\nBIRTHDAY","style":"neon"|"gold"|"flat","font":"vibes","color":"#RRGGBB"}  an inscription, at most two lines, exactly as written. font: the closest of vibes (flowing calligraphy), alex, paris, pinyon (thin formal scripts), script, badscript, caveat (handwriting), pacifico, lobster (bold rounded scripts), serif (classic serif), playfair (high-contrast serif), cinzel (Roman capitals), prata, forum, sans, mont (geometric sans), comfortaa (rounded sans), amatic (narrow hand-drawn capitals).',
'  {"t":"foil","kind":"digit"|"letter"|"star"|"heart"|"round","box":[..],"text":"1","color":"#RRGGBB","string":false}  one foil (metallic) balloon; digits and letters are one character each.',
'  {"t":"drape","kind":"backdrop"|"swag"|"curtain"|"veil","fab":"velvet"|"satin"|"chiffon","box":[..],"color":"#RRGGBB"}  fabric that is part of the decoration. backdrop = a pleated fabric wall hanging from a rod down to the floor; swag = fabric draped across the top; curtain = two side curtains tied back; veil = sheer fabric over a panel.',
'  {"t":"flora","kind":"flowers"|"greens","shape":"corner"|"arc"|"asym"|"column"|"pile","flower":"hydrangea"|"rose"|"peony"|"mix","leaf":"green"|"euca"|"fern"|"gold"|"goldmix","box":[..],"colors":["#..","#..","#.."]}  flowers or leaves; along a line like a garland, or "pile" for one bouquet or spray. colors = up to 3 flower colours.',
'  {"t":"sym","kind":"shell","box":[..],"color":"#RRGGBB","on":"wall"|"floor"}  kind is one of: hanukkiah, magen (star of David), star, heart, rings, moon, snow, cloud, tree, pumpkin, digit, shell, starfish; neon line signs on the wall: ngift (gift box), nheart, nstar, nmagen, nmoon. For digit add "text":"1".',
'  {"t":"prop","kind":"podr","box":[..],"color":"#RRGGBB"}  kind is one of: podr (round podium, cylinder or pouf), podq (rectangular podium or box), plc (ONE tall cylinder plinth), plq (ONE tall rectangular plinth), plinths (a group of cylinders), mframe (metal frame cube), mglass (metal frame cube with glass or acrylic sides), mcyl (metal frame cylinder) — for these three add "top":"open"|"panel"|"mirror"|"marble"|"wood" for what closes the top, gift (ONE gift box: add "shape":"cube"|"tall"|"flat"|"round" and "ribbon":"#RRGGBB"), giftpile (a heap of many gift boxes: add "n":12 and "ribbon"), gifts (a small set of 3 boxes), candles (LED pillar candles), candelabra (one branched candle holder: add "n":3|5), csticks (several single candlesticks of different heights: add "n"), lantern, easel (a sign on an easel: add "design":"wood"|"gold"|"black"|"table", "board":"rect"|"arch"|"round", "text":"what the sign says", "flowers":true if it has flowers on it; color = the board colour), table (a sweets table), dreidel, pampas (vase with dried grass). Things standing on top of a plinth get their own box where they really are.',
'  {"t":"pic","box":[..],"label":"короткое название по-русски","on":"wall"|"floor"}  anything else that matters and fits none of the forms above: a character cut-out, a printed figure, a logo, flowers, a custom shape. It will be cut out of the photo as a picture, so make the box tight.',
'',
'Rules: describe only what is really there. One continuous garland is ONE element. A fabric backdrop counts as the tallest background for tallestMm. Ignore the room itself: furniture, windows, room curtains, lamps, people. Colours are what you see, as #RRGGBB.'
].join('\n')};

/* a description as text (pasted from the chat, with or without a code fence around it) or as an object -> the object, or null */
PH.parse = function(t){
  if(t&&typeof t==='object')return Array.isArray(t.elements)?t:(typeof t.json==='string'?PH.parse(t.json):null);
  var s=String(t||''),a=s.indexOf('{'),b=s.lastIndexOf('}'),o=null;if(a<0||b<=a)return null;s=s.slice(a,b+1);
  try{o=JSON.parse(s)}catch(e){try{o=JSON.parse(s.replace(/[\u201C\u201D]/g,'"').replace(/\u00a0/g,' '))}catch(e2){o=null}}
  if(o&&typeof o==='object'&&!Array.isArray(o.elements)&&typeof o.json==='string')return PH.parse(o.json);
  return o&&typeof o==='object'&&Array.isArray(o.elements)?o:null;
};
PH.hex = function(c,d){return /^#[0-9a-fA-F]{6}$/.test(String(c||''))?String(c).toUpperCase():d};
PH.box = function(b){
  if(!Array.isArray(b)||b.length!==4)return null;var v=b.map(Number);if(!v.every(isFinite))return null;
  var c=function(n){return Math.max(-60,Math.min(1060,n))},x0=c(Math.min(v[0],v[2])),x1=c(Math.max(v[0],v[2])),y0=c(Math.min(v[1],v[3])),y1=c(Math.max(v[1],v[3]));
  return (x1-x0<4||y1-y0<4)?null:[x0,y0,x1,y1];
};
PH.dist = function(a,b){var p=function(h,i){return parseInt(h.slice(1+i*2,3+i*2),16)};return Math.hypot(p(a,0)-p(b,0),p(a,1)-p(b,1),p(a,2)-p(b,2))};
PH.nearestBalloon = function(mm){var best=12,bd=1e9;Object.keys(D.BSIZE).forEach(function(k){var d=Math.abs(D.BSIZE[k]-mm);if(d<bd){bd=d;best=+k}});return best};

/* photo = {id, w, h} in pixels; opt.tall = real height of the tallest background in mm, if the user knows it.
   Returns {S, crops:[{id, box:[x0,y0,x1,y1] px}], stats, notes, scale} or null when nothing usable came back. */
PH.build = function(A,photo,opt){
  opt=opt||{};
  var list=(A&&Array.isArray(A.elements)?A.elements:[]).filter(function(e){return e&&typeof e==='object'&&typeof e.t==='string'}).map(function(e){return {e:e,b:PH.box(e.box)}}).filter(function(q){return q.b}).slice(0,60);
  if(!list.length)return null;
  var W=photo.w,H=photo.h,px=function(b){return [b[0]*W/1000,b[1]*H/1000,b[2]*W/1000,b[3]*H/1000]};
  list.forEach(function(q){q.p=px(q.b)});
  var bgs=list.filter(function(q){return PH.BG[q.e.t]||(q.e.t==='drape'&&q.e.kind==='backdrop')}),ref=bgs.length?bgs:list;
  // the floor line: the given one, unless the backgrounds clearly end somewhere else
  var bots=ref.map(function(q){return q.p[3]}).sort(function(a,c){return a-c}),med=bots[Math.floor(bots.length/2)],floorPx=isFinite(+A.floorY)?Math.max(.2,Math.min(1,+A.floorY/1000))*H:med;
  if(bgs.length&&Math.abs(floorPx-med)>H*.12)floorPx=med;
  var tallPx=Math.max.apply(null,ref.map(function(q){return floorPx-q.p[1]}));if(!(tallPx>20))tallPx=H*.6;
  var given=+opt.tall>0,tallMm=Math.max(800,Math.min(4000,given?+opt.tall:(+A.tallestMm>0?+A.tallestMm:2200))),s=tallMm/tallPx;   // mm per pixel
  var minX=Math.min.apply(null,list.map(function(q){return q.p[0]})),maxX=Math.max.apply(null,list.map(function(q){return q.p[2]}));
  // the editor's camera looks at the middle of the room, so the middle of the photo goes there
  var half=Math.max(W/2-minX,maxX-W/2)*s,roomW=Math.max(3000,Math.min(12000,Math.ceil((2*half+700)/100)*100)),cxR=roomW/2;
  var X=function(xp){return cxR+(xp-W/2)*s},Yb=function(yp){return (floorPx-yp)*s};
  var r50=function(v){return Math.round(v/50)*50},r10=function(v){return Math.round(v/10)*10};
  var S=M.defaults();S.name='Сцена по фото';S.room.w=roomW;S.room.h=6000;S.room.moldings=false;S.holiday='birthday';
  var crops=[],stats={bg:0,air:0,text:0,decor:0,pic:0},out=[];
  // Things that stand on the floor in FRONT of the backgrounds are closer to the camera and look bigger; their feet
  // sit below the floor line. With the camera about 1.4 m above the floor the correction is the ratio of the two
  // distances from the horizon line. An assumption, good to roughly 10-15 %.
  var horizon=floorPx-SC.CAM.h/s;if(horizon<H*.1)horizon=H*.1;
  list.forEach(function(q){
    var e=q.e,p=q.p,pf=(!PH.BG[e.t]&&e.t!=='garland'&&e.t!=='text'&&e.t!=='balloon'&&e.t!=='drape'&&e.t!=='flora'&&p[3]>floorPx+H*.012)?Math.max(.55,(floorPx-horizon)/(p[3]-horizon)):1,w=(p[2]-p[0])*s*pf,h=(p[3]-p[1])*s*pf,cx=cxR+(X((p[0]+p[2])/2)-cxR)*pf,yb=Math.max(0,Yb(p[3])),top=Yb(p[1]),t=e.t,col=PH.hex(e.color,null),el=null,cols;
    if(PH.BG[t]){
      if(t==='circle'){var d=r50(Math.max(600,(w+h)/2));el={type:'circle',w:d,h:d,y:r50(yb)}}
      else{el={type:t,w:r50(Math.max(300,w)),h:r50(Math.max(400,top)),y:0};
        if(t==='harch'){el.flip=e.side==='left';el.r=r50(Math.min(el.w,el.h)*.9)}
        if(t==='rect')el.r=e.round?200:0;
        if(t==='portal'){el.nw=r50(el.w*.58);el.nh=r50(el.h*.72);el.ny=100;el.insert='smooth'}
        if(t==='uarch')el.t=160}
      if(e.surf==='foil'){el.surf='foil';el.seq=D.SEQ[e.seq]&&e.seq!=='custom'?e.seq:'custom';if(el.seq==='custom'&&col)el.color=col}
      else if(e.surf==='sequin'){el.surf='sequin';el.seq=D.SEQ[e.seq]&&e.seq!=='custom'?e.seq:'custom';if(el.seq==='custom'&&col)el.color=col}
      else if(col)el.color=col;
      el.tone=stats.bg%4;el.name=D.TYPE_NAME[t]+' '+(stats.bg+1);stats.bg++;
    } else if(t==='garland'||t==='cluster'){
      cols=(Array.isArray(e.colors)?e.colors:[]).map(function(c){return PH.hex(c,null)}).filter(Boolean).slice(0,5);
      if(t==='garland'){var shape=E.GPRE[e.shape]?e.shape:(w<h*.45?'column':'asym');el={type:'garland',shape:shape,flip:!!e.flip,w:r50(Math.max(300,w)),h:r50(Math.max(600,top-yb)),y:r50(yb)}}
      else el={type:'cluster',w:r50(Math.max(300,w)),h:r50(Math.max(200,h)),y:yb<200?0:r50(yb)};
      if(cols.length){var base=cols.slice();while(cols.length<5)cols.push(base[cols.length%base.length]);el.cols=cols;
        var chr=(Array.isArray(e.chrome)?e.chrome:[]).map(function(c){return PH.hex(c,null)}).filter(Boolean);if(chr.length){el.fins=cols.map(function(c){return chr.indexOf(c)>=0?'chrome':'latex'});if(el.fins.every(function(f){return f==='latex'}))delete el.fins}}
      var gi=Math.max(0,Math.min(20,Math.round(+e.giants||0)));if(gi){el.g36=Math.round(gi/3);el.g24=gi-el.g36;if(!el.g36)delete el.g36;if(!el.g24)delete el.g24}
      stats.air++;
    } else if(t==='neon'&&D.NEON_KIND[e.kind]){
      el={type:'neon',kind:e.kind,w:r10(Math.max(150,w)),h:r10(Math.max(e.kind==='line'?60:150,h)),y:r10(Math.max(0,yb)),color:col||'#FFE3A6',glow:2};
      if(e.kind==='ring'&&+e.arc>0)el.arc=+e.arc;if(e.kind==='line')el.pts=w>=h?[[0,.5],[.5,.5],[1,.5]]:[[.5,0],[.5,.5],[.5,1]];stats.decor++;
    } else if(t==='balloon'){
      var sz=PH.nearestBalloon((w+h)/2),dm=D.BSIZE[sz],cy=Yb((p[1]+p[3])/2);
      el={type:'balloon',size:sz,fin:D.FIN_NAME[e.fin]?e.fin:'latex',string:!!e.string,y:r10(Math.max(0,cy-dm/2))};if(col&&el.fin!=='clear')el.color=col;stats.air++;
    } else if(t==='text'&&String(e.text||'').trim()){
      var lines=String(e.text).replace(/\r/g,'').split('\n').map(function(l){return l.trim()}).filter(Boolean).slice(0,2),n=lines.length||1;
      el={type:'text',text:lines.join('\n').slice(0,60),size:Math.max(40,Math.min(600,r10(h/n/1.04*.66))),style:D.STYLE_NAME[e.style]?e.style:'gold',font:D.FONTS[e.font]?e.font:'serif',x:0,y:0,w:0};
      M.fit(el);if(el.w>0&&w>60){var k=Math.max(.5,Math.min(2,w/el.w));el.size=Math.max(40,Math.min(600,r10(el.size*k)));el.w=0;M.fit(el)}
      el.y=r10(Math.max(0,Yb((p[1]+p[3])/2)-el.h/2));if(col)el.color=col;stats.text++;
    } else if(t==='sym'&&PH.SYM[e.kind]){
      el={type:'sym',kind:e.kind,w:r10(Math.max(80,w)),mount:e.on==='floor'?'floor':'wall',y:e.on==='floor'?0:r10(yb)};
      if(e.kind==='digit'){var dg=String(e.text||'1').replace(/[^0-9A-Za-zА-Яа-я]/g,'').slice(0,3)||'1';el.text=dg;el.w=r10(Math.max(80,h/1.5*dg.length))}
      if(col)el.color=col;stats.decor++;
    } else if(t==='prop'&&PH.PROP[e.kind]){
      el={type:'prop',kind:e.kind,w:r10(Math.max(D.FREE_H[e.kind]?100:80,w)),y:yb>120?r10(yb):0};if(D.FREE_H[e.kind])el.h=r10(Math.max(80,h));if(col)el.color=col;
      var rb=PH.hex(e.ribbon,null);if(rb)el.rib=rb;
      if(/^m(frame|glass|cyl|set)$/.test(e.kind)&&D.LID_NAME[e.top]&&e.top!=='open')el.lid=e.top;
      if(e.kind==='gift')el.shape=D.GIFT_SHAPE[e.shape]?e.shape:'cube';
      if(e.kind==='giftpile')el.n=Math.max(3,Math.min(30,Math.round(+e.n||12)));
      if(e.kind==='candelabra')el.n=+e.n===3?3:5;
      if(e.kind==='csticks')el.n=Math.max(2,Math.min(9,Math.round(+e.n||5)));
      if(e.kind==='easel'){el.design=D.EASEL_NAME[e.design]?e.design:'wood';el.board=['rect','arch','round'].indexOf(e.board)>=0?e.board:'rect';el.flw=!!e.flowers;el.text=String(e.text||'').replace(/\r/g,'').split('\n').slice(0,2).join('\n').slice(0,40)||'Welcome'}
      if(/^m(frame|glass|cyl|set)$|^candelabra$|^csticks$|^lantern$/.test(e.kind)&&!col)el.color='#C9A857';
      stats.decor++;
    } else if(t==='foil'&&D.FOIL_NAME[e.kind]){
      var fs=D.FOIL_SIZES[e.kind],fz=fs[0];fs.forEach(function(z){if(Math.abs(D.FOIL_H[z]-h)<Math.abs(D.FOIL_H[fz]-h))fz=z});
      el={type:'foil',kind:e.kind,size:fz,text:String(e.text||'').slice(0,1).toUpperCase(),string:!!e.string&&fz>16,y:yb>150?r10(yb):0};if(col)el.color=col;stats.air++;
    } else if(t==='drape'&&D.DRAPE_NAME[e.kind]){
      el={type:'drape',kind:e.kind,fab:D.FAB[e.fab]?e.fab:'chiffon',w:r50(Math.max(400,w)),h:r50(Math.max(300,e.kind==='backdrop'?top:h)),y:e.kind==='backdrop'?0:r50(Math.max(0,yb))};if(col)el.color=col;stats.decor++;
    } else if(t==='flora'){
      cols=(Array.isArray(e.colors)?e.colors:[]).map(function(c){return PH.hex(c,null)}).filter(Boolean).slice(0,3);
      var pile2=e.shape==='pile'||!E.GPRE[e.shape];
      el={type:'flora',kind:e.kind==='greens'?'greens':'flowers',shape:pile2?'pile':e.shape,flip:!!e.flip,w:r50(Math.max(250,w)),h:r50(Math.max(200,h)),y:r50(Math.max(0,yb))};
      if(D.FL_NAME[e.flower])el.fl=e.flower;if(D.LEAF_NAME[e.leaf])el.leaf=e.leaf;
      if(cols.length){while(cols.length<5)cols.push(cols[cols.length%Math.max(1,Math.min(3,cols.length))]);el.cols=cols}
      stats.decor++;
    } else {
      // everything else is cut out of the photo
      var cb=[Math.max(0,p[0]),Math.max(0,p[1]),Math.min(W,p[2]),Math.min(H,p[3])];if(cb[2]-cb[0]<8||cb[3]-cb[1]<8)return;
      var cw=(cb[2]-cb[0])*s*pf,chh=(cb[3]-cb[1])*s*pf,fl=e.on==='floor';
      el={type:'pic',im:'',ar:chh/cw,w:r10(Math.max(80,cw)),mount:fl?'floor':'wall',y:fl?0:r10(Math.max(0,Yb(cb[3]))),name:String(e.label||e.kind||'Вырезка из фото').slice(0,40)};
      cx=cxR+(X((cb[0]+cb[2])/2)-cxR)*pf;stats.pic++;
    }
    if(!el)return;
    el.id=M.uid();if(el.x===undefined||el.type==='text')el.x=0;M.fit(el);el.x=Math.round(cx-el.w/2);M.clamp(S,el);
    if(el.type==='pic')crops.push({id:el.id,box:cb});
    if(pf<1)el._pf=pf;
    out.push(el);
  });
  if(!out.length)return null;
  var isBd=function(e){return e.type==='drape'&&e.kind==='backdrop'};
  S.els=out.filter(E.isBg).concat(out.filter(isBd)).concat(out.filter(function(e){return !E.isBg(e)&&!isBd(e)}));
  // backgrounds that stand edge to edge are joined in real life: give such neighbours a 100 mm overlap so that the
  // frame calculation links them with spacers instead of treating each as free-standing
  var row=S.els.filter(function(e){return E.isBg(e)&&e.type!=='circle'}).sort(function(a,c){return a.x-c.x});
  for(var i=1;i<row.length;i++){var a=row[i-1],c=row[i],ov=a.x+a.w-c.x;if(ov>-160&&ov<100)c.x=Math.round(a.x+a.w-100)}
  var topMm=Math.max.apply(null,S.els.map(function(e){return e.y+e.h}));
  S.room.h=Math.max(2600,Math.min(6000,Math.ceil((topMm+250)/100)*100));
  S.els.forEach(function(e){M.clamp(S,e)});
  // depth: the backgrounds as their overlaps imply; things in front at the depth that makes them as big in the
  // picture as in the photo (projected size = real size x s(z), and the photo was measured at the rear plane)
  // what stands right at the floor line goes 100 mm in front of the backgrounds, not where a fresh prop would go
  M.ensureZ(S);var z0=M.refZ(S),s0=SC.sc(z0),zf=Math.max.apply(null,[z0].concat(S.els.filter(function(e){return E.isBg(e)||E.isBackdrop(e)}).map(function(e){return e.z})));
  S.els.forEach(function(e){if(e._pf){e.z=Math.max(zf+100,Math.min(E.ZMAX,Math.round(SC.CAM.d*(1-e._pf/s0)/10)*10));delete e._pf}else if(!E.isBg(e)&&E.isFloorish(e))e.z=Math.min(E.ZMAX,zf+100)});
  var wall=PH.hex(A.wall,null);if(wall)S.room.wall=wall;
  if(A.floorMat){S.floor.mat=true;S.floor.color=PH.hex(A.floor,S.floor.color)}
  // the palette closest to the colours of the backgrounds, so that new elements match
  var bc=S.els.filter(function(e){return (E.isBg(e)||isBd(e))&&e.color}).map(function(e){return e.color});
  if(bc.length){var bp=null,bd=1e9;D.PALETTES.forEach(function(pl){var d=0;bc.forEach(function(c){d+=Math.min.apply(null,pl.c.map(function(pc){return PH.dist(c,pc)}))});if(d<bd){bd=d;bp=pl.id}});S.palette=bp}
  // the photo itself stays as a see-through sample laid exactly where the elements were measured
  S.ref={im:photo.id,on:true,op:45,x:Math.round(X(0)),y:Math.round(Yb(H)),w:Math.round(W*s),h:Math.round(H*s),z:z0};
  return {S:S,crops:crops,stats:stats,notes:String(A.notes||'').slice(0,400),scale:{tallMm:tallMm,given:given,mmPerPx:s,floorPx:floorPx}};
};
/* a photo without analysis: fit it to the room as a sample to build over by hand */
PH.underlay = function(S,photo){
  var h=Math.round(S.room.h*.92),w=Math.round(h*photo.w/photo.h);if(w>S.room.w*.96){w=Math.round(S.room.w*.96);h=Math.round(w*photo.h/photo.w)}
  S.ref={im:photo.id,on:true,op:55,x:Math.round((S.room.w-w)/2),y:-Math.round(h*.06),w:w,h:h};
};
