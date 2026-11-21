// Original cover artwork is painted here so preview and PNG export share one deterministic renderer.
const inkCache = new WeakMap();
let grainTile;

function filmGrain(ctx,w,h) {
  if(!grainTile){
    grainTile=document.createElement('canvas');grainTile.width=grainTile.height=128;
    const c=grainTile.getContext('2d'),image=c.createImageData(128,128);let seed=0x6af73c21;
    for(let i=0;i<image.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const value=seed>>>24;image.data[i]=image.data[i+1]=image.data[i+2]=value;image.data[i+3]=30;}
    c.putImageData(image,0,0);
  }
  ctx.save();ctx.globalCompositeOperation='soft-light';ctx.fillStyle=ctx.createPattern(grainTile,'repeat');ctx.fillRect(0,0,w,h);ctx.restore();
}

export function panelPolygons(layout) {
  if (layout === 'hero') return [[[0,0],[.72,0],[.66,.83],[0,.83]],[[.72,0],[1,0],[1,.53],[.68,.57]],[[.68,.57],[1,.53],[1,.83],[.66,.83]]];
  if (layout === 'triptych') return [[[0,0],[1,0],[1,.79],[0,.79]],[[.70,.12],[.96,.12],[.96,.52],[.70,.52]],[[.70,.54],[.96,.54],[.96,.73],[.70,.73]]];
  if (layout === 'grid') return [[[0,0],[.5,0],[.5,.5],[0,.5]],[[.5,0],[1,0],[1,.5],[.5,.5]],[[0,.5],[.5,.5],[.5,1],[0,1]],[[.5,.5],[1,.5],[1,1],[.5,1]]];
  return [[[0,0],[.29,0],[.275,.25],[0,.28]],[[0,.28],[.275,.25],[.245,.76],[0,.8]],[[.29,0],[1,0],[1,.8],[.245,.76]],[[0,.8],[.245,.76],[1,.8],[1,1],[0,1]]];
}

function illustratedPhoto(image) {
  if (inkCache.has(image)) return inkCache.get(image);
  const layer = document.createElement('canvas');
  const ratio = Math.min(1, 1100 / Math.max(image.width, image.height));
  layer.width = Math.round(image.width * ratio); layer.height = Math.round(image.height * ratio);
  const c = layer.getContext('2d', {willReadFrequently:true});
  c.drawImage(image, 0, 0, layer.width, layer.height);
  const pixels = c.getImageData(0, 0, layer.width, layer.height), data = pixels.data, original = new Uint8ClampedArray(data), width = layer.width;
  for (let y=1; y<layer.height-1; y++) for (let x=1; x<width-1; x++) {
    const i=(y*width+x)*4, luminance=.299*original[i]+.587*original[i+1]+.114*original[i+2];
    let edge=0; for (const offset of [4,width*4]) edge += Math.abs(original[i]-original[i+offset])+Math.abs(original[i+1]-original[i+offset+1])+Math.abs(original[i+2]-original[i+offset+2]);
    const line=edge>88 ? Math.max(.38,1-(edge-88)/420) : 1;
    for (let channel=0; channel<3; channel++) {
      const saturated=luminance+(original[i+channel]-luminance)*1.4, contrasted=(saturated-128)*1.16+134;
      data[i+channel]=Math.max(0,Math.min(255,(Math.round(contrasted/20)*20)*line));
    }
  }
  c.putImageData(pixels,0,0); inkCache.set(image,layer); return layer;
}

function tracePolygon(ctx, polygon, w, h) { ctx.beginPath(); polygon.forEach(([x,y],i)=>i?ctx.lineTo(x*w,y*h):ctx.moveTo(x*w,y*h)); ctx.closePath(); }
function bounds(polygon,w,h) { const xs=polygon.map(p=>p[0]*w), ys=polygon.map(p=>p[1]*h); return {left:Math.min(...xs),top:Math.min(...ys),pw:Math.max(...xs)-Math.min(...xs),ph:Math.max(...ys)-Math.min(...ys)}; }
function dots(ctx,x,y,w,h,step,alpha=.22,color='#ffd7ba') { ctx.save(); ctx.globalAlpha=alpha; ctx.fillStyle=color; for(let yy=y;yy<y+h;yy+=step) for(let xx=x;xx<x+w;xx+=step){ctx.beginPath();ctx.arc(xx,yy,Math.max(1,step*.13),0,Math.PI*2);ctx.fill();} ctx.restore(); }

function drawPalm(ctx,x,y,size,flip=1) {
  ctx.save(); ctx.translate(x,y); ctx.scale(size*flip,size); ctx.strokeStyle='#21152d'; ctx.fillStyle='#21152d'; ctx.lineCap='round'; ctx.lineWidth=8;
  ctx.beginPath();ctx.moveTo(0,110);ctx.quadraticCurveTo(18,42,0,0);ctx.stroke();
  for(let i=0;i<9;i++){const angle=-Math.PI+(i/8)*Math.PI,ex=Math.cos(angle)*58,ey=Math.sin(angle)*40;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(ex*.52,ey-18,ex,ey+18);ctx.quadraticCurveTo(ex*.5,ey+3,0,0);ctx.fill();} ctx.restore();
}

function vignette(ctx,type,x,y,w,h) {
  const g=ctx.createLinearGradient(x,y,x,y+h); g.addColorStop(0,type===2?'#182e62':'#28183f'); g.addColorStop(.55,type===1?'#d33d79':'#b53f83'); g.addColorStop(1,'#f5a45f'); ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
  ctx.save();ctx.globalCompositeOperation='screen';const glow=ctx.createRadialGradient(x+w*.67,y+h*.42,0,x+w*.67,y+h*.42,w*.42);glow.addColorStop(0,'#ffe6adcc');glow.addColorStop(1,'#ff9a3500');ctx.fillStyle=glow;ctx.fillRect(x,y,w,h);ctx.restore();
  if(type===0){
    const sun=h*.16;ctx.fillStyle='#ffd68a';ctx.beginPath();ctx.arc(x+w*.69,y+h*.36,sun,0,Math.PI*2);ctx.fill();ctx.fillStyle='#bd507d';for(let i=0;i<5;i++)ctx.fillRect(x+w*.69-sun,y+h*.3+i*sun*.2,sun*2,sun*.035);
    ctx.fillStyle='#1a1832';for(let i=0;i<9;i++){const bw=w*(.035+i%3*.018),bh=h*(.15+(i%4)*.07),bx=x+w*(.04+i*.105);ctx.fillRect(bx,y+h-bh,bw,bh);ctx.fillRect(bx+bw*.35,y+h-bh-h*.025,bw*.12,h*.025);} drawPalm(ctx,x+w*.1,y+h*.78,h*.0022);drawPalm(ctx,x+w*.91,y+h*.82,h*.0018,-1);
  } else if(type===1){
    ctx.fillStyle='#11162b';ctx.beginPath();ctx.moveTo(x+w*.1,y+h*.86);ctx.quadraticCurveTo(x+w*.12,y+h*.55,x+w*.27,y+h*.5);ctx.lineTo(x+w*.73,y+h*.5);ctx.quadraticCurveTo(x+w*.9,y+h*.55,x+w*.93,y+h*.86);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#f5b37d';ctx.lineWidth=Math.max(3,w*.012);ctx.stroke();ctx.fillStyle='#f8d598';ctx.beginPath();ctx.arc(x+w*.29,y+h*.7,w*.075,0,Math.PI*2);ctx.arc(x+w*.71,y+h*.7,w*.075,0,Math.PI*2);ctx.fill();ctx.fillStyle='#38203e';ctx.beginPath();ctx.arc(x+w*.29,y+h*.7,w*.035,0,Math.PI*2);ctx.arc(x+w*.71,y+h*.7,w*.035,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f5a06a';ctx.lineWidth=Math.max(2,w*.008);ctx.beginPath();ctx.moveTo(x+w*.2,y+h*.78);ctx.lineTo(x+w*.8,y+h*.78);ctx.stroke();
  } else if(type===2){
    ctx.fillStyle='#ffd38a';ctx.beginPath();ctx.arc(x+w*.7,y+h*.29,h*.13,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f2c6b4';ctx.lineWidth=Math.max(2,w*.006);for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(x,y+h*(.55+i*.065));ctx.quadraticCurveTo(x+w*.25,y+h*(.48+i*.065),x+w*.5,y+h*(.55+i*.065));ctx.quadraticCurveTo(x+w*.75,y+h*(.62+i*.065),x+w,y+h*(.55+i*.065));ctx.stroke();}ctx.fillStyle='#30234c';for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(x+w*(.2+i*.25),y+h*(.34+i%2*.07),w*.025,Math.PI,Math.PI*2);ctx.stroke();}
  } else {
    ctx.fillStyle='#f7c36f';ctx.beginPath();ctx.arc(x+w*.5,y+h*.44,w*.18,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffdf9f';ctx.lineWidth=Math.max(2,w*.012);for(let i=0;i<16;i++){const a=i*Math.PI/8;ctx.beginPath();ctx.moveTo(x+w*.5+Math.cos(a)*w*.23,y+h*.44+Math.sin(a)*w*.23);ctx.lineTo(x+w*.5+Math.cos(a)*w*.42,y+h*.44+Math.sin(a)*w*.42);ctx.stroke();}drawPalm(ctx,x+w*.18,y+h*.88,h*.002,-1);drawPalm(ctx,x+w*.84,y+h*.9,h*.002);
  }
  dots(ctx,x,y,w,h,Math.max(8,w*.035),.16,'#fff0ce');
}

function paintPanel(ctx,panel,polygon,w,h,index) {
  const s=Math.min(w,h);
  const {left,top,pw,ph}=bounds(polygon,w,h); ctx.save();tracePolygon(ctx,polygon,w,h);ctx.clip();
  if(panel.image){const image=panel.image,scale=Math.max(pw/image.width,ph/image.height)*panel.zoom,dw=image.width*scale,dh=image.height*scale,x=left-(dw-pw)*panel.x,y=top-(dh-ph)*panel.y;ctx.filter='saturate(1.32) contrast(1.09)';ctx.drawImage(image,x,y,dw,dh);ctx.filter='none';ctx.globalAlpha=panel.ink/100*.6;ctx.drawImage(illustratedPhoto(image),x,y,dw,dh);ctx.globalAlpha=1;} else vignette(ctx,(panel.vignetteIndex??index)%4,left,top,pw,ph);
  const palette=panel.grade==='neon'?['#9428d0','#ff267f','#ffae48']:panel.grade==='ocean'?['#2544ac','#00c7c0','#ffbf73']:['#a12188','#ff5376','#ffb744'];
  const gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,palette[0]);gradient.addColorStop(.5,palette[1]);gradient.addColorStop(1,palette[2]);ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=panel.strength/100;ctx.fillStyle=gradient;ctx.fillRect(left,top,pw,ph);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=panel.strength/100*.055;ctx.fillStyle='#ff7848';ctx.fillRect(left,top,pw,ph);ctx.globalAlpha=1;
  const shade=ctx.createRadialGradient(w*.55,h*.3,s*.2,w*.5,h*.4,Math.max(w,h)*.8);shade.addColorStop(0,'#15122600');shade.addColorStop(1,'#17112e88');ctx.fillStyle=shade;ctx.fillRect(left,top,pw,ph);dots(ctx,left,top,pw,ph,Math.max(5,s*.008),.035,'#21152d');ctx.restore();
}

function drawTitleBand(ctx,w,h,polygon) {ctx.save();tracePolygon(ctx,polygon,w,h);ctx.clip();const g=ctx.createLinearGradient(0,h*.7,w,h);g.addColorStop(0,'#1b102c');g.addColorStop(.6,'#571d4a');g.addColorStop(1,'#e93678');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);dots(ctx,0,h*.7,w,h*.3,8,.06);ctx.restore();}

function drawCaptionLettering(ctx,state) {
  const w=state.width,h=state.height,s=Math.min(w,h);
  filmGrain(ctx,w,h);
  let text=state.caption.trim().toUpperCase();if(!text)return;
  let lines=text.split(/\n/).filter(Boolean).slice(0,3);
  if(lines.length===1&&text.length>12){
    const words=text.split(' ');
    if(words.length>1){let split=1;for(let i=1;i<words.length;i++)if(Math.abs(words.slice(0,i).join(' ').length-text.length/2)<Math.abs(words.slice(0,split).join(' ').length-text.length/2))split=i;lines=[words.slice(0,split).join(' '),words.slice(split).join(' ')];}
  }
  let fontSize=s*.167*state.typeSize/100;
  ctx.font=`900 ${fontSize}px Impact, 'Arial Black', Arial, sans-serif`;
  const widest=Math.max(...lines.map((line,i)=>ctx.measureText(line).width*(i?1.08:1)));
  if(widest>w*.88)fontSize*=w*.88/widest;
  const lineHeight=fontSize*.92,total=lineHeight*lines.length;
  const center=Math.min(h-total/2-s*.08,Math.max(total/2+s*.05,h*state.typeY/100));
  ctx.save();
  const scrim=ctx.createLinearGradient(0,center-total,0,center+total);
   scrim.addColorStop(0,'#17112600');scrim.addColorStop(.4,'#171126b8');scrim.addColorStop(1,'#171126ee');
  ctx.fillStyle=scrim;ctx.fillRect(0,center-total,w,total*2);
  ctx.translate(w*.5,center);ctx.rotate(-.025);ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.strokeStyle='#f4bd73';ctx.lineWidth=Math.max(2,s*.003);
  ctx.beginPath();ctx.moveTo(-w*.43,-total*.64);ctx.lineTo(-w*.23,-total*.64);ctx.stroke();
  lines.forEach((line,i)=>{
    const y=(i-(lines.length-1)/2)*lineHeight,size=i?fontSize*1.08:fontSize;
    ctx.font=`900 ${size}px Impact, 'Arial Black', Arial, sans-serif`;
    ctx.lineJoin='round';ctx.lineWidth=s*.028;ctx.strokeStyle='#171321';ctx.strokeText(line,s*.007,y+s*.012);
    ctx.lineWidth=s*.006;ctx.strokeStyle='#fff1d4';ctx.strokeText(line,0,y);
    const fill=ctx.createLinearGradient(0,y-size*.5,0,y+size*.5);
    fill.addColorStop(0,i?'#ffafd2':'#fff9df');fill.addColorStop(1,i?'#f04492':'#ffd88a');ctx.fillStyle=fill;ctx.fillText(line,0,y);
  });ctx.restore();
}

export function renderPoster(ctx,state) {
  const w=state.width,h=state.height,s=Math.min(w,h),polygons=panelPolygons(state.layout);
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#24132d';ctx.fillRect(0,0,w,h);
  polygons.forEach((polygon,i)=>{if(state.layout==='collage'&&i===3)drawTitleBand(ctx,w,h,polygon);else paintPanel(ctx,state.panels[i]||{},polygon,w,h,i);});
  ctx.lineWidth=s*.012;ctx.strokeStyle='#171320';ctx.lineJoin='round';polygons.forEach(p=>{tracePolygon(ctx,p,w,h);ctx.stroke();});
  drawCaptionLettering(ctx,state);
  if(state.details){
    ctx.save();ctx.fillStyle='#171320';ctx.fillRect(s*.032,s*.03,s*.35,s*.049);
    ctx.fillStyle='#fff1d6';ctx.textAlign='left';ctx.font=`700 ${s*.017}px Arial`;ctx.fillText('AFTER HOURS  /  ORIGINALS',s*.045,s*.062);
    ctx.fillStyle='#ffcd81';ctx.textAlign='right';ctx.font=`700 ${s*.018}px Arial`;ctx.fillText('VOL. 06',w-s*.045,s*.062);
    ctx.font=`700 ${s*.012}px Arial`;ctx.textAlign='left';ctx.fillStyle='#ffe9d0';ctx.fillText('SUN DOWN.  STORY ON.',s*.045,h-s*.033);
    ctx.textAlign='right';ctx.fillText('YOUR CITY. YOUR RULES.  /  18+',w-s*.045,h-s*.033);
    ctx.restore();
  }
  ctx.strokeStyle='#171320';ctx.lineWidth=s*.018;ctx.strokeRect(0,0,w,h);
  ctx.lineWidth=s*.002;ctx.strokeStyle='#ffdd9e99';ctx.strokeRect(s*.019,s*.019,w-s*.038,h-s*.038);
}
