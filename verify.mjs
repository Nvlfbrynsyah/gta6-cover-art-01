import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root=fileURLToPath(new URL('.',import.meta.url));
mkdirSync(join(root,'.verification'),{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
const errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
page.on('request',request=>requests.push(request.url()));
async function open(path='') {
  await page.goto(`http://localhost:8080/${path}`);
  await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
}
const png=()=>page.locator('#cover').evaluate(c=>c.toDataURL('image/png'));
try {
  await open('?shot=editor&photo=boulevard&caption=VICE%5CnAFTER%20HOURS');
  await page.screenshot({path:join(root,'.verification/editor.png')});
  const exportBounds=await page.locator('#export').boundingBox();
  assert.ok(exportBounds.y+exportBounds.height<=1100,'Export should be visible without scrolling the desktop editor');
  const baseline=await png();
  await page.locator('[data-panel="0"]').click();
  const vectorBaseline=await png();
  await page.locator('[data-sample="vignette"]').click();
  assert.equal(await png(),vectorBaseline,'Unassigned supporting panel must already be a vector vignette');
  await page.locator('[data-sample="pier"]').click();
  assert.notEqual(await png(),vectorBaseline,'Explicit photo assignment must replace the vignette');
  await page.locator('[data-sample="vignette"]').click();
  assert.equal(await png(),vectorBaseline,'Restoring a vignette must restore identical pixels');
  assert.equal(baseline,await png(),'Repeated canvas encodes must match');
  for(const layout of ['hero','triptych','grid','collage']) {
    await page.locator(`[data-layout="${layout}"]`).click();
    assert.equal(await page.locator('[data-panel]').count(),['hero','triptych'].includes(layout)?3:4);
  }
  await page.locator('[data-panel="2"]').click();
  const beforeGrade=await png();
  await page.locator('[data-grade="ocean"]').click();
  assert.notEqual(await png(),beforeGrade,'Changing grade should alter the cover');
  await page.locator('[data-sample="pier"]').click();
  const beforeCrop=await png();
  await page.locator('#zoom').fill('1.8');
  assert.notEqual(await png(),beforeCrop,'Zoom should change the selected photo');
  await page.locator('#photo').setInputFiles(join(root,'app/samples/boulevard.jpg'));
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('local photo'));
  await page.locator('#fill-all').click();
  await page.locator('#caption').fill('MIDNIGHT\nRUN');
  await page.locator('#type-size').fill('120');
  await page.locator('#type-y').fill('55');
  await page.locator('#details').uncheck();
  const box=await page.locator('#cover').boundingBox();
  await page.mouse.move(box.x+box.width*.7,box.y+box.height*.3);
  const beforePan=await png();
  await page.mouse.down();await page.mouse.move(box.x+box.width*.62,box.y+box.height*.35,{steps:3});await page.mouse.up();
  assert.notEqual(await png(),beforePan,'Dragging should change crop position');
  for(const size of ['1080x1080','1080x1350','1920x1080']) {
    await page.locator('#size').selectOption(size);
    const [w,h]=size.split('x').map(Number);
    assert.deepEqual(await page.locator('#cover').evaluate(c=>[c.width,c.height]),[w,h]);
    const pending=page.waitForEvent('download');await page.locator('#export').click();
    const download=await pending;
    const destination=join(root,'.verification',download.suggestedFilename());
    await download.saveAs(destination);
    const bytes=readFileSync(destination);
    assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');
    assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[w,h]);
    const second=page.waitForEvent('download');await page.locator('#export').click();
    const again=await second;
    assert.deepEqual(readFileSync(await again.path()),bytes,'Two PNG downloads must have identical bytes');
  }
  await open('?shot=cover&photo=boulevard&caption=VICE%5CnAFTER%20HOURS&size=1920x1080');
  await page.setViewportSize({width:1280,height:720});
  await page.screenshot({path:join(root,'.verification/wide.png')});
  assert.equal(await page.locator('.controls').isVisible(),false);
  const shot=await png();
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
  assert.equal(await png(),shot,'Reloading the hook should produce identical pixels');
  await open('?shot=cover&photo=pier.jpg&caption=OCEAN%5CnDRIVE&size=1080x1080');
  await page.setViewportSize({width:900,height:900});
  await page.screenshot({path:join(root,'.verification/square.png')});
  await open();
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Mobile must not overflow horizontally');
  assert.deepEqual(errors,[],'No browser errors');
  assert.equal(requests.every(url=>url.startsWith('http://localhost:8080/')||url.startsWith('data:')),true,'No remote requests');
  const walk=(dir)=>readdirSync(dir).flatMap(name=>{const path=join(dir,name),stats=statSync(path);return stats.isDirectory()?[{path,bytes:0},...walk(path)]:[{path,bytes:stats.size}];});
  const files=walk(join(root,'app'));
  const total=files.reduce((sum,file)=>sum+file.bytes,0);
  assert.ok(files.length<=993&&total<=50331648);
  assert.ok(statSync(join(root,'app/index.html')).size<=1048576);
  assert.ok(files.every(f=>Buffer.byteLength(f.path.slice(root.length))<=1000));
  console.log(JSON.stringify({browser:'Chromium',errors,requests:'local only',layouts:4,pngSizes:3,deterministic:true,appEntries:files.length,appBytes:total,hooks:'cover + editor',mobile:'390px verified'},null,2));
} finally {await browser.close();}
