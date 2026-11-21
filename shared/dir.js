/* ==========================================================================
   Waking Matter — shared runtime for direction-{A,B,C,D}.html
   Vanilla, no dependencies. Exposes window.WM.

   - Embedded mode: <html data-embedded="true|false"> (the review wrapper shows
     each direction in an iframe that scrolls on its own).
   - Reduced motion: WM.reduced + <html data-reduced="true|false">. Follows the OS
     setting unless the wrapper overrides it (so reviewers can preview the
     reduced-motion state). CSS should key off html[data-reduced="true"] AND keep
     an @media (prefers-reduced-motion: reduce) block for the no-JS case.
   - WM.frame(fn): lazy rAF loop. fn(state) runs while the page scrolls/resizes and
     for ~160ms afterwards. Return true from fn to keep the loop alive (smoothing).
       state = { y, vh, vw, dy, dt, t }
   - WM.track(el): cached document-space measurements (top/height/left/width),
     refreshed on resize, font load and body resize. Track STATIC wrappers, not
     elements that are transformed or inside sticky/fixed ancestors.
       tracker.p(y, vh, anchor=.5) -> 0..1 progress of the viewport line at
       `anchor` (fraction of vh) through the element.
   - WM.tween(ms, fn, ease): time-based animation; fn(easedProgress). Jumps to the
     end state immediately when reduced motion is on. Returns a cancel function.
   - WM.sleep(ms): promise; resolves immediately when reduced motion is on.
   - Beat protocol (review wrapper):
       elements with data-beat="id" data-beat-label="Human label" are "beats".
       child -> parent  {type:'wm:ready', beats:[{id,label}]}
                        {type:'wm:beat',  id}               (active beat changed)
       parent -> child  {type:'wm:goto',  id}               (scroll to a beat)
                        {type:'wm:reduced', value:true|false|null}
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var embedded = window.self !== window.top;
  root.dataset.embedded = embedded ? 'true' : 'false';

  /* ---- Reduced motion ---------------------------------------------------- */
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var override = null; // null = follow OS; true/false = wrapper override
  var reducedListeners = [];

  function computeReduced() {
    return override === null ? !!(mq && mq.matches) : override;
  }

  var WM = {
    embedded: embedded,
    reduced: computeReduced(),
    onReduced: function (fn) {
      reducedListeners.push(fn);
      fn(WM.reduced);
    }
  };

  function applyReduced() {
    var r = computeReduced();
    var changed = r !== WM.reduced;
    WM.reduced = r;
    root.dataset.reduced = r ? 'true' : 'false';
    if (changed) reducedListeners.forEach(function (fn) { fn(r); });
  }
  applyReduced();
  if (mq && mq.addEventListener) {
    mq.addEventListener('change', function () { if (override === null) applyReduced(); });
  }

  /* ---- Math -------------------------------------------------------------- */
  WM.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  WM.lerp = function (a, b, t) { return a + (b - a) * t; };
  WM.invLerp = function (a, b, v) { return a === b ? 0 : WM.clamp((v - a) / (b - a), 0, 1); };
  WM.map = function (v, a, b, c, d) { return WM.lerp(c, d, WM.invLerp(a, b, v)); };
  WM.smooth = function (t) { t = WM.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  WM.easeOut = function (t) { t = WM.clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };
  WM.easeInOut = function (t) {
    t = WM.clamp(t, 0, 1);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  /* ---- Lazy frame loop ---------------------------------------------------- */
  var subs = [];
  var running = false;
  var last = 0;
  var quietUntil = 0;
  var state = { y: 0, vh: window.innerHeight, vw: window.innerWidth, dy: 0, dt: 16, t: 0 };

  function tick(now) {
    var y = window.scrollY || window.pageYOffset || 0;
    state.dt = Math.min(64, now - last || 16);
    last = now;
    state.t = now;
    state.dy = y - state.y;
    state.y = y;
    state.vh = window.innerHeight;
    state.vw = window.innerWidth;
    var keep = false;
    for (var i = 0; i < subs.length; i++) {
      if (subs[i](state) === true) keep = true;
    }
    if (state.dy !== 0 || keep) quietUntil = now + 160;
    if (now < quietUntil) requestAnimationFrame(tick);
    else running = false;
  }

  function wake() {
    if (running) return;
    running = true;
    last = performance.now();
    quietUntil = last + 160;
    requestAnimationFrame(tick);
  }

  WM.frame = function (fn) {
    subs.push(fn);
    wake();
    return function () {
      var i = subs.indexOf(fn);
      if (i > -1) subs.splice(i, 1);
    };
  };
  WM.invalidate = wake;
  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', wake);

  /* ---- Element tracking ---------------------------------------------------- */
  var tracked = [];

  WM.track = function (el) {
    var t = { el: el, top: 0, height: 0, left: 0, width: 0 };
    t.measure = function () {
      var r = el.getBoundingClientRect();
      t.top = r.top + (window.scrollY || 0);
      t.left = r.left + (window.scrollX || 0);
      t.height = r.height;
      t.width = r.width;
    };
    t.p = function (y, vh, anchor) {
      return WM.invLerp(t.top, t.top + t.height, y + vh * (anchor == null ? 0.5 : anchor));
    };
    t.measure();
    tracked.push(t);
    return t;
  };

  function measureAll() {
    tracked.forEach(function (t) { t.measure(); });
    wake();
  }
  window.addEventListener('resize', measureAll);
  window.addEventListener('load', measureAll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureAll);
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(measureAll);
    var attach = function () { ro.observe(document.body); };
    if (document.body) attach(); else document.addEventListener('DOMContentLoaded', attach);
  }

  /* ---- Time-based helpers --------------------------------------------------- */
  WM.tween = function (ms, fn, ease) {
    var easeFn = ease || WM.easeInOut;
    if (WM.reduced) { fn(1); return function () {}; }
    var start = performance.now();
    var cancelled = false;
    function step(now) {
      if (cancelled) return;
      var p = WM.clamp((now - start) / ms, 0, 1);
      fn(easeFn(p));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    return function () { cancelled = true; };
  };

  WM.sleep = function (ms) {
    return new Promise(function (resolve) { setTimeout(resolve, WM.reduced ? 0 : ms); });
  };

  /* ---- Beat protocol --------------------------------------------------------- */
  var beatEls = [];
  var beatTrackers = [];
  var currentBeat = null;

  function post(msg) {
    if (!embedded) return;
    try { window.parent.postMessage(msg, '*'); } catch (e) { /* cross-origin parent: ignore */ }
  }

  function untrack(t) {
    var i = tracked.indexOf(t);
    if (i > -1) tracked.splice(i, 1);
  }

  // A beat's landing position is its CSS scroll-margin-top (a pinned figure may cover the top of the viewport),
  // so it counts as reached once it is at or above that position.
  function readMargins() {
    beatTrackers.forEach(function (t) { t.margin = parseFloat(window.getComputedStyle(t.el).scrollMarginTop) || 0; });
  }
  window.addEventListener('resize', readMargins);

  // Idempotent: only re-tracks and re-announces when the set of beat elements changed.
  function collectBeats() {
    var els = [].slice.call(document.body.querySelectorAll('[data-beat]'));
    var same = els.length === beatEls.length && els.every(function (el, i) { return el === beatEls[i]; });
    if (same) return;
    beatTrackers.forEach(untrack);
    beatEls = els;
    beatTrackers = els.map(function (el) {
      var t = WM.track(el);
      t.id = el.getAttribute('data-beat');
      t.label = el.getAttribute('data-beat-label') || t.id;
      t.margin = 0;
      return t;
    });
    readMargins();
    post({ type: 'wm:ready', beats: beatTrackers.map(function (t) { return { id: t.id, label: t.label }; }) });
  }

  WM.frame(function (st) {
    if (!beatTrackers.length) return;
    var base = st.vh * 0.45;
    var found = null;
    for (var i = 0; i < beatTrackers.length; i++) {
      var t = beatTrackers[i];
      if (t.top <= st.y + Math.max(base, t.margin + 2)) found = t;
    }
    var id = found ? found.id : null;
    if (id !== currentBeat) {
      currentBeat = id;
      root.dataset.activeBeat = id || '';
      post({ type: 'wm:beat', id: id });
    }
  });

  function boot() { collectBeats(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('load', function () { measureAll(); collectBeats(); });

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'wm:goto') {
      var id = String(d.id).replace(/["\\]/g, '');
      var el = document.querySelector('[data-beat="' + id + '"]');
      if (!el) return;
      var off = Number(el.getAttribute('data-beat-offset') || 0);
      var margin = parseFloat(window.getComputedStyle(el).scrollMarginTop) || 0;
      var y = el.getBoundingClientRect().top + (window.scrollY || 0) + off - margin;
      window.scrollTo({ top: y, behavior: WM.reduced ? 'auto' : 'smooth' });
    } else if (d.type === 'wm:reduced') {
      override = d.value === null ? null : !!d.value;
      applyReduced();
    }
  });

  window.WM = WM;
})();
