/* ===== engine.js — pure calculations. No DOM. Everything is derived from the scene state. =====
   Units: mm for lengths, m² for areas in results, kg, EUR.                                        */
var E = {};
E.BG = {arch:1, portal:1, uarch:1, harch:1, rect:1, circle:1};
E.isBg = function(el){return !!E.BG[el.type]};
E.MOD_T = 50;                      // module thickness: 10 mm skin + 40 mm frame
/* depth: every element has z = distance from the wall in mm (a background: its face). Spacers join backgrounds
   whose gap (z difference minus the module thickness) is SP_MIN..SP_MAX; farther apart they stand on their own. */
E.ZMAX = 2500; E.PLANE = 40; E.SP_MIN = 60; E.SP_MAX = 300;
E.PVC = {w:2050, h:3050, kgm2:5.5};
E.G = 9.81;
E.SIZES = [['36″ · 90 см','b36',0],['24″ · 60 см','b24',0],['18″ · 45 см','b18',.05],['12″ · 30 см','b12',.30],['10″ · 25 см','b10',.25],['5″ · 13 см','b5',.40]];
E.FINS = ['latex','chrome','pearl','confetti'];
E.BAL_SHARE = [.26,.22,.20,.14,.18];
E.DENS = {light:28, std:40, lush:52};
/* how the balloons of one garland or cluster split between the four sizes; BR = drawn radius of each size, mm */
E.MIX = {mix:[0,0,.05,.30,.25,.40], big:[0,0,.20,.45,.25,.10], small:[0,0,0,.15,.35,.50], s18:[0,0,1,0,0,0], s12:[0,0,0,1,0,0], s10:[0,0,0,0,1,0], s5:[0,0,0,0,0,1]};
E.BR = [420,290,210,140,115,62];
E.mixOf = function(el){return E.MIX[el.mix]||E.MIX.mix};
/* HSV for the colour wheel: h 0..360 (0 = red, counter-clockwise on the wheel), s and v 0..100 */
E.hsv = function(hex){var h=String(hex).replace('#',''),r=parseInt(h.slice(0,2),16)/255,g=parseInt(h.slice(2,4),16)/255,b=parseInt(h.slice(4,6),16)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,hh=0;
  if(d>0){if(mx===r)hh=((g-b)/d)%6;else if(mx===g)hh=(b-r)/d+2;else hh=(r-g)/d+4;hh*=60;if(hh<0)hh+=360}
  return [hh,mx?d/mx*100:0,mx*100]};
E.hsvHex = function(q){var h=((q[0]%360)+360)%360,s=Math.max(0,Math.min(100,q[1]))/100,v=Math.max(0,Math.min(100,q[2]))/100,c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c,r=0,g=0,b=0;
  if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}
  var f=function(t){return ('0'+Math.round((t+m)*255).toString(16)).slice(-2)};return ('#'+f(r)+f(g)+f(b)).toUpperCase()};
E.r10 = function(v){return Math.round(v/10)*10};
/* stands on the floor by itself (not hung on a background) */
E.isFloorish = function(el){var t=el.type;
  if(t==='prop'||t==='person')return true;
  if(t==='text')return el.style==='marquee'||!!el.stand;
  if(t==='sym'||t==='pic')return el.mount==='floor';
  if(t==='balloon')return !!el.string;
  if(t==='foil')return !!el.string||!(el.y>0);
  if(t==='cluster'||(t==='flora'&&el.shape==='pile'))return !(el.y>0);
  return false};
E.isTie = function(el){return el.type==='drape'&&(el.kind==='tie'||el.kind==='tie2')};
E.isBackdrop = function(el){return el.type==='drape'&&(el.kind==='backdrop'||(E.isTie(el)&&el.bst!==false))};   // a tied curtain on its own stand stands like a fabric backdrop
E.gapFor = function(el){return Math.max(450,E.r10(0.24*el.h))+100};   // wall gap a background needs for its support
/* where a new element goes in depth, given the backgrounds already there (Z: id -> z) */
E.zRule = function(S,el,Z){
  var others=S.els.filter(function(e){return e!==el&&Z[e.id]!==undefined}),bgs=others.filter(E.isBg),bds=others.filter(E.isBackdrop),T=E.MOD_T,step=(S.layout&&S.layout.step)||250;
  var zs=function(L){return L.map(function(b){return Z[b.id]})},ovx=function(a,b){return Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)};
  if(E.isBg(el)){var ov=bgs.filter(function(b){return ovx(el,b)>=80});
    if(ov.length)return Math.min(E.ZMAX,Math.max.apply(null,zs(ov))+step);
    return bgs.length?Math.min.apply(null,zs(bgs)):E.gapFor(el)+T}
  if(E.isBackdrop(el))return bgs.length?Math.max(100,Math.min.apply(null,zs(bgs))-T-200):300;
  if(E.isFloorish(el)){var fr=bgs.concat(bds);return Math.min(E.ZMAX,(fr.length?Math.max.apply(null,zs(fr)):700)+300)}
  var cx=el.x+el.w/2,cy=el.y+el.h/2,host=null;
  // hung on the nearest background it overlaps (as the flat layout drew decor over every background)
  bgs.concat(bds).forEach(function(b){var hit=el.type==='garland'?ovx(el,b)>0:(ovx(el,b)>0&&Math.min(el.y+el.h,b.y+b.h)-Math.max(el.y,b.y)>0);if(hit&&(!host||Z[b.id]>Z[host.id]))host=b});
  return host?Math.min(E.ZMAX,Z[host.id]+1):0;
};
/* z of every element; elements saved before depth existed get it the way the old layout implied:
   backgrounds by overlap order (each overlap one step forward), decor on its background, props in front */
E.zMap = function(S){
  var Z={},miss=[];S.els.forEach(function(e){if(isFinite(e.z)&&e.z!==null&&e.z!=='')Z[e.id]=+e.z;else miss.push(e)});if(!miss.length)return Z;
  var bgs=S.els.filter(E.isBg),rows=bgs.map(function(){return 0}),step=(S.layout&&S.layout.step)||250,gap=0;
  bgs.forEach(function(m,i){for(var j=0;j<i;j++){var o=bgs[j],ov=Math.min(m.x+m.w,o.x+o.w)-Math.max(m.x,o.x);if(ov>=80)rows[i]=Math.max(rows[i],rows[j]+1)}});
  bgs.forEach(function(b,i){if(!rows[i])gap=Math.max(gap,E.gapFor(b))});
  bgs.forEach(function(b,i){if(Z[b.id]===undefined)Z[b.id]=Math.min(E.ZMAX,gap+E.MOD_T+rows[i]*step)});
  miss.forEach(function(e){if(E.isBackdrop(e))Z[e.id]=E.zRule(S,e,Z)});
  miss.forEach(function(e){if(Z[e.id]===undefined)Z[e.id]=E.zRule(S,e,Z)});
  // decor that overlapped other decor was drawn over it when it came later in the list: keep that, so an old scene looks as before
  var wallish=function(e){return !E.isBg(e)&&!E.isBackdrop(e)&&!E.isFloorish(e)},hit=function(a,b){return Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x)&&Math.min(a.y+a.h,b.y+b.h)>Math.max(a.y,b.y)};
  miss.forEach(function(e){if(!wallish(e))return;var i=S.els.indexOf(e);for(var j=0;j<i;j++){var o=S.els[j];if(wallish(o)&&hit(e,o))Z[e.id]=Math.max(Z[e.id],Z[o.id])}});
  return Z;
};
E.sum = function(a,f){var s=0;for(var i=0;i<a.length;i++)s+=f?f(a[i]):a[i];return s};
E.bw = function(frame){return frame==='metal'?20:40};
E.kgm = function(frame){return frame==='metal'?1.33:0.72};
E.stock = function(frame){return frame==='metal'?6000:3000};
/* CMYK without a colour profile: the usual device formula, K = 1 - max(R,G,B). Good for naming a colour, not for proofing. */
E.cmyk = function(hex){var h=String(hex).replace('#',''),R=parseInt(h.slice(0,2),16)/255,G=parseInt(h.slice(2,4),16)/255,B=parseInt(h.slice(4,6),16)/255,K=1-Math.max(R,G,B);
  if(K>=.999)return [0,0,0,100];return [Math.round((1-R-K)/(1-K)*100),Math.round((1-G-K)/(1-K)*100),Math.round((1-B-K)/(1-K)*100),Math.round(K*100)]};
E.cmykHex = function(k){var b=1-k[3]/100,f=function(v){return ('0'+Math.round(255*(1-v/100)*b).toString(16)).slice(-2)};return ('#'+f(k[0])+f(k[1])+f(k[2])).toUpperCase()};
E.cmykText = function(k){return 'C'+k[0]+' M'+k[1]+' Y'+k[2]+' K'+k[3]};

/* largest-remainder apportionment: integers that sum exactly to N */
E.apportion = function(q,N){
  var f=q.map(Math.floor), rest=N-E.sum(f);
  var idx=q.map(function(x,i){return [x-Math.floor(x),i]}).sort(function(a,b){return b[0]-a[0]||a[1]-b[1]});
  for(var i=0;i<rest&&i<idx.length;i++)f[idx[i][1]]++;
  return f;
};

/* ---------- shape geometry of a background (local coords: origin bottom-left, y up) ---------- */
E.geom = function(el){
  var w=el.w,h=el.h,g={type:el.type,w:w,h:h},PI=Math.PI;
  if(el.type==='arch'||el.type==='portal'||el.type==='uarch'){
    g.r=w/2; g.hs=Math.max(0,h-g.r);
    g.area=w*g.hs+PI*g.r*g.r/2; g.edge=2*g.hs+PI*g.r+w;
  }
  if(el.type==='portal'){
    var nw=Math.min(el.nw,w-240), nh=Math.min(el.nh,h-el.ny-140), rn=nw/2, nhs=Math.max(0,nh-rn);
    g.niche={x0:(w-nw)/2,x1:(w+nw)/2,y0:el.ny,y1:el.ny+nh,r:rn,hs:nhs,w:nw,h:nh};
    g.area-=nw*nhs+PI*rn*rn/2; g.edge+=2*nhs+PI*rn+nw;
    g.insert={w:nw+80,h:nh+80};
  }
  if(el.type==='uarch'){
    var t=Math.max(80,Math.min(el.t,w/2-60)), wi=w-2*t, ri=wi/2, his=Math.max(0,h-t-ri);
    g.t=t; g.ri=ri; g.wi=wi;
    g.area-=wi*his+PI*ri*ri/2; g.edge=2*g.hs+PI*g.r+2*his+PI*ri+2*t;
  }
  if(el.type==='rect'){
    var rr=Math.max(0,Math.min(el.r||0,w/2,h/2)); g.rr=rr;
    g.area=w*h-(4-PI)*rr*rr; g.edge=2*(w+h)-8*rr+2*PI*rr;
  }
  if(el.type==='circle'){ g.r=w/2; g.area=PI*g.r*g.r; g.edge=2*PI*g.r; }
  if(el.type==='harch'){ // rectangle with one top corner rounded by r: a half arch when r = w
    var q=Math.max(60,Math.min(el.r||w,w,h)); g.r=q; g.hs=h-q; g.flip=!!el.flip; g.cx=g.flip?q:w-q;
    g.area=w*h-(1-PI/4)*q*q; g.edge=2*(w+h)-2*q+PI*q/2;
  }
  return g;
};
/* top and bottom of the outer outline at local x, pulled in by `inset` */
E.topAt = function(g,x,inset){
  inset=inset||0;
  if(g.type==='circle'){var rc=g.r-inset,d=rc*rc-(x-g.r)*(x-g.r);return d>0?g.r+Math.sqrt(d):null}
  if(g.type==='rect'){return g.h-inset}
  if(g.type==='harch'){var dx=g.flip?g.cx-x:x-g.cx;if(dx<=0)return g.h-inset;var rh=g.r-inset,dh=rh*rh-dx*dx;return dh>0?g.hs+Math.sqrt(dh):null}
  var ra=g.r-inset,dd=ra*ra-(x-g.r)*(x-g.r);return dd>0?g.hs+Math.sqrt(dd):null;
};
E.botAt = function(g,x,inset){
  inset=inset||0;
  if(g.type==='circle'){var rc=g.r-inset,d=rc*rc-(x-g.r)*(x-g.r);return d>0?g.r-Math.sqrt(d):null}
  return inset;
};
E.inside = function(g,x,y,inset){
  inset=inset||0;
  if(x<inset||x>g.w-inset)return false;
  var t=E.topAt(g,x,inset),b=E.botAt(g,x,inset);
  if(t===null||y>t||y<b)return false;
  if(g.type==='rect'&&g.rr){var rr=g.rr,cx=x<rr?rr:(x>g.w-rr?g.w-rr:null),cy=y<rr?rr:(y>g.h-rr?g.h-rr:null);
    if(cx!==null&&cy!==null&&Math.hypot(x-cx,y-cy)>rr-inset)return false}
  if(g.niche){var n=g.niche;if(x>n.x0-inset&&x<n.x1+inset&&y>n.y0-inset){var nt=y<=n.y0+n.hs?true:Math.hypot(x-g.w/2,y-(n.y0+n.hs))<n.r+inset;if(nt&&y<n.y1+inset)return false}}
  if(g.type==='uarch'){var xi=x-g.t;if(xi>-inset&&xi<g.wi+inset){var his=g.h-g.t-g.ri;if(y<=his||Math.hypot(x-g.w/2,y-his)<g.ri+inset)return false}}
  return true;
};
/* can a full-height post stand at local x? (not inside an opening) */
E.postOk = function(g,x,b){
  if(x<b/2-1||x>g.w-b/2+1)return false;
  if(g.niche&&x>g.niche.x0-b&&x<g.niche.x1+b)return false;
  if(g.type==='uarch'&&x>g.t-b/2+1&&x<g.w-g.t+b/2-1)return false;
  if(g.type==='circle'&&E.topAt(g,x,b)===null)return false;
  return true;
};

/* usable top of a post at local x: side posts of arches stop at the spring line */
E.postTop = function(g,x,b){
  if(g.type==='rect')return g.h-b;
  if(g.type==='harch'){var th=E.topAt(g,x,b);return th===null?g.hs:Math.min(th,g.h-b)}
  if(g.type==='circle')return E.topAt(g,x,b);
  if(x<=b||x>=g.w-b||g.type==='uarch')return g.hs;
  return E.topAt(g,x,b);
};
/* keep every gap between vertical members at or below 600 mm */
E.fillGaps = function(g,b,posts){
  if(g.type==='uarch')return;
  var all=(g.type==='circle'?[0,g.w]:posts.side.slice()).concat(posts.mid).sort(function(a,c){return a-c}),add=[];
  for(var i=1;i<all.length;i++){var a=all[i-1],c=all[i],gap=c-a;
    if(gap<=600)continue;
    if(g.niche&&a>=g.niche.x0-b&&c<=g.niche.x1+b)continue;
    var n=Math.ceil(gap/600)-1;for(var k=1;k<=n;k++){var x=Math.round(a+k*gap/(n+1));if(E.postOk(g,x,b))add.push(x)}}
  posts.mid=posts.mid.concat(add).sort(function(a,c){return a-c});
};

/* ---------- base post axes before spacers are known ---------- */
E.basePosts = function(g,b){
  var xs=[],w=g.w,i,n;
  if(g.type==='circle'){n=Math.max(1,Math.ceil(w/600)-1);for(i=1;i<=n;i++)xs.push(Math.round(i*w/(n+1)));return {side:[],mid:xs}}
  if(g.type==='uarch')return {side:[b/2,g.t-b/2,w-g.t+b/2,w-b/2],mid:[]};
  n=Math.max(0,Math.ceil((w-b)/600)-1);
  for(i=1;i<=n;i++)xs.push(Math.round(b/2+i*(w-b)/(n+1)));
  var side=[b/2,w-b/2];
  if(g.niche){xs=xs.filter(function(x){return x<g.niche.x0-b-80||x>g.niche.x1+b+80});xs.push(g.niche.x0-b/2,g.niche.x1+b/2)}
  return {side:side,mid:xs.sort(function(a,c){return a-c})};
};

/* ---------- frame of one background: members with coordinates, then a parts list ---------- */
E.frame = function(g,b,mid){
  var M=[],w=g.w,h=g.h,PI=Math.PI,i,k;
  function bar(pos,name,x1,y1,x2,y2,note){var len=Math.round(Math.hypot(x2-x1,y2-y1));if(len>=40)M.push({k:'bar',pos:pos,name:name,len:len,x1:x1,y1:y1,x2:x2,y2:y2,note:note||''})}
  function arc(pos,name,cx,cy,r,a0,a1,note){M.push({k:'arc',pos:pos,name:name,len:Math.round(Math.abs(a1-a0)*r),cx:cx,cy:cy,r:r,a0:a0,a1:a1,note:note||''})}
  function rails(levels,xs,skip){ // horizontal rails between vertical members
    levels.forEach(function(y){for(var j=0;j<xs.length-1;j++){var xa=xs[j]+b/2,xb=xs[j+1]-b/2;if(skip&&skip(xa,xb,y))continue;
      if(g.type==='circle'){var half=Math.sqrt(Math.max(0,(g.r-b)*(g.r-b)-(y-g.r)*(y-g.r)));xa=Math.max(xa,g.r-half);xb=Math.min(xb,g.r+half)}
      if(g.type==='harch'&&y>g.hs){var hh=Math.sqrt(Math.max(0,(g.r-b)*(g.r-b)-(y-g.hs)*(y-g.hs)));if(g.flip)xa=Math.max(xa,g.cx-hh);else xb=Math.min(xb,g.cx+hh)}
      if(xb-xa>=60)bar('Г','Ригель',xa,y,xb,y)}});
  }
  function levelsFor(H){var n=Math.max(0,Math.ceil((H-b)/600)-1),L=[];for(var q=1;q<=n;q++)L.push(Math.round(q*H/(n+1)));return L}

  if(g.type==='arch'||g.type==='portal'){
    bar('А','Нижняя обвязка',0,b/2,w,b/2);
    if(g.hs-b>=100){bar('Б','Стойка боковая',b/2,b,b/2,g.hs);bar('Б','Стойка боковая',w-b/2,b,w-b/2,g.hs)}
    arc('Д','Дуга внешняя',g.r,g.hs,g.r-b/2,0,PI,'R '+Math.round(g.r-b/2));
    mid.forEach(function(x){var t=E.topAt(g,x,b);if(t!==null&&t-b>=100)bar('В','Стойка промежуточная',x,b,x,t)});
    var xsA=[b/2].concat(mid).concat([w-b/2]).sort(function(a,c){return a-c});
    var n=g.niche;
    rails(levelsFor(g.hs),xsA,n?function(xa,xb,y){return xa>=n.x0-1&&xb<=n.x1+1&&y>n.y0&&y<n.y1}:null);
    if(n){
      if(n.y0>=b+40)bar('Е','Порог ниши',n.x0,n.y0-b/2,n.x1,n.y0-b/2);
      arc('Ж','Дуга ниши',w/2,n.y0+n.hs,n.r+b/2,0,PI,'R '+Math.round(n.r+b/2));
    }
  }
  if(g.type==='rect'){
    var rr=g.rr||0;
    bar('А','Нижняя обвязка',rr,b/2,w-rr,b/2);bar('А','Верхняя обвязка',rr,h-b/2,w-rr,h-b/2);
    bar('Б','Стойка боковая',b/2,Math.max(b,rr),b/2,h-Math.max(b,rr));bar('Б','Стойка боковая',w-b/2,Math.max(b,rr),w-b/2,h-Math.max(b,rr));
    if(rr>=80){[[rr,b/2,b/2,rr],[w-rr,b/2,w-b/2,rr],[rr,h-b/2,b/2,h-rr],[w-rr,h-b/2,w-b/2,h-rr]].forEach(function(c){bar('К','Косынка угла',c[0],c[1],c[2],c[3])})}
    mid.forEach(function(x){bar('В','Стойка промежуточная',x,b,x,h-b)});
    rails(levelsFor(h),[b/2].concat(mid).concat([w-b/2]).sort(function(a,c){return a-c}));
  }
  if(g.type==='harch'){
    var q=g.r,xf=g.flip?w-b/2:b/2,xr=g.flip?b/2:w-b/2,t0=g.flip?q:0,t1=g.flip?w:w-q;
    bar('А','Нижняя обвязка',0,b/2,w,b/2);
    if(t1-t0>=60)bar('А','Верхняя обвязка',t0,h-b/2,t1,h-b/2);
    bar('Б','Стойка высокая',xf,b,xf,h-b);
    if(g.hs-b>=100)bar('Б','Стойка низкая',xr,b,xr,g.hs);
    arc('Д','Дуга',g.cx,g.hs,q-b/2,g.flip?PI/2:0,g.flip?PI:PI/2,'R '+Math.round(q-b/2));
    mid.forEach(function(x){var t=E.topAt(g,x,b);if(t!==null&&t-b>=100)bar('В','Стойка промежуточная',x,b,x,Math.min(t,h-b))});
    rails(levelsFor(h),[b/2].concat(mid).concat([w-b/2]).sort(function(a,c){return a-c}));
  }
  if(g.type==='circle'){
    arc('Д','Кольцо',g.r,g.r,g.r-b/2,0,2*PI,'R '+Math.round(g.r-b/2));
    mid.forEach(function(x){var t=E.topAt(g,x,b),bt=E.botAt(g,x,b);if(t!==null&&t-bt>=100)bar('В','Стойка',x,bt,x,t)});
    var nl=Math.max(1,Math.ceil(w/600)-1),L=[];for(k=1;k<=nl;k++)L.push(Math.round(k*w/(nl+1)));
    rails(L,[-b/2].concat(mid).concat([w+b/2]).sort(function(a,c){return a-c}));
  }
  if(g.type==='uarch'){
    var t=g.t,ri=g.ri,legs=[[0,t],[w-t,w]];
    legs.forEach(function(lg){
      bar('А','Башмак ноги',lg[0],b/2,lg[1],b/2);
      bar('Б','Стойка ноги',lg[0]+b/2,b,lg[0]+b/2,g.hs);bar('Б','Стойка ноги',lg[1]-b/2,b,lg[1]-b/2,g.hs);
      var nr=Math.max(1,Math.ceil(g.hs/600));for(k=1;k<=nr;k++){var y=Math.round(k*g.hs/nr);if(t-2*b>=40)bar('Г','Перемычка ноги',lg[0]+b,y-b/2,lg[1]-b,y-b/2)}
    });
    arc('Д','Дуга внешняя',g.r,g.hs,g.r-b/2,0,PI,'R '+Math.round(g.r-b/2));
    arc('Ж','Дуга внутренняя',g.r,g.hs,ri+b/2,0,PI,'R '+Math.round(ri+b/2));
    var ns=Math.max(1,Math.ceil(PI*g.r/600)-1);
    for(k=1;k<=ns;k++){var a=k*PI/(ns+1);if(t-2*b>=40)bar('Г','Спица дуги',g.r+(ri+b)*Math.cos(a),g.hs+(ri+b)*Math.sin(a),g.r+(g.r-b)*Math.cos(a),g.hs+(g.r-b)*Math.sin(a))}
  }
  return M;
};
E.partsOf = function(M){ // group equal members into a parts list
  var map={},out=[];
  M.forEach(function(m){var key=m.pos+'|'+m.name+'|'+m.len+'|'+m.k;if(!map[key]){map[key]={pos:m.pos,name:m.name,len:m.len,qty:0,k:m.k,note:m.note};out.push(map[key])}map[key].qty++});
  return out;
};

/* ---------- one-dimensional cutting, first-fit decreasing ---------- */
E.cut1d = function(lengths,stock,kerf){
  var L=lengths.slice().sort(function(a,b){return b-a}),bars=[];
  L.forEach(function(len){
    if(len>stock){var parts=Math.ceil(len/stock),pl=Math.ceil(len/parts);for(var p=0;p<parts;p++)bars.push({left:stock-pl-kerf,cuts:[pl],spliced:true});return}
    for(var i=0;i<bars.length;i++){if(bars[i].left>=len){bars[i].cuts.push(len);bars[i].left-=len+kerf;return}}
    bars.push({left:stock-len-kerf,cuts:[len]});
  });
  bars.forEach(function(b){b.waste=stock-E.sum(b.cuts)});
  return bars;
};
/* ---------- sheet nesting by bounding boxes, shelves ---------- */
E.nest = function(items,SW,SH,gap){
  var its=items.map(function(i){var o={name:i.name,w:i.w,h:i.h,area:i.area,color:i.color,rot:false};
    if(o.w>SW&&o.h<=SW&&o.w<=SH){var q=o.w;o.w=o.h;o.h=q;o.rot=true}
    o.over=o.w>SW||o.h>SH;return o}).sort(function(a,b){return b.h-a.h});
  var sheets=[];
  its.forEach(function(it){
    if(it.over){sheets.push({items:[Object.assign({x:0,y:0},it)],shelves:[],over:true});return}
    for(var s=0;s<sheets.length;s++){var sh=sheets[s];if(sh.over)continue;
      for(var k=0;k<sh.shelves.length;k++){var sf=sh.shelves[k];if(it.h<=sf.h&&sf.x+it.w<=SW){sh.items.push(Object.assign({x:sf.x,y:sf.y},it));sf.x+=it.w+gap;return}}
      var top=sh.shelves.length?sh.shelves[sh.shelves.length-1].y+sh.shelves[sh.shelves.length-1].h+gap:0;
      if(top+it.h<=SH){sh.shelves.push({y:top,h:it.h,x:it.w+gap});sh.items.push(Object.assign({x:0,y:top},it));return}}
    sheets.push({shelves:[{y:0,h:it.h,x:it.w+gap}],items:[Object.assign({x:0,y:0},it)]});
  });
  sheets.forEach(function(sh){sh.use=E.sum(sh.items,function(i){return i.area})/(SW*SH)});
  return sheets;
};

/* ---------- garland centre line inside its box (origin top-left, y down) ---------- */
E.GPRE = {
  asym:[[[.03,.21],[.16,-.05],[.60,-.05],[.78,.15]],[[.78,.15],[.98,.36],[.88,.70],[.92,1]]],
  arc:[[[.07,1],[-.02,.30],[.18,.03],[.5,.03]],[[.5,.03],[.82,.03],[1.02,.30],[.93,1]]],
  corner:[[[.04,.12],[.55,-.04],[1.0,.10],[.88,.98]]],
  column:[[[.5,.04],[.62,.35],[.38,.65],[.5,.98]]]
};
E.validPts = function(p){return Array.isArray(p)&&p.length>=2&&p.length<=8&&p.every(function(q){return Array.isArray(q)&&q.length===2&&isFinite(+q[0])&&isFinite(+q[1])&&Math.abs(q[0])<=3&&Math.abs(q[1])<=3})};
/* a smooth line through the given points (Catmull-Rom); every span is cut into `seg` pieces */
E.spline = function(P,seg){
  seg=seg||12;var out=[],n=P.length;if(n<2)return P.slice();
  for(var i=0;i<n-1;i++){var p0=P[i-1]||P[i],p1=P[i],p2=P[i+1],p3=P[i+2]||P[i+1];
    for(var k=(i?1:0);k<=seg;k++){var t=k/seg,t2=t*t,t3=t2*t;
      out.push([.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
                .5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)])}}
  return out;
};
E.garlandPts = function(el){
  var w=el.w,h=el.h;
  if(E.validPts(el.pts))return E.spline(el.pts,12).map(function(q){return [q[0]*w,q[1]*h]});
  var f=el.flip?function(x){return 1-x}:function(x){return x},S=E.GPRE[el.shape]||E.GPRE.asym,pts=[];
  S.forEach(function(c,si){for(var i=(si?1:0);i<=24;i++){var t=i/24,u=1-t;
    var x=u*u*u*f(c[0][0])+3*u*u*t*f(c[1][0])+3*u*t*t*f(c[2][0])+t*t*t*f(c[3][0]);
    var y=u*u*u*c[0][1]+3*u*u*t*c[1][1]+3*u*t*t*c[2][1]+t*t*t*c[3][1];pts.push([x*w,y*h])}});
  return pts;
};
/* the line of a neon shape in its box (mm), along the middle of the tube */
E.neonPts = function(el){var t=(D.NEON_TUBE[el.tube]||D.NEON_TUBE.l)[1]*2,w=el.w,h=el.h,out=[];
  if(el.kind==='line')return E.garlandPts(el);
  if(el.kind==='rect'){var W=w-t,H=h-t,r=Math.max(0,Math.min(+el.r||0,W/2,H/2)),x0=t/2,y0=t/2,arc=function(cx,cy,a0){for(var i=0;i<=8;i++){var a=(a0+i*90/8)*Math.PI/180;out.push([cx+r*Math.cos(a),cy+r*Math.sin(a)])}};
    out.push([x0+r,y0]);arc(x0+W-r,y0+r,-90);arc(x0+W-r,y0+H-r,0);arc(x0+r,y0+H-r,90);arc(x0+r,y0+r,180);return out}
  var a=(w-t)/2,b=(h-t)/2,sw=(+el.arc||360),a0=90+(360-sw)/2,n=Math.max(12,Math.round(sw/3));   // an open ring has its gap at the bottom
  for(var i=0;i<=n;i++){var g=(a0+sw*i/n)*Math.PI/180;out.push([w/2+a*Math.cos(g),h/2+b*Math.sin(g)])}return out};
/* tube length in mm: ring by Ramanujan's ellipse perimeter times the share of the circle, rectangle by its sides and corner arcs, line along its curve */
E.neonLen = function(el){var t=(D.NEON_TUBE[el.tube]||D.NEON_TUBE.l)[1]*2;
  if(el.kind==='line')return E.polyLen(E.garlandPts(el));
  if(el.kind==='rect'){var W=el.w-t,H=el.h-t,r=Math.max(0,Math.min(+el.r||0,W/2,H/2));return 2*(W+H)-8*r+2*Math.PI*r}
  var a=(el.w-t)/2,b=(el.h-t)/2;return Math.PI*(3*(a+b)-Math.sqrt((3*a+b)*(a+3*b)))*(+el.arc||360)/360};
E.polyLen = function(p){var s=0;for(var i=1;i<p.length;i++)s+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);return s};
/* the points a garland is shaped by, as fractions of its box: its own, or k points taken evenly along a ready-made shape */
E.garlandNodes = function(el,k){
  if(E.validPts(el.pts))return el.pts.map(function(q){return [q[0],q[1]]});
  var p=E.garlandPts(el),L=E.polyLen(p)||1,out=[],w=el.w||1,h=el.h||1;k=k||({asym:5,arc:5,corner:4,column:4}[el.shape]||5);
  for(var i=0;i<k;i++){var s=L*i/(k-1),a=0,j=1;while(j<p.length-1&&a+Math.hypot(p[j][0]-p[j-1][0],p[j][1]-p[j-1][1])<s){a+=Math.hypot(p[j][0]-p[j-1][0],p[j][1]-p[j-1][1]);j++}
    var d=Math.hypot(p[j][0]-p[j-1][0],p[j][1]-p[j-1][1])||1,t=Math.max(0,Math.min(1,(s-a)/d));out.push([Math.round((p[j-1][0]+(p[j][0]-p[j-1][0])*t)/w*1e4)/1e4,Math.round((p[j-1][1]+(p[j][1]-p[j-1][1])*t)/h*1e4)/1e4])}
  return out;
};
/* ---------- balloons of one garland or cluster: how many, of which sizes and colours ---------- */
E.clusterCount = function(el){var m=E.mixOf(el),a=0;m.forEach(function(sh,i){a+=sh*4*E.BR[i]*E.BR[i]});return Math.max(1,Math.min(400,Math.round(el.w*(el.h||el.w*.7)/(.62*a))))};
E.balCount = function(el,S){
  if(+el.n>0)return Math.min(600,Math.round(+el.n));
  if(el.type==='cluster')return E.clusterCount(el);
  return Math.round(E.polyLen(E.garlandPts(el))/1000*(E.DENS[S.balloons.density]||40));
};
/* cells: 4 sizes x 5 colour slots, whole numbers that add up to n exactly. The picture and the purchase list both read this. */
/* colour shares of the five slots (own or the default 26/22/20/14/18 %), finishes of the slots, giants on top of the regular count */
E.shareOf = function(el){var q=Array.isArray(el.share)&&el.share.length===5?el.share.map(function(v){return Math.max(0,+v||0)}):null,t=q?E.sum(q):0;return t>0?q.map(function(v){return v/t}):E.BAL_SHARE};
E.finsOf = function(el){return [0,1,2,3,4].map(function(i){var f=Array.isArray(el.fins)?el.fins[i]:null;return E.FINS.indexOf(f)>=0?f:'latex'})};
E.balPlan = function(el,S){
  var n=E.balCount(el,S),mix=E.mixOf(el),sh=E.shareOf(el),cols=(el.cols||D.pal(S.palette).bal).map(function(c){return String(c).toUpperCase()}),fins=E.finsOf(el);
  var bySize=E.apportion(mix.map(function(ms){return n*ms}),n),cells=[],debt=[0,0,0,0,0];
  bySize[0]+=Math.max(0,Math.min(50,Math.round(+el.g36||0)));bySize[1]+=Math.max(0,Math.min(50,Math.round(+el.g24||0)));
  // sizes first, then each size among the colour slots; what one size rounds away the next one gives back, so colours stay in proportion overall
  bySize.forEach(function(k){
    var want=sh.map(function(cs,j){return Math.max(0,k*cs+debt[j])}),t=E.sum(want)||1,a=E.apportion(want.map(function(v){return v/t*k}),k);
    a.forEach(function(v,j){debt[j]+=k*sh[j]-v;cells.push(v)})});
  return {n:E.sum(bySize),reg:n,cols:cols,fins:fins,cells:cells,bySize:bySize};
};
/* flowers along a line or in a bouquet: counts the drawing and the estimate share */
E.floraPlan = function(el){
  var pile=el.shape==='pile',hy=el.fl==='hydrangea',len=pile?0:E.polyLen(E.garlandPts(el))/1000,auto=pile?Math.max(hy?3:5,Math.round(el.w*el.h/(hy?52000:26000))):Math.round(len*(el.kind==='greens'?0:hy?11:22));   // a hydrangea head is about twice a rose
  var fl=el.kind==='greens'?0:(+el.n>0?Math.min(400,Math.round(+el.n)):auto),sp=el.kind==='greens'?(+el.n>0?Math.min(400,Math.round(+el.n)):Math.max(3,Math.round(pile?el.w*el.h/60000:len*16))):Math.max(2,Math.round(fl*.6));
  return {flowers:fl,sprigs:sp,len:len};
};
/* fabric in running metres of the roll of that material (chiffon 3 m wide, satin 1.5 m, velvet 1.45 m).
   The swag sags, curtains and backdrops are gathered: a backdrop takes twice its width of cloth, plus 0.3 m to lie on the floor.
   Chiffon is wider than the drop, so it can run sideways in one piece; narrower cloth is sewn from drops. */
E.fabOf = function(el){return D.FAB[el.fab]?el.fab:(el.sheer===false?'velvet':'chiffon')};
E.fabricLen = function(el){var w=el.w/1000,h=el.h/1000,roll=D.FAB[E.fabOf(el)][1],r10=function(v){return Math.ceil(v*10-1e-9)/10};
  if(el.kind==='swag')return r10(w*1.8+h*2);
  if(el.kind==='curtain')return r10(2*(h+.3)*Math.ceil(w*.375/roll));
  if(el.kind==='backdrop')return h+.3<=roll?r10(w*2):r10((h+.3)*Math.ceil(w*2/roll));
  if(E.isTie(el)){var len=0,P=E.validPts(el.pts)?el.pts:D.TIE_PTS[el.kind];for(var i=0;i+2<P.length;i+=3){var lft=P[i+1][0]<=P[i][0],span=(lft?P[i][0]:1-P[i][0])*w+P[i][1]*h;len+=(h+.6)*Math.ceil(span*2/roll-1e-9)}return r10(len)}   // each panel: gathered ×2 over the top it covers (and the side it hangs down), drop + 60 cm for the train and hems
  return r10((h+.3)*Math.ceil(w*1.5/roll))};

/* ====================================================================================== */
E.calc = function(S){
  if(S.els.some(function(e){return e.type==='person'}))S=Object.assign({},S,{els:S.els.filter(function(e){return e.type!=='person'})});   // people for scale are never built, bought or checked
  var R={}, frame=S.frame||'wood', b=E.bw(frame), step=S.layout.step, P=function(k){return (S.prices&&S.prices[k]!=null)?S.prices[k]:D.PRICE[k]};
  var pal=D.pal(S.palette);
  var bgs=S.els.filter(E.isBg),ZM=E.zMap(S),T=E.MOD_T;

  /* --- modules: geometry, depth rows --- */
  var mods=bgs.map(function(el,i){var g=E.geom(el);return {el:el,id:el.id,label:'M'+(i+1),name:el.name||D.TYPE_NAME[el.type],g:g,x0:el.x,x1:el.x+el.w,row:0,z:ZM[el.id],ix:i,
    surf:el.surf==='sequin'?'sequin':el.surf==='foil'?'foil':el.surf==='greens'?'greens':(el.surf==='image'&&el.im?'image':'paint'),
    color:(el.surf==='sequin'||el.surf==='foil')?(el.seq==='custom'||!D.SEQ[el.seq]?(el.color||D.SEQ.gold.c):D.SEQ[el.seq].c):(el.color||pal.c[(el.tone||0)%4]),posts:E.basePosts(g,b),lock:[]}});
  var lv=[];mods.map(function(m){return m.z}).sort(function(a,c){return a-c}).forEach(function(z){if(!lv.length||z-lv[lv.length-1]>E.PLANE)lv.push(z)});
  mods.forEach(function(m){m.row=Math.max(0,lv.filter(function(v){return v<=m.z}).length-1)});
  var ovOf=function(m,o){return Math.min(m.x1,o.x1)-Math.max(m.x0,o.x0)};

  /* --- spacers between overlapping backgrounds --- */
  var pairs=[],notes=[],byZ=mods.slice().sort(function(a,c){return a.z-c.z||a.ix-c.ix});
  mods.forEach(function(m,i){for(var j=0;j<i;j++){var o=mods[j];if(Math.abs(o.z-m.z)<=E.PLANE&&ovOf(m,o)>=80)notes.push(o.label+' и '+m.label+' стоят в одной плоскости и заходят друг в друга: разведите их по глубине (зазор 60–300 мм) или по ширине.')}});
  byZ.forEach(function(m){
    var best=null,close=null;
    mods.forEach(function(o){if(o===m||o.z>=m.z-E.PLANE)return;var ov=ovOf(m,o);if(ov<80)return;var gp=m.z-o.z-T;
      if(gp<E.SP_MIN){close=o;return}if(gp>E.SP_MAX)return;
      if(!best||o.z>best.o.z||(o.z===best.o.z&&ov>best.ov))best={o:o,ov:ov}});
    if(!best){if(close)notes.push(m.label+' и '+close.label+': шаг слоёв слишком мал для проставки (зазор '+Math.round(m.z-close.z-T)+' мм, нужно от '+E.SP_MIN+').');return}
    var o=best.o,a=Math.max(m.x0,o.x0),c=Math.min(m.x1,o.x1);
    var cand=m.posts.side.concat(m.posts.mid).map(function(x,idx){return {gx:m.x0+x,side:idx<m.posts.side.length}})
      .filter(function(q){return q.gx>=a+b/2-1&&q.gx<=c-b/2+1&&E.postOk(o.g,q.gx-o.x0,b)&&E.topAt(o.g,q.gx-o.x0,b)!==null});
    if(!cand.length){ // front has no post inside the overlap: use a post of the rear one and add a post to the front
      cand=o.posts.side.concat(o.posts.mid).map(function(x){return {gx:o.x0+x,side:false}}).filter(function(q){return q.gx>=a+b/2-1&&q.gx<=c-b/2+1&&E.postOk(m.g,q.gx-m.x0,b)&&E.topAt(m.g,q.gx-m.x0,b)!==null});
    }
    if(!cand.length){notes.push(m.label+' и '+o.label+' перекрываются, но стойки не совпадают: проставку поставить некуда.');return}
    var mid=(a+c)/2;cand.sort(function(p,q){return (q.side-p.side)||Math.abs(p.gx-mid)-Math.abs(q.gx-mid)});
    var gx=cand[0].gx, lim=Math.min(E.postTop(m.g,gx-m.x0,b)||0,E.postTop(o.g,gx-o.x0,b)||0);
    var lo=Math.max(E.botAt(m.g,gx-m.x0,b)||0,E.botAt(o.g,gx-o.x0,b)||0);
    var h2=Math.round(Math.min(1300,lo+0.65*(lim-lo))/50)*50,h1=Math.max(400,Math.round((lo+150)/50)*50);
    var hs=(h2-h1>=300)?[h1,h2]:[Math.round((lo+lim)/2/50)*50];
    var len=Math.round(m.z-o.z-T);
    pairs.push({front:m,rear:o,gx:gx,heights:hs,len:len});
    // posts that a spacer lands on must never move again
    [[m,gx-m.x0],[o,gx-o.x0]].forEach(function(pr){var mm=pr[0],lx=pr[1],all=mm.posts.side.concat(mm.posts.mid);
      if(!all.some(function(q){return Math.abs(q-lx)<2})){
        var near=-1,nd=151;mm.posts.mid.forEach(function(q,qi){var d=Math.abs(q-lx);if(d<nd&&!mm.lock.some(function(L){return Math.abs(L-q)<2})){nd=d;near=qi}});
        if(near>=0)mm.posts.mid[near]=lx;else mm.posts.mid.push(lx);
        mm.posts.mid.sort(function(a,c){return a-c})}
      mm.lock.push(lx)});
    m.linked=true;o.linked=true;
  });
  mods.forEach(function(m){E.fillGaps(m.g,b,m.posts)});

  /* --- frames, supports, weights --- */
  var bagKg=S.stab.bag;
  mods.forEach(function(m){
    var g=m.g,el=m.el;
    m.mem=E.frame(g,b,m.posts.mid); m.parts=E.partsOf(m.mem);
    m.area=g.area/1e6; m.edge=g.edge;
    var bars=m.mem.filter(function(q){return q.k==='bar'}),arcs=m.mem.filter(function(q){return q.k==='arc'});
    m.barLen=E.sum(bars,function(q){return q.len}); m.arcLen=E.sum(arcs,function(q){return q.len});
    m.screws=E.sum(m.mem,function(q){return Math.ceil(q.len/180)});
    m.joints=E.sum(bars,function(q){return (q.pos==='А'&&q.name.indexOf('обвязка')>=0)?0:2});
    m.ply=frame==='wood'?(g.type==='uarch'?Math.PI*(g.r*g.r-g.ri*g.ri)/2*2*1.25/1e6:m.arcLen/1000*0.16):0;
    m.plates=frame==='wood'?E.sum(arcs,function(q){return 2*Math.ceil(q.len/700)+2}):0;
    // supports
    var n=(el.w>=1300||(!m.linked&&el.w>=900)||g.type==='uarch')?2:1;
    var i1=E.r10(Math.max(600,0.6*el.h)),i2=Math.max(450,E.r10(0.24*el.h)),i3=Math.round(Math.hypot(i1-40,i2-40));
    // a support unfolds backwards, so it cannot stand where a background of a rear row is in the way:
    // there it moves to the nearest free post, and if there is none the spacer carries that side
    var want,all=(g.type==='circle'?[]:m.posts.side).concat(m.posts.mid).sort(function(a,c){return a-c}),ax=[];
    if(g.type==='circle')want=n===2?[all[0],all[all.length-1]]:[all[Math.floor(all.length/2)]];
    else want=n===2?[b/2,el.w-b/2]:[b/2];
    var free=function(lx){var gx=m.x0+lx;return !mods.some(function(o){return o!==m&&o.z<m.z-E.PLANE&&o.z>m.z-T-i2-60&&gx>o.x0-b&&gx<o.x1+b})};   // a support reaches i2 behind the module
    want.forEach(function(w0){var c=all.filter(function(q){return free(q)&&!ax.some(function(u){return Math.abs(u-q)<300})}).sort(function(p,q){return Math.abs(p-w0)-Math.abs(q-w0)});if(c.length)ax.push(c[0])});
    if(!ax.length&&!m.linked){ax=[want[0]];notes.push(m.label+': упору мешает фон заднего ряда, а проставки нет. Сдвиньте фон или увеличьте нахлёст.')}
    ax.sort(function(a,c){return a-c});n=ax.length;m.supFree=ax.every(free);
    m.sup={n:n,i1:i1,i2:i2,i3:i3,axes:ax};
    m.supParts=[{pos:'И',name:'Упор: стойка',len:i1,qty:n,k:'bar',note:'на петлях к каркасу'},{pos:'И',name:'Упор: основание',len:i2,qty:n,k:'bar',note:''},{pos:'И',name:'Упор: раскос',len:i3,qty:n,k:'bar',note:'запил 2 торца'}];
    m.supLen=n*(i1+i2+i3);
    // skin and weight
    m.insArea=g.insert?g.insert.w*g.insert.h/1e6:0;
    var arcKg=frame==='wood'?m.ply*12.2:m.arcLen/1000*E.kgm(frame);
    m.weight=(m.barLen+m.supLen)/1000*E.kgm(frame)+arcKg+m.area*E.PVC.kgm2+m.insArea*E.PVC.kgm2*0.5+(m.surf==='sequin'?m.area*1.3:m.surf==='foil'?m.area*0.3:m.surf==='greens'?m.area*1.5:0);
    m.totalLen=frame==='metal'?(m.barLen+m.arcLen+m.supLen)/1000:(m.barLen+m.supLen)/1000;
    // magnet grid: 200 x 200 above the props zone
    m.mag=[];m.hooks=[];
    if(el.grid!==false&&m.area>=1.4&&g.type!=='uarch'){
      var y0=Math.max(800,Math.round(el.h*0.42/200)*200),x0=(el.w%200)/2+ (Math.floor(el.w/200)%2?100:0);
      for(var y=y0;y<el.h;y+=200)for(var x=x0;x<el.w;x+=200)if(E.inside(g,x,y,140))m.mag.push([x,y]);
    }
  });
  var zMin=mods.length?Math.min.apply(null,mods.map(function(m){return m.z})):0;
  mods.forEach(function(m){m.depth=Math.round(m.z-zMin);m.back=Math.round(m.z-T)});
  /* stability: tipping forward under a horizontal push */
  var F=S.stab.F*(S.stab.outdoor?2:1), hApp=S.stab.h, req=S.stab.req;
  mods.forEach(function(m){
    m.restore=m.sup.n*bagKg*E.G*(m.sup.i2-100)/1000+m.weight*E.G*0.025;
    m.over=F*Math.min(hApp,m.el.h/1000);
    m.safe=m.restore/m.over;
  });
  // connected groups through spacers
  var parent={};mods.forEach(function(m){parent[m.id]=m.id});
  function find(x){while(parent[x]!==x)x=parent[x];return x}
  pairs.forEach(function(p){parent[find(p.front.id)]=find(p.rear.id)});
  var groups={};mods.forEach(function(m){var r=find(m.id);(groups[r]=groups[r]||[]).push(m)});
  R.groups=Object.keys(groups).map(function(k){var ms=groups[k],hmax=Math.max.apply(null,ms.map(function(m){return m.el.h/1000}));
    var rs=E.sum(ms,function(m){return m.restore}),ov=F*Math.min(hApp,hmax);
    return {mods:ms,safe:rs/ov,restore:rs,over:ov}});
  mods.forEach(function(m){m.group=R.groups.filter(function(gp){return gp.mods.indexOf(m)>=0})[0]});
  R.sysSafe=R.groups.length?Math.min.apply(null,R.groups.map(function(gp){return gp.safe})):0;
  R.bagNeed=null;
  [5,10,15,20,25,30].some(function(kg){var ok=R.groups.every(function(gp){
      var rs=E.sum(gp.mods,function(m){return m.sup.n*kg*E.G*(m.sup.i2-100)/1000+m.weight*E.G*0.025});return rs/gp.over>=req});
    if(ok){R.bagNeed=kg;return true}return false});

  R.mods=mods; R.pairs=pairs; R.notes=notes; R.frame=frame; R.b=b;
  R.nSup=E.sum(mods,function(m){return m.sup.n});
  R.nSpacer=E.sum(pairs,function(p){return p.heights.length});
  R.weight=E.sum(mods,function(m){return m.weight});
  R.area=E.sum(mods,function(m){return m.area});
  R.screws=E.sum(mods,function(m){return m.screws});
  R.joints=E.sum(mods,function(m){return m.joints});
  R.magnets=E.sum(mods,function(m){return m.mag.length});

  /* --- zone --- */
  var x0=1e9,x1=-1e9,top=0;
  S.els.forEach(function(el){var pad=(el.type==='garland'||el.type==='cluster')?140:0;x0=Math.min(x0,el.x-pad);x1=Math.max(x1,el.x+el.w+pad);top=Math.max(top,el.y+el.h+(el.type==='garland'?140:0))});
  if(!S.els.length){x0=0;x1=0}
  var maxRow=mods.length?Math.max.apply(null,mods.map(function(m){return m.row})):0;
  var rear=mods.filter(function(m){return m.row===0});
  R.wallGap=mods.length?Math.min.apply(null,mods.map(function(m){return m.back})):0;
  R.needGap=rear.length?Math.max.apply(null,rear.map(function(m){return m.sup.n?m.sup.i2+50:0})):0;
  R.frameDepth=mods.length?Math.max.apply(null,mods.map(function(m){return m.z})):0;
  var zFar=0;S.els.forEach(function(e){if(!E.isBg(e)&&!e.hide&&E.isFloorish(e))zFar=Math.max(zFar,ZM[e.id]||0)});R.zFar=zFar;
  R.zone={w:Math.ceil((x1-x0+200)/100)*100, d:Math.ceil(Math.max(mods.length?R.frameDepth+600:0,zFar+300)/100)*100, h:Math.ceil(top/100)*100, x0:x0,x1:x1, ceil:Math.ceil((top+300)/100)*100};
  R.framesW=mods.length?Math.max.apply(null,mods.map(function(m){return m.x1}))-Math.min.apply(null,mods.map(function(m){return m.x0})):0;
  R.maxRow=maxRow;

  /* --- cutting --- */
  var lens=[];
  mods.forEach(function(m){m.mem.forEach(function(q){if(q.k==='bar'||frame==='metal')lens.push(q.len)});m.supParts.forEach(function(p){for(var i=0;i<p.qty;i++)lens.push(p.len)})});
  pairs.forEach(function(p){p.heights.forEach(function(){lens.push(p.len)})});
  R.cutLens=lens;
  R.cut=E.cut1d(lens,E.stock(frame),3);
  R.cutTotal=E.sum(lens); R.cutWaste=E.sum(R.cut,function(c){return c.waste});
  var items=mods.map(function(m){return {name:m.label,w:m.el.w,h:m.el.h,area:m.g.area,color:m.color}});
  mods.forEach(function(m){if(m.g.insert&&m.el.insert!=='none')items.push({name:'Вставка '+m.label,w:m.g.insert.w,h:m.g.insert.h,area:m.g.insert.w*m.g.insert.h,color:m.el.insColor||pal.ins})});
  R.sheets=E.nest(items,E.PVC.w,E.PVC.h,20);

  /* --- balloons --- */
  var gar=S.els.filter(function(e){return e.type==='garland'}),clu=S.els.filter(function(e){return e.type==='cluster'});
  var plans=gar.concat(clu).map(function(e){return {el:e,p:E.balPlan(e,S)}});
  R.balPlans={};plans.forEach(function(q){R.balPlans[q.el.id]=q.p});
  R.garLen=E.sum(gar,function(e){return E.polyLen(E.garlandPts(e))})/1000;
  R.garN=E.sum(plans,function(q){return q.el.type==='garland'?q.p.n:0});
  R.cluN=E.sum(plans,function(q){return q.el.type==='cluster'?q.p.n:0});
  R.balN=R.garN+R.cluN;
  // columns of the purchase table = the colours really used, in order of first appearance
  var colIx={},colors=[],cfin=[];plans.forEach(function(q){q.p.cols.forEach(function(c,j){var kc=c+'|'+q.p.fins[j];if(colIx[kc]===undefined){colIx[kc]=colors.length;colors.push(c);cfin.push(q.p.fins[j])}})});
  if(!colors.length){colors=pal.bal.map(function(c){return String(c).toUpperCase()});cfin=colors.map(function(){return 'latex'})}
  var nC=colors.length,cells=[];for(var ci0=0;ci0<E.SIZES.length*nC;ci0++)cells.push(0);
  plans.forEach(function(q){q.p.cells.forEach(function(v,i){cells[Math.floor(i/5)*nC+colIx[q.p.cols[i%5]+'|'+q.p.fins[i%5]]]+=v})});
  R.balNC=nC;R.balCells=cells;
  R.balReserve=Math.ceil(R.balN*S.balloons.reserve/100);
  var extra=E.apportion(cells.map(function(v){return R.balN?v/R.balN*R.balReserve:0}),R.balReserve);
  R.balBuy=R.balCells.map(function(c,i){return c+extra[i]});
  R.balRow=E.SIZES.map(function(_,i){return E.sum(R.balBuy.slice(i*nC,i*nC+nC))});
  R.balRowNet=E.SIZES.map(function(_,i){return E.sum(R.balCells.slice(i*nC,i*nC+nC))});
  R.balCol=colors.map(function(_,j){var t=0;for(var i=0;i<E.SIZES.length;i++)t+=R.balBuy[i*nC+j];return t});
  R.balBuyN=E.sum(R.balBuy);
  R.balColors=colors;R.balFins=cfin;R.balKeys=colors.map(function(c,j){return c+'|'+cfin[j]});

  /* --- decor kit: every inscription, symbol and prop on the scene --- */
  var kit={};
  S.els.forEach(function(el){
    var key=null,name,spec,qty=1;
    if(el.type==='text'){key='k_'+el.style;name=D.STYLE_NAME[el.style]+' «'+String(el.text).replace(/\n/g,' ')+'»';spec={neon:'Гибкий неон 6 мм на прозрачном акриле 5 мм, 12 В',gold:'ПВХ 10 мм или пенопласт, золото металлик',flat:'ПВХ 5 мм, покраска или УФ-печать'}[el.style]+'; '+Math.round(el.w)+'×'+Math.round(el.h)+' мм'}
    else if(el.type==='sym'){key='k_'+el.kind+(el.kind==='magen'?'_'+el.mount:'');name=D.KIND_NAME[el.kind]+(el.mount==='floor'&&el.kind==='magen'?' напольная':'')+(el.kind==='digit'?' «'+el.text+'»':'');
      spec=(el.mount==='wall'?'Зеркальный акрил 3 мм, на тыле стальные шайбы':'ПВХ 10 мм, подставка-паз')+'; '+Math.round(el.w)+' мм';if(el.kind==='digit')qty=String(el.text||'').length||1;
      if(el.kind==='hanukkiah')spec='ПВХ 10 мм (ЧПУ), основание с грузом 3 кг, золото металлик, 9 свечей; В '+Math.round(el.h)+' мм';
      if(/^n(gift|heart|star|magen|moon)$/.test(el.kind)){key='k_nsign';name='Неоновая вывеска '+D.KIND_NAME[el.kind].replace(/^Неон /,'');spec='Гибкий неон 6 мм на прозрачном акриле 5 мм, 12 В, цвет '+String(el.color||'#FFE3A6').toUpperCase()+'; '+Math.round(el.w)+'×'+Math.round(el.h)+' мм'}}
    else if(el.type==='prop'){key='k_'+el.kind;name=D.KIND_NAME[el.kind];spec={gifts:'Набор из 3 коробок с бантами',candles:'Восковые LED-свечи с таймером, 3 шт.',dreidel:'Пенополистирол EPS 25, шпаклёвка, покраска',plinths:'Набор из 3 цилиндров, ПВХ или металл',pampas:'Сухоцвет в напольной вазе',
        podr:'Каркас из фанеры, обшивка ПВХ 5 мм, покраска; Ø '+Math.round(el.w)+' × В '+Math.round(el.h)+' мм',podq:'Каркас из бруса, обшивка ПВХ 10 мм, покраска; '+Math.round(el.w)+' × В '+Math.round(el.h)+' мм',
        plc:'Цилиндр: кольца из фанеры, обшивка ПВХ 3 мм, покраска; Ø '+Math.round(el.w)+' × В '+Math.round(el.h)+' мм',plq:'Короб из ПВХ 10 мм на каркасе из бруса, покраска; '+Math.round(el.w)+' × В '+Math.round(el.h)+' мм',
        easel:(D.EASEL_NAME[el.design]||'Деревянный')+' мольберт и табличка ПВХ 5 мм'+(el.flw?' с цветами по углам':'')+', надпись «'+String(el.text||'').replace(/\n/g,' ')+'»',
        mframe:'Сварная рама из трубы 20×20, покраска «'+(el.color||'#C9A857')+'»; '+Math.round(el.w)+' × В '+Math.round(el.h)+' мм',mglass:'Рама из трубы 20×20 и акриловые стенки 3 мм; '+Math.round(el.w)+' × В '+Math.round(el.h)+' мм',
        mcyl:'Каркас из колец и стоек, металл, покраска; Ø '+Math.round(el.w)+' × В '+Math.round(el.h)+' мм',mset:'Три рамы-куба разной высоты, металл, покраска; общая ширина '+Math.round(el.w)+' мм',
        gift:'Коробка '+((D.GIFT_SHAPE[el.shape]||D.GIFT_SHAPE.cube)[0]).toLowerCase()+' '+Math.round(el.w)+'×'+Math.round(el.h)+' мм, обтянута бумагой '+String(el.color||'').toUpperCase()+', лента '+String(el.rib||'#C9A857').toUpperCase(),
        giftpile:'Пустые коробки разных размеров, бумага '+String(el.color||'').toUpperCase()+' и '+String(el.rib||'#C9A857').toUpperCase()+', ленты и банты',
        candelabra:'Металлический канделябр на '+(+el.n||5)+' свечей, LED-свечи; В '+Math.round(el.h)+' мм',csticks:'Подсвечники разной высоты, '+(+el.n||5)+' шт., LED-свечи-тейперы',lantern:'Металлический фонарь со стеклом, LED-свеча; В '+Math.round(el.h)+' мм',table:'Стол или консоль, скатерть, подставки под торт и сладости; '+Math.round(el.w)+' мм'}[el.kind];
      if(D.FREE_H[el.kind]&&el.kind!=='easel'&&el.kind!=='giftpile')name+=' '+Math.round(el.w)+'×'+Math.round(el.h);
      if(el.kind==='easel'&&el.design&&el.design!=='wood'&&D.EASEL_NAME[el.design]){key='k_easel_'+el.design;name='Мольберт · '+D.EASEL_NAME[el.design].toLowerCase()}
      if(el.kind==='gift'&&el.w*el.h>140000)key='k_gift_l';
      if(el.kind==='giftpile'){key='k_gift';name='Подарочные коробки для горы подарков';qty=Math.max(1,Math.min(30,Math.round(+el.n||12)))}
      if(el.kind==='candelabra'||el.kind==='csticks')name+=' · '+(+el.n||5)+' свечей'}
    else if(el.type==='pic'){key='k_pic';name='Фигура по изображению '+Math.round(el.w)+'×'+Math.round(el.h);spec='УФ-печать на ПВХ 5 мм, контурная резка, '+(el.mount==='floor'?'подставка-паз':'стальные шайбы на тыле');qty=Math.max(.1,Math.round(el.w*el.h/1e4)/100)}
    if(el.type==='text'&&el.style==='marquee'){key='k_marquee';name='Светящиеся буквы «'+String(el.text).replace(/\n/g,' ')+'»';spec='Буквы с лампами по контуру, высота '+Math.round(el.size)+' мм; число букв';qty=String(el.text||'').replace(/\s/g,'').length||1}
    if(el.type==='sym'&&(el.kind==='shell'||el.kind==='starfish'))spec='ПВХ 10 мм, фрезеровка рёбер, покраска; '+Math.round(el.w)+' мм';
    if(!key)return;
    var kk=key+'|'+name+'|'+spec;if(!kit[kk])kit[kk]={key:key,name:name,spec:spec,qty:0,unit:el.type==='pic'?'м²':'шт',mount:el.type==='text'?(el.style==='neon'?'2 крюка':'Штифты или магниты'):(el.type==='sym'||el.type==='pic')?(el.mount==='wall'?'Магнитная сетка':'Свободностоящая'):'Напольные'};
    kit[kk].qty+=qty;
    if(el.type==='prop'&&el.lid&&D.LID_NAME[el.lid]&&el.lid!=='open'){var lk='k_lid_'+el.lid,ln='Столешница для тумбы-рамы · '+D.LID_NAME[el.lid].toLowerCase(),ls={panel:'МДФ или фанера 18 мм, покраска '+String(el.lc||'#F4EFE6').toUpperCase(),mirror:'Зеркальный акрил 5 мм на основе',marble:'Плита под мрамор 12 мм',wood:'Массив дуба 20 мм, масло'}[el.lid]+(el.kind==='mcyl'?'; круглая Ø '+Math.round(el.w):el.kind==='mset'?'; три размера':'; '+Math.round(el.w)+' мм'),lkk=lk+'|'+ls;if(!kit[lkk])kit[lkk]={key:lk,name:ln,spec:ls,qty:0,unit:'шт',mount:'Напольные'};kit[lkk].qty+=el.kind==='mset'?3:1}
    if(el.type==='text'&&el.stand&&D.STAND_NAME[el.stand]){var sk=el.stand==='floor'?'k_stand':'k_stand_t',sn=el.stand==='floor'?'Стойка для надписи, до пола':'Настольная подставка для надписи',ss=el.stand==='floor'?'прозрачный акрил 5 мм на двух металлических стойках с основанием':'акриловая панель на опорах',kk2=sk+'|'+sn;if(!kit[kk2])kit[kk2]={key:sk,name:sn,spec:ss,qty:0,unit:'шт',mount:'Напольные'};kit[kk2].qty++}
  });
  R.kit=Object.keys(kit).map(function(k){return kit[k]});
  R.hooks=E.sum(S.els,function(el){return (el.type==='text'&&el.style==='neon')||(el.type==='sym'&&/^n(gift|heart|star|magen|moon)$/.test(el.kind))?2:0});

  /* --- bill of materials --- */
  var G=[],rw=function(key,name,spec,qty,unit){var pr=P(key);return {key:key,name:name,spec:spec,qty:qty,unit:unit,price:pr,sum:qty*pr}};
  var grp=function(id,name,rows,cls){rows=rows.filter(function(r){return r&&r.qty>0});if(rows.length)G.push({id:id,name:name,rows:rows,sum:E.sum(rows,function(r){return r.sum}),cls:cls})};
  var nSheets=R.sheets.length, nBars=R.cut.length, ply=E.sum(mods,function(m){return m.ply}), arcTot=E.sum(mods,function(m){return m.arcLen})/1000;
  var frameLen=E.sum(mods,function(m){return m.barLen+m.arcLen})/1000;
  var up10=function(v){return Math.ceil(v/10)*10};
  grp('skin','Обшивка',[rw('pvc','ПВХ вспененный 10 мм','лист 2050×3050; раскрой по схеме: '+nSheets+' л., лицо '+R.area.toFixed(1)+' м²',nSheets,'лист')],'c');
  if(frame==='wood')grp('frame','Каркас',[
    rw('bar','Брус строганый 40×40, 3 м','хвоя камерной сушки; '+(R.cutTotal/1000).toFixed(1)+' пог. м деталей, отход '+(R.cutWaste/1000).toFixed(1)+' м',nBars,'шт'),
    rw('ply','Фанера берёзовая 18 мм','лист 1250×2500; сегменты дуг ≈ '+ply.toFixed(1)+' м² в 2 слоя',ply>0?Math.ceil(ply*1.25/3.125):0,'лист'),
    rw('scr70','Саморезы по дереву 4,5×70','узлы каркаса: '+R.joints+' × 2',up10(R.joints*2*1.1),'шт'),
    rw('plate','Пластины крепёжные 40×120','стыки сегментов дуг',E.sum(mods,function(m){return m.plates}),'шт'),
    rw('scr30','Саморезы 4×30','склейка слоёв дуг, шаг 100 мм по '+arcTot.toFixed(1)+' м',ply>0?up10(arcTot*20):0,'шт'),
    rw('pva','Клей ПВА D3, 0,75 кг','склейка дуг и узлов',ply>0?1:0,'шт'),
    rw('scr35','Саморезы 3,5×35 потай','крепление обшивки: '+R.screws+' точек, шаг до 180 мм',up10(R.screws*1.1),'шт'),
    rw('ms','Клей-герметик MS-полимер 290 мл','полоса 6 мм по каркасу, '+frameLen.toFixed(1)+' м',Math.ceil(frameLen/13),'шт')],'c');
  else grp('frame','Каркас',[
    rw('tube','Труба 40×20×1,5, 6 м',(R.cutTotal/1000).toFixed(1)+' пог. м деталей, отход '+(R.cutWaste/1000).toFixed(1)+' м',nBars,'шт'),
    rw('bend','Гибка дуг на трубогибе','дуг: '+E.sum(mods,function(m){return m.mem.filter(function(q){return q.k==='arc'}).length}),E.sum(mods,function(m){return m.mem.filter(function(q){return q.k==='arc'}).length}),'шт'),
    rw('weld','Расходники для сварки','проволока, газ, круги',1,'компл'),
    rw('scrMetal','Саморезы по металлу 3,5×32 потай','крепление обшивки: '+R.screws+' точек',up10(R.screws*1.1),'шт'),
    rw('ms','Клей-герметик MS-полимер 290 мл','полоса 6 мм по каркасу, '+frameLen.toFixed(1)+' м',Math.ceil(frameLen/13),'шт')],'c');
  // paint grouped by colour
  var edge=E.sum(mods,function(m){return m.edge})/1000, byCol={};
  var kOf={};
  mods.forEach(function(m){if(m.surf==='paint'){byCol[m.color]=(byCol[m.color]||0)+m.area;if(m.el.k&&m.el.k.color)kOf[m.color]=m.el.k.color}
    if(m.g.insert&&m.el.insert!=='none'){var ic=m.el.insColor||pal.ins;byCol[ic]=(byCol[ic]||0)+m.insArea;if(m.el.k&&m.el.k.insColor)kOf[ic]=m.el.k.insColor}});
  var paintRows=[rw('putty','Шпатлёвка финишная','торцы '+edge.toFixed(1)+' пог. м и головки саморезов',Math.max(1,Math.ceil(edge/15)),'ведро')];
  Object.keys(byCol).forEach(function(c){var l=Math.max(0.5,Math.ceil(byCol[c]*2/10*2)/2);var r=rw('paint','Краска акриловая матовая','колеровка '+c.toUpperCase()+' · '+E.cmykText(kOf[c]||E.cmyk(c))+'; '+byCol[c].toFixed(1)+' м² × 2 слоя',l,'л');r.color=c;paintRows.push(r)});
  paintRows.push(rw('paintBack','Краска белая, тыльная сторона',R.area.toFixed(1)+' м², 1 слой',Math.max(1,Math.ceil(R.area/8)),'л'));
  paintRows.push(rw('sundries','Расходники для отделки','абразив P180/P240, валик, кисть, малярный скотч',1,'компл'));
  if(mods.length)grp('finish','Отделка',paintRows,'c');
  // coverings other than paint: sequin tiles 300 x 300 with 8 % for trimming, UV print by area with 10 %
  var cover=[],seqBy={},foilBy={},printA=0,grA=0;mods.forEach(function(m){if(m.surf==='greens')grA+=m.area;
    if(m.surf==='foil'){var fn=(D.SEQ[m.el.seq]||D.SEQ.custom).name+(m.el.seq==='custom'||!D.SEQ[m.el.seq]?' '+m.color.toUpperCase():'');foilBy[fn]=(foilBy[fn]||0)+m.area}});
  mods.forEach(function(m){if(m.surf==='sequin'){var nm=(D.SEQ[m.el.seq]||D.SEQ.custom).name+(m.el.seq==='custom'||!D.SEQ[m.el.seq]?' '+m.color.toUpperCase():'');seqBy[nm]=(seqBy[nm]||0)+m.area}if(m.surf==='image')printA+=m.area});
  Object.keys(seqBy).forEach(function(nm){cover.push(rw('seqTile','Пайеточная панель 30×30 см · '+nm.toLowerCase(),seqBy[nm].toFixed(2)+' м² ÷ 0,09 м² + 8 % на подрезку; крепится к ПВХ стяжками и клеем',Math.ceil(seqBy[nm]/0.09*1.08),'шт'))});
  // crumpled foil: a crumpled sheet covers about 1/1.4 of its flat area (assumption), plus 10 % for trimming, bought by the half square metre
  var foilA=0;Object.keys(foilBy).forEach(function(nm){foilA+=foilBy[nm];cover.push(rw('foilWall','Фольга металлизированная для мятого фона · '+nm.toLowerCase(),foilBy[nm].toFixed(2)+' м² × 1,4 на смятие × 1,1 на подрезку',Math.ceil(foilBy[nm]*1.4*1.1*2)/2,'м²'))});
  if(foilA>0)cover.push(rw('sprayGlue','Клей-спрей для плёнки, 500 мл','один баллон на 4 м² фона; '+foilA.toFixed(2)+' м²',Math.ceil(foilA/4),'шт'));R.foilArea=foilA;
  if(printA>0)cover.push(rw('print','Печать изображения на фон','УФ-печать на плёнке или ПВХ 3 мм; '+printA.toFixed(2)+' м² + 10 %',Math.ceil(printA*1.1*10)/10,'м²'));
  if(grA>0)cover.push(rw('gwMat','Мат искусственной зелени 50×50 см',grA.toFixed(2)+' м² ÷ 0,25 м² + 8 % на подрезку; крепится стяжками к ПВХ',Math.ceil(grA/0.25*1.08),'шт'));
  grp('cover','Покрытия фонов',cover,'c');
  R.floorArea=S.floor&&S.floor.mat&&S.els.length?Math.round(Math.ceil((x1-x0+320)/100)*100*R.zone.d/1e4)/100:0;
  grp('floor','Напольное покрытие',[rw('floorMat','Напольный фон: винил или ковролин','цвет '+String(S.floor&&S.floor.color||'').toUpperCase()+'; '+(Math.ceil((x1-x0+320)/100)/10).toFixed(1)+' × '+(R.zone.d/1000).toFixed(1)+' м',R.floorArea,'м²')],'c');
  grp('sup','Упоры',[rw('hinge','Петля карточная 75 мм','2 на упор, ось вертикальна',2*R.nSup,'шт'),rw('hook','Крючок-фиксатор 100 мм','держит упор раскрытым под 90°',R.nSup,'шт'),
    rw('rubber','Резиновая накладка 40×120','под основание упора',R.nSup,'шт'),rw('bag','Мешок-утяжелитель '+bagKg+' кг','по одному на упор',R.nSup,'шт')],'c');
  grp('spacer','Проставки',[rw('insert','Футорка вкручиваемая M8','в торец проставки',R.nSpacer,'шт'),rw('wing','Винт с барашком M8×70','вкручивается с тыла заднего фона',R.nSpacer,'шт'),rw('angle','Уголок крепёжный 40×40','крепление проставки к переднему фону',2*R.nSpacer,'шт')],'c');
  grp('asm','Сборка',[rw('pad','Подпятники войлочные','под нижнюю обвязку',4*mods.length,'шт'),rw('strap','Ремни-стяжки для перевозки','',mods.length?4:0,'шт')],'c');
  var mag=Math.ceil(R.magnets*1.1);
  grp('ovl','Система накладок',[rw('magnet','Магнит неодимовый N42 15×3 мм',R.magnets+' точек сетки 200×200 + 10 %',mag,'шт'),rw('washer','Шайба стальная 16 мм','ответная часть на накладках',mag,'шт'),
    rw('epoxy','Клей эпоксидный 2К','вклейка магнитов',mag?1:0,'шт'),rw('brassHook','Крючок ввертной латунный','подвес неона',R.hooks,'шт'),
    rw('sleeve','Втулка латунная Ø10/8×20','гнёзда штифтов на двух самых больших фонах',mods.length?Math.min(6,2+2*Math.min(2,mods.length)):0,'шт'),rw('pin','Штифт стальной Ø8×40','на тыл тяжёлых накладок',mods.length?8:0,'шт'),rw('velcro','Липучка 25 мм на клеевой основе','драпировки, чехлы',mods.length?5:0,'м')],'c');
  var slats=E.sum(mods,function(m){return m.g.niche&&m.el.insert==='slats'?Math.ceil(m.g.niche.w/25)+1:0});
  grp('ins','Реечная вставка',[rw('slat','Рейка полукруглая 20×10 мм, 2 м','шаг 25 мм по ширине ниши',slats,'шт'),rw('mount','Клей монтажный 310 мл','',slats?2:0,'шт')],'c');
  var balRows=[];E.SIZES.forEach(function(sz,i){E.FINS.forEach(function(f){var q=0,qn=0;for(var j=0;j<R.balNC;j++)if(R.balFins[j]===f){q+=R.balBuy[i*R.balNC+j];qn+=R.balCells[i*R.balNC+j]}
    if(q>0)balRows.push(rw(sz[1]+(f==='latex'?'':'_'+f),'Шар латексный '+sz[0]+(f==='latex'?'':' · '+D.BFIN_NAME[f].toLowerCase()),'в зоне '+qn+' + запас',q,'шт'))})});
  var greens=S.balloons.greens?Math.ceil(R.garLen*3):0;
  grp('bal','Шары и гирлянда',balRows.concat([rw('tape','Лента для гирлянды перфорированная, 5 м',R.garLen.toFixed(1)+' м гирлянды',Math.ceil(R.garLen/5),'рулон'),
    rw('dots','Клеевые точки, 200 шт','вклейка мелких шаров 5″',R.balN?Math.ceil(R.balRow[5]/200):0,'упак'),rw('ties','Хомуты прозрачные','крепление гирлянды, шаг 300 мм',Math.ceil(R.garLen/0.3),'шт'),
    rw('ring','Кольцо ввертное 3×20','в торцы фонов по трассе гирлянды, остаётся навсегда',Math.ceil(R.garLen/0.36),'шт'),rw('greens','Эвкалипт искусственный, ветка 60 см','3 ветки на 1 м гирлянды',greens,'шт')]),'b');
  var sg={},sgl=S.els.filter(function(e){return e.type==='balloon'}),strN=0;
  sgl.forEach(function(e){var fin=D.FIN_NAME[e.fin]?e.fin:'latex',key='sb_'+fin+'_'+e.size,c=fin==='clear'?'':(e.color||pal.bal[0]).toUpperCase();if(!sg[key])sg[key]={key:key,fin:fin,size:e.size,qty:0,cols:{}};sg[key].qty++;if(c)sg[key].cols[c]=(sg[key].cols[c]||0)+1;if(e.string)strN++});
  var fo={},fol=S.els.filter(function(e){return e.type==='foil'}),heS=0,heL=0;
  fol.forEach(function(e){var key='fb_'+e.kind+'_'+e.size,c=(e.color||'#D4AF37').toUpperCase();if(!fo[key])fo[key]={key:key,kind:e.kind,size:e.size,qty:0,cols:{},txt:[]};fo[key].qty++;fo[key].cols[c]=(fo[key].cols[c]||0)+1;if(e.text&&(e.kind==='digit'||e.kind==='letter'))fo[key].txt.push(e.text);
    if(e.string&&e.size>16){if(e.size>18)heL++;else heS++;strN++}});
  R.foilN=fol.length;R.singleN=sgl.length;R.stringN=strN;
  grp('single','Отдельные шары',Object.keys(sg).sort().map(function(k){var q=sg[k];return rw(q.key,'Шар '+q.size+'″ · '+D.FIN_NAME[q.fin].toLowerCase(),'Ø '+D.BSIZE[q.size]+' мм'+(Object.keys(q.cols).length?'; цвета: '+Object.keys(q.cols).map(function(c){return c+' × '+q.cols[c]}).join(', '):''),q.qty,'шт')})
    .concat(Object.keys(fo).sort().map(function(k){var q=fo[k];return rw(q.key,'Фольгированный шар · '+D.FOIL_NAME[q.kind]+' '+q.size+'″','высота '+D.FOIL_H[q.size]+' мм'+(q.txt.length?'; «'+q.txt.join('», «')+'»':'')+'; цвета: '+Object.keys(q.cols).map(function(c){return c+' × '+q.cols[c]}).join(', '),q.qty,'шт')}))
    .concat([rw('helium','Гелий на шар на нитке','латексные шары на нитке',strN-heS-heL,'шт'),rw('he_foil_s','Гелий на фольгированный шар до 18″','',heS,'шт'),rw('he_foil_l','Гелий на фольгированный шар 32–40″','',heL,'шт'),rw('bweight','Грузик и нить','',strN,'шт')]),'b');
  // flowers, greenery, fabric
  var flo=S.els.filter(function(e){return e.type==='flora'}),dra=S.els.filter(function(e){return e.type==='drape'}),flN=0,spN=0,flC={},fab={};
  var flBy={},lfBy={},flCol={},bst=0,tbk=0;
  flo.forEach(function(e){var q=E.floraPlan(e),ft=e.kind==='greens'?null:(D.FL_NAME[e.fl]?e.fl:'mix'),lf=D.LEAF_NAME[e.leaf]?e.leaf:(e.kind==='greens'?'euca':'green');flN+=q.flowers;spN+=q.sprigs;
    if(ft&&q.flowers){var fk=ft==='hydrangea'?'hydr':'rose';flBy[fk]=(flBy[fk]||0)+q.flowers;flCol[fk]=flCol[fk]||{};(e.cols||[]).slice(0,3).forEach(function(c){flCol[fk][c]=1})}
    if(lf==='goldmix'){var gh=Math.round(q.sprigs/2);lfBy.gold=(lfBy.gold||0)+gh;lfBy.green=(lfBy.green||0)+q.sprigs-gh}else{var lk=lf==='gold'?'gold':'green';lfBy[lk]=(lfBy[lk]||0)+q.sprigs}});
  dra.forEach(function(e){var fb=E.fabOf(e),c=(e.color||'#FFFFFF').toUpperCase(),k=fb+' '+c;fab[k]=(fab[k]||0)+E.fabricLen(e);if(E.isBackdrop(e))bst+=Math.ceil(e.w/3000-1e-9);if(E.isTie(e)&&e.tb!=='none')tbk+=e.kind==='tie2'?2:1});
  R.floraN=flN;R.sprigN=spN;R.fabricM=E.sum(Object.keys(fab).map(function(k){return fab[k]}));R.bstandN=bst;R.tiebackN=tbk;
  var fcs=function(k){var o=flCol[k]||{};return Object.keys(o).length?'цвета '+Object.keys(o).join(', '):'цвета по эскизу'};
  grp('flora','Цветы, зелень, ткань',[rw('fl_flower','Цветы искусственные, головка 8–12 см','розы и пионы; '+fcs('rose'),flBy.rose||0,'шт'),rw('fl_hydr','Гортензия искусственная, соцветие 15–18 см',fcs('hydr'),flBy.hydr||0,'шт'),
    rw('fl_sprig','Ветка зелени искусственная, 60 см','эвкалипт, папоротник, рускус',lfBy.green||0,'шт'),rw('fl_gold','Ветка с золотыми листьями, 60 см','декоративные листья с напылением',lfBy.gold||0,'шт')]
    .concat(Object.keys(fab).sort().map(function(k){var fb=k.split(' ')[0],F=D.FAB[fb];return rw(F[2],'Ткань · '+F[0].toLowerCase()+', рулон '+String(F[1]).replace('.',',')+' м',k.split(' ')[1]+'; провис, сборка и 30 см на пол учтены',Math.round(fab[k]*10)/10,'м')}))
    .concat([rw('k_tieback','Подхват для ткани: лента или шнур, крючок','по одному на каждую сторону с подхватом',tbk,'шт'),rw('k_bstand','Стойка для тканевого фона, телескопическая','перекладина до 3 м, высота до 3 м; по одной на каждые 3 м ширины',bst,'шт')]),'k');
  // neon shapes: tube by tube size and colour, 0.1 m per shape for the ends, bought by the half metre; one 12 V supply with dimmer per shape
  var neo=S.els.filter(function(e){return e.type==='neon'&&!e.hide}),nBy={},nRaw=0,nW=0,nClip=0,nAcr=0;
  neo.forEach(function(e){var L=E.neonLen(e)/1000,k=(D.NEON_TUBE[e.tube]?e.tube:'l')+' '+(e.color||'#FFFFFF').toUpperCase();nBy[k]=nBy[k]||{len:0,n:0};nBy[k].len+=L;nBy[k].n++;nRaw+=L;nW+=L*(e.tube==='s'?7:10);
    if(e.base==='acrylic')nAcr+=e.w*e.h/1e6;else nClip+=Math.ceil(L/0.25)+1});
  R.neonLen=nRaw;R.neonN=neo.length;
  var nRows=Object.keys(nBy).sort().map(function(k){var tb=D.NEON_TUBE[k.split(' ')[0]],q=nBy[k];return rw(tb[2],'Гибкий неон 12 В · '+tb[0]+' · '+k.split(' ')[1],'по форме '+q.len.toFixed(2).replace('.',',')+' м + 0,1 м на концы × '+q.n+'; кратно 0,5 м',Math.ceil((q.len+0.1*q.n)*2-1e-9)/2,'м')});
  R.neonCheck=Math.abs(E.sum(Object.keys(nBy).map(function(k){return nBy[k].len}))-nRaw)<1e-9;
  grp('neon','Неон',nRows.concat([rw('neon_psu','Блок питания 12 В с диммером','по одному на фигуру; всего около '+Math.ceil(nW)+' Вт при 7–10 Вт/м',neo.length,'шт'),
    rw('neon_clip','Клипса для гибкого неона','шаг 250 мм + 1 на фигуру',nClip,'шт'),rw('neon_acr','Подложка из прозрачного акрила 5 мм','по габариту фигур; '+nAcr.toFixed(2)+' м²',Math.ceil(nAcr*10)/10,'м²')]),'k');
  grp('kit','Набор декора',R.kit.map(function(k){var r=rw(k.key,k.name,k.spec,k.qty,k.unit||'шт');r.mount=k.mount;return r}),'k');
  R.bom=G;
  R.cost={constr:E.sum(G,function(g){return g.cls==='c'?g.sum:0}),bal:E.sum(G,function(g){return g.cls==='b'?g.sum:0}),kit:E.sum(G,function(g){return g.cls==='k'?g.sum:0})};
  R.cost.all=R.cost.constr+R.cost.bal+R.cost.kit;
  R.bomCheck=Math.abs(R.cost.all-E.sum(G,function(g){return g.sum}))<0.005;

  /* --- assembly time --- */
  var steps=[],order=mods.slice().sort(function(a,c){return a.z-c.z||a.x0-c.x0});
  steps.push({t:5,name:'Разметка',text:(mods.length?'Тыл заднего фона в '+R.wallGap+' мм от стены'+(R.needGap?' (упорам нужно '+R.needGap+' мм)':'')+'. ':'')+'Пол ровный, проверка уровнем. Оси фонов разметить малярным скотчем по плану: зона '+(R.zone.w/1000).toFixed(1)+' × '+(R.zone.d/1000).toFixed(1)+' м.'});
  order.forEach(function(m){var sp=pairs.filter(function(p){return p.front===m});var t=3+2*m.sup.n+(m.area>2.5?2:0)+sp.length;
    steps.push({t:t,name:m.label+' · '+m.name,text:(m.depth?'Поставить на '+m.depth+' мм ближе к зрителю, чем задний ряд: лицо в '+Math.round(m.z)+' мм от стены. ':'Поставить в задний ряд: лицо в '+Math.round(m.z)+' мм от стены. ')+(m.sup.n?'Раскрыть '+(m.sup.n===1?'упор, накинуть крючок-фиксатор, положить мешок ':m.sup.n+' упора, накинуть крючки-фиксаторы, положить мешки по ')+bagKg+' кг.':'Своих упоров нет: фон держат проставки.')+
      sp.map(function(p){return ' Завести проставки в '+p.rear.label+' и закрутить барашки с тыла по оси x = '+Math.round(p.gx-R.zone.x0-100)+' мм.'}).join('')})});
  if(mods.length)steps.push({t:3,name:'Контроль',text:'Вертикаль уровнем; тест толчком '+F+' Н на высоте '+hApp+' м: отклонение не больше 5 мм.'});
  if(R.garLen>0)steps.push({t:Math.round(R.garLen*5),name:'Гирлянда',text:'Заранее собранные секции по 1–1,5 м на перфоленте соединяются на месте и крепятся хомутами к ввертным кольцам каждые 300 мм. Длина '+R.garLen.toFixed(1)+' м.'});
  if(R.kit.length)steps.push({t:5,name:'Накладки',text:'Надпись на крюки, кабель неона увести за фон. Магнитные и штифтовые накладки ставить по эталонному фото набора.'});
  steps.push({t:10,name:'Напольный реквизит',text:'Главный предмет по центру, затем остальное; высота по убыванию к краям.'});
  steps.push({t:5,name:'Свет и тестовый снимок',text:'Два источника под 45°, тёплая температура 3200–4000 К; неон в кадре не пересвечивать.'});
  R.steps=steps; R.asmMin=E.sum(steps,function(s){return s.t});

  /* --- economics --- */
  var ec=S.eco, ev=Math.max(1,ec.events), X={};
  X.amort=R.cost.constr/(ev*Math.max(1,ec.years));
  X.repair=R.cost.constr*ec.repair/100/ev;
  X.kit=R.cost.kit/Math.max(1,ec.kitUses);
  X.bal=R.cost.bal;
  X.work=ec.people*ec.hours*ec.rate+ec.prep*ec.rate;
  X.transport=ec.transport*ec.trips;
  X.misc=ec.misc;
  X.rows=[['Амортизация конструкции',X.amort,'#1F4D3F'],['Ремонт и подкраска',X.repair,'#6E9A88'],['Набор декора (доля)',X.kit,'#A98B4A'],['Шары и гирлянда',X.bal,'#C98A5A'],['Работа',X.work,'#7A2338'],['Транспорт',X.transport,'#4A5568'],['Мелочи',X.misc,'#A39A8C']];
  X.cost=E.sum(X.rows,function(r){return r[1]});
  X.check=Math.abs(X.cost-(X.amort+X.repair+X.kit+X.bal+X.work+X.transport+X.misc))<1e-9;
  X.price=function(mk){var net=X.cost*(1+mk/100),vat=ec.vat?net*0.19:0,profit=net-X.cost;
    return {net:net,vat:vat,gross:net+vat,profit:profit,year:profit*ev,payback:profit>0?Math.ceil((R.cost.constr+R.cost.kit)/profit):null}};
  X.cur=X.price(ec.markup);
  X.invest=R.cost.constr+R.cost.kit;
  R.eco=X;

  /* --- automatic checks --- */
  var C=[],room=S.room;
  function chk(ok,good,bad,level){C.push({ok:ok,text:ok?good:bad,level:ok?'ok':(level||'warn')})}
  if(mods.length){
    chk(R.sysSafe>=req,'Устойчивость связанной системы: запас '+R.sysSafe.toFixed(2)+' при требуемом '+req+'.','Запас устойчивости '+R.sysSafe.toFixed(2)+' меньше требуемого '+req+'. '+(R.bagNeed?'Нужны мешки по '+R.bagNeed+' кг.':'Нужно крепление к стене или полу.'),'bad');
    var lone=mods.filter(function(m){return m.group.mods.length===1&&m.safe<req});
    chk(!lone.length,'Отдельно стоящих фонов без запаса нет.','Стоят отдельно и не дотягивают до запаса '+req+': '+lone.map(function(m){return m.label+' ('+m.safe.toFixed(2)+')'}).join(', ')+'. Свяжите их проставкой с соседним фоном (нахлёст от 80 мм, зазор по глубине '+E.SP_MIN+'–'+E.SP_MAX+' мм) или увеличьте груз.','bad');
    var sep=mods.filter(function(m){return m.group.mods.length===1&&mods.some(function(o){return o!==m&&ovOf(m,o)>=80&&Math.abs(o.z-m.z)-T>E.SP_MAX})});
    if(sep.length)C.push({ok:true,level:'info',text:'Стоят отдельно, потому что до соседнего фона больше '+E.SP_MAX+' мм по глубине: '+sep.map(function(m){return m.label}).join(', ')+'. У каждого свои упоры и груз.'});
    var wallHit=mods.filter(function(m){return m.sup.n&&m.back<m.sup.i2+50});
    chk(!wallHit.length,'Упоры помещаются между фонами и стеной.','Упору не хватает места до стены: '+wallHit.map(function(m){return m.label+' (тыл в '+m.back+' мм, нужно '+(m.sup.i2+50)+')'}).join(', ')+'. Отодвиньте от стены.');
    var lifted=mods.filter(function(m){return m.el.type!=='circle'&&m.el.y>0});
    chk(!lifted.length,'Фоны стоят на полу.','Подняты над полом: '+lifted.map(function(m){return m.label+' на '+m.el.y+' мм'}).join(', ')+'. Нужен подиум или подставка, упоры рассчитаны на пол.');
    var tall=mods.filter(function(m){return m.el.h>room.h-100});
    chk(!tall.length,'Все фоны проходят по высоте комнаты '+(room.h/1000).toFixed(1)+' м.','Выше комнаты или впритык: '+tall.map(function(m){return m.label}).join(', ')+'.','bad');
    var big=mods.filter(function(m){return Math.min(m.el.w,m.el.h)>E.PVC.w||Math.max(m.el.w,m.el.h)>E.PVC.h});
    chk(!big.length,'Каждый фон вырезается из одного листа ПВХ 2050×3050.','Не помещаются на лист ПВХ, нужна стыковка: '+big.map(function(m){return m.label}).join(', ')+'.');
    var car=mods.filter(function(m){return m.el.w>1250||m.el.h>2000});
    chk(!car.length,'Все фоны входят в универсал или минивэн.','Нужен фургон (проём от 1,6 м, длина от 2,5 м) или разъёмное исполнение: '+car.map(function(m){return m.label+' '+m.el.w+'×'+m.el.h}).join(', ')+'.','info');
    var heavy=mods.filter(function(m){return m.weight>30});
    chk(!heavy.length,'Каждый фон легче 30 кг: переносится вдвоём без усилий.','Тяжелее 30 кг: '+heavy.map(function(m){return m.label+' ≈ '+m.weight.toFixed(0)+' кг'}).join(', ')+'. Нести вдвоём.','info');
    notes.forEach(function(n){C.push({ok:false,text:n,level:'warn'})});
  }
  var high=S.els.filter(function(el){return !E.isBg(el)&&el.y+el.h>room.h+5});
  if(S.els.length)chk(!high.length,'Шары, надписи и декор ниже потолка.','Выше потолка '+(room.h/1000).toFixed(1)+' м: '+high.length+' элем. Опустите их или увеличьте высоту комнаты в настройках сцены.');
  var out=S.els.filter(function(el){return el.x<-5||el.x+el.w>room.w+5});
  chk(!out.length,'Все элементы внутри ширины комнаты.','За пределами комнаты: '+out.length+' элем.');
  S.els.filter(function(el){return el.type==='text'&&el.style!=='marquee'&&!el.stand}).forEach(function(tx){   // free-standing letters and inscriptions on a stand are not mounted on a background
    var host=mods.filter(function(m){return tx.x+tx.w/2>m.x0&&tx.x+tx.w/2<m.x1&&tx.y<m.el.y+m.el.h}).pop();
    if(host)chk(tx.w<=host.el.w-200,'Надпись «'+String(tx.text).replace(/\n/g,' ')+'» помещается на '+host.label+'.','Надпись «'+String(tx.text).replace(/\n/g,' ')+'» шире фона '+host.label+': '+Math.round(tx.w)+' мм при доступных '+(host.el.w-200)+' мм.');
  });
  var bkd=S.els.some(E.isBackdrop);
  if(R.garLen>0)chk(mods.length>0||bkd,mods.length?'Гирлянда крепится к торцам фонов.':'Гирлянда крепится к стойке тканевого фона.','Гирлянде не к чему крепиться: на сцене нет фонов. Нужна стойка для шаров.');
  R.checks=C;
  return R;
};
