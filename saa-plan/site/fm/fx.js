/* Field Manual fx - the three effects CSS cannot do: decode a title, count a number up, reveal on scroll.
   Browser only: window.FieldManualFx. No dependencies. Everything else in the motion system is in bundle.css.
   Respects <html data-fm-motion="off"> and the reduced-motion system setting: then text is set at once. */
(function (root) {
  'use strict';
  var doc = root.document;
  var GLYPHS = 'ABCDEFGHKLMNPRSTUVXYZ0123456789/#%<>[]_';

  function level() {
    var m = doc.documentElement.getAttribute('data-fm-motion');
    if (m === 'off') return 'off';
    if (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'off';
    return m || 'full';
  }
  function finalText(el) {
    var t = el.getAttribute('data-fm-text');
    if (t == null) { t = el.textContent; el.setAttribute('data-fm-text', t); }
    return t;
  }

  /* scramble(el) - the text resolves left to right out of random glyphs. For titles of a few words.
     Screen readers get the final text at once through aria-label. */
  function scramble(el, opts) {
    opts = opts || {};
    var text = finalText(el), n = text.length, dur = opts.duration || 640, start = null, last = 0;
    el.setAttribute('aria-label', text);
    if (level() === 'off') { el.textContent = text; return; }
    function frame(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / dur);
      if (t - last > 40 || p === 1) {
        last = t;
        var fixed = Math.floor(p * n), out = '';
        for (var i = 0; i < n; i++) {
          var c = text.charAt(i);
          out += (i < fixed || c === ' ') ? c : GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
        }
        el.textContent = p === 1 ? text : out;
      }
      if (p < 1) root.requestAnimationFrame(frame);
    }
    root.requestAnimationFrame(frame);
  }

  /* count(el) - the first number in the text counts up in 16 steps, keeping its padding and decimals:
     "03" goes 00, 01, 02, 03; "17.4" goes 1.1, 2.2 ... 17.4. */
  function count(el, opts) {
    opts = opts || {};
    var text = finalText(el), m = /^(\D*?)(\d+(?:\.\d+)?)([\s\S]*)$/.exec(text);
    if (!m || level() === 'off') { el.textContent = text; return; }
    var to = parseFloat(m[2]), dec = (m[2].split('.')[1] || '').length, width = m[2].length;
    var steps = opts.steps || 16, dur = opts.duration || 800, k = 0;
    el.setAttribute('aria-label', text);
    var id = root.setInterval(function () {
      k++;
      var s = (to * k / steps).toFixed(dec);
      while (s.length < width) s = '0' + s;
      el.textContent = k >= steps ? text : m[1] + s + m[3];
      if (k >= steps) root.clearInterval(id);
    }, dur / steps);
  }

  /* reveal(scope) - elements marked data-fm-reveal flicker on the first time they scroll into view. */
  function reveal(scope) {
    var els = [].slice.call((scope || doc).querySelectorAll('[data-fm-reveal]'));
    if (level() === 'off' || !('IntersectionObserver' in root)) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var io = new root.IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.15 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* boot(scope) - run every effect marked up inside scope: data-fm-scramble, data-fm-count, data-fm-reveal. */
  function boot(scope) {
    scope = scope || doc;
    doc.documentElement.classList.add('fm-js');
    [].forEach.call(scope.querySelectorAll('[data-fm-scramble]'), function (e) { scramble(e); });
    [].forEach.call(scope.querySelectorAll('[data-fm-count]'), function (e) { count(e); });
    reveal(scope);
  }

  /* replay(el) - restart every CSS animation under el and run boot again. For demos and after big content swaps. */
  function replay(el) {
    el = el || doc.body;
    var d = el.style.display;
    el.style.display = 'none';
    void el.offsetHeight;
    el.style.display = d;
    boot(el);
  }

  /* setLevel('full' | 'calm' | 'off') */
  function setLevel(l) { doc.documentElement.setAttribute('data-fm-motion', l); }

  root.FieldManualFx = { boot: boot, replay: replay, scramble: scramble, count: count, reveal: reveal, level: level, setLevel: setLevel };
})(window);
