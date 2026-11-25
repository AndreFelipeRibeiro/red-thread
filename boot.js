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
// Lottie animation instead of the plain spinner"). The screen first paints
// the still pin. When motion is allowed, the Lottie player (/lottie-light.js,
// vite.config.js) and the animation, "Bounce" (/boot-loader.json), download
// beside the app at low priority. The pin then starts from the pose it was
// already drawn in, so nothing jumps. <html data-boot-anim> says which is on
// screen:
// - pending: the still pin, while the player loads.
// - playing: the animation.
// - off: the still pin with the ring, when motion is reduced (Settings, or
//   the system under Auto), the player cannot load, or startup failed.
// The animation is optional: a player that fails never counts as a failed
// startup, and nothing waits for it.
(function () {
  var SLOW_MS = 25000;
  var ANIM_WAIT_MS = 3000;
  var MOTION_KEY = 'mcu.motion.v1'; // src/app/settings.tsx
  var state = 'loading';
  var anim = null;

  function box() { return document.getElementById('mcu-boot'); }
  function setAnim(v) { document.documentElement.setAttribute('data-boot-anim', v); }
  function animState() { return document.documentElement.getAttribute('data-boot-anim'); }
  function stopAnim() {
    if (anim) { try { anim.destroy(); } catch (e) { /* already gone */ } anim = null; }
  }
  function noAnim() { stopAnim(); setAnim('off'); }

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

  // Runs once the page's markup is parsed, before the deferred scripts and
  // the bundle run (readyState "interactive"). Waiting for DOMContentLoaded
  // would also wait for the bundle, by which time the app has replaced the
  // screen.
  function whenParsed(fn) {
    if (document.readyState !== 'loading') return fn();
    document.addEventListener('readystatechange', function once() {
      if (document.readyState === 'loading') return;
      document.removeEventListener('readystatechange', once);
      fn();
    });
  }

  function startAnim() {
    if (reducedMotion() || !window.fetch || !window.Promise) return setAnim('off');
    setAnim('pending');
    var data = null;
    var player = false;
    function play() {
      if (!data || !player || anim) return;
      whenParsed(function start() {
        var b = box();
        var holder = b && b.querySelector('.boot-lottie');
        if (!holder || state === 'failed' || !window.lottie || anim) return noAnim();
        // Only once the stylesheet has sized the box. Unstyled, the SVG fills
        // the page width: a giant pin for an instant. The dev server only adds
        // the stylesheet when the bundle runs, and a slow stylesheet would do
        // the same in production.
        if (getComputedStyle(holder.parentNode).position !== 'relative') return setTimeout(start, 50);
        try {
          anim = window.lottie.loadAnimation({
            container: holder, renderer: 'svg', loop: true, autoplay: true, animationData: data,
            rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
          });
        } catch (e) { return noAnim(); }
        anim.addEventListener('DOMLoaded', function () { if (anim && state !== 'failed') setAnim('playing'); });
        // Once the app has replaced the screen, stop drawing frames nobody sees.
        anim.addEventListener('loopComplete', function () { if (!holder.isConnected) stopAnim(); });
      });
    }
    fetch('/boot-loader.json')
      .then(function (r) { if (!r.ok) throw new Error('boot-loader.json ' + r.status); return r.json(); })
      .then(function (d) { data = d; play(); }, noAnim);
    var s = document.createElement('script');
    s.src = '/lottie-light.js';
    s.async = true;
    s.setAttribute('data-boot-optional', '');
    if ('fetchPriority' in s) s.fetchPriority = 'low';
    s.onload = function () { player = true; play(); };
    s.onerror = noAnim;
    document.head.appendChild(s);
    // A slow player shows the ring meanwhile; if it arrives later, it still plays.
    setTimeout(function () { if (animState() === 'pending') setAnim('off'); }, ANIM_WAIT_MS);
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
    if (state === 'failed') noAnim(); // the still pin above the message
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
    // The animated pin is optional: its player failing to load, or throwing,
    // only brings the ring back.
    if ((isScript && t.hasAttribute('data-boot-optional')) || (isRuntime && /\/lottie-light\.js/.test(e.filename || ''))) {
      noAnim();
      return;
    }
    state = 'failed';
    render();
  }, true);

  // i18n.js calls refresh() as soon as it has loaded (it runs before the CDN
  // scripts); DOMContentLoaded is a second chance if it could not.
  window.MCU_BOOT = { refresh: render };
  document.addEventListener('DOMContentLoaded', render);
  startAnim();

  setTimeout(function () {
    if (state === 'loading' && box()) { state = 'slow'; render(); }
  }, SLOW_MS);

  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('.boot-reload')) location.reload();
  });
})();
