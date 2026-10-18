// builds the preview images: node tests/preview.js <outdir>
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';
const URL = 'http://127.0.0.1:8765/';
const go = (page, q) => page.evaluate(q => { const e = document.querySelector(q); window.scrollTo({ top: e.getBoundingClientRect().top + scrollY - 80, behavior: 'instant' }); }, q);
(async () => {
  const b = await chromium.launch();
  for (const theme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.goto(URL + '?nointro&theme=' + theme, { waitUntil: 'networkidle' });
    await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 60)); } scrollTo({ top: 0, behavior: 'instant' }); });
    await p.waitForTimeout(2600);
    const shots = [['hero', null], ['care', '#care'], ['days', '#days'], ['packages', '#packages'], ['branches', '#branches'], ['reviews', '#rvForm'], ['faq', '#faq'], ['contact', '#contact']];
    for (const [n, q] of shots) {
      if (q) { await go(p, q); await p.waitForTimeout(1400); await p.evaluate(() => scrollBy({ top: -1, behavior: 'instant' })); await p.waitForTimeout(500); }
      await p.screenshot({ path: `${OUT}/ph-${theme}-${n}.png` });
    }
    // open states
    await go(p, '#days'); await p.waitForTimeout(600);
    await p.evaluate(() => scrollBy({ top: -40, behavior: 'instant' })); await p.waitForTimeout(600);
    await p.locator('#menuBtn').tap(); await p.waitForTimeout(900);
    await p.screenshot({ path: `${OUT}/ph-${theme}-menu.png` });
    await p.locator('#menuBtn').tap(); await p.waitForTimeout(700);
    await p.locator('#bookBtn').tap(); await p.waitForTimeout(900);
    await p.screenshot({ path: `${OUT}/ph-${theme}-book.png` });
    await p.locator('#scrim').tap({ position: { x: 30, y: 60 } }); await p.waitForTimeout(700);
    await go(p, '#rvForm'); await p.waitForTimeout(800);
    await p.locator('label[for=r4]').tap(); await p.locator('#rvName').fill('أبو عبدالله'); await p.locator('#rvText').fill('التنظيم والتفويج كانوا ممتازين');
    await p.locator('#rvText').blur();
    await p.locator('[data-dd="branch"] .dd-btn').tap(); await p.waitForTimeout(900);
    await p.screenshot({ path: `${OUT}/ph-${theme}-dropdown.png` });
    await ctx.close();
    for (const [w, h, n] of [[1440, 900, 'd1440'], [768, 1024, 't768'], [320, 568, 'p320'], [844, 390, 'land']]) {
      const c2 = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 1000, hasTouch: w < 1000 });
      const q = await c2.newPage();
      await q.goto(URL + '?nointro&theme=' + theme, { waitUntil: 'networkidle' });
      await q.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 50)); } scrollTo({ top: 0, behavior: 'instant' }); });
      await q.waitForTimeout(2600);
      await q.screenshot({ path: `${OUT}/${n}-${theme}-full.png`, fullPage: true });
      await q.screenshot({ path: `${OUT}/${n}-${theme}-top.png` });
      await c2.close();
    }
  }
  await b.close();
})();
