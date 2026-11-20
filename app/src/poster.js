// All artwork is painted here: the same canvas is previewed and exported.
const inkCache = new WeakMap();
export function panelPolygons(layout) {
  if(layout==='hero') return [[[0,0],[.64,0],[.59,1],[0,1]],[[.64,0],[1,0],[1,.49],[.615,.54]],[[.615,.54],[1,.49],[1,1],[.59,1]]];
  if(layout==='triptych') return [[[0,0],[.36,0],[.3,1],[0,1]],[[.36,0],[.7,0],[.64,1],[.3,1]],[[.7,0],[1,0],[1,1],[.64,1]]];
  if(layout==='grid') return [[[0,0],[.5,0],[.5,.5],[0,.5]],[[.5,0],[1,0],[1,.5],[.5,.5]],[[0,.5],[.5,.5],[.5,1],[0,1]],[[.5,.5],[1,.5],[1,1],[.5,1]]];
  return [[[0,0],[.43,0],[.4,.36],[0,.42]],[[0,.42],[.4,.36],[.38,.7],[0,.75]],[[.43,0],[1,0],[1,.72],[.38,.7],[.4,.36]],[[0,.75],[.38,.7],[1,.72],[1,1],[0,1]]];
}

function illustratedPhoto(image) {
  if(inkCache.has(image))return inkCache.get(image);
  const layer=document.createElement('canvas');
  const ratio=Math.min(1,1100/Math.max(image.width,image.height));
  layer.width=Math.round(image.width*ratio);layer.height=Math.round(image.height*ratio);
  const c=layer.getContext('2d',{willReadFrequently:true});
  c.drawImage(image,0,0,layer.width,layer.height);
  const pixels=c.getImageData(0,0,layer.width,layer.height),data=pixels.data,original=new Uint8ClampedArray(data);
  const width=layer.width;
  for(let y=1;y<layer.height-1;y++) for(let x=1;x<width-1;x++) {
    const i=(y*width+x)*4;
    const luminance=.299*original[i]+.587*original[i+1]+.114*original[i+2];
    let edge=0;
    for(const offset of [4,width*4])edge+=Math.abs(original[i]-original[i+offset])+Math.abs(original[i+1]-original[i+offset+1])+Math.abs(original[i+2]-original[i+offset+2]);
    const line=edge>105?Math.max(.48,1-(edge-105)/480):1;
    for(let channel=0;channel<3;channel++) {
      const saturated=luminance+(original[i+channel]-luminance)*1.32;
      const contrasted=(saturated-128)*1.12+132;
      data[i+channel]=Math.max(0,Math.min(255,(Math.round(contrasted/22)*22)*line));
    }
  }
  c.putImageData(pixels,0,0);inkCache.set(image,layer);return layer;
}

function tracePolygon(ctx,polygon,w,h) {
  ctx.beginPath();polygon.forEach(([x,y],i)=>i?ctx.lineTo(x*w,y*h):ctx.moveTo(x*w,y*h));ctx.closePath();
}

function paintPhotoPanel(ctx,panel,polygon,w,h) {
  const xs=polygon.map(p=>p[0]*w),ys=polygon.map(p=>p[1]*h);
  const left=Math.min(...xs),top=Math.min(...ys),pw=Math.max(...xs)-left,ph=Math.max(...ys)-top;
  ctx.save();tracePolygon(ctx,polygon,w,h);ctx.clip();
  ctx.fillStyle='#e2b79a';ctx.fillRect(left,top,pw,ph);
  if(panel.image) {
    const image=panel.image,scale=Math.max(pw/image.width,ph/image.height)*panel.zoom;
    const dw=image.width*scale,dh=image.height*scale;
    const x=left-(dw-pw)*panel.x,y=top-(dh-ph)*panel.y;
    ctx.drawImage(image,x,y,dw,dh);
    ctx.globalAlpha=panel.ink/100;ctx.drawImage(illustratedPhoto(image),x,y,dw,dh);ctx.globalAlpha=1;
  }
  const palette=panel.grade==='neon'?['#9f39d7','#fb4c9e','#13dbc8']:panel.grade==='ocean'?['#236baf','#46d6c6','#edbd75']:['#8b4caa','#ec8c8c','#ffd284'];
  const gradient=ctx.createLinearGradient(0,top,0,top+ph);gradient.addColorStop(0,palette[0]);gradient.addColorStop(.55,palette[1]);gradient.addColorStop(1,palette[2]);
  ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=panel.strength/100;ctx.fillStyle=gradient;ctx.fillRect(left,top,pw,ph);
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=panel.strength/100*.13;ctx.fillStyle=palette[0];ctx.fillRect(left,top,pw,ph);ctx.globalAlpha=1;
  const vignette=ctx.createRadialGradient(left+pw*.5,top+ph*.4,pw*.15,left+pw*.5,top+ph*.5,Math.max(pw,ph)*.8);
  vignette.addColorStop(0,'#15122600');vignette.addColorStop(1,'#17112e8c');ctx.fillStyle=vignette;ctx.fillRect(left,top,pw,ph);
  ctx.restore();
}

function drawPalm(ctx,x,y,size,flip=1) {
  ctx.save();ctx.translate(x,y);ctx.scale(size*flip,size);ctx.strokeStyle='#21172d';ctx.fillStyle='#21172d';ctx.lineCap='round';
  ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(0,100);ctx.quadraticCurveTo(14,40,0,0);ctx.stroke();
  for(let i=0;i<7;i++) {
    const angle=-Math.PI+(i/6)*Math.PI;
    const ex=Math.cos(angle)*48,ey=Math.sin(angle)*33;
    ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(ex*.5,ey-15,ex,ey+15);ctx.quadraticCurveTo(ex*.5,ey+1,0,0);ctx.fill();
  }
  ctx.restore();
}

function drawCaptionLettering(ctx,state) {
  const w=state.width,h=state.height,s=Math.min(w,h);
  let text=state.caption.trim().toUpperCase();if(!text)return;
  let lines=text.split(/\n/).filter(Boolean).slice(0,3);
  if(lines.length===1 && text.length>12){const words=text.split(' ');if(words.length>1){let split=1;for(let i=1;i<words.length;i++)if(Math.abs(words.slice(0,i).join(' ').length-text.length/2)<Math.abs(words.slice(0,split).join(' ').length-text.length/2))split=i;lines=[words.slice(0,split).join(' '),words.slice(split).join(' ')];}}
  const maxWidth=w*.86;
  let fontSize=s*.158*state.typeSize/100;
  ctx.font=`900 ${fontSize}px Impact, 'Arial Black', Arial, sans-serif`;
  const widest=Math.max(...lines.map(line=>ctx.measureText(line).width));
  if(widest>maxWidth)fontSize*=maxWidth/widest;
  const lineHeight=fontSize*.92,total=lineHeight*lines.length;
  const center=Math.min(h-total/2-s*.05,Math.max(total/2+s*.05,h*state.typeY/100));
  ctx.save();ctx.translate(w*.5,center);ctx.rotate(-.035);ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
  ctx.font=`900 ${fontSize}px Impact, 'Arial Black', Arial, sans-serif`;
  lines.forEach((line,i)=>{
    const y=(i-(lines.length-1)/2)*lineHeight;
    ctx.lineWidth=s*.027;ctx.strokeStyle='#171321';ctx.strokeText(line,s*.007,y+s*.015);
    ctx.lineWidth=s*.017;ctx.strokeStyle='#171321';ctx.strokeText(line,0,y);
    ctx.lineWidth=s*.004;ctx.strokeStyle='#fff1d4';ctx.strokeText(line,0,y);
    const fill=ctx.createLinearGradient(0,y-fontSize*.5,0,y+fontSize*.5);
    fill.addColorStop(0,i===0?'#fff6dc':'#ffb7c6');fill.addColorStop(1,i===0?'#f4d7ac':'#ed79a5');ctx.fillStyle=fill;ctx.fillText(line,0,y);
  });ctx.restore();
}

export function renderPoster(ctx,state) {
  const w=state.width,h=state.height,s=Math.min(w,h),polygons=panelPolygons(state.layout);
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#181321';ctx.fillRect(0,0,w,h);
  polygons.forEach((polygon,i)=>paintPhotoPanel(ctx,state.panels[i],polygon,w,h));
  ctx.lineWidth=s*.014;ctx.strokeStyle='#171320';ctx.lineJoin='round';
  polygons.forEach(p=>{tracePolygon(ctx,p,w,h);ctx.stroke();});
  ctx.lineWidth=s*.003;ctx.strokeStyle='#ffe7c677';
  ctx.strokeRect(s*.018,s*.018,w-s*.036,h-s*.036);
  if(state.details) {
    // Original screen-print flourishes, never a game logo or borrowed asset.
    ctx.save();ctx.fillStyle='#f6d99c';ctx.strokeStyle='#201729';ctx.lineWidth=s*.003;
    ctx.beginPath();ctx.arc(w*.86,h*.11,s*.055,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.globalAlpha=.45;ctx.fillStyle='#d76e93';for(let i=0;i<5;i++)ctx.fillRect(w*.86-s*.055,h*.11+i*s*.009,s*.11,s*.003);ctx.globalAlpha=1;
    drawPalm(ctx,w*.89,h*.1,s*.0011);drawPalm(ctx,w*.94,h*.15,s*.0008,-1);
    ctx.fillStyle='#fff1d6';ctx.textAlign='left';ctx.font=`700 ${s*.014}px Arial, sans-serif`;ctx.letterSpacing=`${s*.004}px`;
    ctx.fillText('A F T E R   H O U R S   /   O R I G I N A L S',s*.043,s*.053);
    ctx.font=`700 ${s*.011}px Arial, sans-serif`;ctx.fillText('SUN DOWN.  STORY ON.',s*.043,h-s*.045);
    ctx.textAlign='right';ctx.fillText('06  /  THE CITY IS YOURS',w-s*.043,h-s*.045);ctx.restore();
    // Fixed halftone coordinates make repeated exports byte-identical.
    ctx.save();ctx.globalAlpha=.13;ctx.fillStyle='#24192d';
    for(let y=h*.02;y<h*.3;y+=s*.009)for(let x=w*.02;x<w*.2;x+=s*.009){ctx.beginPath();ctx.arc(x,y,s*.0011,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  drawCaptionLettering(ctx,state);
  ctx.strokeStyle='#171320';ctx.lineWidth=s*.018;ctx.strokeRect(0,0,w,h);
}
