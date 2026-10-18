// Full QA pass: node tests/qa.js  (server on http://127.0.0.1:8765)
const { chromium } = require('playwright');
const fs = require('fs');
const URL = 'http://127.0.0.1:8765/';
const AXE = fs.readFileSync(__dirname + '/axe.min.js', 'utf8');
const SIZES = [
  { n: 'p320', w: 320, h: 568, m: 1 }, { n: 'p360', w: 360, h: 740, m: 1 }, { n: 'p390', w: 390, h: 844, m: 1 },
  { n: 'p412', w: 412, h: 915, m: 1 }, { n: 'p430', w: 430, h: 932, m: 1 }, { n: 'land', w: 844, h: 390, m: 1 },
  { n: 't768', w: 768, h: 1024, m: 1 }, { n: 'd1024', w: 1024, h: 768 }, { n: 'd1366', w: 1366, h: 768 }, { n: 'd1440', w: 1440, h: 900 },
];
const fails = [];
const fail = (where, msg) => { fails.push(where + ': ' + msg); };
process.on('exit', () => { if (fails.length) console.log('\nFAILS SO FAR (' + fails.length + '):\n' + fails.join('\n')); });

async function open(browser, s, theme, extra = '') {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, isMobile: !!s.m, hasTouch: !!s.m, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', e => page.errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') page.errs.push(m.text()); });
  await page.addInitScript(() => {
    window.__cls = 0; window.__shifts = [];
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__shifts.push({ v: e.value, t: e.startTime, src: (e.sources || []).map(s => s.node && (s.node.className || s.node.nodeName)).join('|') }); } }).observe({ type: 'layout-shift', buffered: true });
    window.__wa = []; window.open = (u) => { window.__wa.push(u); return {}; };
  });
  await page.goto(URL + '?nointro&theme=' + theme + extra, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  return { ctx, page };
}

const sv = (page, q) => page.evaluate(q => document.querySelector(q).scrollIntoView({ block: 'center', behavior: 'instant' }), q);
async function revealAll(page) {
  await page.evaluate(async () => {
    const H = document.documentElement.scrollHeight;
    for (let y = 0; y < H; y += Math.round(innerHeight * .7)) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 80)); }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForTimeout(1100);
}

(async () => {
  const browser = await chromium.launch();

  // ---------- static checks at every size and theme ----------
  for (const s of SIZES) for (const theme of ['light', 'dark']) {
    const where = `${s.n}/${theme}`;
    const { ctx, page } = await open(browser, s, theme);
    await revealAll(page);
    const r = await page.evaluate(() => {
      const out = {};
      const de = document.documentElement;
      out.overflow = de.scrollWidth - de.clientWidth;
      const vis = el => { const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return false; if (el.closest('[inert],[hidden],[aria-hidden="true"]')) return false; const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
      // touch targets (inline text links exempt per WCAG 2.5.8)
      out.small = [];
      document.querySelectorAll('a, button, summary, .stars-row label, input, textarea, [role=tab], [role=radio]').forEach(el => {
        if (!vis(el) || el.matches('.tlink, .maker, .skip, input[type=radio]')) return;
        const b = el.getBoundingClientRect();
        if (b.width < 43.5 || b.height < 43.5) out.small.push((el.className.baseVal ?? el.className) + ' "' + el.textContent.trim().slice(0, 20) + '" ' + Math.round(b.width) + 'x' + Math.round(b.height));
      });
      out.inputs = [...document.querySelectorAll('input, textarea, .dd-btn')].filter(vis).map(e => parseFloat(getComputedStyle(e).fontSize)).filter(f => f < 16);
      out.underline = [...document.querySelectorAll('a, button, summary')].filter(e => getComputedStyle(e).textDecorationLine !== 'none').map(e => e.className);
      // sibling consistency
      out.sib = [];
      const groups = [['#careRow', '.card'], ['#pkRow', '.pk'], ['#daysList', '.d-card'], ['#brList', '.br'], ['.contacts', '.ct a'], ['#gal', '.ph'], ['.facts', '.fact'], ['.qa', '.qa-b > span']];
      for (const [g, c] of groups) {
        const box = document.querySelector(g); if (!box || !vis(box)) continue;
        const items = [...box.querySelectorAll(c)].filter(vis);
        if (box.matches('.row') && getComputedStyle(box).overflowX === 'auto') {
          // swipe row: compare untransformed heights
          const hs = items.map(e => e.offsetHeight); if (Math.max(...hs) - Math.min(...hs) > 1) out.sib.push(g + ' heights ' + hs.join(','));
          continue;
        }
        const rows = {};
        items.forEach(e => { const t = Math.round(e.offsetTop + (e.offsetParent ? e.offsetParent.getBoundingClientRect().top : 0)); const b = e.getBoundingClientRect(); const key = Math.round(b.top / 6); (rows[key] = rows[key] || []).push(b); });
        Object.values(rows).forEach(list => {
          const hs = list.map(b => b.height), ts = list.map(b => b.top);
          if (Math.max(...hs) - Math.min(...hs) > 1) out.sib.push(g + ' heights ' + hs.map(Math.round).join(','));
          if (Math.max(...ts) - Math.min(...ts) > 1) out.sib.push(g + ' tops ' + ts.map(Math.round).join(','));
        });
        items.forEach(e => { const b = e.getBoundingClientRect(); [...e.querySelectorAll('*')].forEach(k => { if (!vis(k) || k.closest('svg') !== null && k.tagName !== 'svg') return; const kb = k.getBoundingClientRect(); if (kb.right > b.right + 1.5 || kb.left < b.left - 1.5 || kb.bottom > b.bottom + 1.5) out.sib.push(g + ' child overflow ' + (k.className.baseVal ?? k.className) + ' ' + Math.round(kb.left - b.left) + '/' + Math.round(b.right - kb.right) + '/' + Math.round(b.bottom - kb.bottom)); }); });
      }
      // footers on one line inside package cards
      const pr = [...document.querySelectorAll('#pkRow .pk-btns')].filter(vis).map(e => e.closest('.pk').offsetHeight - (e.offsetTop + e.offsetHeight));
      if (new Set(pr).size > 1) out.sib.push('pk footers ' + pr.join(','));
      out.hidden = [...document.querySelectorAll('.rv, .enter')].filter(e => vis(e) && parseFloat(getComputedStyle(e).opacity) < .99).map(e => e.className).slice(0, 5);
      return out;
    });
    if (r.overflow > 0) fail(where, 'horizontal overflow ' + r.overflow + 'px');
    if (r.small.length) fail(where, 'small targets: ' + r.small.slice(0, 8).join(' | '));
    if (r.inputs.length) fail(where, 'inputs < 16px');
    if (r.underline.length) fail(where, 'underlines: ' + r.underline.join(','));
    if (r.sib.length) fail(where, 'siblings: ' + [...new Set(r.sib)].slice(0, 6).join(' | '));
    if (r.hidden.length) fail(where, 'still hidden after reveal: ' + r.hidden.join(','));
    // hover/focus underline spot check
    const ul = await page.evaluate(async () => {
      const bad = [];
      for (const el of [...document.querySelectorAll('a, button')].slice(0, 60)) { el.focus({ preventScroll: true }); if (getComputedStyle(el).textDecorationLine !== 'none') bad.push(el.className); }
      document.activeElement && document.activeElement.blur(); return bad;
    });
    if (ul.length) fail(where, 'focus underline ' + ul.join(','));
    if (!s.m) { for (const sel of ['.nav a', '.btn.primary', '.chip', '.maker', '.tlink']) { const h = page.locator(sel).first(); if (await h.isVisible()) { await h.hover(); const d = await h.evaluate(e => getComputedStyle(e).textDecorationLine); if (d !== 'none') fail(where, 'hover underline ' + sel); } } }
    // axe (serious + critical)
    if (['p390', 'd1440', 'p320', 't768'].includes(s.n)) {
      await page.addScriptTag({ content: AXE });
      const ax = await page.evaluate(async () => { const res = await axe.run(document, { resultTypes: ['violations'] }); return res.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id + ' x' + v.nodes.length + ' ' + v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' ; ')); });
      if (ax.length) fail(where, 'axe: ' + ax.join(' || '));
    }
    if (page.errs.length) fail(where, 'js errors: ' + page.errs.join(' | '));
    const cls = await page.evaluate(() => window.__cls);
    if (cls > 0.0001) fail(where, 'CLS on load/scroll ' + cls.toFixed(4) + ' ' + JSON.stringify(await page.evaluate(() => window.__shifts.slice(0, 4))));
    await ctx.close();
    process.stdout.write('.');
  }
  console.log('\nstatic checks done');

  // ---------- nothing jumps: positions after every switching block ----------
  for (const s of [SIZES[2], SIZES[9], SIZES[6]]) for (const theme of ['light', 'dark']) {
    const where = `jump ${s.n}/${theme}`;
    const { ctx, page } = await open(browser, s, theme);
    await revealAll(page);
    // layout positions (offsetTop chain): transforms such as bobbing or parallax don't count, layout moves do
    const tops = () => page.evaluate(() => [...document.querySelectorAll('main > section, footer, .facts, .qa, #heroSide, #pkRow, .how, #daysList, #rvForm, #jCap, #brList, #gal')].filter(e => e.offsetParent).map(e => { let y = 0, n = e; while (n) { y += n.offsetTop; n = n.offsetParent; } return e.id || e.className; }).length && [...document.querySelectorAll('main > section, footer, .facts, .qa, #heroSide, #pkRow, .how, #daysList, #rvForm, #jCap, #brList, #gal')].filter(e => e.offsetParent).map(e => { let y = 0, n = e; while (n) { y += n.offsetTop; n = n.offsetParent; } return (e.id || e.className) + '@' + y; }));
    const t0 = await tops();
    await page.evaluate(() => window.__cls = 0);
    // let the journey, days and carousels run a full cycle
    await page.evaluate(q => document.querySelector(q).scrollIntoView({ block: 'center', behavior: 'instant' }), '#journey'); await page.waitForTimeout(300); await page.waitForTimeout(4200 * 1.2);
    await page.evaluate(q => document.querySelector(q).scrollIntoView({ block: 'center', behavior: 'instant' }), '#daysList'); await page.waitForTimeout(300); await page.waitForTimeout(6000);
    await page.evaluate(q => document.querySelector(q).scrollIntoView({ block: 'center', behavior: 'instant' }), '#careRow'); await page.waitForTimeout(300); await page.waitForTimeout(s.m ? 9000 : 500);
    if (s.w <= 760) { await page.locator('#pkSeg [data-i="1"]').click(); await page.waitForTimeout(900); await page.locator('#pkSeg [data-i="0"]').click(); await page.waitForTimeout(900); }
    await page.evaluate(() => window.scrollBy(0, -300)); await page.waitForTimeout(700);
    await page.locator('#themeBtn').click(); await page.waitForTimeout(900); await page.locator('#themeBtn').click(); await page.waitForTimeout(900);
    const t1 = await tops();
    const moved = t0.filter((v, i) => v !== t1[i]).map((v, i) => v + ' -> ' + t1[t0.indexOf(v)]);
    if (moved.length) fail(where, 'moved: ' + JSON.stringify(moved));
    const cls = await page.evaluate(() => [window.__cls, window.__shifts.slice(-4)]);
    if (cls[0] > 0.0001) fail(where, 'CLS during toggles ' + cls[0].toFixed(4) + ' ' + JSON.stringify(cls[1]));
    if (page.errs.length) fail(where, 'js errors: ' + page.errs.join(' | '));
    await ctx.close();
    process.stdout.write('.');
  }
  console.log('\njump checks done');

  // ---------- touch flows on a phone ----------
  {
    const s = SIZES[2], where = 'touch';
    const { ctx, page } = await open(browser, s, 'light');
    const hoverMQ = await page.evaluate(() => matchMedia('(hover: hover)').matches);
    if (hoverMQ) fail(where, 'touch context reports hover:hover');
    // dock appears after the hero, each tab navigates
    await page.evaluate(() => window.scrollTo(0, 1400)); await page.waitForTimeout(700);
    if (!(await page.locator('#dock').evaluate(e => getComputedStyle(e).visibility === 'visible'))) fail(where, 'dock not visible after hero');
    for (const tab of ['packages', 'branches', 'home']) {
      await page.locator(`#dock a[data-tab="${tab}"]`).tap(); await page.waitForTimeout(1300);
      const top = await page.evaluate(id => Math.round(document.getElementById(id).getBoundingClientRect().top), tab);
      if (Math.abs(top - (tab === 'home' ? 0 : 72)) > 90) fail(where, 'dock tab ' + tab + ' landed at ' + top);
    }
    // booking sheet from the dock
    await page.evaluate(() => window.scrollTo(0, 1400)); await page.waitForTimeout(800);
    await page.locator('#bookBtn').tap(); await page.waitForTimeout(700);
    if (!(await page.locator('#bookSheet').evaluate(e => e.classList.contains('open') && getComputedStyle(e).visibility === 'visible'))) fail(where, 'book sheet did not open');
    if (!(await page.evaluate(() => document.documentElement.classList.contains('lock')))) fail(where, 'no scroll lock with sheet');
    await page.locator('#bookChips [data-v="باقة 4 الاقتصادية"]').tap();
    const bw = await page.locator('#bookWa').getAttribute('href');
    if (!bw.startsWith('https://wa.me/966542976755?text=') || !decodeURIComponent(bw).includes('باقة 4')) fail(where, 'book WA link ' + bw);
    await page.locator('#scrim').tap({ position: { x: 20, y: 40 } }); await page.waitForTimeout(700);
    if (await page.locator('#bookSheet').evaluate(e => e.classList.contains('open'))) fail(where, 'book sheet did not close');
    // menu
    await page.evaluate(() => window.scrollBy(0, -300)); await page.waitForTimeout(700);
    await page.locator('#menuBtn').tap(); await page.waitForTimeout(600);
    if (!(await page.locator('#menu').evaluate(e => e.classList.contains('open')))) fail(where, 'menu did not open');
    await page.locator('.menu-nav a[href="#faq"]').tap(); await page.waitForTimeout(1300);
    if (await page.locator('#menu').evaluate(e => e.classList.contains('open'))) fail(where, 'menu did not close on link');
    const ft = await page.evaluate(() => Math.round(document.getElementById('faq').getBoundingClientRect().top));
    if (Math.abs(ft - 72) > 90) fail(where, 'menu link landed at ' + ft);
    // carousel: swipe + autoplay
    await page.evaluate(q => document.querySelector(q).scrollIntoView({ block: 'center', behavior: 'instant' }), '#careRow'); await page.waitForTimeout(300); await page.waitForTimeout(400);
    const a0 = await page.evaluate(() => [...document.querySelectorAll('[data-dots="careRow"] i')].findIndex(d => d.classList.contains('on')));
    await page.evaluate(() => { const r = document.getElementById('careRow'); r.scrollBy({ left: -r.clientWidth * .82, behavior: 'instant' }); r.dispatchEvent(new Event('touchstart')); });
    await page.waitForTimeout(500);
    const a1 = await page.evaluate(() => [...document.querySelectorAll('[data-dots="careRow"] i')].findIndex(d => d.classList.contains('on')));
    if (a1 === a0) fail(where, 'swipe did not change the active card');
    await page.waitForTimeout(12500);
    const a2 = await page.evaluate(() => [...document.querySelectorAll('[data-dots="careRow"] i')].findIndex(d => d.classList.contains('on')));
    if (a2 === a1) fail(where, 'carousel did not rotate on its own');
    // packages segmented
    await page.evaluate(q => document.querySelector(q).scrollIntoView({ block: 'center', behavior: 'instant' }), '#pkSeg'); await page.waitForTimeout(300);
    await page.locator('#pkSeg [data-i="1"]').tap(); await page.waitForTimeout(900);
    const seg = await page.evaluate(() => { const r = document.getElementById('pkRow'), b = r.getBoundingClientRect(), c = document.getElementById('pk-4').getBoundingClientRect(); return Math.abs((c.left + c.width / 2) - (b.left + b.width / 2)); });
    if (seg > 30) fail(where, 'segmented switch did not bring package 4 to centre (' + seg + ')');
    // theme
    await page.evaluate(() => window.scrollBy(0, -300)); await page.waitForTimeout(700);
    await page.locator('#themeBtn').tap(); await page.waitForTimeout(900);
    if (await page.evaluate(() => document.documentElement.dataset.theme) !== 'dark') fail(where, 'theme toggle');
    await page.goto(URL + '?nointro', { waitUntil: 'networkidle' });
    if (await page.evaluate(() => document.documentElement.dataset.theme) !== 'dark') fail(where, 'theme not remembered');
    // review flow: validation then a correct wa.me message
    await page.goto(URL + '?nointro&theme=light', { waitUntil: 'networkidle' });
    await page.evaluate(q => document.querySelector(q).scrollIntoView({ block: 'center', behavior: 'instant' }), '#rvForm'); await page.waitForTimeout(300);
    await page.locator('#rvForm button[type=submit]').tap(); await page.waitForTimeout(300);
    if (!(await page.locator('#toast').evaluate(e => e.classList.contains('on')))) fail(where, 'no validation toast');
    await page.locator('label[for=r5]').tap();
    await page.locator('#rvName').fill('أبو فهد');
    await page.locator('[data-dd="branch"] .dd-btn').tap(); await page.waitForTimeout(600);
    if (!(await page.locator('[data-dd="branch"] .dd-list').evaluate(e => getComputedStyle(e).position === 'fixed' && getComputedStyle(e).visibility === 'visible'))) fail(where, 'dropdown is not a bottom sheet');
    await page.locator('[data-dd="branch"] [data-v="فرع البدائع"]').tap(); await page.waitForTimeout(500);
    await page.locator('[data-dd="season"] .dd-btn').tap(); await page.waitForTimeout(600);
    await page.locator('[data-dd="season"] [data-v="موسم 1447"]').tap(); await page.waitForTimeout(500);
    await page.locator('#rvText').fill('التفويج كان منظم والمشرفين متعاونين');
    const prev = await page.evaluate(() => [document.getElementById('rvLName').textContent, document.getElementById('rvLMeta').textContent, document.querySelectorAll('#rvLStars .i.on').length]);
    if (prev[0] !== 'أبو فهد' || !prev[1].includes('البدائع') || prev[2] !== 5) fail(where, 'live preview ' + JSON.stringify(prev));
    await page.locator('#rvForm button[type=submit]').tap(); await page.waitForTimeout(300);
    const wa = await page.evaluate(() => window.__wa[0] || '');
    const msg = decodeURIComponent(wa.split('text=')[1] || '');
    if (!wa.startsWith('https://wa.me/966542976755?text=') || !msg.includes('5 من 5') || !msg.includes('فرع البدائع') || !msg.includes('موسم 1447') || !msg.includes('أبو فهد')) fail(where, 'review message: ' + msg);
    if (page.errs.length) fail(where, 'js errors: ' + page.errs.join(' | '));
    await ctx.close();
    console.log('touch flows done');
  }

  // ---------- keyboard: dropdown + menu on desktop ----------
  {
    const where = 'keyboard';
    const { ctx, page } = await open(browser, SIZES[9], 'light');
    await page.locator('[data-dd="season"] .dd-btn').focus();
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    const v = await page.locator('[data-dd="season"]').getAttribute('data-value');
    if (v !== 'موسم 1446') fail(where, 'dropdown keyboard pick got ' + v);
    await ctx.close();
  }

  // ---------- motion: intro + at rest + scroll, both themes; reduced motion stays readable ----------
  for (const theme of ['light', 'dark']) for (const s of [SIZES[2], SIZES[9]]) {
    const where = `motion ${s.n}/${theme}`;
    const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, isMobile: !!s.m, hasTouch: !!s.m });
    const page = await ctx.newPage();
    await page.goto(URL + '?intro&theme=' + theme, { waitUntil: 'domcontentloaded' });
    const shots = [];
    for (const t of [300, 1000, 3000]) { await page.waitForTimeout(t - (shots.length ? [300, 1000, 3000][shots.length - 1] : 0)); shots.push(await page.screenshot({ path: `/tmp/claude-0/-home-user/2f4e9c6b-8946-58ff-aeca-a7ac6276653d/scratchpad/shots/m-${s.n}-${theme}-${t}.png` })); }
    if (shots[0].equals(shots[1]) || shots[1].equals(shots[2])) fail(where, 'intro/entrance frames identical');
    const a = await page.screenshot(); await page.waitForTimeout(1500); const b = await page.screenshot();
    if (a.equals(b)) fail(where, 'hero not moving at rest');
    for (const f of [.25, .5, .8]) {
      await page.evaluate(f => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), f); await page.waitForTimeout(900);
      const x = await page.screenshot({ path: `/tmp/claude-0/-home-user/2f4e9c6b-8946-58ff-aeca-a7ac6276653d/scratchpad/shots/m-${s.n}-${theme}-s${f}.png` }); await page.waitForTimeout(1200); const y = await page.screenshot();
      if (x.equals(y)) fail(where, 'nothing moving at scroll ' + f);
    }
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(URL + '?theme=light', { waitUntil: 'networkidle' });
    if (await page.evaluate(() => document.documentElement.classList.contains('intro-on'))) fail('reduced', 'intro played with reduced motion');
    await revealAll(page);
    const hid = await page.evaluate(() => [...document.querySelectorAll('.rv, .enter, .j-st.on')].filter(e => parseFloat(getComputedStyle(e).opacity) < .99).length);
    if (hid) fail('reduced', hid + ' elements not visible');
    await ctx.close();
  }
  console.log('motion done');

  // ---------- glass fallback without backdrop-filter stays readable ----------
  {
    const { ctx, page } = await open(browser, SIZES[9], 'light');
    await page.addStyleTag({ content: '*{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}' });
    await revealAll(page);
    await page.addScriptTag({ content: AXE });
    const ax = await page.evaluate(async () => (await axe.run(document, { runOnly: ['color-contrast'] })).violations.map(v => v.nodes.length + ' ' + v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' ; ')));
    if (ax.length) fail('no-blur', 'contrast: ' + ax.join(' | '));
    await ctx.close();
  }

  // ---------- smoothness: 390 touch, 4x CPU throttle ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(URL + '?nointro', { waitUntil: 'networkidle' });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const fr = await page.evaluate(async () => {
      const times = []; let last = performance.now();
      const H = document.documentElement.scrollHeight - innerHeight;
      await new Promise(res => { const step = () => { const now = performance.now(); times.push(now - last); last = now; window.scrollBy(0, 14); if (scrollY < H - 2) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
      times.sort((a, b) => a - b);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      return { frames: times.length, avgMs: +avg.toFixed(1), p95: +times[Math.floor(times.length * .95)].toFixed(1), slow: times.filter(t => t > 34).length };
    });
    console.log('smoothness @4x CPU:', JSON.stringify(fr), '≈', Math.round(1000 / fr.avgMs), 'fps avg');
    if (fr.avgMs > 22) fail('perf', 'average frame ' + fr.avgMs + 'ms');
    await ctx.close();
  }

  await browser.close();
  if (!fails.length) console.log('\nALL CHECKS PASSED');
})();
