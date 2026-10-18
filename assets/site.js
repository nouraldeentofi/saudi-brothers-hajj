(function(){
  'use strict';

  // ---------- CONFIG: كل بيانات التواصل هون. القيمة الفاضية بتخفي العنصر ----------
  var CONFIG = {
    WA: '966542976755',                 // واتساب (بدون + وبدون صفر)
    PHONE: '+966542976755',             // زر الاتصال
    PHONE2: '+966558199986',            // الجوال الثاني
    LANDLINE: '',                       // الثابت: ناقص مفتاح المنطقة، يظهر لما ينعبى
    EMAIL: 'hajj@saudibrothers.com',
    NUSUK_URL: 'https://www.nusuk.sa/', // رابط الحجز الرسمي (أو رابط باقاتهم على نسك لما يوصل)
    BASE_URL: 'https://nouraldeentofi.github.io/saudi-brothers-hajj/',
    MAKER: 'https://nouraldeentofi.com'
  };

  var $ = function(s, r){ return (r || document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var mm = function(q){ return window.matchMedia ? matchMedia(q) : { matches:false, addEventListener:function(){} }; };
  var reduce = mm('(prefers-reduced-motion: reduce)').matches;
  var mqPhone = mm('(max-width: 760px)');
  var mqMenu = mm('(max-width: 1099px)');
  var scrollFX = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()'));
  function on(mq, fn){ if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn); }
  function waLink(text){ return 'https://wa.me/' + CONFIG.WA + (text ? '?text=' + encodeURIComponent(text) : ''); }
  function hide(el){ el.hidden = true; el.style.display = 'none'; }

  // ---------- apply CONFIG to every link ----------
  $$('[data-wa]').forEach(function(a){ if (!CONFIG.WA) return hide(a.closest('li') || a); a.href = waLink(a.getAttribute('data-wa')); });
  $$('[data-tel]').forEach(function(a){ if (!CONFIG.PHONE) return hide(a); a.href = 'tel:' + CONFIG.PHONE; });
  $$('[data-tel2]').forEach(function(a){ if (!CONFIG.PHONE2) return hide(a.closest('li') || a); a.href = 'tel:' + CONFIG.PHONE2; });
  $$('[data-mail]').forEach(function(a){ if (!CONFIG.EMAIL) return hide(a.closest('li') || a); a.href = 'mailto:' + CONFIG.EMAIL; });
  $$('[data-nusuk]').forEach(function(a){ if (!CONFIG.NUSUK_URL) return hide(a); a.href = CONFIG.NUSUK_URL; });
  $$('[data-maker]').forEach(function(a){ a.href = CONFIG.MAKER; });

  var toastEl = $('#toast'), toastT = 0;
  function toast(msg){ toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function(){ toastEl.classList.remove('on'); }, 3200); }

  // ---------- opening ----------
  var intro = $('#intro');
  function ready(){ root.classList.add('ready'); }
  if (intro && root.classList.contains('intro-on')) {
    var ended = false, timers = [];
    var end = function(){ if (ended) return; ended = true; timers.forEach(clearTimeout); ready(); root.classList.remove('intro-on'); intro.hidden = true; };
    timers.push(setTimeout(function(){ intro.classList.add('open'); }, 1950));
    timers.push(setTimeout(ready, 2150));
    timers.push(setTimeout(end, 3050));
    var skip = function(){ if (ended) return; timers.forEach(clearTimeout); ready(); intro.classList.add('skip'); setTimeout(end, 380); };
    intro.addEventListener('click', skip);
    document.addEventListener('keydown', function k(e){ if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { skip(); document.removeEventListener('keydown', k); } });
  } else {
    if (intro) intro.hidden = true;
    ready();
  }

  // ---------- theme: a circle of the new theme grows out of the button ----------
  var themeBtn = $('#themeBtn'), themeMeta = $('meta[name="theme-color"]');
  function setTheme(t){
    root.setAttribute('data-theme', t);
    themeBtn.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
    themeBtn.setAttribute('aria-label', t === 'dark' ? 'تبديل للوضع الفاتح' : 'تبديل للوضع الداكن');
    if (themeMeta) themeMeta.setAttribute('content', t === 'dark' ? '#0b1613' : '#f6f1e7');
    try { localStorage.setItem('sb-theme', t); } catch (e) {}
  }
  setTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  themeBtn.addEventListener('click', function(){
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    if (!document.startViewTransition || reduce) return setTheme(next);
    var r = themeBtn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    var R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    var vt = document.startViewTransition(function(){ setTheme(next); });
    vt.ready.then(function(){
      root.animate({ clipPath:['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + R + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration:700, easing:'cubic-bezier(.2,.8,.2,1)', pseudoElement:'::view-transition-new(root)' });
    }).catch(function(){});
  });

  // ---------- header: glass after the first scroll, hides on the way down (phones) ----------
  var top = $('#top'), lastY = window.scrollY, ticking = false, progress = $('#progress'), revealPass = function(){};
  var heroIn = $('#heroIn'), heroSide = $('#heroSide'), scene = $('.scene');
  function onScroll(){
    ticking = false;
    var y = window.scrollY;
    top.classList.toggle('scrolled', y > 10);
    if (mqPhone.matches && !root.classList.contains('lock')) {
      if (y > lastY + 6 && y > 160) top.classList.add('away');
      else if (y < lastY - 6 || y < 160) top.classList.remove('away');
    } else top.classList.remove('away');
    lastY = y;
    if (!scrollFX && !reduce) {
      // fallback for browsers without scroll-driven animations
      var h = document.documentElement.scrollHeight - innerHeight;
      progress.style.setProperty('--p', h > 0 ? Math.min(1, y / h) : 0);
      var k = Math.min(1, y / (innerHeight * .85));
      if (!mqPhone.matches) [heroIn, heroSide].forEach(function(el){ el.style.translate = '0 ' + (-70 * k) + 'px'; el.style.opacity = 1 - k; });
      if (scene) scene.style.translate = '0 ' + (70 * Math.min(1, y / innerHeight)) + 'px';
    }
    daysOnScroll();
    revealPass();
  }
  window.addEventListener('scroll', function(){ if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive:true });

  // ---------- full-screen menu (tablet + phone) ----------
  var menu = $('#menu'), menuBtn = $('#menuBtn');
  $$('.menu-nav a').forEach(function(a, i){ a.style.setProperty('--i', i); });
  function lock(onOff){ root.classList.toggle('lock', onOff); }
  function setMenu(open){
    menu.classList.toggle('open', open);
    menu.inert = !open;
    root.classList.toggle('menu-open', open);
    lock(open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
    if (open) { top.classList.remove('away'); setTimeout(function(){ var f = $('.menu-nav a', menu); if (f) f.focus({ preventScroll:true }); }, 60); }
  }
  menuBtn.addEventListener('click', function(){ setMenu(!menu.classList.contains('open')); });
  $$('a', menu).forEach(function(a){ a.addEventListener('click', function(){ setMenu(false); }); });
  on(mqMenu, function(){ if (!mqMenu.matches && menu.classList.contains('open')) setMenu(false); });

  // ---------- bottom sheets (booking + dropdowns on phones) ----------
  var scrim = $('#scrim'), openSheet = null, sheetReturn = null;
  function showSheet(sh, from){
    if (openSheet) closeSheet();
    openSheet = sh; sheetReturn = from || null;
    sh.inert = false; sh.classList.add('open'); scrim.classList.add('on'); lock(true);
    setTimeout(function(){ var f = $('a, button:not([data-close])', sh); if (f) f.focus({ preventScroll:true }); }, 80);
  }
  function closeSheet(){
    if (!openSheet) return;
    var sh = openSheet; openSheet = null;
    sh.classList.remove('open'); sh.style.removeProperty('--drag'); sh.inert = true;
    scrim.classList.remove('on'); lock(false);
    if (sheetReturn) sheetReturn.focus({ preventScroll:true });
  }
  scrim.addEventListener('click', function(){ closeSheet(); closeDropdowns(); });
  $$('[data-close]').forEach(function(b){ b.addEventListener('click', closeSheet); });
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Escape') return;
    if (openSheet) closeSheet();
    else if (menu.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
  });
  // drag the booking sheet down to close it
  var book = $('#bookSheet');
  (function(){
    var y0 = 0, dy = 0, dragging = false;
    book.addEventListener('touchstart', function(e){ if (e.target.closest('a, button')) return; y0 = e.touches[0].clientY; dy = 0; dragging = true; book.classList.add('dragging'); }, { passive:true });
    book.addEventListener('touchmove', function(e){ if (!dragging) return; dy = Math.max(0, e.touches[0].clientY - y0); book.style.setProperty('--drag', dy + 'px'); }, { passive:true });
    book.addEventListener('touchend', function(){ if (!dragging) return; dragging = false; book.classList.remove('dragging'); if (dy > 90) closeSheet(); else book.style.removeProperty('--drag'); });
  })();
  var bookBtn = $('#bookBtn'), bookWa = $('#bookWa'), bookChips = $$('#bookChips [role=radio]');
  function bookMsg(){
    var sel = bookChips.filter(function(b){ return b.getAttribute('aria-checked') === 'true'; })[0], v = sel ? sel.getAttribute('data-v') : '';
    bookWa.href = waLink('السلام عليكم، أبي أستفسر عن ' + (v ? '«' + v + '»' : 'باقات الحج') + ' لموسم 1448');
  }
  bookChips.forEach(function(b, i){
    b.addEventListener('click', function(){ bookChips.forEach(function(x){ x.setAttribute('aria-checked', x === b ? 'true' : 'false'); }); bookMsg(); });
    b.addEventListener('keydown', function(e){
      var d = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0;   // RTL: left is "next"
      if (!d) return; e.preventDefault(); var n = bookChips[(i + d + bookChips.length) % bookChips.length]; n.focus(); n.click();
    });
  });
  if (CONFIG.WA) bookMsg(); else hide(bookWa);
  bookBtn.addEventListener('click', function(){ showSheet(book, bookBtn); });

  // ---------- reveal on scroll ----------
  function stagger(sel){
    $$(sel).forEach(function(g){ Array.prototype.forEach.call(g.children, function(c, i){ c.style.setProperty('--rd', (i % 6) * 90 + 'ms'); }); });
  }
  if (!mqPhone.matches) {
    $$('#careRow > *, #pkRow > *').forEach(function(c){ c.classList.add('rv'); });
  } else {
    $$('#careRow, .pk-grid').forEach(function(c){ c.classList.add('rv'); });
  }
  stagger('#careRow, #pkRow, #daysList, #brList, .contacts, #gal, .faq');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin:'0px 0px -8% 0px' });
    $$('.rv').forEach(function(el){ io.observe(el); });
    // a fast fling can jump an element from below the screen to above it between two frames;
    // anything already passed gets revealed too
    var pending = $$('.rv'), lastPass = 0;
    revealPass = function(){
      var now = performance.now(); if (now - lastPass < 120 || !pending.length) return; lastPass = now;
      pending = pending.filter(function(el){ if (el.classList.contains('in')) return false; if (el.getBoundingClientRect().top < innerHeight) { el.classList.add('in'); io.unobserve(el); return false; } return true; });
    };
    // pause decorative motion while it's off screen
    var pio = new IntersectionObserver(function(es){ es.forEach(function(e){ e.target.classList.toggle('off', !e.isIntersecting); }); });
    $$('#stage, #packages, .end-card, #gal, .br-map').forEach(function(el){ pio.observe(el); });
  } else $$('.rv').forEach(function(el){ el.classList.add('in'); });

  // ---------- numbers count up when they appear ----------
  // padded with figure spaces so the number keeps one width while it counts (nothing beside it moves)
  function pad(n, len){ n = String(n); while (n.length < len) n = '\u2007' + n; return n; }
  function countUp(el, to){
    var len = String(to).length;
    if (reduce) { el.textContent = to; return; }
    var t0 = 0, dur = 1400;
    (function f(t){ if (!t0) t0 = t; var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = p < 1 ? pad(Math.round(to * e), len) : String(to); if (p < 1) requestAnimationFrame(f); })(performance.now());
  }
  function whenSeen(el, fn){
    if (!('IntersectionObserver' in window)) return fn();
    var o = new IntersectionObserver(function(es){ if (es[0].isIntersecting) { o.disconnect(); setTimeout(fn, root.classList.contains('ready') ? 0 : 2000); } }, { threshold:.6 });
    o.observe(el);
  }
  $$('[data-count]').forEach(function(el){ var to = +el.getAttribute('data-count'); el.textContent = reduce ? to : 0; whenSeen(el, function(){ countUp(el, to); }); });

  // ---------- live Hijri countdown to the Day of Arafah (Umm al-Qura calendar) ----------
  (function(){
    var dEl = $('[data-days]'), yEl = $('[data-hyear]');
    if (!dEl) return;
    var fmt;
    try { fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone:'Asia/Riyadh', year:'numeric', month:'numeric', day:'numeric' }); } catch (e) { return; }
    function hijri(d){ var p = {}; fmt.formatToParts(d).forEach(function(x){ p[x.type] = x.value; }); return { y:parseInt(p.year, 10), m:parseInt(p.month, 10), d:parseInt(p.day, 10) }; }
    var now = new Date(), h = hijri(now);
    if (!(h.y > 1400)) return;
    var ty = (h.m < 12 || (h.m === 12 && h.d <= 9)) ? h.y : h.y + 1, days = -1;
    for (var i = 0; i < 400; i++) { var q = hijri(new Date(now.getTime() + i * 864e5)); if (q.y === ty && q.m === 12 && q.d === 9) { days = i; break; } }
    if (days < 0) return;
    yEl.textContent = ty;
    dEl.setAttribute('data-to', days);
    dEl.textContent = reduce ? days : pad(0, String(days).length);
    whenSeen(dEl, function(){ countUp(dEl, days); });
  })();

  // ---------- journey card: the marker travels Al-Qassim → Makkah → the holy sites ----------
  (function(){
    var path = $('#jTrace'), mark = $('#jMark'), card = $('#journey');
    if (!path || !path.getTotalLength) return;
    var caps = $$('.j-st', card), bars = $$('#jProg i'), L = path.getTotalLength();
    var STOPS = [[276, 34], [58, 128], [112, 140], [212, 156], [162, 176], [112, 140]];
    var lens = [], from = 0;
    STOPS.forEach(function(p, k){
      if (k === STOPS.length - 1) { lens.push(L); return; }
      var best = from, bd = 1e9;
      for (var s = from; s <= L; s += 1) { var q = path.getPointAtLength(s), d = (q.x - p[0]) * (q.x - p[0]) + (q.y - p[1]) * (q.y - p[1]); if (d < bd) { bd = d; best = s; } if (d > bd + 900 && bd < 4) break; }
      lens.push(best); from = best + 2;
    });
    path.style.strokeDasharray = L; path.style.strokeDashoffset = L;
    var DWELL = 2600, TRAVEL = 1500, idx = 0, phase = 'dwell', t0 = 0, cur = 0, visible = false, raf = 0;
    card.style.setProperty('--dwell', DWELL + 'ms');
    function place(len){
      cur = len; var p = path.getPointAtLength(len);
      mark.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')');
      path.style.strokeDashoffset = (L - len).toFixed(1);
    }
    function show(i){
      caps.forEach(function(c, k){ c.classList.toggle('on', k === i); });
      bars.forEach(function(b, k){ b.classList.toggle('done', k < i); b.classList.remove('on'); });
      if (bars[i]) { void bars[i].offsetWidth; bars[i].classList.add('on'); }
    }
    function ease(x){ return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
    function tick(t){
      raf = 0;
      if (!visible) return;
      if (!t0) t0 = t;
      var el = t - t0;
      if (phase === 'dwell' && el >= (idx === STOPS.length - 1 ? DWELL + 900 : DWELL)) {
        t0 = t; el = 0;
        if (idx === STOPS.length - 1) { idx = 0; place(lens[0]); show(0); }
        else phase = 'travel';
      }
      if (phase === 'travel') {
        var a = lens[idx], b = lens[idx + 1], k = Math.min(1, el / TRAVEL);
        place(a + (b - a) * ease(k));
        if (k >= 1) { idx++; phase = 'dwell'; t0 = t; show(idx); }
      }
      raf = requestAnimationFrame(tick);
    }
    place(lens[0]); show(0);
    if (reduce) { place(L); return; }
    function resume(){ if (visible && !raf) { t0 = 0; bars[idx] && bars[idx].classList.remove('on'); show(idx); raf = requestAnimationFrame(tick); } }
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ visible = es[0].isIntersecting && !document.hidden; resume(); }, { threshold:.25 }).observe(card);
    document.addEventListener('visibilitychange', function(){ visible = !document.hidden && visible; if (!document.hidden) { visible = true; resume(); } });
  })();

  // ---------- the bus on the branches map ----------
  (function(){
    var path = $('#mRoute'), bus = $('#mBus');
    if (!path || !path.getTotalLength || reduce) return;
    var L = path.getTotalLength(), t0 = 0, raf = 0, vis = false, DUR = 6500;
    function f(t){
      raf = 0; if (!vis) return; if (!t0) t0 = t;
      var k = ((t - t0) % (DUR + 900)) / DUR, p = path.getPointAtLength(Math.min(1, k) * L);
      bus.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')');
      bus.style.opacity = k > 1 ? 0 : k < .06 ? k / .06 : k > .94 ? (1 - k) / .06 : 1;
      raf = requestAnimationFrame(f);
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ vis = es[0].isIntersecting; if (vis && !raf) raf = requestAnimationFrame(f); }).observe(path.ownerSVGElement);
  })();

  // ---------- Hajj days: desktop highlights each day in turn, phones follow the scroll ----------
  var daysList = $('#daysList'), dayItems = daysList ? $$('.day', daysList) : [], dayNow = -1, daysVis = false;
  function setDay(i){
    if (i === dayNow) return; dayNow = i;
    dayItems.forEach(function(d, k){ d.classList.toggle('now', k === i); d.classList.toggle('past', k < i); });
    if (!mqPhone.matches) daysList.style.setProperty('--dp', dayItems.length > 1 ? i / (dayItems.length - 1) : 0);
  }
  function daysOnScroll(){
    if (!daysList || !mqPhone.matches || !daysVis) return;
    var r = daysList.getBoundingClientRect(), c = innerHeight * .55;
    daysList.style.setProperty('--dp', Math.max(0, Math.min(1, (c - r.top) / r.height)).toFixed(3));
    var best = 0, bd = 1e9;
    dayItems.forEach(function(d, k){ var b = d.getBoundingClientRect(), m = Math.abs(b.top + b.height / 2 - c); if (m < bd) { bd = m; best = k; } });
    setDay(best);
  }
  if (daysList) {
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ daysVis = es[0].isIntersecting; if (daysVis) daysOnScroll(); }).observe(daysList);
    setInterval(function(){ if (!daysVis || mqPhone.matches || reduce || document.hidden) return; setDay((dayNow + 1) % dayItems.length); }, 2600);
    setDay(0);
  }

  // ---------- swipe rows (phones): centred card is larger, dots follow, care row rotates on its own ----------
  $$('[data-row]').forEach(function(row){
    var items = Array.prototype.slice.call(row.children), dotsBox = $('[data-dots="' + row.id + '"]'), dots = [], active = -1, lastTouch = 0, rtick = false;
    if (dotsBox) { items.forEach(function(){ var d = document.createElement('i'); dotsBox.appendChild(d); dots.push(d); }); }
    function setActive(i){
      if (i === active) return; active = i;
      dots.forEach(function(d, k){ d.classList.toggle('on', k === i); });
      row.dispatchEvent(new CustomEvent('rowchange', { detail:i }));
    }
    function update(){
      rtick = false;
      if (!mqPhone.matches) { items.forEach(function(el){ el.style.removeProperty('--f'); }); return; }
      var r = row.getBoundingClientRect(), c = r.left + r.width / 2, best = 0, bd = 1e9;
      items.forEach(function(el, i){
        var b = el.getBoundingClientRect(), dist = Math.abs(b.left + b.width / 2 - c);
        el.style.setProperty('--f', Math.max(0, 1 - dist / (b.width * 1.05)).toFixed(3));
        if (dist < bd) { bd = dist; best = i; }
      });
      setActive(best);
    }
    row.goTo = function(i, smooth){
      var el = items[i]; if (!el) return;
      var r = row.getBoundingClientRect(), b = el.getBoundingClientRect();
      row.scrollTo({ left: row.scrollLeft + (b.left + b.width / 2) - (r.left + r.width / 2), behavior: smooth === false || reduce ? 'auto' : 'smooth' });
    };
    row.addEventListener('scroll', function(){ if (!rtick) { rtick = true; requestAnimationFrame(update); } }, { passive:true });
    ['touchstart', 'pointerdown', 'wheel'].forEach(function(ev){ row.addEventListener(ev, function(){ lastTouch = Date.now(); }, { passive:true }); });
    // a swipe row is a scrollable region, so it must be reachable from the keyboard
    function focusable(){ if (mqPhone.matches) { row.tabIndex = 0; row.setAttribute('role', 'region'); row.setAttribute('aria-label', row.getAttribute('data-label') || 'بطاقات قابلة للسحب'); } else { row.removeAttribute('tabindex'); row.removeAttribute('role'); row.removeAttribute('aria-label'); } }
    focusable(); on(mqPhone, function(){ focusable(); update(); }); window.addEventListener('resize', update);
    update();
    if (row.hasAttribute('data-auto') && !reduce) {
      var vis = false;
      if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ vis = es[0].intersectionRatio > .6; }, { threshold:[0, .6, 1] }).observe(row);
      setInterval(function(){
        if (!vis || !mqPhone.matches || document.hidden || Date.now() - lastTouch < 7000 || root.classList.contains('lock')) return;
        row.goTo((active + 1) % items.length);
      }, 4200);
    }
  });

  // packages: segmented switch + swipe stay in sync
  (function(){
    var seg = $('#pkSeg'), row = $('#pkRow');
    if (!seg || !row) return;
    var tabs = $$('[role=tab]', seg);
    function mark(i){ seg.style.setProperty('--si', i); tabs.forEach(function(t, k){ t.setAttribute('aria-selected', k === i ? 'true' : 'false'); t.tabIndex = k === i ? 0 : -1; }); }
    tabs.forEach(function(t, i){
      t.addEventListener('click', function(){ mark(i); row.goTo(i); });
      t.addEventListener('keydown', function(e){ var d = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0; if (!d) return; e.preventDefault(); var n = (i + d + tabs.length) % tabs.length; tabs[n].focus(); tabs[n].click(); });
    });
    row.addEventListener('rowchange', function(e){ mark(e.detail); });
    mark(0);
  })();

  // ---------- custom dropdowns (bottom sheets on phones) ----------
  var dds = [];
  function closeDropdowns(except){ dds.forEach(function(d){ if (d !== except) d.close(); }); }
  $$('.dd').forEach(function(dd, n){
    var btn = $('.dd-btn', dd), list = $('.dd-list', dd), opts = $$('[role=option]', list), val = $('.dd-v', dd), act = -1, sel = -1;
    opts.forEach(function(o, i){ o.id = 'dd' + n + 'o' + i; });
    function setAct(i){ act = i; opts.forEach(function(o, k){ o.classList.toggle('act', k === i); }); if (opts[i]) list.setAttribute('aria-activedescendant', opts[i].id); }
    // the moving highlight only shows for keyboard users; a tap shows the chosen option alone
    list.addEventListener('keydown', function(){ list.classList.add('kbd'); });
    list.addEventListener('pointerdown', function(){ list.classList.remove('kbd'); });
    var api = {
      open: function(){
        closeDropdowns(api); dd.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
        if (mqPhone.matches) { scrim.classList.add('on'); lock(true); }
        setAct(sel >= 0 ? sel : 0); list.focus({ preventScroll:true });
      },
      close: function(focusBtn){
        if (!dd.classList.contains('open')) return;
        dd.classList.remove('open'); btn.setAttribute('aria-expanded', 'false');
        if (!openSheet) { scrim.classList.remove('on'); lock(false); }
        if (focusBtn) btn.focus({ preventScroll:true });
      },
      pick: function(i){
        sel = i; opts.forEach(function(o, k){ o.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
        val.textContent = opts[i].textContent.trim(); val.classList.remove('empty');
        dd.setAttribute('data-value', opts[i].getAttribute('data-v'));
        dd.dispatchEvent(new Event('change', { bubbles:true }));
      }
    };
    dds.push(api);
    btn.addEventListener('click', function(){ dd.classList.contains('open') ? api.close(true) : api.open(); });
    btn.addEventListener('keydown', function(e){ if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); api.open(); } });
    opts.forEach(function(o, i){ o.addEventListener('click', function(){ api.pick(i); api.close(true); }); });
    list.addEventListener('keydown', function(e){
      if (e.key === 'ArrowDown') { e.preventDefault(); setAct(Math.min(opts.length - 1, act + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setAct(Math.max(0, act - 1)); }
      else if (e.key === 'Home') { e.preventDefault(); setAct(0); }
      else if (e.key === 'End') { e.preventDefault(); setAct(opts.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (act >= 0) api.pick(act); api.close(true); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); api.close(true); }
      else if (e.key === 'Tab') api.close(false);
    });
  });
  document.addEventListener('pointerdown', function(e){ if (!e.target.closest('.dd')) closeDropdowns(); });

  // ---------- review form: live preview, sent on WhatsApp ----------
  (function(){
    var form = $('#rvForm');
    if (!form) return;
    var labels = $$('.stars-row label', form), inputs = $$('.stars-row input', form), word = $('#rvWord');
    var WORDS = ['اختر', 'ضعيفة', 'مقبولة', 'جيدة', 'جيدة جدًا', 'ممتازة'];
    var name = $('#rvName'), text = $('#rvText'), live = $('#rvLive');
    var lName = $('#rvLName'), lMeta = $('#rvLMeta'), lText = $('#rvLText'), ava = $('#rvAva'), lStars = $$('#rvLStars .i');
    var ddB = $('[data-dd="branch"]'), ddS = $('[data-dd="season"]');
    function rate(){ var c = inputs.filter(function(i){ return i.checked; })[0]; return c ? +c.value : 0; }
    function paint(n, pop){
      labels.forEach(function(l, k){ l.classList.toggle('on', k < n); if (pop && k < n) { l.classList.remove('pop'); void l.offsetWidth; l.classList.add('pop'); } });
      word.textContent = WORDS[n];
    }
    function preview(){
      var nm = name.value.trim(), tx = text.value.trim(), r = rate();
      lName.textContent = nm || 'اسمك';
      ava.textContent = nm ? nm.charAt(0) : 'ح';
      var meta = [ddB.getAttribute('data-value'), ddS.getAttribute('data-value')].filter(Boolean).join(' · ');
      lMeta.textContent = meta || 'فرعك · موسمك';
      lText.textContent = tx || 'اكتب تجربتك، وتشوفها هنا وأنت تكتب.';
      live.classList.toggle('empty', !tx);
      lStars.forEach(function(s, k){ s.classList.toggle('on', k < r); });
      $('#rvLStars').setAttribute('aria-label', r ? 'التقييم ' + r + ' من 5' : 'التقييم');
    }
    inputs.forEach(function(inp){ inp.addEventListener('change', function(){ paint(rate(), true); preview(); }); });
    labels.forEach(function(l, k){
      l.addEventListener('mouseenter', function(){ if (mm('(hover: hover)').matches) paint(k + 1); });
      l.addEventListener('mouseleave', function(){ paint(rate()); });
    });
    [name, text].forEach(function(f){ f.addEventListener('input', preview); });
    name.addEventListener('keydown', function(e){ if (e.key === 'Enter') { e.preventDefault(); $('.dd-btn', ddB).focus(); } });
    form.addEventListener('change', preview);
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var r = rate();
      if (!r) { toast('اختر تقييمك بالنجوم أول'); inputs[4].focus(); return; }
      if (text.value.trim().length < 3) { toast('اكتب لنا كلمتين عن تجربتك'); text.focus(); return; }
      var lines = ['السلام عليكم، هذا تقييمي لرحلة الحج معكم:', 'التقييم: ' + r + ' من 5 (' + WORDS[r] + ')'];
      if (name.value.trim()) lines.push('الاسم: ' + name.value.trim());
      if (ddB.getAttribute('data-value')) lines.push('حجّيت من: ' + ddB.getAttribute('data-value'));
      if (ddS.getAttribute('data-value')) lines.push('الموسم: ' + ddS.getAttribute('data-value'));
      lines.push('التجربة: ' + text.value.trim());
      var w = window.open(waLink(lines.join('\n')), '_blank', 'noopener');
      if (!w) location.href = waLink(lines.join('\n'));
      toast('شكرًا لك! كمّل الإرسال من واتساب');
    });
    preview();
  })();

  // ---------- dock: current section, hides at the hero, inside the form and while typing ----------
  (function(){
    var dock = $('#dock'), qa = $('#qa'), heroCta = $('#heroCta'), form = $('#rvForm'), seen = new Map();
    var TAB = { home:'home', care:'home', days:'home', packages:'packages', branches:'branches' };
    var navLinks = $$('.nav a, .menu-nav a');
    if ('IntersectionObserver' in window) {
      var so = new IntersectionObserver(function(es){
        es.forEach(function(e){
          if (!e.isIntersecting) return;
          var id = e.target.id, tab = TAB[id] || '';
          $$('a[data-tab]', dock).forEach(function(a){ a.classList.toggle('on', a.getAttribute('data-tab') === tab); });
          navLinks.forEach(function(a){ a.classList.toggle('on', a.getAttribute('href') === '#' + id); });
        });
      }, { rootMargin:'-45% 0px -50% 0px' });
      $$('main > section[id]').forEach(function(s){ so.observe(s); });
      // hidden while the hero's own buttons are on screen, so the same button never shows twice
      var ho = new IntersectionObserver(function(es){ es.forEach(function(e){ seen.set(e.target, e.isIntersecting); }); var any = false; seen.forEach(function(v){ any = any || v; }); dock.classList.toggle('at-hero', any); });
      ho.observe(qa); ho.observe(heroCta);
      new IntersectionObserver(function(es){ dock.classList.toggle('in-form', es[0].isIntersecting); }, { threshold:.3 }).observe(form);
    } else dock.classList.remove('at-hero');
    function typing(el){ return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'); }
    document.addEventListener('focusin', function(e){ if (typing(e.target)) dock.classList.add('hide'); });
    document.addEventListener('focusout', function(){ setTimeout(function(){ if (!typing(document.activeElement)) dock.classList.remove('hide'); }, 80); });
  })();

  onScroll();
})();
