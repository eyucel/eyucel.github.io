(() => {
  const $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const C = {ink:'#1f2f3d', muted:'#647582', grid:'#dbe4e8', blue:'#3c78a8', teal:'#31776f', purple:'#8070a4', panel:'#ffffff'};
  const ids = ['adSlope','discountSlope','interaction','discount','ads','rotation','tilt'];
  const state = () => ({b0:40,b1:+$('adSlope').value,b2:+$('discountSlope').value,b3:+$('interaction').value,d:+$('discount').value,a:+$('ads').value,rotation:+$('rotation').value,tilt:+$('tilt').value});
  const pred = (s,a,d) => s.b0+s.b1*a+s.b2*d+s.b3*a*d;
  const signed = (v,digits=2) => `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(digits)}`;
  const el = (svg,name,attrs={},text) => {const n=document.createElementNS(NS,name);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text!==undefined)n.textContent=text;svg.appendChild(n);return n;};
  const linePath = pts => pts.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
  const range = (n,fn) => Array.from({length:n},(_,i)=>fn(i));

  function axes(svg,w,h,m,xd,yd,xLabel,yLabel){
    const x=v=>m.l+(v-xd[0])*(w-m.l-m.r)/(xd[1]-xd[0]),y=v=>h-m.b-(v-yd[0])*(h-m.t-m.b)/(yd[1]-yd[0]);
    for(let i=0;i<=5;i++){
      const xv=xd[0]+i*(xd[1]-xd[0])/5,yv=yd[0]+i*(yd[1]-yd[0])/5;
      el(svg,'line',{x1:x(xv),x2:x(xv),y1:m.t,y2:h-m.b,stroke:C.grid,'stroke-width':1});
      el(svg,'line',{x1:m.l,x2:w-m.r,y1:y(yv),y2:y(yv),stroke:C.grid,'stroke-width':1});
      el(svg,'text',{x:x(xv),y:h-m.b+19,'text-anchor':'middle',fill:C.muted,'font-size':11},Math.round(xv));
      el(svg,'text',{x:m.l-8,y:y(yv)+4,'text-anchor':'end',fill:C.muted,'font-size':11},Math.round(yv));
    }
    el(svg,'line',{x1:m.l,x2:w-m.r,y1:h-m.b,y2:h-m.b,stroke:C.ink});
    el(svg,'line',{x1:m.l,x2:m.l,y1:m.t,y2:h-m.b,stroke:C.ink});
    el(svg,'text',{x:(m.l+w-m.r)/2,y:h-5,'text-anchor':'middle',fill:C.muted,'font-size':12},xLabel);
    el(svg,'text',{transform:`translate(14 ${(m.t+h-m.b)/2}) rotate(-90)`,'text-anchor':'middle',fill:C.muted,'font-size':12},yLabel);
    return{x,y};
  }

  function drawSlices(s){
    const svg=$('sliceChart'),w=720,h=360,m={l:58,r:24,t:22,b:48};svg.innerHTML='';
    el(svg,'title',{id:'sliceTitle'},'Revenue versus ad spending at three discount rates');
    el(svg,'desc',{id:'sliceDesc'},'Three lines show how the slope of revenue on advertising changes with discount rate.');
    const values=[];
    [0,s.d,30].forEach(d=>range(41,i=>i/2).forEach(a=>values.push(pred(s,a,d))));
    const lo=Math.min(...values),hi=Math.max(...values),pad=Math.max(12,(hi-lo)*.08);
    const sc=axes(svg,w,h,m,[0,20],[lo-pad,hi+pad],'Digital ad spending ($000)','Weekly revenue ($000)');
    const drawLine=(d,color,width)=>{
      const pts=range(81,i=>{const a=i/4;return[sc.x(a),sc.y(pred(s,a,d))]});
      el(svg,'path',{d:linePath(pts),fill:'none',stroke:color,'stroke-width':width,'stroke-linecap':'round'});
    };
    drawLine(0,C.blue,2.3);drawLine(30,C.purple,2.3);drawLine(s.d,C.teal,4);
    const yv=pred(s,s.a,s.d);
    el(svg,'line',{x1:sc.x(s.a),x2:sc.x(s.a),y1:h-m.b,y2:sc.y(yv),stroke:C.muted,'stroke-dasharray':'4 4'});
    el(svg,'circle',{cx:sc.x(s.a),cy:sc.y(yv),r:6,fill:C.panel,stroke:C.teal,'stroke-width':3});
    const run=4,start=Math.max(0,Math.min(16,s.a-2)),end=start+run,y0=pred(s,start,s.d),y1=pred(s,end,s.d);
    el(svg,'path',{d:`M${sc.x(start)},${sc.y(y0)} L${sc.x(end)},${sc.y(y0)} L${sc.x(end)},${sc.y(y1)}`,fill:'none',stroke:C.ink,'stroke-width':1.5,'stroke-dasharray':'4 3'});
    el(svg,'text',{x:(sc.x(start)+sc.x(end))/2,y:sc.y(y0)+16,'text-anchor':'middle',fill:C.muted,'font-size':10},'run = $4k ads');
    el(svg,'text',{x:sc.x(end)+7,y:(sc.y(y0)+sc.y(y1))/2,'text-anchor':'start',fill:C.muted,'font-size':10},`rise = ${(y1-y0).toFixed(1)}k`);
    [['0%',0,C.blue], [`${s.d}%`,s.d,C.teal], ['30%',30,C.purple]].forEach(([label,d,color])=>{
      const yy=sc.y(pred(s,19.4,d));
      el(svg,'text',{x:sc.x(19.4)-3,y:yy-7,'text-anchor':'end',fill:color,'font-size':11,'font-weight':700},label);
    });
  }

  function drawSurface(s){
    const svg=$('surfaceChart');svg.innerHTML='';
    el(svg,'title',{id:'surfaceTitle'},'Three-dimensional fitted revenue surface');
    el(svg,'desc',{id:'surfaceDesc'},'A rotatable wireframe surface displays predicted revenue over ad spending and discount rate. The teal line is the selected discount slice and the purple ring is the selected business.');
    const samples=[];
    for(let d=0;d<=30;d+=3)for(let a=0;a<=20;a+=2)samples.push(pred(s,a,d));
    const yMin=Math.min(...samples),yMax=Math.max(...samples),ySpan=Math.max(1,yMax-yMin),angle=s.rotation*Math.PI/180,pitch=s.tilt*Math.PI/180;
    const project=(a,d,y)=>{const xn=a/20,zn=d/30,yn=(y-yMin)/ySpan,dx=(xn-.5)*280,dz=(zn-.5)*230,yv=(yn-.5)*200,ca=Math.cos(angle),sa=Math.sin(angle),horizontal=dx*ca-dz*sa,depth=dx*sa+dz*ca;return[360+horizontal,215+depth*Math.sin(pitch)-yv*Math.cos(pitch)];};
    const faces=[];
    for(let di=0;di<10;di++)for(let ai=0;ai<10;ai++){
      const a0=ai*2,a1=(ai+1)*2,d0=di*3,d1=(di+1)*3,center=project((a0+a1)/2,(d0+d1)/2,pred(s,(a0+a1)/2,(d0+d1)/2));
      faces.push({depth:center[1],pts:[[a0,d0],[a1,d0],[a1,d1],[a0,d1]].map(([a,d])=>project(a,d,pred(s,a,d)))});
    }
    faces.sort((q,r)=>q.depth-r.depth).forEach((f,i)=>el(svg,'path',{d:`${linePath(f.pts)} Z`,fill:C.teal,'fill-opacity':.06+(i/faces.length)*.07,stroke:'none'}));
    for(let d=0;d<=30;d+=5){const pts=range(41,i=>{const a=i/2;return project(a,d,pred(s,a,d))});el(svg,'path',{d:linePath(pts),fill:'none',stroke:C.grid,'stroke-width':1});}
    for(let a=0;a<=20;a+=2){const pts=range(61,i=>{const d=i/2;return project(a,d,pred(s,a,d))});el(svg,'path',{d:linePath(pts),fill:'none',stroke:C.grid,'stroke-width':1});}
    const selected=range(81,i=>{const a=i/4;return project(a,s.d,pred(s,a,s.d))});
    el(svg,'path',{d:linePath(selected),fill:'none',stroke:C.teal,'stroke-width':4,'stroke-linecap':'round'});
    const p=project(s.a,s.d,pred(s,s.a,s.d));
    el(svg,'circle',{cx:p[0],cy:p[1],r:6,fill:C.panel,stroke:C.purple,'stroke-width':3});
    const origin=project(0,0,yMin),aEnd=project(20,0,yMin),dEnd=project(0,30,yMin),yEnd=project(0,0,yMax);
    [[origin,aEnd],[origin,dEnd],[origin,yEnd]].forEach(pair=>el(svg,'line',{x1:pair[0][0],y1:pair[0][1],x2:pair[1][0],y2:pair[1][1],stroke:C.ink,'stroke-width':1.4}));
    el(svg,'text',{x:aEnd[0],y:aEnd[1]+18,'text-anchor':'middle',fill:C.muted,'font-size':11},'Ads ($000)');
    el(svg,'text',{x:dEnd[0],y:dEnd[1]+18,'text-anchor':'middle',fill:C.muted,'font-size':11},'Discount (%)');
    el(svg,'text',{x:yEnd[0]-10,y:yEnd[1]-7,'text-anchor':'end',fill:C.muted,'font-size':11},'Revenue');
    el(svg,'line',{x1:28,x2:56,y1:24,y2:24,stroke:C.teal,'stroke-width':4,'stroke-linecap':'round'});
    el(svg,'text',{x:64,y:28,fill:C.muted,'font-size':11},`selected ${s.d}% discount slice`);
    el(svg,'circle',{cx:33,cy:48,r:5,fill:C.panel,stroke:C.purple,'stroke-width':3});
    el(svg,'text',{x:45,y:52,fill:C.muted,'font-size':11},'selected business');
  }

  function update(){
    const s=state(),slope=s.b1+s.b3*s.d,y=pred(s,s.a,s.d);
    $('adSlopeOut').textContent=s.b1.toFixed(2);$('discountSlopeOut').textContent=s.b2.toFixed(2);$('interactionOut').textContent=signed(s.b3);$('discountOut').textContent=`${s.d}%`;$('adsOut').textContent=`$${s.a}k`;$('rotationOut').textContent=`${s.rotation} deg`;$('tiltOut').textContent=`${s.tilt} deg`;
    $('modelEquation').textContent=`Revenue = 40 ${signed(s.b1)}(Ads) ${signed(s.b2)}(Discount) ${signed(s.b3)}(Ads x Discount)`;
    $('slopeValue').textContent=`${s.b1.toFixed(2)} ${signed(s.b3)}(${s.d}) = ${slope.toFixed(2)}`;
    $('slopeSentence').textContent=`At a ${s.d}% discount, another $1k in ads is associated with ${slope<0?'a $'+Math.abs(slope).toFixed(2)+'k decrease':'$'+slope.toFixed(2)+'k more'} weekly revenue.`;
    $('predictionValue').textContent=`$${y.toFixed(1)}k weekly revenue`;
    $('predictionInputs').textContent=`for $${s.a}k ads and a ${s.d}% discount`;
    drawSlices(s);drawSurface(s);
  }
  function resetView(){ $('rotation').value=43;$('tilt').value=28;update(); }
  function setupOrbit(){
    const surface=$('surfaceChart'),wrap=v=>((v+180)%360+360)%360-180,clamp=(lo,hi,v)=>Math.max(lo,Math.min(hi,v));let drag=null;
    surface.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,rotation:+$('rotation').value,tilt:+$('tilt').value};surface.setPointerCapture(e.pointerId);surface.classList.add('is-dragging');e.preventDefault();});
    surface.addEventListener('pointermove',e=>{if(!drag)return;$('rotation').value=wrap(drag.rotation+(e.clientX-drag.x)*.65);$('tilt').value=clamp(-65,65,drag.tilt-(e.clientY-drag.y)*.35);update();e.preventDefault();});
    const end=e=>{if(!drag)return;drag=null;surface.classList.remove('is-dragging');if(surface.hasPointerCapture(e.pointerId))surface.releasePointerCapture(e.pointerId);};
    surface.addEventListener('pointerup',end);surface.addEventListener('pointercancel',end);
  }
  ids.forEach(id=>$(id).addEventListener('input',update));
  $('resetView').addEventListener('click',resetView);
  $('reset').addEventListener('click',()=>{const defaults={adSlope:3,discountSlope:1.2,interaction:.18,discount:10,ads:10,rotation:43,tilt:28};Object.entries(defaults).forEach(([id,v])=>$(id).value=v);update();});
  setupOrbit();
  update();
})();
