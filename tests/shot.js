// quick visual pass: node tests/shot.js [outdir]
const { chromium, devices } = require('playwright');
const OUT = process.argv[2] || 'shots';
const URL = 'http://127.0.0.1:8765/';
(async () => {
  const browser = await chromium.launch();
  const runs = [
    { name: 'desk-light', vp: { width: 1440, height: 900 }, theme: 'light' },
    { name: 'desk-dark', vp: { width: 1440, height: 900 }, theme: 'dark' },
    { name: 'phone-light', vp: { width: 390, height: 844 }, theme: 'light', mobile: true },
    { name: 'phone-dark', vp: { width: 390, height: 844 }, theme: 'dark', mobile: true },
  ];
  for (const r of runs) {
    const ctx = await browser.newContext({ viewport: r.vp, deviceScaleFactor: r.mobile ? 2 : 1, isMobile: !!r.mobile, hasTouch: !!r.mobile });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await page.goto(URL + '?nointro&theme=' + r.theme, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${OUT}/${r.name}-top.png` });
    // full page after forcing all reveals
    await page.evaluate(() => document.querySelectorAll('.rv').forEach(e => e.classList.add('in')));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${OUT}/${r.name}-full.png`, fullPage: true });
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth, document.documentElement.scrollHeight]);
    console.log(r.name, 'scrollW/innerW/H', w.join('/'), errs.length ? errs : 'no errors');
    await ctx.close();
  }
  await browser.close();
})();
