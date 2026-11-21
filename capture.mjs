import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, resolve, sep } from 'node:path';

// Keep the capture workflow in the entry; Playwright is supplied by the workspace.
const require = createRequire(new URL('../../shots/package.json', import.meta.url));
const { chromium } = require('playwright');
const root = fileURLToPath(new URL('.', import.meta.url));
const app = resolve(root, 'app');
const shots = JSON.parse(await readFile(resolve(root, 'shots.json'), 'utf8'));
const errors = [];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const path = resolve(app, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!path.startsWith(app + sep)) { response.writeHead(403).end(); return; }
    const bytes = await readFile(path);
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
    response.end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  await mkdir(resolve(root, 'screenshots'), { recursive: true });
  for (const shot of [...shots, { name: 'default index.html', query: '/index.html', w: 1280, h: 720 }]) {
    const page = await browser.newPage({ viewport: { width: shot.w, height: shot.h }, deviceScaleFactor: 1 });
    page.on('pageerror', error => errors.push(`${shot.name}: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error') errors.push(`${shot.name}: ${message.text()}`); });
    page.on('requestfailed', request => errors.push(`${shot.name}: ${request.url()} failed`));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${shot.name}: HTTP ${response.status()} ${response.url()}`); });
    await page.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
      errors.push(`${shot.name}: external request ${url}`);
      return route.abort();
    });
    await page.goto(`${origin}/${shot.query.replace(/^\//, '')}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => ['true','error'].includes(document.documentElement.dataset.ready), null, {timeout:20000});
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.ready),'true',`${shot.name}: cover renderer failed to initialise`);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const pixels = await page.locator('#cover').evaluate(canvas => {
      const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      const colors = new Set();
      for (let i = 0; i < data.length; i += 400) colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);
      return colors.size;
    });
    assert.ok(pixels > 100, `${shot.name}: canvas is blank or lacks illustrated detail`);
    if (shot.query.includes('shot=cover')) {
      const expected = new URLSearchParams(shot.query).get('size').split('x').map(Number);
      assert.deepEqual(await page.locator('#cover').evaluate(c => [c.width, c.height]), expected);
      const box = await page.locator('#cover').boundingBox();
      assert.ok(Math.abs(box.width - shot.w) < 1 && Math.abs(box.height - shot.h) < 1, 'Cover must fill capture');
      // Invoke the real export handler and compare its PNG to the displayed canvas.
      const downloadPromise = page.waitForEvent('download');
      await page.locator('#export').evaluate(button => button.click());
      const download = await downloadPromise;
      const png = await readFile(await download.path());
      assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], expected);
      const displayed = await page.locator('#cover').evaluate(c => c.toDataURL('image/png').split(',')[1]);
      assert.deepEqual(png, Buffer.from(displayed, 'base64'), 'Export and preview must match');
    }
    if (shot.name.endsWith('.jpg')) {
      let jpeg;
      for (const quality of [88, 82, 76, 70, 64, 58]) {
        jpeg = await page.screenshot({ type: 'jpeg', quality, animations: 'disabled' });
        if (jpeg.length <= 256 * 1024) break;
      }
      assert.ok(jpeg.length <= 256 * 1024, `${shot.name}: too large`);
      await writeFile(resolve(root, 'screenshots', shot.name), jpeg);
      console.log(`${shot.name}: ${shot.w}x${shot.h}, ${jpeg.length} bytes, ${pixels} sampled colors`);
    }
    await page.close();
  }
  assert.deepEqual(errors, [], 'Browser must have zero errors and no external requests');
  console.log('Four captures and default index.html passed: zero browser errors; local requests only; exported PNGs match canvas.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
