const puppeteer = require('puppeteer-core');
const fs = require('fs');
const [,, mode = 'test', angle = 'metal'] = process.argv;
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: [`--use-angle=${angle}`, '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
    protocolTimeout: 600000,
  });
  const page = await browser.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
  page.on('pageerror', e => console.log('pageerror:', e.message));
  await page.goto('file:///Users/dmarcos/Development/vibeferatu/index.html?trailer', { waitUntil: 'networkidle0', timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  console.log('renderer:', await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); const e = gl.getExtension('WEBGL_debug_renderer_info'); return gl.getParameter(e.UNMASKED_RENDERER_WEBGL); }));
  await new Promise(r => setTimeout(r, 1500));
  for (const i of [0, 100, 200, 300, 330, 360]) await page.evaluate(i => window.__trailerStep(i), i);   // compile shaders, warm caches
  const frames = mode === 'test' ? (process.env.FRAMES || '190,215,235,245,252,256').split(',').map(Number) : Array.from({ length: 450 }, (_, i) => i);
  fs.mkdirSync('frames', { recursive: true });
  const t0 = Date.now();
  for (const i of frames) {
    await page.evaluate(i => window.__trailerStep(i), i);
    await page.screenshot({ path: `frames/f${String(i).padStart(4, '0')}.png` });
    if (i % 30 === 0) console.log('frame', i, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }
  if (mode !== 'test') {
    const b64 = await page.evaluate(() => window.__trailerAudio());
    fs.writeFileSync('trailer.wav', Buffer.from(b64, 'base64'));
    console.log('audio written');
  }
  console.log('done in', ((Date.now() - t0) / 1000).toFixed(1), 's');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
