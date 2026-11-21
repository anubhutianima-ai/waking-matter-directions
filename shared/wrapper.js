/* Review wrapper behaviour: tabs, scaled iframe stage, beat jumping, reduced-motion
   override, distance matrix. Vanilla. Talks to shared/dir.js inside each direction. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var DIRS = {
    a: { letter: 'A', name: 'The Second Run', beats: [
      ['hero', 'Hero · two runs'], ['problem', 'The problem · the bundle'], ['contract', 'Agent Memory Contracts · the gate'],
      ['questions', 'Four questions · lanes'], ['repeated', 'Repeated work · weekly passes'], ['accumulate', 'Thesis · the column'], ['end', 'Close · the mark']] },
    b: { letter: 'B', name: 'The Aperture', beats: [
      ['hero', 'Hero · the mark'], ['open', 'The mark opens'], ['wake', 'Wake · the iris'], ['problem', 'The problem · gate 01'],
      ['contract', 'Agent Memory Contracts · gate 02'], ['questions', 'Four questions · gate 03'], ['repeated', 'Repeated work · gate 04'],
      ['thesis', 'Thesis · gate 05'], ['close', 'Close · the mark re-forms']] },
    c: { letter: 'C', name: 'The Record', beats: [
      ['hero', 'Hero · the record'], ['problem', 'The problem · stored, not trusted'], ['contract', 'Agent Memory Contracts · the graph'],
      ['questions', 'Four questions · the ledger'], ['repeated', 'Repeated work · rows accumulate'], ['thesis', 'Thesis · authority fades']] },
    d: { letter: 'D', name: 'The Instrument', beats: [
      ['hero', 'Hero · baseline'], ['problem', 'The problem · history pile'], ['decisions', '01 Decisions'], ['state', '02 Useful state'],
      ['revision', '03 Revision'], ['evaluation', '04 Evaluation'], ['contract', 'Agent Memory Contracts · the record'],
      ['repeated', 'Repeated work'], ['thesis', 'Thesis · accumulated']] }
  };
  var FILES = { a: 'direction-A.html', b: 'direction-B.html', c: 'direction-C.html', d: 'direction-D.html' };

  var state = { device: 'desktop', reduced: false };
  var entries = {};      // key -> { panel, frame, viewport, beatsEl, loaded }
  var byWindow = [];     // [{win, key}]

  /* ---------- Tabs ---------------------------------------------------------- */
  var tabs = $$('[role="tab"]');
  var panels = $$('[role="tabpanel"]');

  function keyFromPanel(p) { return p.getAttribute('data-dir'); }

  function activate(id, focusTab) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-tab') === id;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && focusTab) t.focus();
    });
    panels.forEach(function (p) { p.hidden = p.id !== 'panel-' + id; });
    try { history.replaceState(null, '', '#' + id); } catch (e) { /* file:// in some browsers */ }
    var entry = entries[id];
    if (entry) {
      if (!entry.loaded) loadFrame(entry);
      requestAnimationFrame(function () { layout(entry); });
    }
    window.scrollTo({ top: Math.min(window.scrollY, $('.tabs-wrap').offsetTop - 1), behavior: 'auto' });
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { activate(t.getAttribute('data-tab')); });
    t.addEventListener('keydown', function (e) {
      var n = tabs.length, j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % n;
      else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = n - 1;
      if (j !== null) { e.preventDefault(); activate(tabs[j].getAttribute('data-tab'), true); }
    });
  });

  /* ---------- Stage: scaled iframe ------------------------------------------ */
  function size() { return state.device === 'desktop' ? [1440, 900] : [390, 844]; }

  function layout(entry) {
    if (!entry || entry.panel.hidden) return;
    var wh = size(), w = wh[0], h = wh[1];
    var avail = entry.viewport.clientWidth || w;
    var k = Math.min(1, avail / w);
    if (state.device === 'mobile') {
      k = Math.min(1, (window.innerHeight - 250) / h, avail / w);
      k = Math.max(k, 0.5);
    }
    entry.frame.style.width = w + 'px';
    entry.frame.style.height = h + 'px';
    entry.frame.style.transform = 'scale(' + k + ')';
    entry.frame.style.marginLeft = state.device === 'mobile' ? Math.max(0, (avail - w * k) / 2) + 'px' : '0';
    entry.viewport.style.height = Math.round(h * k) + 'px';
    entry.viewport.setAttribute('data-device', state.device);
    var hint = $('[data-scale]', entry.panel);
    if (hint) hint.textContent = w + ' × ' + h + ' shown at ' + Math.round(k * 100) + '%';
  }

  function layoutAll() { Object.keys(entries).forEach(function (k) { layout(entries[k]); }); }

  function loadFrame(entry, bust) {
    entry.loaded = true;
    var loading = $('.loading', entry.viewport);
    if (loading) loading.hidden = false;
    entry.frame.src = entry.file + (bust ? '?r=' + Date.now() : '');
  }

  function post(entry, msg) {
    try { entry.frame.contentWindow.postMessage(msg, '*'); } catch (e) { /* not loaded yet */ }
  }

  function syncReduced() {
    Object.keys(entries).forEach(function (k) {
      if (entries[k].loaded) post(entries[k], { type: 'wm:reduced', value: state.reduced ? true : null });
    });
  }

  function renderChips(entry, beats) {
    entry.beatsEl.innerHTML = '';
    var lab = document.createElement('span');
    lab.className = 'beats-label';
    lab.textContent = 'Jump to';
    entry.beatsEl.appendChild(lab);
    beats.forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.setAttribute('data-beat', b[0]);
      btn.setAttribute('data-test-id', 'jump-' + entry.key + '-' + b[0]);
      btn.textContent = b[1];
      btn.addEventListener('click', function () {
        if (!entry.loaded) loadFrame(entry);
        post(entry, { type: 'wm:goto', id: b[0] });
      });
      entry.beatsEl.appendChild(btn);
    });
  }

  function setActiveBeat(entry, id) {
    $$('.chip', entry.beatsEl).forEach(function (c) {
      if (c.getAttribute('data-beat') === id) c.setAttribute('aria-current', 'true');
      else c.removeAttribute('aria-current');
    });
  }

  panels.forEach(function (p) {
    var key = keyFromPanel(p);
    if (!key || !DIRS[key]) return;
    var entry = {
      key: key, panel: p, file: FILES[key], loaded: false,
      frame: $('iframe', p), viewport: $('[data-viewport]', p), beatsEl: $('.beats', p)
    };
    entries[key] = entry;
    byWindow.push({ win: entry.frame.contentWindow, key: key });
    renderChips(entry, DIRS[key].beats);
    entry.frame.addEventListener('load', function () {
      var l = $('.loading', entry.viewport);
      if (l) l.hidden = true;
      if (state.reduced) post(entry, { type: 'wm:reduced', value: true });
    });
    $$('[data-device]', p).forEach(function (b) {
      b.addEventListener('click', function () { setDevice(b.getAttribute('data-device')); });
    });
    var rm = $('[data-rm]', p);
    if (rm) rm.addEventListener('click', function () { setReduced(!state.reduced); });
    var rp = $('[data-replay]', p);
    if (rp) rp.addEventListener('click', function () { loadFrame(entry, true); });
    var wd = $('[data-wide]', p);
    if (wd) wd.addEventListener('click', function () {
      var on = p.getAttribute('data-wide') !== 'true';
      p.setAttribute('data-wide', on ? 'true' : 'false');
      wd.setAttribute('aria-pressed', on ? 'true' : 'false');
      requestAnimationFrame(function () { layout(entry); });
    });
  });

  function setDevice(d) {
    state.device = d;
    $$('[data-device]').forEach(function (b) { b.setAttribute('aria-checked', b.getAttribute('data-device') === d ? 'true' : 'false'); });
    requestAnimationFrame(layoutAll);
  }

  function setReduced(on) {
    state.reduced = on;
    $$('[data-rm]').forEach(function (b) { b.setAttribute('aria-checked', on ? 'true' : 'false'); });
    syncReduced();
  }

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || typeof d !== 'object' || typeof d.type !== 'string' || d.type.indexOf('wm:') !== 0) return;
    var key = null;
    Object.keys(entries).forEach(function (k) { if (entries[k].frame.contentWindow === e.source) key = k; });
    if (!key) return;
    var entry = entries[key];
    if (d.type === 'wm:ready') {
      if (d.beats && d.beats.length) renderChips(entry, d.beats.map(function (b) { return [b.id, b.label]; }));
      if (state.reduced) post(entry, { type: 'wm:reduced', value: true });
    } else if (d.type === 'wm:beat') {
      setActiveBeat(entry, d.id);
    }
  });

  var rafId = 0;
  window.addEventListener('resize', function () {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(layoutAll);
  });

  /* ---------- Direction-distance gate -------------------------------------- */
  var DIM = [
    ['information_architecture', 'Information architecture', 's'],
    ['interaction_model', 'Interaction model', 's'],
    ['navigation_or_entry', 'Navigation or entry', 's'],
    ['visual_hierarchy', 'Visual hierarchy', 'v'],
    ['surface_depth', 'Surface depth', 'v'],
    ['palette_strategy', 'Palette strategy', 'v']
  ];
  var PROFILE = {
    A: {
      information_architecture: ['timeline', 'One timeline of runs, marked in weeks. Sections are moments in an agent’s life.'],
      interaction_model: ['autoplay+scrub', 'Autoplay hero (once), then scroll-scrubbed. Scroll is time.'],
      navigation_or_entry: ['spine', 'Entry is a demonstration. A left spine of weeks shows position.'],
      visual_hierarchy: ['type+traces', 'Left type, right traces; one column with a left spine below.'],
      surface_depth: ['flat', 'Flat hairlines on void. No cards.'],
      palette_strategy: ['void-only', 'Void throughout. Ivory type. Resonance only when experience changes a decision.']
    },
    B: {
      information_architecture: ['spatial', 'The page is the mark: chambers about a central axis, sections are gates.'],
      interaction_model: ['gates+iris', 'Scroll-driven gates, accumulating ticks, iris wake.'],
      navigation_or_entry: ['pillar-ticks', 'The pillars are the navigation. Entry is the mark opening.'],
      visual_hierarchy: ['axis-symmetric', 'Centered axis, symmetric chambers, monumental mark.'],
      surface_depth: ['layered:rails', 'Fixed rails over content, two clipped ground layers.'],
      palette_strategy: ['void-to-ivory', 'Void hero inverts to ivory at the wake.']
    },
    C: {
      information_architecture: ['object-states', 'One record through the contract states. Questions are ledger columns.'],
      interaction_model: ['click+travel', 'Click-first hero playground, then a card that travels and morphs.'],
      navigation_or_entry: ['state-stepper', 'Entry is operating the record. A state-machine stepper navigates.'],
      visual_hierarchy: ['prose|card', 'Prose left, dark card right. The card is the focal object.'],
      surface_depth: ['layered:card', 'A floating dark card with one shadow over flat paper.'],
      palette_strategy: ['ivory+card', 'Ivory page with one void card as the only inverse.']
    },
    D: {
      information_architecture: ['by-question', 'Chapters are the four research questions.'],
      interaction_model: ['pinned-morph', 'A pinned plate morphs in place. Index jumps. Outcome switch.'],
      navigation_or_entry: ['chapter-chips', 'Chapter chips in the plate caption strip.'],
      visual_hierarchy: ['plate-over-text', 'Stacked: wide plate over a text column.'],
      surface_depth: ['flat', 'Flat paper and ink. Hairline-framed figure.'],
      palette_strategy: ['ivory-only', 'Ivory only. Ink and hairlines. No dark ground.']
    }
  };
  var LETTERS = ['A', 'B', 'C', 'D'];

  function renderMatrix() {
    var host = $('#profile-table');
    var pairsHost = $('#pairs');
    if (!host || !pairsHost) return;
    var html = '<table><thead><tr><th>Dimension</th>' + LETTERS.map(function (l) { return '<th>' + l + ' · ' + DIRS[l.toLowerCase()].name + '</th>'; }).join('') + '</tr></thead><tbody>';
    DIM.forEach(function (d) {
      html += '<tr><td class="k">' + d[1] + '<br><span class="mono">' + (d[2] === 's' ? 'structural' : 'visual') + '</span></td>' +
        LETTERS.map(function (l) { return '<td>' + PROFILE[l][d[0]][1] + '</td>'; }).join('') + '</tr>';
    });
    host.innerHTML = html + '</tbody></table>';

    var out = '';
    var allPass = true;
    for (var i = 0; i < LETTERS.length; i++) {
      for (var j = i + 1; j < LETTERS.length; j++) {
        var a = LETTERS[i], b = LETTERS[j];
        var diffs = DIM.filter(function (d) { return PROFILE[a][d[0]][0] !== PROFILE[b][d[0]][0]; });
        var structural = diffs.some(function (d) { return d[2] === 's'; });
        var visual = diffs.some(function (d) { return d[2] === 'v'; });
        var ok = diffs.length >= 3 && structural && visual;
        if (!ok) allPass = false;
        out += '<div class="pair"><h3><span>' + a + ' ↔ ' + b + '</span><span class="' + (ok ? 'pass' : 'fail') + '">' + (ok ? 'Pass' : 'Fail') + ' · ' + diffs.length + ' of 6</span></h3>' +
          '<p>' + diffs.map(function (d) { return d[1].toLowerCase(); }).join(', ') + '</p>' +
          '<p class="mono">' + (structural ? 'structural ✓' : 'structural ✗') + ' · ' + (visual ? 'visual ✓' : 'visual ✗') + '</p></div>';
      }
    }
    pairsHost.innerHTML = out;
    var badge = $('#gate-result');
    if (badge) { badge.textContent = allPass ? 'All six pairs pass' : 'A pair fails'; badge.className = allPass ? 'pass' : 'fail'; }
    window.__distanceGate = { pass: allPass };
  }
  renderMatrix();

  /* ---------- Boot ---------------------------------------------------------- */
  var start = (location.hash || '#today').slice(1).toLowerCase();
  if (!$('#panel-' + start)) start = 'today';
  activate(start);
})();
