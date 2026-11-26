// Startup screen. index.html puts a brand mark and spinner inside #root, so
// visitors see the app at once instead of a blank page while the app's bundle
// downloads; React's first render replaces it.
//
// This file loads first, before any other script, so it can notice when
// startup goes wrong: a script that fails to load (network, blocked, or a
// bundle that will not parse) or an error before the first render turns the
// screen into a short explanation with a Reload button, and a start that is
// merely slow says so after a while.
// Words come from the locale files once they are loaded; until then the screen
// shows only the brand and spinner (and, if even the locales failed, a Reload
// button marked with an icon).
//
// The pin bounces while the app loads (Notion "Startup loader: a branded
// Lottie animation instead of the plain spinner"). "Bounce" was designed in
// LottieFiles Creator and ships as CSS keyframes (src/index.css): no player
// to download. A Lottie player fetched beside the bundle cost about 0.3 s of
// mobile LCP on a slow load, even when it waited a second (Lighthouse,
// 2026-11-24). This file only picks the mode, before the first paint, as
// <html data-boot-anim>:
// - playing: the pin bounces.
// - off: the still pin with the ring, when motion is reduced (Settings, or
//   the system under Auto), or once startup has failed.
(function () {
  var SLOW_MS = 25000;
  var MOTION_KEY = 'mcu.motion.v1'; // src/app/settings.tsx
  var state = 'loading';

  function box() { return document.getElementById('mcu-boot'); }
  function setAnim(v) { document.documentElement.setAttribute('data-boot-anim', v); }

  // The visitor's Reduce motion setting, read straight from storage: the
  // bundle's window.MCU_MOTION isn't here yet. Settings puts `reduce-motion`
  // on <html> once the app runs; doing it now as well means the startup ring
  // obeys it too (src/index.css).
  function reducedMotion() {
    var chosen = null;
    try { chosen = localStorage.getItem(MOTION_KEY); } catch (e) { /* private mode */ }
    if (chosen === 'reduced') { document.documentElement.classList.add('reduce-motion'); return true; }
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function text(key) {
    var i18n = window.MCU_I18N;
    if (i18n) return i18n.tr(key);
    var en = window.MCU_LOCALES && window.MCU_LOCALES.en;
    return (en && en.strings && en.strings[key]) || '';
  }
  function render() {
    var b = box();
    if (!b) return;
    b.setAttribute('data-state', state);
    var msg = b.querySelector('.boot-msg');
    var btn = b.querySelector('.boot-reload');
    if (state === 'failed') setAnim('off'); // the still pin above the message
    if (state === 'loading') {
      msg.textContent = text('boot.loading');
      btn.hidden = true;
    } else {
      msg.textContent = text(state === 'failed' ? 'boot.failed' : 'boot.slow');
      var label = text('boot.reload');
      btn.textContent = label || '↻';
      if (!label) btn.setAttribute('aria-label', 'Reload');
      btn.hidden = false;
    }
  }

  // Resource errors do not bubble, so listen in the capture phase. Only script
  // failures matter here: a poster that fails is the app's own business.
  window.addEventListener('error', function (e) {
    if (state === 'failed' || !box()) return;
    var t = e.target;
    var isScript = t && t.tagName === 'SCRIPT';
    var isRuntime = t === window || !t || !t.tagName;
    if (!isScript && !isRuntime) return;
    state = 'failed';
    render();
  }, true);

  // i18n.js calls refresh() as soon as it has loaded (it runs before the CDN
  // scripts); DOMContentLoaded is a second chance if it could not.
  window.MCU_BOOT = { refresh: render };
  document.addEventListener('DOMContentLoaded', render);
  setAnim(reducedMotion() ? 'off' : 'playing');

  setTimeout(function () {
    if (state === 'loading' && box()) { state = 'slow'; render(); }
  }, SLOW_MS);

  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('.boot-reload')) location.reload();
  });
})();
