// renders og.jpg and the PNG icons: node tests/assets.js
const { chromium } = require('playwright');
const base = 'http://127.0.0.1:8765/';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.goto(base + 'tests/og.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: 'assets/img/og.jpg', type: 'jpeg', quality: 88 });
  for (const [size, name] of [[180, 'apple-touch-icon.png'], [64, 'favicon.png']]) {
    const q = await b.newPage({ viewport: { width: size, height: size } });
    await q.setContent(`<html><body style="margin:0;background:transparent"><img src="${base}assets/img/favicon.svg" style="width:${size}px;height:${size}px;display:block"></body></html>`);
    await q.waitForTimeout(300);
    await q.screenshot({ path: 'assets/img/' + name, omitBackground: true });
  }
  await b.close();
})();
