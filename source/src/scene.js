/* ===== scene.js — draws the photo zone as SVG markup (1 unit = 1 mm). No state changes here. ===== */
var SC = {};
/* the camera: d mm in front of the wall, eye h mm above the floor, aimed straight at the wall. The wall is drawn at
   scale 1; a thing z mm in front of it at s = d/(d-z), around the room centre and the eye line. */
SC.CAM = {d:6500, h:1500};
SC.ZMAX = 2500;                 // floor depth shown and allowed, mm
SC.sc = function(z){z=+z||0;return SC.CAM.d/(SC.CAM.d-Math.max(-1000,Math.min(SC.ZMAX+500,z)))};
SC.FLOOR = Math.ceil((SC.CAM.h*(SC.sc(SC.ZMAX)-1)+340)/10)*10;  // floor strip under the wall in the picture, mm: the 2.5 m and a margin for the buttons
SC.box = function(S,x,y,w,h,z){var s=SC.sc(z),cx=S.room.w/2,C=SC.CAM,bot=C.h+(y-C.h)*s;return {x:cx+(x-cx)*s,y:S.room.h-bot-h*s,w:w*s,h:h*s,s:s}};
SC.zOf = function(S,el){return isFinite(el.z)&&el.z!==null&&el.z!==''?+el.z:((SC._zm&&SC._zm[el.id])||0)};
SC.proj = function(S,el,z){return SC.box(S,el.x,el.y,el.w,el.h,z==null?SC.zOf(S,el):z)};
SC.floorY = function(S,z){return S.room.h+SC.CAM.h*(SC.sc(z)-1)};       // picture y of the floor at depth z
SC.zAtFloorY = function(S,Y){var s=1+(Y-S.room.h)/SC.CAM.h;s=Math.max(1,Math.min(SC.sc(SC.ZMAX),s));return SC.CAM.d*(1-1/s)};
SC.unX = function(S,X,s){var cx=S.room.w/2;return cx+(X-cx)/s};          // picture x -> room x at scale s
SC.fp = function(S,x,z){var s=SC.sc(z),cx=S.room.w/2;return [cx+(x-cx)*s,SC.floorY(S,z)]};   // a floor point
/* drawing order: far to near; the list order decides between things at the same depth */
SC.order = function(S,zm){zm=zm||E.zMap(S);return S.els.map(function(e,i){return i}).sort(function(a,b){return (zm[S.els[a].id]||0)-(zm[S.els[b].id]||0)||a-b})};
SC.GOLD = '#C9A857';
SC._cache = {};

SC.rgb = function(h){h=h.replace('#','');if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]};
SC.hex = function(c){return '#'+c.map(function(v){return ('0'+Math.max(0,Math.min(255,Math.round(v))).toString(16)).slice(-2)}).join('')};
SC.mix = function(a,b,t){var x=SC.rgb(a),y=SC.rgb(b);return SC.hex([x[0]+(y[0]-x[0])*t,x[1]+(y[1]-x[1])*t,x[2]+(y[2]-x[2])*t])};
SC.lite = function(c,t){return SC.mix(c,'#ffffff',t)};
SC.dark = function(c,t){return SC.mix(c,'#000000',t)};
SC.lum = function(c){var r=SC.rgb(c);return (0.299*r[0]+0.587*r[1]+0.114*r[2])/255};
SC.rng = function(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
SC.hash = function(s){var h=7;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return h};
SC.esc = function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')};
function n1(v){return Math.round(v*10)/10}

/* ---------- outline paths of backgrounds, local box, y down ---------- */
SC.archD = function(x,y,w,h){var r=Math.min(w/2,h);return 'M'+n1(x)+','+n1(y+h)+' L'+n1(x)+','+n1(y+r)+' A'+n1(r)+','+n1(r)+' 0 0 1 '+n1(x+w)+','+n1(y+r)+' L'+n1(x+w)+','+n1(y+h)+' Z'};
SC.bgPath = function(el){
  var w=el.w,h=el.h,g=E.geom(el);
  if(el.type==='arch')return SC.archD(0,0,w,h);
  if(el.type==='harch'){var q=g.r;return el.flip?'M0,'+h+' L0,'+n1(q)+' A'+n1(q)+','+n1(q)+' 0 0 1 '+n1(q)+',0 L'+w+',0 L'+w+','+h+' Z':'M0,'+h+' L0,0 L'+n1(w-q)+',0 A'+n1(q)+','+n1(q)+' 0 0 1 '+w+','+n1(q)+' L'+w+','+h+' Z'}
  if(el.type==='circle')return 'M0,'+w/2+' A'+w/2+','+w/2+' 0 1 1 '+w+','+w/2+' A'+w/2+','+w/2+' 0 1 1 0,'+w/2+' Z';
  if(el.type==='rect'){var r=g.rr;return r?'M'+r+',0 L'+(w-r)+',0 A'+r+','+r+' 0 0 1 '+w+','+r+' L'+w+','+(h-r)+' A'+r+','+r+' 0 0 1 '+(w-r)+','+h+' L'+r+','+h+' A'+r+','+r+' 0 0 1 0,'+(h-r)+' L0,'+r+' A'+r+','+r+' 0 0 1 '+r+',0 Z':'M0,0 L'+w+',0 L'+w+','+h+' L0,'+h+' Z'}
  if(el.type==='uarch')return SC.archD(0,0,w,h)+' '+SC.archD(g.t,g.t,g.wi,h-g.t);
  if(el.type==='portal'){var n=g.niche;return SC.archD(0,0,w,h)+' '+SC.archD(n.x0,h-n.y1,n.w,n.h)}
  return '';
};
SC.nicheD = function(el){var g=E.geom(el),n=g.niche;return SC.archD(n.x0,el.h-n.y1,n.w,n.h)};

/* ---------- garland and cluster layouts, cached ---------- */
SC.BR = E.BR;
/* the plan says how many balloons of each size and colour slot there are; here each one gets its place */
SC.balList = function(plan,R){
  var list=[];
  for(var si=0;si<plan.bySize.length;si++){var cs=[];for(var j=0;j<5;j++)for(var k=0;k<plan.cells[si*5+j];k++)cs.push(j);
    for(var i=cs.length-1;i>0;i--){var t=Math.floor(R()*(i+1)),x=cs[i];cs[i]=cs[t];cs[t]=x}
    cs.forEach(function(c){list.push({si:si,ci:c})})}
  return list;
};
SC.garland = function(el,plan){
  var low=el.y<320?el.y:-1,key='g'+el.id+'|'+el.w+'|'+el.h+'|'+el.shape+'|'+(el.flip?1:0)+'|'+plan.n+'|'+(el.mix||'')+'|'+low+'|'+(el.pts?JSON.stringify(el.pts):'')+'|'+plan.cells.join(',');
  if(SC._cache[key])return SC._cache[key];
  var pts=E.garlandPts(el),R=SC.rng(SC.hash(el.id)),cum=[0],i;
  for(i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  var L=cum[cum.length-1]||1,floorY=low<0?1e9:el.h+el.y;
  function at(s){s=Math.max(0,Math.min(L,s));var k=1;while(k<cum.length-1&&cum[k]<s)k++;var t=(s-cum[k-1])/((cum[k]-cum[k-1])||1),a=pts[k-1],b=pts[k];
    var dx=b[0]-a[0],dy=b[1]-a[1],ln=Math.hypot(dx,dy)||1;return {x:a[0]+dx*t,y:a[1]+dy*t,nx:-dy/ln,ny:dx/ln}}
  var list=SC.balList(plan,R),rank=[],rk=0;plan.bySize.forEach(function(c,si){rank[si]=c>0?rk++:-1});   // the largest size present runs along the axis, smaller ones fill around it
  var placed=[],nb=plan.bySize[rank.indexOf(0)]||1,bi=0;
  list.forEach(function(it){
    var si=it.si,r=SC.BR[si],q0=rank[si],best=null,bs=-1e9;
    for(var t=0;t<(q0===0?5:16);t++){
      var s=q0===0?((bi+.25+R()*.5)/Math.max(1,nb))*L:R()*L,p=at(s);
      var off=(q0===0?(R()-.5)*60:q0===1?(R()-.5)*220:q0===2?(R()-.5)*300:(R()<.5?-1:1)*(90+R()*150));
      var x=p.x+p.nx*off,y=Math.min(p.y+p.ny*off,floorY-r*0.92),sc=1e9;
      for(var q=0;q<placed.length;q++){var o=placed[q],d=Math.hypot(x-o.x,y-o.y)-(r+o.r)*.72;if(d<sc)sc=d}
      if(sc>bs){bs=sc;best={x:x,y:y,r:r,ci:it.ci}}
    }
    if(q0===0)bi++;placed.push(best);
  });
  var sprigs=[];for(i=0;i<Math.round(L/330);i++){var p=at((i+.3+R()*.4)*330),sd=R()<.5?-1:1;sprigs.push({x:p.x+p.nx*sd*150,y:p.y+p.ny*sd*150,a:Math.atan2(p.ny*sd,p.nx*sd)+(R()-.5)*.9,s:.8+R()*.5})}
  return SC._cache[key]={b:placed,sprigs:sprigs};
};
/* a cluster standing on the floor is a pile with a flat bottom; lifted off the floor it is a round cloud */
SC.cluster = function(el,plan){
  var fl=el.y>0,key='c'+el.id+'|'+el.w+'|'+el.h+'|'+plan.n+'|'+(el.mix||'')+'|'+(fl?1:0)+'|'+plan.cells.join(',');if(SC._cache[key])return SC._cache[key];
  var R=SC.rng(SC.hash(el.id)+3),out=[],w=el.w,h=el.h,list=SC.balList(plan,R);
  list.forEach(function(it){var r=SC.BR[it.si],best=null,bs=-1e9,rx=Math.max(0,w/2-r),ry=Math.max(0,h/2-r);
    for(var t=0;t<14;t++){var x,yy,sc=1e9,pen;
      if(fl){var a=R()*Math.PI*2,rd=Math.sqrt(R());x=w/2+Math.cos(a)*rd*rx;yy=h/2+Math.sin(a)*rd*ry;pen=Math.hypot((x-w/2)/(rx||1),(yy-h/2)/(ry||1))*40}
      else{var lim=h-r;x=w>2*r?r+R()*(w-2*r):w/2;yy=Math.max(Math.min(r,lim),lim-R()*R()*Math.max(0,h-2*r)*(1-Math.abs(x-w/2)/(w/2)*.7));pen=Math.abs(lim-yy)*.25}
      for(var q=0;q<out.length;q++){var d=Math.hypot(x-out[q].x,yy-out[q].y)-(r+out[q].r)*.7;if(d<sc)sc=d}
      sc-=pen;if(sc>bs){bs=sc;best={x:x,y:yy,r:r,ci:it.ci}}}
    out.push(best)});
  out.sort(function(a,b){return a.y-b.y});
  return SC._cache[key]={b:out};
};

/* flowers and greenery along the same lines as garlands, or heaped in a bouquet */
SC.flora = function(el,fq){
  var key='f'+el.id+'|'+el.w+'|'+el.h+'|'+el.shape+'|'+(el.flip?1:0)+'|'+fq.flowers+'|'+fq.sprigs+'|'+el.kind+'|'+(el.fl||'')+'|'+(el.pts?JSON.stringify(el.pts):''),big=el.fl==='hydrangea'?1.45:1;if(SC._cache[key])return SC._cache[key];
  var R=SC.rng(SC.hash(el.id)+11),fl=[],sp=[],w=el.w,h=el.h,i;
  if(el.shape==='pile'){
    for(i=0;i<fq.sprigs;i++){var ax=w*(.15+R()*.7);sp.push({x:ax,y:h*(.5+R()*.4),a:-180+R()*180,s:.7+R()*.5})}
    for(i=0;i<fq.flowers;i++){var r=(60+R()*40)*big,best=null,bs=-1e9;for(var t=0;t<12;t++){var x=r+R()*Math.max(1,w-2*r),lim=h-r*.8,y=Math.max(r,lim-R()*R()*(h-2*r)*(1-Math.abs(x-w/2)/(w/2)*.6)),sc=1e9;
        for(var q=0;q<fl.length;q++){var d=Math.hypot(x-fl[q].x,y-fl[q].y)-(r+fl[q].r)*.8;if(d<sc)sc=d}if(sc>bs){bs=sc;best={x:x,y:y,r:r}}}
      best.ci=i%3===0?0:i%3===1?1:(R()<.5?2:0);best.pe=R()<.35;best.rot=R()*6;fl.push(best)}
  } else {
    var pts=E.garlandPts(el),cum=[0];for(i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));var L=cum[cum.length-1]||1;
    var at=function(s){s=Math.max(0,Math.min(L,s));var k=1;while(k<cum.length-1&&cum[k]<s)k++;var tt=(s-cum[k-1])/((cum[k]-cum[k-1])||1),a=pts[k-1],b=pts[k],dx=b[0]-a[0],dy=b[1]-a[1],ln=Math.hypot(dx,dy)||1;return {x:a[0]+dx*tt,y:a[1]+dy*tt,nx:-dy/ln,ny:dx/ln,a:Math.atan2(dy,dx)}};
    for(i=0;i<fq.sprigs;i++){var p=at((i+R())/fq.sprigs*L),sd=R()<.5?-1:1;sp.push({x:p.x+p.nx*sd*30,y:p.y+p.ny*sd*30,a:(Math.atan2(p.ny*sd,p.nx*sd)+(R()-.5)*1.2)*57.3,s:.8+R()*.6})}
    for(i=0;i<fq.flowers;i++){var p2=at((i+.2+R()*.6)/fq.flowers*L),r2=(55+R()*45)*big,off=(R()-.5)*170;fl.push({x:p2.x+p2.nx*off,y:p2.y+p2.ny*off,r:r2,ci:i%3===0?0:i%3===1?1:(R()<.5?2:0),pe:R()<.35,rot:R()*6})}
  }
  fl.sort(function(a,b){return a.r-b.r});
  return SC._cache[key]={fl:fl,sp:sp};
};

/* ---------- symbols and props: local box w x h, y down ---------- */
/* people for scale: flat figures drawn to their real height; the proportions follow ordinary body measurements
   (head about 1/7.5 of an adult's height, 1/5.5 of a six-year-old's) */
SC.PERSON = {
  man:  {hx:.043,hy:.062,hc:.066,nk:.018,sy:.158,sw:.12,wy:.47,ww:.094,ao:.152,aw:.044,ab:.47,lt:.455,lw:.074,lb:.052,lg:.006},
  woman:{hx:.041,hy:.06,hc:.07,nk:.015,sy:.165,sw:.1,wy:.39,ww:.068,ao:.142,aw:.036,ab:.455,lt:.62,lw:.042,lb:.032,lg:.022,dress:.66,dw:.145,hair:1},
  child:{hx:.072,hy:.088,hc:.095,nk:.024,sy:.192,sw:.12,wy:.52,ww:.1,ao:.162,aw:.05,ab:.5,lt:.5,lw:.072,lb:.056,lg:.01}};
SC.person = function(el,w,h,col){var P=SC.PERSON[el.kind]||SC.PERSON.man,H=h,c=w/2,f=function(v){return n1(v*H)},X=function(v){return n1(c+v*H)},s='',
    dk=SC.dark(col,.18),lt=SC.lite(col,.12);
  if(P.hair)s+='<ellipse cx="'+n1(c)+'" cy="'+f(P.hc+.035)+'" rx="'+f(P.hx*1.32)+'" ry="'+f(P.hy*1.45)+'" fill="'+dk+'"/>';
  // legs (with shoes), drawn first so the body overlaps them
  [-1,1].forEach(function(sd){var ix=sd*P.lg/2,ox=sd*(P.lg/2+P.lw),ob=sd*(P.lg/2+P.lb),ib=ix;
    s+='<path d="M'+X(ix)+','+f(P.lt)+' L'+X(ox)+','+f(P.lt)+' L'+X(ob)+','+f(.975)+' L'+X(ib)+','+f(.975)+' Z" fill="'+(sd<0?col:dk)+'"/>';
    s+='<path d="M'+X(ib-sd*.004)+','+f(.966)+' L'+X(ob+sd*.018)+','+f(.966)+' Q'+X(ob+sd*.03)+','+f(1)+' '+X(ob+sd*.01)+','+f(1)+' L'+X(ib-sd*.004)+','+f(1)+' Z" fill="'+SC.dark(col,.35)+'"/>'});
  // arms
  [-1,1].forEach(function(sd){var o=sd*P.ao,i=sd*(P.ao-P.aw),top=P.sy+.012;
    s+='<path d="M'+X(sd*(P.sw-.01))+','+f(P.sy)+' Q'+X(o)+','+f(P.sy)+' '+X(o)+','+f(top+.04)+' L'+X(o-sd*.006)+','+f(P.ab)+' Q'+X(o-sd*P.aw/2)+','+f(P.ab+.022)+' '+X(i+sd*.002)+','+f(P.ab)+' L'+X(i)+','+f(top+.05)+' Z" fill="'+(sd<0?lt:SC.dark(col,.1))+'"/>'});
  // body: a dress for the woman, trousers and shirt for the others
  if(P.dress)s+='<path d="M'+X(-P.sw)+','+f(P.sy+.012)+' Q'+X(-P.sw)+','+f(P.sy)+' '+X(-P.sw+.03)+','+f(P.sy)+' L'+X(P.sw-.03)+','+f(P.sy)+' Q'+X(P.sw)+','+f(P.sy)+' '+X(P.sw)+','+f(P.sy+.012)+' L'+X(P.ww)+','+f(P.wy)+' L'+X(P.dw)+','+f(P.dress)+' Q'+X(0)+','+f(P.dress+.012)+' '+X(-P.dw)+','+f(P.dress)+' L'+X(-P.ww)+','+f(P.wy)+' Z" fill="'+col+'"/>';
  else s+='<path d="M'+X(-P.sw)+','+f(P.sy+.012)+' Q'+X(-P.sw)+','+f(P.sy)+' '+X(-P.sw+.03)+','+f(P.sy)+' L'+X(P.sw-.03)+','+f(P.sy)+' Q'+X(P.sw)+','+f(P.sy)+' '+X(P.sw)+','+f(P.sy+.012)+' L'+X(P.ww)+','+f(P.wy)+' L'+X(P.ww)+','+f(P.lt+.02)+' L'+X(-P.ww)+','+f(P.lt+.02)+' L'+X(-P.ww)+','+f(P.wy)+' Z" fill="'+col+'"/>'+
    '<rect x="'+X(-P.ww)+'" y="'+f(P.wy-.012)+'" width="'+f(P.ww*2)+'" height="'+f(.016)+'" fill="'+dk+'" opacity=".55"/>';
  // neck and head
  s+='<rect x="'+X(-P.nk)+'" y="'+f(P.hc+P.hy*.7)+'" width="'+f(P.nk*2)+'" height="'+f(P.sy-P.hc-P.hy*.7+.01)+'" fill="'+col+'"/>';
  s+='<ellipse cx="'+n1(c)+'" cy="'+f(P.hc)+'" rx="'+f(P.hx)+'" ry="'+f(P.hy)+'" fill="'+lt+'"/>';
  if(P.hair)s+='<path d="M'+X(-P.hx*1.05)+','+f(P.hc+.004)+' Q'+X(-P.hx*1.1)+','+f(P.hc-P.hy*1.15)+' '+X(0)+','+f(P.hc-P.hy*1.08)+' Q'+X(P.hx*1.1)+','+f(P.hc-P.hy*1.15)+' '+X(P.hx*1.05)+','+f(P.hc+.004)+' Q'+X(P.hx*.4)+','+f(P.hc-P.hy*.55)+' '+X(-P.hx*1.05)+','+f(P.hc+.004)+' Z" fill="'+dk+'"/>';
  return s};
/* a curtain gathered by a tieback, as on a window or a photo-zone stand: drawn in its left-hand form, a right-hand panel is mirrored.
   p: [end of the free edge, tieback, tip of the train] as fractions of the box */
SC.tiePanel = function(p,w,h,dc,fbk,tb,cid){
  var a=[p[0][0]*w,p[0][1]*h],t=[p[1][0]*w,p[1][1]*h],e2=[Math.max(p[2][0]*w,t[0]+w*.04),h],pd=Math.min(170,h*.055),fl2=SC.dark(dc,fbk==='velvet'?.42:.2),hl=SC.lite(dc,fbk==='satin'?.6:fbk==='velvet'?.25:.45),op=fbk==='chiffon'?.62:1,s='';
  var edge='M'+n1(a[0])+','+n1(a[1])+' C'+n1(a[0])+','+n1(a[1]+(t[1]-a[1])*.45)+' '+n1(t[0]+(a[0]-t[0])*.35)+','+n1(t[1]-(t[1]-a[1])*.08)+' '+n1(t[0])+','+n1(t[1]),
      fall=' C'+n1(t[0]+w*.025)+','+n1(t[1]+(h-t[1])*.35)+' '+n1(e2[0]-(e2[0]-t[0])*.2)+','+n1(h-(h-t[1])*.22)+' '+n1(e2[0])+','+n1(h),
      body='M0,0 L'+n1(a[0])+',0'+(a[1]>0?' L'+n1(a[0])+','+n1(a[1]):'')+' '+edge.slice(1).replace(/^[^C]*/,'')+fall+' Q'+n1(e2[0]*.55)+','+n1(h+pd)+' '+n1(-pd*.3)+','+n1(h+pd*.35)+' Z';
  s+='<clipPath id="'+cid+'"><path d="'+body+'"/></clipPath>';
  s+='<g fill-opacity="'+op+'" stroke-opacity="'+op+'"><path d="'+body+'" fill="'+dc+'"/>';
  // folds: from the heading (top, then the side it hangs down) to the tieback, then from the tieback to the floor
  var g='<g clip-path="url(#'+cid+')" fill="none" stroke-linecap="round">',N=11,topL=a[0]+a[1],pt=function(u){var d=u*topL;return d<=a[0]?[d,0]:[a[0],d-a[0]]};
  for(var i=0;i<=N;i++){var u=i/N,s0=pt(u),en=[t[0]*(.04+u*.92),t[1]+(u-.5)*h*.012],cx=s0[0]*.72+en[0]*.28,cy=(s0[1]+en[1])*.52,dk=i%2===0;
    g+='<path d="M'+n1(s0[0])+','+n1(s0[1])+' Q'+n1(cx)+','+n1(cy)+' '+n1(en[0])+','+n1(en[1])+'" stroke="'+(dk?fl2:hl)+'" stroke-opacity="'+(dk?.55:.42)+'" stroke-width="'+n1(Math.max(8,w*(dk?.022:.012)))+'"/>'}
  for(var j=0;j<=N;j++){var v=j/N,st=[t[0]*(.04+v*.92),t[1]],fe=[v*e2[0],h],fc=[st[0]*.5+fe[0]*.5+w*.01,t[1]+(h-t[1])*.5],dk2=j%2===1;
    g+='<path d="M'+n1(st[0])+','+n1(st[1])+' Q'+n1(fc[0])+','+n1(fc[1])+' '+n1(fe[0])+','+n1(fe[1]+pd*.6)+'" stroke="'+(dk2?fl2:hl)+'" stroke-opacity="'+(dk2?.5:.38)+'" stroke-width="'+n1(Math.max(8,w*(dk2?.02:.011)))+'"/>'}
  g+='<ellipse cx="'+n1(t[0]*.5)+'" cy="'+n1(t[1])+'" rx="'+n1(Math.max(t[0]*.9,w*.08))+'" ry="'+n1(h*.07)+'" fill="#000" opacity=".16"/><path d="'+edge+'" stroke="'+hl+'" stroke-width="'+n1(Math.max(10,w*.014))+'" stroke-opacity=".7"/>';
  // gathered heading
  for(var hx=0;hx<a[0];hx+=60)g+='<path d="M'+n1(hx)+','+n1(h*.012)+' q30,'+n1(h*.022)+' 60,0" stroke="'+fl2+'" stroke-opacity=".55" stroke-width="7"/>';
  s+=g+'</g></g>';
  // the tieback
  var bw=Math.max(t[0]+w*.05,w*.12),bh=Math.max(36,h*.028);
  if(tb==='band')s+='<rect x="'+n1(-w*.01)+'" y="'+n1(t[1]-bh/2)+'" width="'+n1(bw)+'" height="'+n1(bh)+'" rx="'+n1(bh/2)+'" fill="'+SC.dark(dc,.1)+'"/><rect x="'+n1(-w*.01)+'" y="'+n1(t[1]-bh/2)+'" width="'+n1(bw)+'" height="'+n1(bh*.35)+'" rx="'+n1(bh*.17)+'" fill="'+hl+'" opacity=".55"/>';
  if(tb==='knot'){var kr=Math.max(70,w*.06);s+='<path d="M'+n1(t[0]-kr*.2)+','+n1(t[1])+' q'+n1(kr*.6)+','+n1(kr*1.6)+' '+n1(kr*.2)+','+n1(kr*3.2)+'" fill="none" stroke="'+fl2+'" stroke-width="'+n1(kr*.5)+'" stroke-linecap="round" opacity=".8"/>'+
    '<ellipse cx="'+n1(t[0]-kr*.15)+'" cy="'+n1(t[1])+'" rx="'+n1(kr)+'" ry="'+n1(kr*.78)+'" fill="'+SC.dark(dc,.15)+'"/><path d="M'+n1(t[0]-kr*.9)+','+n1(t[1]-kr*.1)+' Q'+n1(t[0]-kr*.15)+','+n1(t[1]-kr*.9)+' '+n1(t[0]+kr*.7)+','+n1(t[1]-kr*.05)+'" fill="none" stroke="'+hl+'" stroke-width="'+n1(kr*.22)+'" stroke-linecap="round" opacity=".75"/>'}
  return s};
SC.symbol = function(kind,w,h,col,ctx,el){
  var s='',sw=Math.max(6,w*.03),k,cx=w/2;
  if(kind==='hanukkiah'){
    var top=h*.2,cy=h*.50,st='fill="none" stroke="url(#'+ctx.id('gold')+')" stroke-linecap="round" stroke-width="'+n1(w*.026)+'"';
    s+='<path d="M'+n1(cx-w*.2)+','+n1(h-4)+' L'+n1(cx+w*.2)+','+n1(h-4)+' L'+n1(cx+w*.05)+','+n1(h-h*.07)+' L'+n1(cx-w*.05)+','+n1(h-h*.07)+' Z" fill="url(#'+ctx.id('gold')+')"/>';
    s+='<line x1="'+cx+'" y1="'+n1(h-h*.06)+'" x2="'+cx+'" y2="'+n1(top-h*.07)+'" '+st+'/>';
    [.11,.22,.33,.44].forEach(function(f){var r=w*f;s+='<path d="M'+n1(cx-r)+','+n1(top)+' L'+n1(cx-r)+','+n1(cy-r*.2)+' A'+n1(r)+','+n1(r)+' 0 0 0 '+n1(cx+r)+','+n1(cy-r*.2)+' L'+n1(cx+r)+','+n1(top)+'" '+st+'/>'});
    [-.44,-.33,-.22,-.11,0,.11,.22,.33,.44].forEach(function(f){var x=cx+w*f,t=f===0?top-h*.07:top,ch=h*.085;
      s+='<rect x="'+n1(x-w*.016)+'" y="'+n1(t-ch)+'" width="'+n1(w*.032)+'" height="'+n1(ch)+'" rx="3" fill="#FBF6EA"/>';
      s+='<ellipse cx="'+n1(x)+'" cy="'+n1(t-ch-h*.022)+'" rx="'+n1(w*.014)+'" ry="'+n1(h*.022)+'" fill="#FFC56A"/><ellipse cx="'+n1(x)+'" cy="'+n1(t-ch-h*.022)+'" rx="'+n1(w*.05)+'" ry="'+n1(h*.045)+'" fill="#FFD98A" opacity=".22"/>'});
  }
  else if(kind==='magen'){
    var R=w/2,cy2=el&&el.mount==='floor'?h-R*1.0:h/2,lw=el&&el.mount==='floor'?w*.075:w*.06;
    [-90,90].forEach(function(o){var p=[];for(k=0;k<3;k++){var a=(o+k*120)*Math.PI/180;p.push(n1(cx+(R-lw/2)*Math.cos(a))+','+n1(cy2+(R-lw/2)*Math.sin(a)))}
      s+='<polygon points="'+p.join(' ')+'" fill="none" stroke="'+(col?col:'url(#'+ctx.id('gold')+')')+'" stroke-width="'+n1(lw)+'" stroke-linejoin="round"/>'});
  }
  else if(kind==='star'){var p5=[];for(k=0;k<10;k++){var rr=(k%2?w*.2:w*.5),a5=(-90+k*36)*Math.PI/180;p5.push(n1(cx+rr*Math.cos(a5))+','+n1(h*.53+rr*Math.sin(a5)))}s+='<polygon points="'+p5.join(' ')+'" fill="'+(col||'url(#'+ctx.id('gold')+')')+'" stroke-linejoin="round"/>'}
  else if(kind==='heart'){s+='<path d="M'+cx+','+n1(h*.98)+' C'+n1(-w*.25)+','+n1(h*.5)+' '+n1(w*.12)+','+n1(-h*.18)+' '+cx+','+n1(h*.26)+' C'+n1(w*.88)+','+n1(-h*.18)+' '+n1(w*1.25)+','+n1(h*.5)+' '+cx+','+n1(h*.98)+' Z" fill="'+(col||'#C24A63')+'"/>'}
  else if(kind==='rings'){var rr2=h*.44;[w*.34,w*.66].forEach(function(x){s+='<circle cx="'+n1(x)+'" cy="'+n1(h/2)+'" r="'+n1(rr2)+'" fill="none" stroke="'+(col||'url(#'+ctx.id('gold')+')')+'" stroke-width="'+n1(w*.045)+'"/>'})}
  else if(kind==='moon'){var Rm=w/2;s+='<path d="M'+n1(cx+Rm*.25)+','+n1(h/2-Rm*.97)+' A'+Rm+','+Rm+' 0 1 0 '+n1(cx+Rm*.25)+','+n1(h/2+Rm*.97)+' A'+n1(Rm*.78)+','+n1(Rm*.78)+' 0 1 1 '+n1(cx+Rm*.25)+','+n1(h/2-Rm*.97)+' Z" fill="'+(col||'url(#'+ctx.id('gold')+')')+'"/>'}
  else if(kind==='snow'){var c=col||'#F4F7FA';for(k=0;k<6;k++){var a6=k*60;s+='<g transform="rotate('+a6+' '+cx+' '+h/2+')"><line x1="'+cx+'" y1="'+n1(h/2)+'" x2="'+cx+'" y2="'+n1(h*.04)+'" stroke="'+c+'" stroke-width="'+n1(w*.06)+'" stroke-linecap="round"/><path d="M'+n1(cx-w*.12)+','+n1(h*.14)+' L'+cx+','+n1(h*.26)+' L'+n1(cx+w*.12)+','+n1(h*.14)+'" fill="none" stroke="'+c+'" stroke-width="'+n1(w*.05)+'" stroke-linecap="round" stroke-linejoin="round"/></g>'}}
  else if(kind==='cloud'){var cc=col||'#FFFFFF';s+='<g fill="'+cc+'"><rect x="'+n1(w*.12)+'" y="'+n1(h*.52)+'" width="'+n1(w*.76)+'" height="'+n1(h*.46)+'" rx="'+n1(h*.23)+'"/><circle cx="'+n1(w*.33)+'" cy="'+n1(h*.5)+'" r="'+n1(h*.3)+'"/><circle cx="'+n1(w*.56)+'" cy="'+n1(h*.38)+'" r="'+n1(h*.38)+'"/><circle cx="'+n1(w*.76)+'" cy="'+n1(h*.6)+'" r="'+n1(h*.24)+'"/></g>'}
  else if(kind==='tree'){var tc=col||'#2F6B55';s+='<rect x="'+n1(cx-w*.06)+'" y="'+n1(h*.86)+'" width="'+n1(w*.12)+'" height="'+n1(h*.14)+'" fill="#6B4A32"/>';
    [[.0,.42,.34],[.22,.66,.42],[.46,.9,.5]].forEach(function(t,i){s+='<polygon points="'+cx+','+n1(h*t[0])+' '+n1(cx+w*t[2])+','+n1(h*t[1])+' '+n1(cx-w*t[2])+','+n1(h*t[1])+'" fill="'+SC.dark(tc,i*.07)+'"/>'});
    s+='<circle cx="'+cx+'" cy="'+n1(h*.02)+'" r="'+n1(w*.05)+'" fill="url(#'+ctx.id('gold')+')"/>'}
  else if(kind==='pumpkin'){var pc=col||'#D9681F';s+='<rect x="'+n1(cx-w*.04)+'" y="0" width="'+n1(w*.08)+'" height="'+n1(h*.2)+'" rx="6" fill="#4C6B35"/>';
    [[.5,.5,1],[.3,.36,.93],[.7,.36,.93],[.5,.2,.86]].forEach(function(e,i){s+='<ellipse cx="'+n1(w*e[0])+'" cy="'+n1(h*.58)+'" rx="'+n1(w*e[1])+'" ry="'+n1(h*.42)+'" fill="'+(i===3?SC.lite(pc,.12):SC.dark(pc,(3-i)*.05))+'"/>'})}
  else if(kind==='shell'){var sc=col||'#FBF7F0',bx=cx,by=h*.9,R2=w*.5,nL=7,a0=198,a1=342,pts=[],d2='M'+n1(bx-w*.13)+','+n1(h)+' L'+n1(bx-w*.1)+','+n1(by);
    for(k=0;k<=nL;k++){var aa=(a0+(a1-a0)*k/nL)*Math.PI/180;pts.push([bx+R2*Math.cos(aa),by+R2*Math.sin(aa)*(h*.9/R2)*.98])}
    for(k=0;k<nL;k++){var p0=pts[k],p1=pts[k+1],mx=(p0[0]+p1[0])/2,my=(p0[1]+p1[1])/2,ox=mx-bx,oy=my-by,ol=Math.hypot(ox,oy)||1;d2+=(k?'':' L'+n1(p0[0])+','+n1(p0[1]))+' Q'+n1(mx+ox/ol*w*.085)+','+n1(my+oy/ol*w*.085)+' '+n1(p1[0])+','+n1(p1[1])}
    d2+=' L'+n1(bx+w*.1)+','+n1(by)+' L'+n1(bx+w*.13)+','+n1(h)+' Z';
    s+='<path d="'+d2+'" fill="'+sc+'"/>';for(k=1;k<nL;k++)s+='<line x1="'+n1(bx)+'" y1="'+n1(by)+'" x2="'+n1(pts[k][0])+'" y2="'+n1(pts[k][1])+'" stroke="'+SC.dark(sc,.13)+'" stroke-width="'+n1(w*.012)+'" stroke-linecap="round"/>'}
  else if(kind==='starfish'){var fcl=col||'#F3D9A4',pp=[];for(k=0;k<10;k++){var rr3=(k%2?w*.2:w*.44),a7=(-90+k*36)*Math.PI/180;pp.push(n1(cx+rr3*Math.cos(a7))+','+n1(h*.53+rr3*Math.sin(a7)))}
    s+='<polygon points="'+pp.join(' ')+'" fill="'+fcl+'" stroke="'+fcl+'" stroke-width="'+n1(w*.11)+'" stroke-linejoin="round"/>';
    for(k=0;k<5;k++){var a8=(-90+k*72)*Math.PI/180;[.12,.24,.36].forEach(function(f){s+='<circle cx="'+n1(cx+w*f*Math.cos(a8))+'" cy="'+n1(h*.53+w*f*Math.sin(a8))+'" r="'+n1(w*.016)+'" fill="'+SC.dark(fcl,.16)+'"/>'})}}
  else if(/^n(gift|heart|star|magen|moon)$/.test(kind)){var nc=col||'#FFE3A6',lw=Math.max(8,w*.04),d='',m=w*.08,k2;
    if(kind==='ngift'){var bx0=m,bx1=w-m,ly=h*.42,by1=h-m;d='M'+n1(bx0+w*.06)+','+n1(ly)+' L'+n1(bx0+w*.06)+','+n1(by1)+' L'+n1(bx1-w*.06)+','+n1(by1)+' L'+n1(bx1-w*.06)+','+n1(ly)+' M'+n1(bx0)+','+n1(ly-h*.12)+' L'+n1(bx1)+','+n1(ly-h*.12)+' L'+n1(bx1)+','+n1(ly)+' L'+n1(bx0)+','+n1(ly)+' Z M'+n1(w/2)+','+n1(ly-h*.12)+' L'+n1(w/2)+','+n1(by1)+
      ' M'+n1(w/2)+','+n1(ly-h*.12)+' C'+n1(w*.38)+','+n1(h*.08)+' '+n1(w*.18)+','+n1(h*.16)+' '+n1(w*.3)+','+n1(ly-h*.12)+' M'+n1(w/2)+','+n1(ly-h*.12)+' C'+n1(w*.62)+','+n1(h*.08)+' '+n1(w*.82)+','+n1(h*.16)+' '+n1(w*.7)+','+n1(ly-h*.12)}
    else if(kind==='nheart')d='M'+cx+','+n1(h*.9)+' C'+n1(w*.02)+','+n1(h*.52)+' '+n1(w*.12)+','+n1(h*.06)+' '+cx+','+n1(h*.3)+' C'+n1(w*.88)+','+n1(h*.06)+' '+n1(w*.98)+','+n1(h*.52)+' '+cx+','+n1(h*.9)+' Z';
    else if(kind==='nstar'){for(k2=0;k2<10;k2++){var rr=(k2%2?w*.19:w*.45),aa=(-90+k2*36)*Math.PI/180;d+=(k2?'L':'M')+n1(cx+rr*Math.cos(aa))+','+n1(h*.53+rr*Math.sin(aa))+' '}d+='Z'}
    else if(kind==='nmagen'){[-90,90].forEach(function(o){for(k2=0;k2<3;k2++){var a3=(o+k2*120)*Math.PI/180;d+=(k2?'L':'M')+n1(cx+w*.44*Math.cos(a3))+','+n1(h/2+w*.44*Math.sin(a3))+' '}d+='Z '})}
    else{var Rm2=w*.42;d='M'+n1(cx+Rm2*.3)+','+n1(h/2-Rm2*.95)+' A'+n1(Rm2)+','+n1(Rm2)+' 0 1 0 '+n1(cx+Rm2*.3)+','+n1(h/2+Rm2*.95)+' A'+n1(Rm2*.76)+','+n1(Rm2*.76)+' 0 1 1 '+n1(cx+Rm2*.3)+','+n1(h/2-Rm2*.95)+' Z'}
    s+='<path d="'+d+'" fill="none" stroke="'+SC.dark(nc,.25)+'" stroke-opacity=".25" stroke-width="'+n1(lw*2.2)+'" stroke-linecap="round" stroke-linejoin="round"/><g filter="url(#'+ctx.id('neon')+')"><path d="'+d+'" fill="none" stroke="'+SC.lite(nc,SC.lum(nc)>.6?.55:.25)+'" stroke-width="'+n1(lw)+'" stroke-linecap="round" stroke-linejoin="round"/></g>'}
  else if(kind==='digit'){var t=SC.esc(el.text||'5');s+='<text class="x-text" data-fill="gold" x="'+cx+'" y="'+n1(h*.97)+'" text-anchor="middle" font-family="'+D.FONTS.serif+'" font-weight="700" font-size="'+n1(h*1.32)+'" fill="'+(col||'url(#'+ctx.id('gold')+')')+'" textLength="'+n1(w*.96)+'" lengthAdjust="spacingAndGlyphs">'+t+'</text>'}
  return s;
};
/* small drawing helpers shared by props, easels and flowers */
SC.metal = function(c,ctx){return SC.METAL.test(c)||c==='#C9A857'?'url(#'+ctx.id('gold')+')':c};
SC.candle = function(x,yTop,cw,ch,base){var s='<rect x="'+n1(x-cw/2)+'" y="'+n1(yTop-ch)+'" width="'+n1(cw)+'" height="'+n1(ch)+'" rx="'+n1(cw*.2)+'" fill="#FBF6EA"/><rect x="'+n1(x+cw*.15)+'" y="'+n1(yTop-ch)+'" width="'+n1(cw*.35)+'" height="'+n1(ch)+'" fill="#000" opacity=".07"/>'+
  '<ellipse cx="'+n1(x)+'" cy="'+n1(yTop-ch-cw*.55)+'" rx="'+n1(cw*.26)+'" ry="'+n1(cw*.55)+'" fill="#FFC56A"/><ellipse cx="'+n1(x)+'" cy="'+n1(yTop-ch-cw*.55)+'" rx="'+n1(cw*1.2)+'" ry="'+n1(cw*1.4)+'" fill="#FFD98A" opacity=".22"/>';if(base)s='<ellipse cx="'+n1(x)+'" cy="'+n1(yTop)+'" rx="'+n1(cw*.9)+'" ry="'+n1(cw*.3)+'" fill="'+base+'"/>'+s;return s};
SC.hydrangea = function(x,y,r,c,c2){var s='<circle cx="'+n1(x)+'" cy="'+n1(y)+'" r="'+n1(r)+'" fill="'+SC.dark(c,.18)+'"/>',R=SC.rng(Math.round(x*3+y*7));
  for(var i=0;i<14;i++){var a=R()*6.283,d=Math.sqrt(R())*r*.78,fx=x+Math.cos(a)*d,fy=y+Math.sin(a)*d,fr=r*.2,fc=i%3?c:c2;
    s+='<g fill="'+fc+'">'+[0,1,2,3].map(function(k){var pa=k*1.571+a;return '<circle cx="'+n1(fx+Math.cos(pa)*fr*.55)+'" cy="'+n1(fy+Math.sin(pa)*fr*.55)+'" r="'+n1(fr*.5)+'"/>'}).join('')+'</g><circle cx="'+n1(fx)+'" cy="'+n1(fy)+'" r="'+n1(fr*.18)+'" fill="'+SC.lite(fc,.5)+'"/>'}
  return s};
SC.giftBox = function(x,y,w,h,shape,c,rib,pat,ctx){
  var s='',lid=Math.min(h*.18,w*.16),bw=Math.max(8,Math.min(w,h)*.11);
  if(shape==='round'){var ry=Math.min(w*.16,h*.22);s+='<path d="M'+n1(x)+','+n1(y+ry+lid*.4)+' L'+n1(x)+','+n1(y+h-ry)+' A'+n1(w/2)+','+n1(ry)+' 0 0 0 '+n1(x+w)+','+n1(y+h-ry)+' L'+n1(x+w)+','+n1(y+ry+lid*.4)+' Z" fill="'+c+'"/><path d="M'+n1(x+w*.66)+','+n1(y+ry+lid*.4)+' L'+n1(x+w*.66)+','+n1(y+h-ry*.4)+' A'+n1(w/2)+','+n1(ry)+' 0 0 0 '+n1(x+w)+','+n1(y+h-ry)+' L'+n1(x+w)+','+n1(y+ry+lid*.4)+' Z" fill="#000" opacity=".09"/>'+
    '<rect x="'+n1(x-w*.02)+'" y="'+n1(y+ry*.4)+'" width="'+n1(w*1.04)+'" height="'+n1(lid)+'" fill="'+SC.dark(c,.08)+'"/><ellipse cx="'+n1(x+w/2)+'" cy="'+n1(y+ry*.4)+'" rx="'+n1(w*.52)+'" ry="'+n1(ry*.9)+'" fill="'+SC.lite(c,.15)+'"/><rect x="'+n1(x-w*.02)+'" y="'+n1(y+ry*.4+lid*.35)+'" width="'+n1(w*1.04)+'" height="'+n1(bw*.7)+'" fill="'+rib+'"/>'}
  else{s+='<rect x="'+n1(x)+'" y="'+n1(y+lid*.5)+'" width="'+n1(w)+'" height="'+n1(h-lid*.5)+'" fill="'+c+'"/>';
    if(pat==='stripes')for(var k=1;k<6;k++)s+='<rect x="'+n1(x+w*k/6-w*.03)+'" y="'+n1(y+lid)+'" width="'+n1(w*.06)+'" height="'+n1(h-lid)+'" fill="'+SC.lite(c,.25)+'" opacity=".7"/>';
    if(pat==='dots')for(var dy=0;dy<4;dy++)for(var dx=0;dx<5;dx++)s+='<circle cx="'+n1(x+w*(dx+.5+(dy%2)*.5)/5.5)+'" cy="'+n1(y+lid+(h-lid)*(dy+.5)/4)+'" r="'+n1(Math.min(w,h)*.035)+'" fill="'+SC.lite(c,.45)+'"/>';
    if(pat==='geo'){var gs='';for(var gk=0;gk<4;gk++)gs+='M'+n1(x+w*gk/4)+','+n1(y+lid)+' L'+n1(x+w*(gk+.5)/4)+','+n1(y+h)+' L'+n1(x+w*(gk+1)/4)+','+n1(y+lid)+' ';s+='<path d="'+gs+'" fill="none" stroke="'+rib+'" stroke-width="'+n1(Math.max(3,w*.012))+'" opacity=".8"/>'}
    s+='<rect x="'+n1(x+w*.7)+'" y="'+n1(y+lid*.5)+'" width="'+n1(w*.3)+'" height="'+n1(h-lid*.5)+'" fill="#000" opacity=".08"/><rect x="'+n1(x-w*.03)+'" y="'+n1(y)+'" width="'+n1(w*1.06)+'" height="'+n1(lid)+'" fill="'+SC.lite(c,.08)+'"/><rect x="'+n1(x-w*.03)+'" y="'+n1(y+lid*.8)+'" width="'+n1(w*1.06)+'" height="'+n1(lid*.2)+'" fill="#000" opacity=".12"/>'+
      '<rect x="'+n1(x+w/2-bw/2)+'" y="'+n1(y)+'" width="'+n1(bw)+'" height="'+n1(h)+'" fill="'+rib+'"/>'+(shape!=='tall'?'<rect x="'+n1(x)+'" y="'+n1(y+lid+(h-lid)*.45)+'" width="'+n1(w)+'" height="'+n1(bw*.8)+'" fill="'+rib+'" opacity=".95"/>':'')}
  var bx=x+w/2,by=y+(shape==='round'?Math.min(w*.16,h*.22)*.3:0),bs=Math.max(18,Math.min(w,h)*.22);
  s+='<path d="M'+n1(bx)+','+n1(by)+' C'+n1(bx-bs*1.3)+','+n1(by-bs*1.1)+' '+n1(bx-bs*1.5)+','+n1(by+bs*.2)+' '+n1(bx)+','+n1(by)+' C'+n1(bx+bs*1.5)+','+n1(by+bs*.2)+' '+n1(bx+bs*1.3)+','+n1(by-bs*1.1)+' '+n1(bx)+','+n1(by)+' Z" fill="'+rib+'" stroke="#000" stroke-opacity=".15" stroke-width="2"/><circle cx="'+n1(bx)+'" cy="'+n1(by)+'" r="'+n1(bs*.22)+'" fill="'+rib+'"/>';
  return s};
/* the closed top of a frame plinth: a slab in the plane of the frame top, its thickness below */
SC.LID = {panel:1,mirror:1,marble:1,wood:1};
SC.lidPaint = function(lid,lc){return lid==='mirror'?'#D3DEE4':lid==='marble'?'#F3F1ED':lid==='wood'?'#B98B5B':(lc||'#F4EFE6')};
SC.lidFace = function(pts,lid,lc){var c=SC.lidPaint(lid,lc),P=pts.map(function(q){return n1(q[0])+','+n1(q[1])}).join(' '),s='<polygon points="'+P+'" fill="'+SC.lite(c,.12)+'"/>',x0=pts[0][0],y0=pts[1][1],x1=pts[2][0],y1=pts[0][1],w=x1-x0,h=y1-y0;
  if(lid==='mirror')s+='<polygon points="'+n1(x0+w*.25)+','+n1(y1)+' '+n1(x0+w*.42)+','+n1(y1)+' '+n1(x0+w*.55)+','+n1(y0)+' '+n1(x0+w*.4)+','+n1(y0)+'" fill="#fff" opacity=".55"/>';
  if(lid==='marble')s+='<path d="M'+n1(x0+w*.1)+','+n1(y1-h*.2)+' C'+n1(x0+w*.35)+','+n1(y0+h*.3)+' '+n1(x0+w*.55)+','+n1(y1-h*.1)+' '+n1(x0+w*.85)+','+n1(y0+h*.35)+'" fill="none" stroke="#B9B4AC" stroke-width="4" opacity=".7"/>';
  if(lid==='wood')for(var k=1;k<4;k++)s+='<path d="M'+n1(x0+w*.08)+','+n1(y0+h*k/4)+' L'+n1(x1-w*.02)+','+n1(y0+h*k/4)+'" stroke="'+SC.dark(c,.18)+'" stroke-width="3" opacity=".6"/>';
  return s};
SC.prop = function(kind,w,h,pal,ctx,el){
  var s='',gold='url(#'+ctx.id('gold')+')',ec=el&&el.color;
  function box(x,bw,bh,c){var y=h-bh;return '<rect x="'+n1(x)+'" y="'+n1(y)+'" width="'+n1(bw)+'" height="'+n1(bh)+'" fill="'+c+'"/><rect x="'+n1(x)+'" y="'+n1(y)+'" width="'+n1(bw)+'" height="'+n1(bh)+'" fill="#000" opacity=".06"/><rect x="'+n1(x+bw*.42)+'" y="'+n1(y)+'" width="'+n1(bw*.16)+'" height="'+n1(bh)+'" fill="'+gold+'"/><rect x="'+n1(x)+'" y="'+n1(y+bh*.4)+'" width="'+n1(bw)+'" height="'+n1(bh*.14)+'" fill="'+gold+'" opacity=".85"/><ellipse cx="'+n1(x+bw*.36)+'" cy="'+n1(y-bw*.05)+'" rx="'+n1(bw*.16)+'" ry="'+n1(bw*.08)+'" fill="'+gold+'"/><ellipse cx="'+n1(x+bw*.64)+'" cy="'+n1(y-bw*.05)+'" rx="'+n1(bw*.16)+'" ry="'+n1(bw*.08)+'" fill="'+gold+'"/>'}
  if(kind==='gifts'){s+=box(w*.32,w*.42,h*.86,ec||pal.c[1])+box(0,w*.36,h*.56,pal.bal[3])+box(w*.66,w*.34,h*.44,pal.c[3])}
  else if(kind==='candles'){[[.02,.3,.62],[.36,.3,1],[.7,.28,.78]].forEach(function(c){var x=w*c[0],cw=w*c[1],ch=(h-w*.16)*c[2],y=h-ch;
    s+='<rect x="'+n1(x)+'" y="'+n1(y)+'" width="'+n1(cw)+'" height="'+n1(ch)+'" rx="5" fill="'+(ec||'#FBF6EA')+'"/><rect x="'+n1(x+cw*.68)+'" y="'+n1(y)+'" width="'+n1(cw*.32)+'" height="'+n1(ch)+'" fill="#000" opacity=".07"/><ellipse cx="'+n1(x+cw/2)+'" cy="'+n1(y-w*.07)+'" rx="'+n1(w*.03)+'" ry="'+n1(w*.07)+'" fill="#FFC56A"/><ellipse cx="'+n1(x+cw/2)+'" cy="'+n1(y-w*.07)+'" rx="'+n1(w*.13)+'" ry="'+n1(w*.16)+'" fill="#FFD98A" opacity=".22"/>'})}
  else if(kind==='dreidel'){var c=ec||pal.bal[3]||'#F1E9DC';s+='<g transform="rotate(14 '+w/2+' '+h/2+')"><rect x="'+n1(w*.44)+'" y="0" width="'+n1(w*.12)+'" height="'+n1(h*.22)+'" rx="5" fill="'+gold+'"/><path d="M'+n1(w*.12)+','+n1(h*.2)+' L'+n1(w*.88)+','+n1(h*.2)+' L'+n1(w*.88)+','+n1(h*.68)+' L'+w/2+','+n1(h*.98)+' L'+n1(w*.12)+','+n1(h*.68)+' Z" fill="'+c+'"/><path d="M'+n1(w*.62)+','+n1(h*.2)+' L'+n1(w*.88)+','+n1(h*.2)+' L'+n1(w*.88)+','+n1(h*.68)+' L'+w/2+','+n1(h*.98)+' L'+n1(w*.62)+','+n1(h*.9)+' Z" fill="#000" opacity=".08"/><text x="'+n1(w*.46)+'" y="'+n1(h*.58)+'" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="'+n1(w*.34)+'" fill="'+gold+'">ש</text></g>'}
  else if(kind==='plinths'){[[.0,.34,.62,pal.c[3]],[.33,.36,1,ec||pal.c[0]],[.68,.32,.42,pal.bal[3]]].forEach(function(p){var x=w*p[0],pw=w*p[1],ph=h*p[2],y=h-ph,e=pw*.14;
    s+='<rect x="'+n1(x)+'" y="'+n1(y+e)+'" width="'+n1(pw)+'" height="'+n1(ph-e)+'" fill="'+p[3]+'"/><rect x="'+n1(x+pw*.7)+'" y="'+n1(y+e)+'" width="'+n1(pw*.3)+'" height="'+n1(ph-e)+'" fill="#000" opacity=".1"/><ellipse cx="'+n1(x+pw/2)+'" cy="'+n1(y+e)+'" rx="'+n1(pw/2)+'" ry="'+n1(e)+'" fill="'+SC.lite(p[3],.18)+'"/>'})}
  else if(kind==='pampas'){var vx=w*.5;s+='<path d="M'+n1(vx-w*.16)+','+h+' L'+n1(vx+w*.16)+','+h+' L'+n1(vx+w*.2)+','+n1(h*.78)+' Q'+vx+','+n1(h*.7)+' '+n1(vx-w*.2)+','+n1(h*.78)+' Z" fill="'+(ec||pal.bal[3])+'"/><path d="M'+n1(vx+w*.05)+','+h+' L'+n1(vx+w*.16)+','+h+' L'+n1(vx+w*.2)+','+n1(h*.78)+' Z" fill="#000" opacity=".08"/>';
    [[-.36,.06],[-.18,.0],[0,.04],[.2,.0],[.36,.08]].forEach(function(p,i){var tx=vx+w*p[0],ty=h*p[1];
      s+='<path d="M'+vx+','+n1(h*.78)+' Q'+n1(vx+w*p[0]*.4)+','+n1(h*.4)+' '+n1(tx)+','+n1(ty+h*.2)+'" fill="none" stroke="#B59A72" stroke-width="5"/><ellipse cx="'+n1(tx)+'" cy="'+n1(ty+h*.17)+'" rx="'+n1(w*.11)+'" ry="'+n1(h*.17)+'" fill="'+(i%2?'#E2CFAE':'#D4BC94')+'" transform="rotate('+(p[0]*40)+' '+n1(tx)+' '+n1(ty+h*.17)+')"/>'})}
  else if(kind==='podr'||kind==='plc'){var pc=ec||pal.bal[3]||'#F4EFE6',e2=Math.min(w*.11,h*.4);
    s+='<path d="M0,'+n1(e2)+' L0,'+n1(h-e2*.6)+' A'+n1(w/2)+','+n1(e2*.6)+' 0 0 0 '+w+','+n1(h-e2*.6)+' L'+w+','+n1(e2)+' Z" fill="'+pc+'"/><path d="M'+n1(w*.66)+','+n1(e2)+' L'+n1(w*.66)+','+n1(h-e2*.36)+' A'+n1(w/2)+','+n1(e2*.6)+' 0 0 0 '+w+','+n1(h-e2*.6)+' L'+w+','+n1(e2)+' Z" fill="#000" opacity=".09"/><ellipse cx="'+n1(w/2)+'" cy="'+n1(e2)+'" rx="'+n1(w/2)+'" ry="'+n1(e2)+'" fill="'+SC.lite(pc,.3)+'"/><ellipse cx="'+n1(w/2)+'" cy="'+n1(e2)+'" rx="'+n1(w/2)+'" ry="'+n1(e2)+'" fill="none" stroke="#000" stroke-opacity=".07" stroke-width="4"/>'}
  else if(kind==='easel'){var dz=el&&el.design||'wood',bc2=ec||'#FFFFFF',tab=dz==='table',bd=el&&el.board||'rect',mt=dz==='gold'?gold:dz==='black'?'#1B1D1F':'#B88A5A',mw=dz==='wood'?w*.045:w*.026;
    var bt=tab?h*.04:h*.08,bh=tab?h*.74:h*.42,bw=w*(tab?.96:.9),bx=(w-bw)/2,by=bt;
    if(tab){s+='<path d="M'+n1(w*.5)+','+n1(h*.1)+' L'+n1(w*.78)+','+h+'" stroke="'+mt+'" stroke-width="'+n1(w*.05)+'" stroke-linecap="round"/><rect x="'+n1(w*.06)+'" y="'+n1(bt+bh-6)+'" width="'+n1(w*.88)+'" height="'+n1(h*.05)+'" rx="6" fill="'+mt+'"/>'}
    else{s+='<path d="M'+n1(w/2)+','+n1(h*.02)+' L'+n1(w*.1)+','+h+'" stroke="'+mt+'" stroke-width="'+n1(mw)+'" stroke-linecap="round"/><path d="M'+n1(w/2)+','+n1(h*.02)+' L'+n1(w*.9)+','+h+'" stroke="'+mt+'" stroke-width="'+n1(mw)+'" stroke-linecap="round"/><path d="M'+n1(w/2)+','+n1(h*.04)+' L'+n1(w*.56)+','+n1(h*.98)+'" stroke="'+(dz==='wood'?SC.dark('#B88A5A',.25):mt)+'" stroke-width="'+n1(mw*.8)+'"/>'+
      '<rect x="'+n1(w*.04)+'" y="'+n1(bt+bh)+'" width="'+n1(w*.92)+'" height="'+n1(h*.022)+'" rx="4" fill="'+mt+'"/>'+(dz!=='wood'?'<rect x="'+n1(w*.22)+'" y="'+n1(h*.78-mw*.35)+'" width="'+n1(w*.56)+'" height="'+n1(mw*.7)+'" fill="'+mt+'"/>':'')}
    var bp=bd==='arch'?'M'+n1(bx)+','+n1(by+bh)+' L'+n1(bx)+','+n1(by+bw/2)+' A'+n1(bw/2)+','+n1(bw/2)+' 0 0 1 '+n1(bx+bw)+','+n1(by+bw/2)+' L'+n1(bx+bw)+','+n1(by+bh)+' Z':bd==='round'?null:'M'+n1(bx)+','+n1(by)+' h'+n1(bw)+' v'+n1(bh)+' h'+n1(-bw)+' Z';
    if(bd==='round'){var rr4=Math.min(bw,bh)/2;by=bt+bh/2-rr4;s+='<circle cx="'+n1(w/2)+'" cy="'+n1(bt+bh/2)+'" r="'+n1(rr4)+'" fill="'+bc2+'" stroke="'+(dz==='wood'?SC.dark(bc2,.18):mt)+'" stroke-width="'+n1(Math.max(8,w*.02))+'"/>'}
    else s+='<path d="'+bp+'" fill="'+bc2+'" stroke="'+(dz==='wood'?SC.dark(bc2,.18):mt)+'" stroke-width="'+n1(Math.max(8,w*.02))+'"/>';
    if(el&&el.flw){var fA=pal.bal[0],fB=SC.lite(pal.bal[0],.25),fz=bw*.14;[[bx+fz*.6,bt+(bd==='arch'?bw*.22:fz*.5)],[bx+bw-fz*.6,bt+bh-fz*.5]].forEach(function(q,i){
      for(var li=0;li<4;li++){var la=(i?-2.4:.8)+li*.55;s+='<ellipse cx="'+n1(q[0]+Math.cos(la)*fz*.9)+'" cy="'+n1(q[1]+Math.sin(la)*fz*.9)+'" rx="'+n1(fz*.45)+'" ry="'+n1(fz*.16)+'" fill="'+(li%2?gold:'#5C7F68')+'" transform="rotate('+n1(la*57.3)+' '+n1(q[0]+Math.cos(la)*fz*.9)+' '+n1(q[1]+Math.sin(la)*fz*.9)+')"/>'}
      s+=SC.hydrangea(q[0],q[1],fz*.62,fA,fB)})}
    var et=String(el&&el.text||'').split('\n'),tc5=SC.lum(bc2)>.5?'#3A3226':(dz==='black'?'#FFFFFF':'#F3E6BE'),ib=bd==='round'?Math.min(bw,bh)*.78:bw*.82,efs=Math.min(bh*.8/(et.length+.6),ib/Math.max(4,Math.max.apply(null,et.map(function(q){return q.length}))*.42)),tcy=bt+bh/2+(bd==='arch'?bw*.12:0);
    et.forEach(function(l,i){s+='<text x="'+n1(w/2)+'" y="'+n1(tcy+(i-(et.length-1)/2)*efs*1.05+efs*.32)+'" text-anchor="middle" font-family="'+D.FONTS.script+'" font-size="'+n1(efs)+'" fill="'+(dz==='gold'&&SC.lum(bc2)<.5?'#E9CF8C':tc5)+'">'+SC.esc(l)+'</text>'})}
  else if(kind==='mframe'||kind==='mglass'){var mc=ec||'#C9A857',mg=SC.metal(mc,ctx),dp=Math.min(w*.18,h*.12),fw2=Math.max(12,w*.035),fx=w-dp;
    if(kind==='mglass')s+='<path d="M0,'+n1(dp)+' L'+n1(dp)+',0 L'+w+',0 L'+w+','+n1(h-dp)+' L'+n1(fx)+','+h+' L0,'+h+' Z" fill="#DDEAF0" fill-opacity=".28"/><path d="M'+n1(fx*.15)+','+n1(dp+h*.08)+' L'+n1(fx*.38)+','+n1(dp+h*.08)+' L'+n1(fx*.12)+','+n1(h*.9)+'" fill="#fff" fill-opacity=".3"/>';
    s+='<path d="M'+n1(dp)+',0 L'+w+',0 L'+w+','+n1(h-dp)+'" fill="none" stroke="'+SC.dark(mc,.25)+'" stroke-width="'+n1(fw2*.8)+'"/><path d="M'+n1(dp)+',0 L'+n1(dp)+','+n1(h-dp)+' L'+w+','+n1(h-dp)+'" fill="none" stroke="'+SC.dark(mc,.3)+'" stroke-opacity=".55" stroke-width="'+n1(fw2*.6)+'"/>';
    s+='<path d="M0,'+n1(dp)+' L'+n1(dp)+',0 M'+n1(fx)+','+n1(dp)+' L'+w+',0 M'+n1(fx)+','+h+' L'+w+','+n1(h-dp)+' M0,'+h+' L'+n1(dp)+','+n1(h-dp)+'" stroke="'+mg+'" stroke-width="'+n1(fw2*.85)+'" stroke-linecap="round"/>';
    s+='<rect x="'+n1(fw2/2)+'" y="'+n1(dp+fw2/2)+'" width="'+n1(fx-fw2)+'" height="'+n1(h-dp-fw2)+'" fill="none" stroke="'+mg+'" stroke-width="'+n1(fw2)+'"/>';
    var lid=el&&SC.LID[el.lid]?el.lid:null;
    if(lid){var lc2=SC.lidPaint(lid,el.lc),tk=Math.max(18,Math.min(h*.05,40)),ov=tk*.4;
      s+='<polygon points="'+n1(fx)+','+n1(dp)+' '+n1(w+ov*.5)+','+n1(-ov*.3)+' '+n1(w+ov*.5)+','+n1(tk-ov*.3)+' '+n1(fx)+','+n1(dp+tk)+'" fill="'+SC.dark(lc2,.22)+'"/>'+SC.lidFace([[-ov,dp],[dp-ov*.5,-ov*.3],[w+ov*.5,-ov*.3],[fx+ov*.5,dp]],lid,el.lc)+
        '<rect x="'+n1(-ov)+'" y="'+n1(dp)+'" width="'+n1(fx+ov*1.5)+'" height="'+n1(tk)+'" fill="'+SC.dark(lc2,.1)+'"/><rect x="'+n1(-ov)+'" y="'+n1(dp)+'" width="'+n1(fx+ov*1.5)+'" height="'+n1(Math.max(3,tk*.18))+'" fill="#fff" opacity=".35"/>'}}
  else if(kind==='mcyl'){var mc2=ec||'#C9A857',mg2=SC.metal(mc2,ctx),ry=Math.min(w*.14,h*.12),sw2=Math.max(10,w*.03);
    s+='<ellipse cx="'+n1(w/2)+'" cy="'+n1(h-ry)+'" rx="'+n1(w/2-sw2/2)+'" ry="'+n1(ry-sw2/2)+'" fill="none" stroke="'+SC.dark(mc2,.3)+'" stroke-opacity=".6" stroke-width="'+n1(sw2*.8)+'"/>';
    [.12,.5,.88].forEach(function(f2,i){var x2=w*f2,y2=ry+(i===1?ry*.9:ry*.45);s+='<rect x="'+n1(x2-sw2/2)+'" y="'+n1(y2)+'" width="'+n1(sw2)+'" height="'+n1(h-2*ry)+'" fill="'+(i===1?mg2:SC.dark(mc2,.15))+'"/>'});
    s+='<ellipse cx="'+n1(w/2)+'" cy="'+n1(ry)+'" rx="'+n1(w/2-sw2/2)+'" ry="'+n1(ry-sw2/2)+'" fill="'+SC.lite(mc2,.55)+'" fill-opacity=".35" stroke="'+mg2+'" stroke-width="'+n1(sw2)+'"/><path d="M'+n1(sw2/2)+','+n1(h-ry)+' A'+n1(w/2-sw2/2)+','+n1(ry-sw2/2)+' 0 0 0 '+n1(w-sw2/2)+','+n1(h-ry)+'" fill="none" stroke="'+mg2+'" stroke-width="'+n1(sw2)+'"/>';
    var lidc=el&&SC.LID[el.lid]?el.lid:null;
    if(lidc){var lc3=SC.lidPaint(lidc,el.lc),tk2=Math.max(18,Math.min(h*.05,40)),rx3=w/2+tk2*.3;
      s+='<ellipse cx="'+n1(w/2)+'" cy="'+n1(ry+tk2)+'" rx="'+n1(rx3)+'" ry="'+n1(ry)+'" fill="'+SC.dark(lc3,.2)+'"/><rect x="'+n1(w/2-rx3)+'" y="'+n1(ry)+'" width="'+n1(rx3*2)+'" height="'+n1(tk2)+'" fill="'+SC.dark(lc3,.12)+'"/><ellipse cx="'+n1(w/2)+'" cy="'+n1(ry)+'" rx="'+n1(rx3)+'" ry="'+n1(ry)+'" fill="'+SC.lite(lc3,.12)+'"/>'+
        (lidc==='mirror'?'<ellipse cx="'+n1(w*.4)+'" cy="'+n1(ry*.8)+'" rx="'+n1(w*.18)+'" ry="'+n1(ry*.3)+'" fill="#fff" opacity=".5"/>':lidc==='marble'?'<path d="M'+n1(w*.15)+','+n1(ry*1.2)+' C'+n1(w*.4)+','+n1(ry*.4)+' '+n1(w*.6)+','+n1(ry*1.4)+' '+n1(w*.85)+','+n1(ry*.6)+'" fill="none" stroke="#B9B4AC" stroke-width="4" opacity=".7"/>':'')}}
  else if(kind==='mset'){[[0,.42,.62],[.36,.32,1],[.66,.34,.78]].forEach(function(q){var sw3=w*q[1],sh3=h*q[2];s+='<g transform="translate('+n1(w*q[0])+' '+n1(h-sh3)+')">'+SC.prop('mglass',sw3,sh3,pal,ctx,{color:ec,lid:el&&el.lid,lc:el&&el.lc})+'</g>'})}
  else if(kind==='gift'){var shp=el&&el.shape||'cube',gc=ec||pal.c[1],rc=el&&el.rib||'#C9A857',rg=SC.METAL.test(rc)?gold:rc,pat=el&&el.pat||'plain';s+=SC.giftBox(0,0,w,h,shp,gc,rg,pat,ctx)}
  else if(kind==='giftpile'){var gc2=ec||pal.c[1],rc2=el&&el.rib||'#C9A857',RR=SC.rng(SC.hash((el&&el.id)||'gp')+5),nn=Math.max(3,Math.min(30,Math.round(+(el&&el.n)||12))),boxes=[],shapes=['cube','tall','flat','cube','round','cube','flat'];
    var unit=Math.max(120,Math.min(h*.62,Math.sqrt(w*h/nn*1.15)));
    for(var gi=0;gi<nn;gi++){var sh=shapes[Math.floor(RR()*shapes.length)],bw3=unit*(.65+RR()*.55)*(sh==='flat'?1.4:sh==='tall'?.75:1),bh3=bw3*D.GIFT_SHAPE[sh][1];bh3=Math.min(bh3,h*.9);
      var best=null,bs=-1e9;for(var t=0;t<16;t++){var x3=RR()*Math.max(1,w-bw3),floorY=h;for(var q=0;q<boxes.length;q++){var o=boxes[q];if(x3<o.x+o.w*.9&&x3+bw3>o.x+o.w*.1)floorY=Math.min(floorY,o.y+o.h*.12)}var y3=floorY-bh3;if(y3<0)continue;var sc=y3-Math.abs(x3+bw3/2-w/2)*.25;if(sc>bs){bs=sc;best={x:x3,y:y3,w:bw3,h:bh3,sh:sh}}}
      if(best)boxes.push(best)}
    boxes.sort(function(a,b){return (a.y+a.h)-(b.y+b.h)});
    boxes.forEach(function(b,i){var alt=i%3===1,c1=alt?rc2:gc2,c2=alt?gc2:rc2,pt2=i%4===2?'geo':i%5===3?'stripes':'plain';s+=SC.giftBox(b.x,b.y,b.w,b.h,b.sh,c1,SC.METAL.test(c2)?gold:c2,pt2,ctx)})}
  else if(kind==='candelabra'){var mc3=ec||'#C9A857',mg3=SC.metal(mc3,ctx),nc3=+(el&&el.n)===3?3:5,ch=h*.34,ab=h*.5,sw4=Math.max(10,w*.035),xs=[];
    for(var ci=0;ci<nc3;ci++)xs.push(w*(.1+.8*ci/(nc3-1)));
    s+='<path d="M'+n1(w*.34)+','+h+' L'+n1(w*.66)+','+h+' L'+n1(w*.54)+','+n1(h*.9)+' L'+n1(w*.46)+','+n1(h*.9)+' Z" fill="'+mg3+'"/><rect x="'+n1(w/2-sw4*.65)+'" y="'+n1(ch+h*.04)+'" width="'+n1(sw4*1.3)+'" height="'+n1(h*.86-ch)+'" fill="'+mg3+'"/>';
    xs.forEach(function(x4,i){if(Math.abs(x4-w/2)<1)return;var ty4=ch+h*.06;s+='<path d="M'+n1(w/2)+','+n1(ab)+' Q'+n1(x4)+','+n1(ab+h*.08)+' '+n1(x4)+','+n1(ty4)+'" fill="none" stroke="'+mg3+'" stroke-width="'+n1(sw4)+'"/>'});
    xs.forEach(function(x4){s+=SC.candle(x4,ch+h*.05,w*.07,h*.28,mg3)})}
  else if(kind==='csticks'){var mc4=ec||'#C9A857',mg4=SC.metal(mc4,ctx),nc4=Math.max(2,Math.min(9,Math.round(+(el&&el.n)||5))),hs=[.55,.85,.7,1,.62,.9,.75,.58,.8];
    for(var si2=0;si2<nc4;si2++){var x5=w*(.08+.84*(nc4>1?si2/(nc4-1):.5)),hh5=h*.62*hs[si2%9],top5=h-hh5;
      s+='<path d="M'+n1(x5-w*.06)+','+h+' L'+n1(x5+w*.06)+','+h+' L'+n1(x5+w*.015)+','+n1(h-h*.04)+' L'+n1(x5-w*.015)+','+n1(h-h*.04)+' Z" fill="'+mg4+'"/><rect x="'+n1(x5-w*.012)+'" y="'+n1(top5)+'" width="'+n1(w*.024)+'" height="'+n1(hh5-h*.04)+'" fill="'+mg4+'"/><ellipse cx="'+n1(x5)+'" cy="'+n1(top5)+'" rx="'+n1(w*.04)+'" ry="'+n1(w*.012)+'" fill="'+mg4+'"/>'+SC.candle(x5,top5,w*.035,h*.3,null)}}
  else if(kind==='lantern'){var mc5=ec||'#C9A857',mg5=SC.metal(mc5,ctx),lw2=Math.max(8,w*.05);
    s+='<rect x="'+n1(w*.12)+'" y="'+n1(h*.22)+'" width="'+n1(w*.76)+'" height="'+n1(h*.68)+'" fill="#E8F1F4" fill-opacity=".25"/>'+SC.candle(w/2,h*.88,w*.2,h*.36,null)+
      '<rect x="'+n1(w*.12)+'" y="'+n1(h*.22)+'" width="'+n1(w*.76)+'" height="'+n1(h*.68)+'" fill="none" stroke="'+mg5+'" stroke-width="'+n1(lw2)+'"/><path d="M'+n1(w*.04)+','+n1(h*.22)+' L'+n1(w*.5)+','+n1(h*.08)+' L'+n1(w*.96)+','+n1(h*.22)+' Z" fill="'+mg5+'"/><circle cx="'+n1(w/2)+'" cy="'+n1(h*.045)+'" r="'+n1(w*.07)+'" fill="none" stroke="'+mg5+'" stroke-width="'+n1(lw2*.7)+'"/><rect x="0" y="'+n1(h*.9)+'" width="'+w+'" height="'+n1(h*.1)+'" fill="'+mg5+'"/>'}
  else if(kind==='table'){var tc2=ec||'#FFFFFF',tt=h*.34,tc3=pal.bal;
    s+='<rect x="0" y="'+n1(tt)+'" width="'+w+'" height="'+n1(h-tt)+'" fill="'+tc2+'"/>';for(var tf=1;tf<8;tf++)s+='<path d="M'+n1(w*tf/8)+','+n1(tt+20)+' Q'+n1(w*tf/8+14)+','+n1((tt+h)/2)+' '+n1(w*tf/8-6)+','+h+'" stroke="'+SC.dark(tc2,.1)+'" stroke-width="8" fill="none"/>';
    s+='<rect x="-14" y="'+n1(tt-14)+'" width="'+n1(w+28)+'" height="28" rx="8" fill="'+SC.lite(tc2,.3)+'" stroke="'+SC.dark(tc2,.12)+'" stroke-width="3"/>';
    var cx4=w/2,cb=tt-14;s+='<rect x="'+n1(cx4-12)+'" y="'+n1(cb-60)+'" width="24" height="60" fill="#D8CFC0"/><ellipse cx="'+n1(cx4)+'" cy="'+n1(cb-62)+'" rx="150" ry="16" fill="#E9E2D6"/>';
    s+='<rect x="'+n1(cx4-120)+'" y="'+n1(cb-200)+'" width="240" height="138" rx="10" fill="'+(tc3[3]||'#F4EFE6')+'"/><rect x="'+n1(cx4-85)+'" y="'+n1(cb-300)+'" width="170" height="104" rx="10" fill="'+(tc3[4]||'#E9D49A')+'"/><circle cx="'+n1(cx4)+'" cy="'+n1(cb-312)+'" r="16" fill="'+(tc3[0]||'#C24A63')+'"/>';
    [w*.18,w*.3].forEach(function(x,i){s+='<path d="M'+n1(x-38)+','+n1(cb)+' L'+n1(x+38)+','+n1(cb)+' L'+n1(x+30)+','+n1(cb-50)+' L'+n1(x-30)+','+n1(cb-50)+' Z" fill="#E5D2B8"/><circle cx="'+n1(x)+'" cy="'+n1(cb-62)+'" r="36" fill="'+(tc3[i+1]||'#F2D6DA')+'"/>'});
    [w*.72,w*.84].forEach(function(x,i){s+='<rect x="'+n1(x-42)+'" y="'+n1(cb-150)+'" width="84" height="150" rx="16" fill="#fff" fill-opacity=".45" stroke="#fff" stroke-width="5"/><rect x="'+n1(x-36)+'" y="'+n1(cb-100)+'" width="72" height="96" rx="12" fill="'+(tc3[i*2]||'#C9A857')+'"/>'})}
  else if(kind==='podq'||kind==='plq'){var qc=ec||pal.bal[3]||'#F4EFE6',tp=Math.min(w*.08,h*.35),sk2=w*.05;
    s+='<rect x="0" y="'+n1(tp)+'" width="'+w+'" height="'+n1(h-tp)+'" fill="'+qc+'"/><rect x="'+n1(w*.72)+'" y="'+n1(tp)+'" width="'+n1(w*.28)+'" height="'+n1(h-tp)+'" fill="#000" opacity=".07"/><path d="M0,'+n1(tp)+' L'+n1(sk2)+',0 L'+n1(w-sk2)+',0 L'+w+','+n1(tp)+' Z" fill="'+SC.lite(qc,.32)+'"/><path d="M0,'+n1(tp)+' L'+w+','+n1(tp)+'" stroke="#000" stroke-opacity=".08" stroke-width="4"/>'}
  return s;
};

/* ---------- pictures loaded from files: kept once in a hidden <svg>, referenced by <use> ---------- */
SC.img = function(id){return (typeof IMG!=='undefined'&&id&&IMG[id])||null};
SC.imgDefs = function(ids){var s='';ids.forEach(function(id){var im=SC.img(id);if(im)s+='<image id="im-'+id+'" href="'+im.src+'" xlink:href="'+im.src+'" width="'+im.w+'" height="'+im.h+'" preserveAspectRatio="none"/>'});return s};
SC.usedImgs = function(S){var u={};S.els.forEach(function(e){if(e.im&&(e.type==='pic'||e.surf==='image'))u[e.im]=1;if(e.type==='pic'&&e.im0)u[e.im0]=1});if(S.ref&&S.ref.im)u[S.ref.im]=1;return Object.keys(u)};
SC.use = function(id,tx,ty,sx,sy){return '<use href="#im-'+id+'" xlink:href="#im-'+id+'" transform="translate('+n1(tx)+' '+n1(ty)+') scale('+(Math.round(sx*1e5)/1e5)+' '+(Math.round(sy*1e5)/1e5)+')"/>'};
SC.METAL = /^#(C9A857|CFA549|D4B05A|C9A24B|CDB48A|D9A98C|B9BEC7|D4AF37|C4C8CF|B76E79|E6C36A)$/i;
SC.seqColor = function(el){var q=D.SEQ[el.seq];return el.seq==='custom'||!q?(el.color||D.SEQ.gold.c):q.c};
/* crumpled foil: a seamless 360 mm tile of facets on a jittered grid, each facet lit differently: deep folds, mid tones, glints */
SC.foilPat = function(id,c,holo,N,T,seed){
  N=N||10;T=T||600;var cs=T/N,rq=SC.rng((seed||173)+(holo?138:0)),P=[],i,j,out='',hc=['#F3B7CF','#CDB4F0','#A9E3DC','#F6D9B0','#BFE3F7'];
  var ex=[],ey=[];for(i=0;i<=N;i++){ex.push(i%N?(rq()-.5)*cs*.7:0);ey.push(i%N?(rq()-.5)*cs*.7:0)}   // shared jitter along the tile edges, so opposite edges match
  for(j=0;j<=N;j++){P.push([]);for(i=0;i<=N;i++){var X=i*cs,Y=j*cs;
    if(i%N&&j%N){X+=(rq()-.5)*cs*.8;Y+=(rq()-.5)*cs*.8}else if(i%N){X+=ex[i]}else if(j%N){Y+=ey[j]}
    P[j].push([X,Y])}}
  var shade=function(){var b=holo?hc[Math.floor(rq()*hc.length)]:c,v=rq();return v<.24?SC.dark(b,.55+rq()*.32):v<.52?SC.dark(b,.18+rq()*.27):v<.84?SC.lite(b,.04+rq()*.28):SC.lite(b,.75+rq()*.25)};
  var tri=function(a,b,d){var f=shade();out+='<path d="M'+n1(a[0])+','+n1(a[1])+'L'+n1(b[0])+','+n1(b[1])+'L'+n1(d[0])+','+n1(d[1])+'Z" fill="'+f+'" stroke="'+f+'" stroke-width=".8"/>';if(rq()<.22)out+='<path d="M'+n1(a[0])+','+n1(a[1])+'L'+n1(b[0])+','+n1(b[1])+'" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>'};
  for(j=0;j<N;j++)for(i=0;i<N;i++){var p00=P[j][i],p10=P[j][i+1],p01=P[j+1][i],p11=P[j+1][i+1];if(rq()<.5){tri(p00,p10,p11);tri(p00,p11,p01)}else{tri(p00,p10,p01);tri(p10,p11,p01)}}
  return '<pattern id="'+id+'" patternUnits="userSpaceOnUse" width="'+T+'" height="'+T+'">'+out+'</pattern>'};
/* a neon shape in its box: glow by level 0..3, then the tube and its bright core */
SC.neon = function(el,fid){
  var p=E.neonPts(el),d='M'+p.map(function(q){return n1(q[0])+','+n1(q[1])}).join('L')+((el.kind!=='line'&&(el.kind==='rect'||(+el.arc||360)>=360))?'Z':''),c=el.color||'#FF5FA2',t=(D.NEON_TUBE[el.tube]||D.NEON_TUBE.l)[1]*2,g=el.glow===undefined?2:+el.glow,s='',P=function(col,wd,op,f){return '<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="'+n1(wd)+'" stroke-opacity="'+op+'" stroke-linecap="round" stroke-linejoin="round"'+(f?' filter="url(#'+f+')"':'')+'/>'};
  s+='<path d="'+d+'" fill="none" stroke="transparent" stroke-width="'+n1(Math.max(90,t*4))+'" stroke-linecap="round" stroke-linejoin="round"/>';   // a wide invisible stroke to tap on
  if(el.base==='acrylic')s+='<rect x="0" y="0" width="'+el.w+'" height="'+el.h+'" rx="18" fill="#fff" fill-opacity=".08" stroke="#fff" stroke-opacity=".45" stroke-width="5"/>';
  if(g>0)s+=P(c,t*(3+2*g),.32+.08*g,fid+'a')+P(c,t*2.2,.75,fid+'b');
  s+=P(g>0?SC.lite(c,.45):SC.mix(c,'#FFFFFF',.35),t*1.25,1)+(g>0?P('#FFFFFF',t*.45,.85):P('#000000',t*.3,.12));
  return s};
SC.bgColor = function(el,pal){return (el.surf==='sequin'||el.surf==='foil')?SC.seqColor(el):(el.color||pal.c[(el.tone||0)%4])};
SC.span = function(S){var a=1e9,b=-1e9;S.els.forEach(function(e){a=Math.min(a,e.x);b=Math.max(b,e.x+e.w)});return S.els.length?[a,b]:[S.room.w*.25,S.room.w*.75]};

/* ---------- the whole scene ---------- */
SC.render = function(S,R,opt){
  opt=opt||{};var uid=opt.uid||'s',W=S.room.w,H=S.room.h,pal=D.pal(S.palette),defs={},rdefs={},o=[],parts=[],from=opt.from||0,to=opt.to==null?S.els.length:opt.to;
  var zm=E.zMap(S),ord=SC.order(S,zm),shd=[];SC._zm=zm;
  // lid/ldefs: where per-colour gradients go. One shared set for a whole picture; a private set per element when
  // the scene is drawn as separate layers, so that recolouring one element never touches the others.
  var lid=uid,ldefs=defs;
  var ctx={id:function(k){return uid+'-'+k}};
  function grad(c){var k='f'+c.replace('#','');if(!ldefs[k])ldefs[k]='<linearGradient id="'+lid+'-'+k+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+SC.lite(c,.09)+'"/><stop offset="1" stop-color="'+SC.dark(c,.09)+'"/></linearGradient>';return 'url(#'+lid+'-'+k+')'}
  function bgrad(c,fin){var chrome=fin==='chrome',metal=chrome||SC.METAL.test(c),k=(chrome?'c':'b')+c.replace('#','');
    if(!ldefs[k])ldefs[k]=chrome?
      '<radialGradient id="'+lid+'-'+k+'" cx=".34" cy=".28" r=".86"><stop offset="0" stop-color="#fff"/><stop offset=".1" stop-color="'+SC.lite(c,.72)+'"/><stop offset=".36" stop-color="'+c+'"/><stop offset=".6" stop-color="'+SC.dark(c,.42)+'"/><stop offset=".8" stop-color="'+SC.lite(c,.12)+'"/><stop offset="1" stop-color="'+SC.dark(c,.55)+'"/></radialGradient>':
      '<radialGradient id="'+lid+'-'+k+'" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="'+SC.lite(c,metal?.75:.42)+'"/><stop offset="'+(metal?.35:.45)+'" stop-color="'+c+'"/><stop offset="1" stop-color="'+SC.dark(c,metal?.42:.3)+'"/></radialGradient>';
    return 'url(#'+lid+'-'+k+')'}
  function pgrad(c){var k='p'+c.replace('#','');if(!ldefs[k])ldefs[k]='<radialGradient id="'+lid+'-'+k+'" cx=".34" cy=".28" r=".85"><stop offset="0" stop-color="'+SC.lite(c,.82)+'"/><stop offset=".3" stop-color="'+SC.lite(c,.35)+'"/><stop offset=".7" stop-color="'+c+'"/><stop offset="1" stop-color="'+SC.mix(SC.dark(c,.18),'#B9A6C9',.18)+'"/></radialGradient>';return 'url(#'+lid+'-'+k+')'}
  function fgrad(c){var k='g'+c.replace('#','');if(!ldefs[k])ldefs[k]='<linearGradient id="'+lid+'-'+k+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+SC.lite(c,.62)+'"/><stop offset=".28" stop-color="'+c+'"/><stop offset=".55" stop-color="'+SC.dark(c,.34)+'"/><stop offset=".78" stop-color="'+SC.lite(c,.32)+'"/><stop offset="1" stop-color="'+SC.dark(c,.42)+'"/></linearGradient>';return 'url(#'+lid+'-'+k+')'}
  function balloon(b,cols,fins){var c=cols[b.ci%cols.length]||'#CCCCCC',f=fins?fins[b.ci%5]:'latex';
    if(f==='confetti'){needClr();var dots='',rq=SC.rng(Math.round(b.x*7+b.y*13));for(var di=0;di<7;di++){var da=rq()*6.283,dr=Math.sqrt(rq())*b.r*.72;dots+='<circle cx="'+n1(b.x+Math.cos(da)*dr)+'" cy="'+n1(b.y+Math.sin(da)*dr)+'" r="'+n1(b.r*.075)+'" fill="'+c+'"/>'}
      return '<circle cx="'+n1(b.x)+'" cy="'+n1(b.y)+'" r="'+n1(b.r)+'" fill="url(#'+uid+'-clr)" stroke="#fff" stroke-opacity=".75" stroke-width="'+n1(Math.max(2,b.r*.04))+'"/>'+dots+'<ellipse cx="'+n1(b.x-b.r*.34)+'" cy="'+n1(b.y-b.r*.4)+'" rx="'+n1(b.r*.2)+'" ry="'+n1(b.r*.12)+'" fill="#fff" opacity=".6" transform="rotate(-32 '+n1(b.x-b.r*.34)+' '+n1(b.y-b.r*.4)+')"/>'}
    var fill=f==='chrome'?bgrad(c,'chrome'):f==='pearl'?pgrad(c):bgrad(c);
    return '<circle cx="'+n1(b.x)+'" cy="'+n1(b.y)+'" r="'+n1(b.r)+'" fill="'+fill+'"/><ellipse cx="'+n1(b.x-b.r*.34)+'" cy="'+n1(b.y-b.r*.4)+'" rx="'+n1(b.r*.2)+'" ry="'+n1(b.r*.12)+'" fill="#fff" opacity=".4" transform="rotate(-32 '+n1(b.x-b.r*.34)+' '+n1(b.y-b.r*.4)+')"/>'}
  var bcols=pal.bal;

  defs.gold='<linearGradient id="'+uid+'-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0DDA0"/><stop offset=".5" stop-color="#C9A857"/><stop offset="1" stop-color="#9C7B34"/></linearGradient>';
  var wc=S.room.wall||'#EEECE6',fc=S.room.floorC||'#DDD7CC';
  rdefs.wall='<linearGradient id="'+uid+'-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+SC.lite(wc,.3)+'"/><stop offset="1" stop-color="'+SC.dark(wc,.02)+'"/></linearGradient>';
  rdefs.floor='<linearGradient id="'+uid+'-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+SC.dark(fc,.05)+'"/><stop offset="1" stop-color="'+SC.lite(fc,.35)+'"/></linearGradient>';
  defs.sh='<filter id="'+uid+'-sh" x="-20%" y="-10%" width="150%" height="130%"><feDropShadow dx="26" dy="14" stdDeviation="22" flood-color="#1b1408" flood-opacity=".3"/></filter>';
  defs.sh2='<filter id="'+uid+'-sh2" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="10" dy="8" stdDeviation="10" flood-color="#1b1408" flood-opacity=".28"/></filter>';
  defs.neon='<filter id="'+uid+'-neon" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="16" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';

  function needSeq(){if(defs.seq)return;var rq=SC.rng(77),cells='';for(var qy=0;qy<10;qy++)for(var qx=0;qx<10;qx++){var v=rq(),wht=v>.45;cells+='<rect x="'+(qx*30+1.5)+'" y="'+(qy*30+1.5)+'" width="27" height="27" rx="3" fill="'+(wht?'#fff':'#000')+'" opacity="'+n1(wht?(v-.45)*1.3:(.45-v)*.75)+'"/>'}
    defs.seq='<pattern id="'+uid+'-seq" width="300" height="300" patternUnits="userSpaceOnUse">'+cells+'<path d="M0,0H300M0,30H300M0,60H300M0,90H300M0,120H300M0,150H300M0,180H300M0,210H300M0,240H300M0,270H300M0,0V300M30,0V300M60,0V300M90,0V300M120,0V300M150,0V300M180,0V300M210,0V300M240,0V300M270,0V300" stroke="#000" stroke-opacity=".16" stroke-width="2.2"/></pattern>';
    defs.cham='<linearGradient id="'+uid+'-cham" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3B7CF"/><stop offset=".3" stop-color="#CDB4F0"/><stop offset=".58" stop-color="#A9E3DC"/><stop offset=".8" stop-color="#F6D9B0"/><stop offset="1" stop-color="#F0A9C4"/></linearGradient>'}
  function needClr(){if(!defs.clr)defs.clr='<radialGradient id="'+uid+'-clr" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".04"/><stop offset=".78" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity=".5"/></radialGradient>'}
  function needGreens(){if(defs.gw)return;var rq=SC.rng(91),lv='',gc=['#2F5A3D','#3E6B4A','#4F7F59','#6E9A6E','#355F42'];
    for(var gi=0;gi<26;gi++){var gx=rq()*180,gy=rq()*180,ga=rq()*180,gl=26+rq()*26;lv+='<ellipse cx="'+n1(gx)+'" cy="'+n1(gy)+'" rx="'+n1(gl)+'" ry="'+n1(gl*.42)+'" fill="'+gc[gi%5]+'" transform="rotate('+n1(ga)+' '+n1(gx)+' '+n1(gy)+')"/>'}
    defs.gw='<pattern id="'+uid+'-gw" patternUnits="userSpaceOnUse" width="180" height="180"><rect width="180" height="180" fill="#2C5238"/>'+lv+'</pattern>'}
  if(opt.parts){needSeq();needClr();needGreens()}   // the shared set never changes while the page lives

  // room
  if(!opt.noRoom){
    o.push('<rect x="0" y="0" width="'+W+'" height="'+H+'" fill="url(#'+uid+'-wall)"/>');
    if(S.room.moldings){var n=Math.max(2,Math.round(W/1700)),pw=(W-200)/n,m1=SC.dark(wc,.09),m2=SC.lite(wc,.7);
      for(var i=0;i<n;i++){var px=100+i*pw+50;o.push('<rect x="'+n1(px)+'" y="180" width="'+n1(pw-100)+'" height="'+n1(H-180-950)+'" fill="none" stroke="'+m1+'" stroke-width="10"/><rect x="'+n1(px+6)+'" y="186" width="'+n1(pw-100)+'" height="'+n1(H-180-950)+'" fill="none" stroke="'+m2+'" stroke-width="5" opacity=".7"/>'+
        '<rect x="'+n1(px)+'" y="'+(H-650)+'" width="'+n1(pw-100)+'" height="470" fill="none" stroke="'+m1+'" stroke-width="10"/>')}
      o.push('<rect x="0" y="'+(H-90)+'" width="'+W+'" height="90" fill="'+SC.lite(wc,.15)+'"/><rect x="0" y="'+(H-94)+'" width="'+W+'" height="6" fill="'+SC.dark(wc,.1)+'"/>')}
    o.push('<rect x="0" y="'+H+'" width="'+W+'" height="'+SC.FLOOR+'" fill="url(#'+uid+'-floor)"/>');
    var fk=SC.dark(fc,.32),zb=SC.ZMAX;
    // boards running towards the viewer every 500 mm, depth lines every 500 mm with a label each metre
    for(var gx=0;gx<=W;gx+=500){var p0=SC.fp(S,gx,0),p1=SC.fp(S,gx,zb);o.push('<path d="M'+n1(p0[0])+','+n1(p0[1])+' L'+n1(p1[0])+','+n1(p1[1])+'" stroke="'+fk+'" stroke-opacity=".13" stroke-width="4"/>')}
    for(var gz=500;gz<=zb;gz+=500){var gy=SC.floorY(S,gz);o.push('<path d="M0,'+n1(gy)+' H'+W+'" stroke="'+fk+'" stroke-opacity="'+(gz===zb?.3:.16)+'" stroke-width="'+(gz===zb?7:4)+'"'+(gz===zb?' stroke-dasharray="40 30"':'')+'/>')}
    var past=SC.floorY(S,zb);o.push('<rect x="0" y="'+n1(past)+'" width="'+W+'" height="'+n1(H+SC.FLOOR-past)+'" fill="'+fk+'" opacity=".06"/>');   // beyond the 2.5 m
    if(S.floor&&S.floor.mat){var sp=R&&S.els.length?[R.zone.x0,R.zone.x1]:SC.span(S),mc=S.floor.color||'#E7C6CF',a=sp[0]-160,b=sp[1]+160,md=Math.min(zb,R&&S.els.length?R.zone.d:1500);
      var q=[SC.fp(S,a,0),SC.fp(S,b,0),SC.fp(S,b,md),SC.fp(S,a,md)];
      rdefs.mat='<linearGradient id="'+uid+'-mat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+SC.dark(mc,.1)+'"/><stop offset=".25" stop-color="'+mc+'"/><stop offset="1" stop-color="'+SC.lite(mc,.22)+'"/></linearGradient>';
      o.push('<path d="M'+q.map(function(p){return n1(p[0])+','+n1(p[1])}).join(' L')+' Z" fill="url(#'+uid+'-mat)"/>')}
    o.push('<rect x="0" y="'+H+'" width="'+W+'" height="30" fill="#000" opacity=".07"/>');
    // contact shadows of what stands on the floor (a layer of their own on the stage: they change while things move)
    ord.forEach(function(ei){var e=S.els[ei];if(e.hide||e.y>0||e.type==='garland'||e.type==='drape'||(e.type==='flora'&&e.shape!=='pile'))return;var pb=SC.box(S,e.x,0,e.w,e.h,zm[e.id]);
      shd.push('<ellipse cx="'+n1(pb.x+pb.w/2)+'" cy="'+n1(pb.y+pb.h-6*pb.s)+'" rx="'+n1(pb.w*.52)+'" ry="'+n1(Math.max(14,Math.min(90,pb.w*.07)))+'" fill="#1b1408" opacity="'+(E.isBg(e)?.16:.22)+'"/>')});
    if(!opt.parts)o.push(shd.join(''));
  }

  var roomEnd=o.length;
  // elements, back to front
  var modById={};if(R)R.mods.forEach(function(m){modById[m.id]=m});
  ord.forEach(function(ei,pos){var el=S.els[ei];
    if(pos<from||pos>=to||el.hide)return;
    if(opt.parts){lid=uid+el.id;ldefs={}}
    var x=el.x,y=H-el.y-el.h,s='',w=el.w,h=el.h,ia=opt.interactive?' class="el" data-id="'+el.id+'"':'',hit='<rect x="0" y="0" width="'+w+'" height="'+h+'" fill="transparent"/>';
    if(E.isBg(el)){
      var c=SC.bgColor(el,pal),d=SC.bgPath(el),ev=(el.type==='uarch'||el.type==='portal')?' fill-rule="evenodd"':'',im=el.surf==='image'?SC.img(el.im):null;
      s+='<g filter="url(#'+uid+'-sh)">';
      if(el.type==='portal'&&el.insert!=='none'){var ic=el.insColor||pal.ins,nd=SC.nicheD(el),g=E.geom(el),nn=g.niche,cid=uid+'-clip'+el.id;
        s+='<clipPath id="'+cid+'"><path d="'+nd+'"/></clipPath><g clip-path="url(#'+cid+')"><rect x="'+nn.x0+'" y="'+(h-nn.y1)+'" width="'+nn.w+'" height="'+nn.h+'" fill="'+ic+'"/>';
        if(el.insert==='slats'){for(var sx=nn.x0+6;sx<nn.x1;sx+=25)s+='<rect x="'+n1(sx)+'" y="'+(h-nn.y1)+'" width="11" height="'+nn.h+'" fill="'+SC.dark(ic,.13)+'"/><rect x="'+n1(sx+11)+'" y="'+(h-nn.y1)+'" width="5" height="'+nn.h+'" fill="'+SC.lite(ic,.2)+'"/>'}
        if(el.insert==='mirror')s+='<rect x="'+nn.x0+'" y="'+(h-nn.y1)+'" width="'+nn.w+'" height="'+nn.h+'" fill="#DDE6EA"/><path d="M'+(nn.x0+nn.w*.2)+','+(h-nn.y1)+' l'+nn.w*.25+',0 l-'+nn.w*.5+','+nn.h+' l-'+nn.w*.25+',0 Z" fill="#fff" opacity=".45"/>';
        s+='<path d="'+nd+'" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="46"/></g>'}
      s+='<path d="'+d+'" transform="translate(16,0)" fill="'+SC.dark(c,.26)+'"'+ev+'/>';
      if(el.surf==='sequin'){
        needSeq();
        s+='<path d="'+d+'" fill="'+(el.seq==='cham'?'url(#'+uid+'-cham)':grad(c))+'"'+ev+'/><path d="'+d+'" fill="url(#'+uid+'-seq)"'+ev+'/>';
      } else if(el.surf==='foil'){var fpid=lid+'-foil'+(el.seq==='cham'?'h':c.slice(1));if(!ldefs['foil'+fpid])ldefs['foil'+fpid]=SC.foilPat(fpid,c,el.seq==='cham');
        if(!ldefs.foilsh)ldefs.foilsh='<linearGradient id="'+lid+'-foilsh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>';
        // two layers of facets with different tile sizes (600 and 410 mm): together they repeat only every 24.6 m, so no pattern shows
        if(!ldefs['foil2'+fpid])ldefs['foil2'+fpid]=SC.foilPat(fpid+'b',c,el.seq==='cham',14,410,59);
        s+='<path d="'+d+'" fill="url(#'+fpid+')"'+ev+'/><path d="'+d+'" fill="url(#'+fpid+'b)" opacity=".5"'+ev+'/><path d="'+d+'" fill="url(#'+lid+'-foilsh)"'+ev+'/>';
      } else if(el.surf==='greens'){needGreens();s+='<path d="'+d+'" fill="url(#'+uid+'-gw)"'+ev+'/>'}
      else s+='<path d="'+d+'" fill="'+grad(c)+'"'+ev+'/>';
      if(im){var fitc=el.imFit==='contain',s0=fitc?Math.min(w/im.w,h/im.h):Math.max(w/im.w,h/im.h),sc=s0*(el.imZ||100)/100,pid=uid+'-pc'+el.id;
        s+='<clipPath id="'+pid+'"><path d="'+d+'"'+(ev?' clip-rule="evenodd"':'')+'/></clipPath><g clip-path="url(#'+pid+')">'+SC.use(el.im,(w-im.w*sc)/2+(el.imX||0)/100*w,(h-im.h*sc)/2+(el.imY||0)/100*h,sc,sc)+'</g>'}
      s+='<path d="'+d+'" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="5"'+ev+'/></g>';
      if(opt.grid&&modById[el.id]){modById[el.id].mag.forEach(function(p){s+='<circle cx="'+p[0]+'" cy="'+(h-p[1])+'" r="15" fill="#E7C66A" stroke="#fff" stroke-width="4"/>'})}
    }
    else if(el.type==='garland'){
      var lay=SC.garland(el,E.balPlan(el,S)),gc=el.cols||bcols;
      s+='<rect x="0" y="0" width="'+w+'" height="'+h+'" fill="transparent" pointer-events="none"/>';
      if(S.balloons.greens)lay.sprigs.forEach(function(p){s+='<g transform="translate('+n1(p.x)+' '+n1(p.y)+') rotate('+n1(p.a*180/Math.PI)+') scale('+n1(p.s)+')"><path d="M0,0 Q90,-18 210,0" fill="none" stroke="#5C7F68" stroke-width="7"/>'+[30,70,110,150,190].map(function(q,i){return '<ellipse cx="'+q+'" cy="'+(i%2?-24:20)+'" rx="26" ry="11" fill="'+(i%2?'#6F957C':'#4F7A60')+'" transform="rotate('+(i%2?-28:28)+' '+q+' '+(i%2?-24:20)+')"/>'}).join('')+'</g>'});
      s+='<g filter="url(#'+uid+'-sh2)">';lay.b.forEach(function(b){s+=balloon(b,gc,E.finsOf(el))});s+='</g>';
    }
    else if(el.type==='cluster'){var cc=el.cols||bcols;s+='<rect x="0" y="0" width="'+w+'" height="'+h+'" fill="transparent" pointer-events="none"/><g filter="url(#'+uid+'-sh2)">';SC.cluster(el,E.balPlan(el,S)).b.forEach(function(b){s+=balloon(b,cc,E.finsOf(el))});s+='</g>'}
    else if(el.type==='balloon'){
      var r=w/2,bc=el.color||pal.bal[0],kn='<path d="M'+n1(r-w*.05)+','+n1(w+w*.05)+' L'+r+','+n1(w-w*.012)+' L'+n1(r+w*.05)+','+n1(w+w*.05)+' Z"';
      if(el.string&&el.y>60){var L=el.y-20;s+='<path d="M'+r+','+n1(w+w*.04)+' q'+n1(w*.07)+','+n1(L*.25)+' 0,'+n1(L*.5)+' t0,'+n1(L*.5)+'" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="5"/><path d="M'+r+','+n1(w+w*.04)+' q'+n1(w*.07)+','+n1(L*.25)+' 0,'+n1(L*.5)+' t0,'+n1(L*.5)+'" fill="none" stroke="#6b6558" stroke-opacity=".35" stroke-width="2"/><ellipse cx="'+r+'" cy="'+n1(w+el.y-14)+'" rx="34" ry="14" fill="#CFC8BB"/>'}
      s+='<g filter="url(#'+uid+'-sh2)">';
      if(el.fin==='clear'){
        needClr();
        s+='<circle cx="'+r+'" cy="'+r+'" r="'+n1(r-3)+'" fill="url(#'+uid+'-clr)" stroke="#fff" stroke-opacity=".8" stroke-width="'+n1(Math.max(4,w*.012))+'"/></g><path d="M'+n1(r*.42)+','+n1(r*.72)+' A'+n1(r*.72)+','+n1(r*.72)+' 0 0 1 '+n1(r*.86)+','+n1(r*.34)+'" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="'+n1(w*.035)+'" stroke-linecap="round"/><path d="M'+n1(r*1.5)+','+n1(r*1.5)+' A'+n1(r*.74)+','+n1(r*.74)+' 0 0 1 '+n1(r*1.2)+','+n1(r*1.68)+'" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="'+n1(w*.02)+'" stroke-linecap="round"/>'+kn+' fill="#fff" fill-opacity=".7"/>';
      } else {
        var ch=el.fin==='chrome';
        s+='<circle cx="'+r+'" cy="'+r+'" r="'+r+'" fill="'+bgrad(bc,ch?'chrome':'')+'"/>'+kn+' fill="'+SC.dark(bc,.25)+'"/></g>';
        s+=ch?'<ellipse cx="'+n1(r*.62)+'" cy="'+n1(r*.52)+'" rx="'+n1(r*.2)+'" ry="'+n1(r*.11)+'" fill="#fff" opacity=".95" transform="rotate(-34 '+n1(r*.62)+' '+n1(r*.52)+')"/><path d="M'+n1(r*.32)+','+n1(r*1.42)+' A'+n1(r*.82)+','+n1(r*.82)+' 0 0 0 '+n1(r*1.5)+','+n1(r*1.62)+'" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="'+n1(w*.03)+'" stroke-linecap="round"/>'
             :'<ellipse cx="'+n1(r*.66)+'" cy="'+n1(r*.6)+'" rx="'+n1(r*.2)+'" ry="'+n1(r*.12)+'" fill="#fff" opacity=".42" transform="rotate(-32 '+n1(r*.66)+' '+n1(r*.6)+')"/>';
      }
    }
    else if(el.type==='pic'){
      var pm=SC.img(el.im);
      s+=hit+(pm?'<g filter="url(#'+uid+'-sh2)">'+SC.use(el.im,0,0,w/pm.w,h/pm.h)+'</g>':'<rect x="6" y="6" width="'+(w-12)+'" height="'+(h-12)+'" rx="24" fill="#fff" fill-opacity=".5" stroke="#8a8478" stroke-width="8" stroke-dasharray="40 26"/><text x="'+w/2+'" y="'+n1(h/2+20)+'" text-anchor="middle" font-family="'+D.FONTS.sans+'" font-size="'+n1(Math.min(70,w/7))+'" fill="#6b6558">нет файла</text>');
    }
    else if(el.type==='text'){
      var px=el.size/0.66,lines=String(el.text||'').split('\n'),mq=el.style==='marquee',col=el.color||(el.style==='flat'?'#1B1F1D':mq?'#F5EFE3':pal.ink),ff=mq?D.FONTS.sans:(D.FONTS[el.font]||D.FONTS.serif),fw=mq?700:(D.FONT_W[el.font]||600),lh=px*1.04;
      if(el.stand&&D.STAND_NAME[el.stand]){var pd=Math.min(px*.3,160),pb=h+pd;
        if(el.stand==='floor'&&el.y>pd+40){[w*.18,w*.82].forEach(function(lx){s+='<rect x="'+n1(lx-16)+'" y="'+n1(pb-20)+'" width="32" height="'+n1(el.y-pb+h+20)+'" fill="#9A9A98"/><rect x="'+n1(lx-16)+'" y="'+n1(pb-20)+'" width="10" height="'+n1(el.y-pb+h+20)+'" fill="#fff" opacity=".35"/><rect x="'+n1(lx-110)+'" y="'+n1(h+el.y-22)+'" width="220" height="22" rx="8" fill="#7E7E7C"/>'})}
        if(el.stand==='table'){[w*.22,w*.78].forEach(function(lx){s+='<rect x="'+n1(lx-60)+'" y="'+n1(pb)+'" width="120" height="40" rx="6" fill="#B7B2A8"/>'})}
        s+='<rect x="'+n1(-pd)+'" y="'+n1(-pd)+'" width="'+n1(w+2*pd)+'" height="'+n1(h+2*pd)+'" rx="24" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-opacity=".7" stroke-width="7"/><path d="M'+n1(-pd+30)+','+n1(-pd+12)+' l'+n1((w+2*pd)*.3)+',0" stroke="#fff" stroke-opacity=".6" stroke-width="8" stroke-linecap="round"/>'}
      if(!opt.base){
        var fill=el.style==='gold'?(el.color?col:'url(#'+uid+'-gold)'):(el.style==='neon'?SC.lite(col,SC.lum(col)>.6?.6:.2):col);
        var attr=' text-anchor="middle" font-family="'+ff+'" font-size="'+n1(px)+'" font-weight="'+fw+'"'+(el.style==='neon'&&!D.FONT_SCRIPT[el.font]||mq?' letter-spacing="'+n1(px*(mq?.08:.06))+'"':'');
        if(mq){s+=hit+'<g class="x-text">';lines.forEach(function(l,i){var ty=lh*(i+.78);
            s+='<text x="'+n1(w/2+px*.04)+'" y="'+n1(ty+px*.04)+'"'+attr+' fill="'+SC.dark(col,.35)+'">'+SC.esc(l)+'</text><text x="'+w/2+'" y="'+n1(ty)+'"'+attr+' fill="'+col+'">'+SC.esc(l)+'</text>'+
              '<text x="'+w/2+'" y="'+n1(ty)+'"'+attr+' fill="none" stroke="#FFF1C4" stroke-width="'+n1(px*.05)+'" stroke-linecap="round" stroke-dasharray="0 '+n1(px*.115)+'" filter="url(#'+uid+'-neon)">'+SC.esc(l)+'</text>'});s+='</g>'}
        else{s+=hit+'<g class="x-text"'+(el.style==='neon'?' filter="url(#'+uid+'-neon)"':el.style==='gold'?' filter="url(#'+uid+'-sh2)"':'')+'>';
          lines.forEach(function(l,i){var ty=lh*(i+.78);s+='<text x="'+w/2+'" y="'+n1(ty)+'"'+attr+' fill="'+fill+'">'+SC.esc(l)+'</text>'});
          s+='</g>'}
      }
    }
    else if(el.type==='foil'){
      var fc=el.color||'#D4AF37',fg=fgrad(fc),fk=el.kind;
      if(el.string&&el.y>60){var Lf=el.y-20,sx0=w/2;s+='<path d="M'+n1(sx0)+','+n1(h)+' q'+n1(w*.05)+','+n1(Lf*.25)+' 0,'+n1(Lf*.5)+' t0,'+n1(Lf*.5)+'" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="5"/><ellipse cx="'+n1(sx0)+'" cy="'+n1(h+el.y-14)+'" rx="40" ry="16" fill="'+fc+'"/>'}
      s+=hit+'<g filter="url(#'+uid+'-sh2)">';
      if(fk==='digit'||fk==='letter'){var t2=SC.esc(el.text||'1'),fs=h*1.2,ta=' x="'+n1(w/2)+'" y="'+n1(h*.9)+'" text-anchor="middle" font-family="'+D.FONTS.sans+'" font-weight="700" font-size="'+n1(fs)+'"';
        s+='<text'+ta+' fill="'+fg+'" stroke="'+fg+'" stroke-width="'+n1(h*.11)+'" stroke-linejoin="round" paint-order="stroke">'+t2+'</text><text'+ta+' fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="'+n1(h*.018)+'" stroke-linejoin="round" transform="translate('+n1(-h*.012)+' '+n1(-h*.014)+')">'+t2+'</text>'}
      else if(fk==='star'){var sp='',sp2='';for(var k5=0;k5<10;k5++){var rr5=(k5%2?w*.22:w*.46),a5=(-90+k5*36)*Math.PI/180;sp+=n1(w/2+rr5*Math.cos(a5))+','+n1(h*.53+rr5*Math.sin(a5))+' ';sp2+=n1(w/2+rr5*.78*Math.cos(a5))+','+n1(h*.53+rr5*.78*Math.sin(a5))+' '}
        s+='<polygon points="'+sp+'" fill="'+fg+'" stroke="'+fg+'" stroke-width="'+n1(h*.08)+'" stroke-linejoin="round"/><polygon points="'+sp2+'" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="'+n1(h*.016)+'" stroke-linejoin="round"/>'}
      else if(fk==='heart'){var hd='M'+n1(w/2)+','+n1(h*.94)+' C'+n1(-w*.18)+','+n1(h*.5)+' '+n1(w*.12)+','+n1(-h*.12)+' '+n1(w/2)+','+n1(h*.27)+' C'+n1(w*.88)+','+n1(-h*.12)+' '+n1(w*1.18)+','+n1(h*.5)+' '+n1(w/2)+','+n1(h*.94)+' Z';
        s+='<path d="'+hd+'" fill="'+fg+'" stroke="'+fg+'" stroke-width="'+n1(h*.05)+'" stroke-linejoin="round"/><path d="M'+n1(w*.24)+','+n1(h*.36)+' Q'+n1(w*.3)+','+n1(h*.16)+' '+n1(w*.44)+','+n1(h*.24)+'" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="'+n1(h*.03)+'" stroke-linecap="round"/>'}
      else{s+='<circle cx="'+n1(w/2)+'" cy="'+n1(h/2)+'" r="'+n1(w/2)+'" fill="'+bgrad(fc,'chrome')+'"/>'}
      s+='</g>';
    }
    else if(el.type==='flora'){
      var fq=E.floraPlan(el),lay2=SC.flora(el,fq),fcs=(el.cols&&el.cols.length?el.cols:[pal.bal[3],pal.c[3],pal.bal[4]]);
      s+='<rect x="0" y="0" width="'+w+'" height="'+h+'" fill="transparent" pointer-events="none"/><g filter="url(#'+uid+'-sh2)">';
      var lf=D.LEAF_NAME[el.leaf]?el.leaf:(el.kind==='greens'?'euca':'green'),ftp=el.kind==='greens'?null:(D.FL_NAME[el.fl]?el.fl:'mix'),goldF='url(#'+uid+'-gold)';
      lay2.sp.forEach(function(q,qi){var lt=lf==='goldmix'?(qi%2?'gold':'green'):lf;s+='<g transform="translate('+n1(q.x)+' '+n1(q.y)+') rotate('+n1(q.a)+') scale('+n1(q.s)+')"><path d="M0,0 Q110,-16 260,0" fill="none" stroke="'+(lt==='gold'?'#9C7B34':'#5C7F68')+'" stroke-width="7"/>';
        if(lt==='fern'){for(var fz2=0;fz2<11;fz2++){var fxp=20+fz2*22,fl3=46-fz2*3;s+='<path d="M'+fxp+',-2 l'+n1(fl3*.5)+','+n1(-fl3)+' M'+fxp+',2 l'+n1(fl3*.5)+','+n1(fl3)+'" stroke="'+(fz2%2?'#4F7A60':'#5E8C6B')+'" stroke-width="9" stroke-linecap="round"/>'}}
        else s+=[40,85,130,175,220].map(function(z,i){return lt==='euca'?'<circle cx="'+z+'" cy="'+(i%2?-20:20)+'" r="24" fill="'+(i%2?'#8DAA94':'#9DB8A2')+'"/>':'<ellipse cx="'+z+'" cy="'+(i%2?-24:20)+'" rx="30" ry="12" fill="'+(lt==='gold'?goldF:(i%2?'#6F957C':'#4F7A60'))+'" transform="rotate('+(i%2?-28:28)+' '+z+' '+(i%2?-24:20)+')"/>'}).join('');
        s+='</g>'});
      lay2.fl.forEach(function(q){var c=fcs[q.ci%fcs.length]||'#F2D6DA',r=q.r,pe=ftp==='peony'?true:ftp==='rose'?false:q.pe;
        if(ftp==='hydrangea'){s+=SC.hydrangea(q.x,q.y,r,c,fcs[(q.ci+1)%fcs.length]||SC.lite(c,.3))}
        else if(pe){var pt='';for(var pi=0;pi<7;pi++){var pa=pi/7*6.283+q.rot;pt+='<ellipse cx="'+n1(q.x+Math.cos(pa)*r*.48)+'" cy="'+n1(q.y+Math.sin(pa)*r*.48)+'" rx="'+n1(r*.55)+'" ry="'+n1(r*.4)+'" fill="'+SC.lite(c,.12)+'" transform="rotate('+n1(pa*57.3)+' '+n1(q.x+Math.cos(pa)*r*.48)+' '+n1(q.y+Math.sin(pa)*r*.48)+')"/>'}
          s+=pt+'<circle cx="'+n1(q.x)+'" cy="'+n1(q.y)+'" r="'+n1(r*.55)+'" fill="'+c+'"/><circle cx="'+n1(q.x)+'" cy="'+n1(q.y)+'" r="'+n1(r*.3)+'" fill="'+SC.dark(c,.12)+'"/>'}
        else s+='<circle cx="'+n1(q.x)+'" cy="'+n1(q.y)+'" r="'+n1(r)+'" fill="'+SC.dark(c,.06)+'"/><circle cx="'+n1(q.x-r*.08)+'" cy="'+n1(q.y-r*.08)+'" r="'+n1(r*.74)+'" fill="'+SC.lite(c,.14)+'"/><path d="M'+n1(q.x-r*.45)+','+n1(q.y)+' A'+n1(r*.45)+','+n1(r*.45)+' 0 1 1 '+n1(q.x+r*.3)+','+n1(q.y+r*.25)+' A'+n1(r*.28)+','+n1(r*.28)+' 0 1 1 '+n1(q.x-r*.1)+','+n1(q.y-r*.12)+'" fill="none" stroke="'+SC.dark(c,.22)+'" stroke-width="'+n1(r*.09)+'" stroke-linecap="round"/>'});
      s+='</g>';
    }
    else if(el.type==='drape'){
      var fbk=E.fabOf(el),dc=el.color||'#F4E9EC',op=fbk==='chiffon'?.6:1,fl2=SC.dark(dc,fbk==='velvet'?.38:.16),hl=SC.lite(dc,fbk==='satin'?.55:fbk==='velvet'?.22:.4),dk=el.kind,dd='';
      if(dk==='tie'||dk==='tie2'){var tp=E.validPts(el.pts)?el.pts:D.TIE_PTS[dk];
        for(var pi=0;pi+2<tp.length;pi+=3){var pp=tp.slice(pi,pi+3),rt=pp[1][0]>pp[0][0],q3=rt?pp.map(function(q){return [1-q[0],q[1]]}):pp,cp=lid+'-tc'+pi;
          s+=rt?'<g transform="translate('+w+' 0) scale(-1 1)">'+SC.tiePanel(q3,w,h,dc,fbk,el.tb,cp)+'</g>':SC.tiePanel(q3,w,h,dc,fbk,el.tb,cp)}
        if(el.bst!==false)s+='<rect x="'+n1(-w*.01)+'" y="0" width="'+n1(w*1.02)+'" height="'+n1(Math.max(24,h*.014))+'" rx="'+n1(Math.max(12,h*.007))+'" fill="url(#'+uid+'-gold)"/>'}
      else if(dk==='backdrop'){var pid2=lid+'-pl'+dc.slice(1)+fbk,pw2=fbk==='chiffon'?110:150,rh=Math.max(30,h*.018),pool=Math.min(160,h*.06);
        ldefs[pid2]='<linearGradient id="'+pid2+'g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="'+fl2+'"/><stop offset=".35" stop-color="'+dc+'"/><stop offset=".55" stop-color="'+hl+'"/><stop offset=".75" stop-color="'+dc+'"/><stop offset="1" stop-color="'+fl2+'"/></linearGradient><pattern id="'+pid2+'" patternUnits="userSpaceOnUse" width="'+pw2+'" height="10"><rect width="'+pw2+'" height="10" fill="url(#'+pid2+'g)"/></pattern>';
        s+='<path d="M0,'+n1(rh)+' L'+w+','+n1(rh)+' L'+n1(w+pool*.4)+','+n1(h-pool*.4)+' Q'+n1(w*.75)+','+n1(h+pool*.15)+' '+n1(w/2)+','+n1(h-pool*.2)+' Q'+n1(w*.25)+','+n1(h+pool*.15)+' '+n1(-pool*.4)+','+n1(h-pool*.4)+' Z" fill="url(#'+pid2+')" fill-opacity="'+op+'"/>';
        if(fbk!=='chiffon')s+='<path d="M0,'+n1(rh)+' L'+w+','+n1(rh)+' L'+w+','+n1(h*.25)+' L0,'+n1(h*.25)+' Z" fill="#fff" opacity="'+(fbk==='satin'?.1:.05)+'"/><rect x="0" y="'+n1(h*.55)+'" width="'+w+'" height="'+n1(h*.45)+'" fill="#000" opacity=".1"/>';
        for(var hx=0;hx<w;hx+=pw2/2)s+='<path d="M'+n1(hx)+','+n1(rh)+' q'+n1(pw2/4)+','+n1(rh*1.6)+' '+n1(pw2/2)+',0" fill="none" stroke="'+fl2+'" stroke-opacity=".5" stroke-width="6"/>';
        s+='<rect x="'+n1(-w*.01)+'" y="0" width="'+n1(w*1.02)+'" height="'+n1(rh*.8)+'" rx="'+n1(rh*.4)+'" fill="url(#'+uid+'-gold)"/>'}

      if(dk==='swag'){var tl=w*.12;
        s+='<path d="M0,0 L'+w+',0 L'+w+','+n1(h)+' L'+n1(w-tl)+','+n1(h)+' C'+n1(w-tl*.6)+','+n1(h*.55)+' '+n1(w*.82)+','+n1(h*.34)+' '+n1(w/2)+','+n1(h*.38)+' C'+n1(w*.18)+','+n1(h*.34)+' '+n1(tl*.6)+','+n1(h*.55)+' '+n1(tl)+','+n1(h)+' L0,'+n1(h)+' Z" fill="'+dc+'" fill-opacity="'+op+'"/>';
        for(var fi=1;fi<5;fi++){var fy=h*.08*fi;dd+='<path d="M'+n1(tl*.4)+','+n1(fy*.6)+' Q'+n1(w/2)+','+n1(h*.38*fi/5+fy)+' '+n1(w-tl*.4)+','+n1(fy*.6)+'" fill="none" stroke="'+(fi%2?fl2:hl)+'" stroke-opacity=".55" stroke-width="'+n1(Math.max(6,w*.006))+'"/>'}
        [tl*.35,w-tl*.35].forEach(function(x){dd+='<path d="M'+n1(x)+','+n1(h*.1)+' L'+n1(x)+','+n1(h*.98)+'" stroke="'+fl2+'" stroke-opacity=".45" stroke-width="'+n1(Math.max(6,w*.005))+'"/>'})}
      else if(dk==='curtain'){var pw=w*.27;[0,1].forEach(function(side){var sx=side?w:0,sg=side?-1:1,ty2=h*.58;
        s+='<path d="M'+n1(sx)+',0 L'+n1(sx+sg*pw)+',0 C'+n1(sx+sg*pw*.95)+','+n1(ty2*.6)+' '+n1(sx+sg*pw*.35)+','+n1(ty2*.9)+' '+n1(sx+sg*pw*.3)+','+n1(ty2)+' C'+n1(sx+sg*pw*.45)+','+n1(ty2+h*.15)+' '+n1(sx+sg*pw*.9)+','+n1(h*.92)+' '+n1(sx+sg*pw*1.05)+','+n1(h)+' L'+n1(sx)+','+n1(h)+' Z" fill="'+dc+'" fill-opacity="'+op+'"/>';
        for(var cf=1;cf<5;cf++){var cx3=sx+sg*pw*cf/5;dd+='<path d="M'+n1(cx3)+',0 Q'+n1(sx+sg*pw*.28*cf/5+sg*pw*.06)+','+n1(ty2)+' '+n1(sx+sg*pw*(.3+cf*.15))+','+n1(h)+'" fill="none" stroke="'+(cf%2?fl2:hl)+'" stroke-opacity=".5" stroke-width="'+n1(Math.max(6,w*.004))+'"/>'}
        dd+='<rect x="'+n1(sx+sg*pw*.3-(side?40:0)-(side?0:0))+'" y="'+n1(ty2-30)+'" width="40" height="60" rx="12" fill="#C9A857" transform="translate('+(side?0:-20)+' 0)"/>'})}
      else if(dk==='veil'){s+='<path d="M0,'+n1(h*.03)+' Q'+n1(w/2)+',-'+n1(h*.02)+' '+w+','+n1(h*.03)+' L'+n1(w*1.02)+','+n1(h)+' L'+n1(-w*.02)+','+n1(h)+' Z" fill="'+dc+'" fill-opacity="'+(fbk!=='chiffon'?.9:.42)+'"/>';
        for(var vf=1;vf<9;vf++){var vx=w*vf/9;dd+='<path d="M'+n1(vx)+','+n1(h*.03)+' C'+n1(vx+w*.02)+','+n1(h*.4)+' '+n1(vx-w*.02)+','+n1(h*.7)+' '+n1(vx+w*.01)+','+n1(h)+'" fill="none" stroke="'+(vf%2?fl2:hl)+'" stroke-opacity=".4" stroke-width="'+n1(Math.max(5,w*.004))+'"/>'}}
      s+=dd;
    }
    else if(el.type==='neon'){var fid=lid+'-ng'+el.id,gl=el.glow===undefined?2:+el.glow,tb=(D.NEON_TUBE[el.tube]||D.NEON_TUBE.l)[1]*2;
      if(gl>0)ldefs['ng'+el.id]='<filter id="'+fid+'a" filterUnits="userSpaceOnUse" x="-400" y="-400" width="'+(w+800)+'" height="'+(h+800)+'"><feGaussianBlur stdDeviation="'+n1(10+gl*14)+'"/></filter><filter id="'+fid+'b" filterUnits="userSpaceOnUse" x="-200" y="-200" width="'+(w+400)+'" height="'+(h+400)+'"><feGaussianBlur stdDeviation="'+n1(tb*.6+3)+'"/></filter>';
      s+=SC.neon(el,fid)}
    else if(el.type==='person'){s+=hit+'<g opacity=".92">'+SC.person(el,w,h,el.color||D.PERSON_COL)+'</g>'}
    else if(el.type==='sym'){s+=hit+'<g filter="url(#'+uid+'-sh2)">'+SC.symbol(el.kind,w,h,el.color,ctx,el)+'</g>'}
    else if(el.type==='prop'){s+=hit+'<g filter="url(#'+uid+'-sh2)">'+SC.prop(el.kind,w,h,pal,ctx,el)+'</g>'}
    if(el.rot)s='<g transform="rotate('+el.rot+' '+n1(w/2)+' '+n1(h/2)+')">'+s+'</g>';
    var pb=SC.box(S,el.x,el.y,w,h,zm[el.id]);
    if(opt.parts){var dl='';Object.keys(ldefs).forEach(function(k){dl+=ldefs[k]});parts.push({id:el.id,x:pb.x,y:pb.y,w:pb.w,h:pb.h,vw:w,vh:h,html:(dl?'<defs>'+dl+'</defs>':'')+'<g>'+s+'</g>'})}
    else o.push('<g'+ia+' transform="translate('+n1(pb.x)+' '+n1(pb.y)+') scale('+(Math.round(pb.s*1e5)/1e5)+')">'+s+'</g>');
  });

  // depth ruler at the left edge (stage only)
  if(opt.parts&&!opt.noRoom){var fk2=SC.dark(S.room.floorC||'#DDD7CC',.5),rl='';[1000,2000,SC.ZMAX].forEach(function(gz){var gy=SC.floorY(S,gz),t=(gz/1000).toFixed(gz%1000?1:0).replace('.',',')+' м',tw=t.length*52+70;
      rl+='<rect x="30" y="'+n1(gy-118)+'" width="'+tw+'" height="112" rx="56" fill="#fff" opacity=".82"/><text x="'+n1(30+tw/2)+'" y="'+n1(gy-38)+'" text-anchor="middle" font-family="'+D.FONTS.sans+'" font-size="78" font-weight="700" fill="'+fk2+'">'+t+'</text>'});
    o.push('<g pointer-events="none">'+rl+'</g>')}
  // the photo the scene was built from, laid over it as a see-through sample (screen only)
  if(opt.ref&&S.ref&&S.ref.on&&SC.img(S.ref.im)&&to===S.els.length){var rf=S.ref,ri=SC.img(rf.im);var rb=SC.box(S,rf.x,rf.y,rf.w,rf.h,rf.z||0);o.push('<g opacity="'+(rf.op/100)+'" pointer-events="none">'+SC.use(rf.im,rb.x,rb.y,rb.w/ri.w,rb.h/ri.h)+'</g>')}
  // size tags above everything, then overall dimensions
  if(opt.dims&&R&&to===S.els.length)S.els.forEach(function(el){var m=modById[el.id];if(!m||el.hide)return;var pb=SC.proj(S,el,zm[el.id]),tx=pb.x+pb.w/2,ty=pb.y+pb.h*.56,t=m.label+' · '+el.w+'×'+el.h,tw=t.length*40+70;
    o.push('<g pointer-events="none"><rect x="'+n1(tx-tw/2)+'" y="'+n1(ty-78)+'" width="'+tw+'" height="112" rx="56" fill="#fff" opacity=".92"/><text x="'+n1(tx)+'" y="'+n1(ty)+'" text-anchor="middle" font-family="'+D.FONTS.sans+'" font-size="62" font-weight="600" fill="#1B1F1D">'+t+'</text></g>')});
  if(opt.dims&&R&&S.els.length&&to===S.els.length){var z=R.zone,zd=Math.min(SC.ZMAX,Math.max(R.frameDepth||0,R.zFar||0)+150),a0=SC.fp(S,z.x0,zd),a1=SC.fp(S,z.x1,zd),dy=Math.min(H+SC.FLOOR-50,a0[1]+60),col2='#A3451C';
    o.push('<g pointer-events="none"><g fill="none" stroke="'+col2+'" stroke-width="6"><line x1="'+n1(a0[0])+'" y1="'+n1(dy)+'" x2="'+n1(a1[0])+'" y2="'+n1(dy)+'"/><line x1="'+n1(a0[0])+'" y1="'+n1(dy-40)+'" x2="'+n1(a0[0])+'" y2="'+n1(dy+40)+'"/><line x1="'+n1(a1[0])+'" y1="'+n1(dy-40)+'" x2="'+n1(a1[0])+'" y2="'+n1(dy+40)+'"/></g><text x="'+n1((a0[0]+a1[0])/2)+'" y="'+n1(dy-30)+'" text-anchor="middle" font-family="'+D.FONTS.sans+'" font-size="78" font-weight="600" fill="'+col2+'">'+Math.round(z.x1-z.x0)+' мм · глубина '+z.d+' мм</text></g>')}
  var dd='',rd='';Object.keys(defs).forEach(function(k){dd+=defs[k]});Object.keys(rdefs).forEach(function(k){rd+=rdefs[k]});
  if(opt.parts)return {defs:dd,room:'<defs>'+rd+'</defs>'+o.slice(0,roomEnd).join(''),shadows:shd.join(''),els:parts,over:o.slice(roomEnd).join('')};
  return '<defs>'+dd+rd+'</defs>'+o.join('');
};
/* the same scene as separate pieces: room, one piece per element (local coordinates, own gradients), overlays.
   The live stage keeps one layer per element and touches only the layers whose markup really changed. */
SC.parts = function(S,R,opt){opt=opt||{};opt.parts=true;return SC.render(S,R,opt)};
SC.viewBox = function(S){return '0 0 '+S.room.w+' '+(S.room.h+SC.FLOOR)};
