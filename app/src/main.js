import { renderPoster, panelPolygons } from './poster.js';

const $ = id => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');
const query = new URLSearchParams(location.search);
const state = {
  layout: 'collage', selected: 0, caption: 'VICE\nAFTER HOURS', typeSize: 100,
  typeY: 70, details: true, width: 1080, height: 1350,
  panels: Array.from({length:4}, () => ({image:null, zoom:1, x:.5, y:.5, grade:'sunset', strength:60, ink:55})),
};
let guides = true;
let dragging = null;
const sampleImages = {};

function decodePhoto(source) {
  return new Promise((resolve,reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('This image could not be opened. Try a JPEG, PNG or WebP.'));
    image.src = source;
  });
}

function refreshCover() {
  renderPoster(ctx, state);
  const polygon = panelPolygons(state.layout)[state.selected];
  $('guides').setAttribute('viewBox', `0 0 ${state.width} ${state.height}`);
  $('guides').innerHTML = guides && !query.get('shot') && polygon ? `<polygon points="${polygon.map(([x,y])=>`${x*state.width},${y*state.height}`).join(' ')}"/>` : '';
}

function syncPanelControls() {
  const p = state.panels[state.selected];
  $('panel-label').textContent = `PANEL 0${state.selected+1}`;
  $('panel-tabs').innerHTML = panelPolygons(state.layout).map((_,i)=>`<button class="${i===state.selected?'active':''}" data-panel="${i}" aria-pressed="${i===state.selected}">0${i+1}</button>`).join('');
  for (const key of ['zoom','strength','ink']) $(key).value = p[key];
  $('zoom-value').value = `${p.zoom.toFixed(1)}×`;
  $('strength-value').value = `${p.strength}%`;
  $('ink-value').value = `${p.ink}%`;
  document.querySelectorAll('[data-grade]').forEach(b=>{b.classList.toggle('active',b.dataset.grade===p.grade);b.setAttribute('aria-pressed',String(b.dataset.grade===p.grade));});
  refreshCover();
}

function chooseSize(value) {
  const [width,height] = value.split('x').map(Number);
  state.width=width; state.height=height;
  canvas.width=width; canvas.height=height;
  $('dimensions').textContent=`${width} × ${height}`;
  $('size').value=value;
  refreshCover();
}

document.querySelectorAll('[data-layout]').forEach(button=>button.addEventListener('click',()=>{
  state.layout=button.dataset.layout;
  state.selected=Math.min(state.selected,panelPolygons(state.layout).length-1);
  document.querySelectorAll('[data-layout]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
  syncPanelControls();
}));
$('panel-tabs').addEventListener('click',e=>{
  const tab=e.target.closest('[data-panel]');
  if(tab){state.selected=Number(tab.dataset.panel);guides=true;syncPanelControls();}
});
document.querySelectorAll('[data-sample]').forEach(button=>button.addEventListener('click',()=>{
  Object.assign(state.panels[state.selected],{image:sampleImages[button.dataset.sample],zoom:1,x:.5,y:.5});
  $('status').textContent=`${button.dataset.sample==='pier'?'The pier':'Boulevard'} loaded into panel ${state.selected+1}.`;
  syncPanelControls();
}));

async function importFiles(files) {
  let loaded=0;
  for(const file of [...files].slice(0,4)) {
    try {
      const source=await new Promise((resolve,reject)=>{
        const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);
      });
      const image=await decodePhoto(source);
      Object.assign(state.panels[(state.selected+loaded)%panelPolygons(state.layout).length],{image,zoom:1,x:.5,y:.5});
      loaded++;
    } catch(error) {$('status').textContent=error.message || 'Could not read that photo.';}
  }
  if(loaded) $('status').textContent=`${loaded} local photo${loaded>1?'s':''} loaded. Drag to crop; export when ready.`;
  syncPanelControls();
}
$('photo').addEventListener('change',e=>{importFiles(e.target.files);e.target.value='';});
document.querySelector('.upload').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('photo').click();}});
canvas.addEventListener('dragover',e=>e.preventDefault());
canvas.addEventListener('drop',e=>{e.preventDefault();importFiles(e.dataTransfer.files);});
$('fill-all').addEventListener('click',()=>{const image=state.panels[state.selected].image;state.panels.forEach(p=>Object.assign(p,{image,zoom:1,x:.5,y:.5}));syncPanelControls();});
$('reset-crop').addEventListener('click',()=>{Object.assign(state.panels[state.selected],{zoom:1,x:.5,y:.5});syncPanelControls();});
for(const key of ['zoom','strength','ink']) $(key).addEventListener('input',e=>{state.panels[state.selected][key]=Number(e.target.value);syncPanelControls();});
document.querySelectorAll('[data-grade]').forEach(b=>b.addEventListener('click',()=>{state.panels[state.selected].grade=b.dataset.grade;syncPanelControls();}));
$('grade-all').addEventListener('click',()=>{const {grade,strength,ink}=state.panels[state.selected];state.panels.forEach(p=>Object.assign(p,{grade,strength,ink}));refreshCover();$('status').textContent='Colour grade applied to every panel.';});
$('caption').value=state.caption;
$('caption').addEventListener('input',e=>{state.caption=e.target.value;refreshCover();});
$('type-size').addEventListener('input',e=>{state.typeSize=Number(e.target.value);refreshCover();});
$('type-y').addEventListener('input',e=>{state.typeY=Number(e.target.value);refreshCover();});
$('details').addEventListener('change',e=>{state.details=e.target.checked;refreshCover();});
$('size').addEventListener('change',e=>chooseSize(e.target.value));
$('clear-selection').addEventListener('click',()=>{guides=!guides;$('clear-selection').textContent=guides?'Hide guides ↗':'Show guides ↗';refreshCover();});

function pointInPolygon(x,y,polygon) {
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const [xi,yi]=polygon[i], [xj,yj]=polygon[j];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
}
function hitPanel(event) {
  const r=canvas.getBoundingClientRect();
  return panelPolygons(state.layout).findIndex(p=>pointInPolygon((event.clientX-r.left)/r.width,(event.clientY-r.top)/r.height,p));
}
canvas.addEventListener('pointerdown',e=>{
  const index=hitPanel(e);if(index<0)return;
  state.selected=index;guides=true;syncPanelControls();
  const p=state.panels[index];dragging={clientX:e.clientX,clientY:e.clientY,x:p.x,y:p.y};canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
  if(!dragging)return;
  const r=canvas.getBoundingClientRect(),p=state.panels[state.selected];
  p.x=Math.max(0,Math.min(1,dragging.x-(e.clientX-dragging.clientX)/r.width));
  p.y=Math.max(0,Math.min(1,dragging.y-(e.clientY-dragging.clientY)/r.height));refreshCover();
});
for(const name of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(name,()=>dragging=null);
canvas.addEventListener('wheel',e=>{
  e.preventDefault();const index=hitPanel(e);if(index>=0)state.selected=index;
  const p=state.panels[state.selected];p.zoom=Math.max(1,Math.min(3,p.zoom-e.deltaY*.001));syncPanelControls();
},{passive:false});

$('export').addEventListener('click',()=>{
  const button=$('export');button.disabled=true;$('status').textContent='Rendering your full-resolution PNG…';
  canvas.toBlob(blob=>{
    button.disabled=false;
    if(!blob){$('status').textContent='Export failed. Try again.';return;}
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`after-hours-${state.width}x${state.height}.png`;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
    $('status').textContent=`Saved ${state.width} × ${state.height} PNG. Your city, your cover.`;
  },'image/png');
});

async function startStudio() {
  try {
    [sampleImages.boulevard,sampleImages.pier]=await Promise.all(['boulevard','pier'].map(name=>decodePhoto(`./samples/${name}.jpg`)));
    const requested=(query.get('photo')||'boulevard').replace(/^.*\//,'').replace(/\.jpg$/,'');
    const primary=sampleImages[requested]||sampleImages.boulevard;
    state.panels.forEach((p,i)=>{
      p.image=i===1?sampleImages.pier:primary;
      p.zoom=[1.45,1.05,1,1.12][i];p.x=[.12,.55,.54,0][i];p.y=[.72,0,0,.94][i];
      p.grade=i===1?'ocean':'sunset';p.strength=i===1?40:60;
    });
    if(query.has('caption'))state.caption=query.get('caption').replace(/\\n/g,'\n');
    $('caption').value=state.caption;
    if(query.get('shot')==='cover')document.body.classList.add('shot-cover');
    if(['1080x1080','1080x1350','1920x1080'].includes(query.get('size')))chooseSize(query.get('size'));
    syncPanelControls();document.documentElement.dataset.ready='true';
  } catch(error){$('status').textContent=error.message;document.documentElement.dataset.ready='error';}
}
startStudio();
