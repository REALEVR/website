(function () {
  'use strict';

  var PAGE = 40;
  var DEFAULTS = { q: '', hours: 72, topics: [], regions: [], off: [], group: true, multi: false, mute: '', sort: 'new' };
  var data = null;
  var shown = PAGE;
  var state = load();

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    q: $('q'), time: $('time'), topics: $('topics'), regions: $('regions'), sources: $('sources'),
    group: $('group'), multi: $('multi'), mute: $('mute'), sort: $('sort'), list: $('list'),
    count: $('count'), empty: $('empty'), more: $('more'), active: $('active'), updated: $('updated'),
    refresh: $('refresh'), filters: $('filters'), toggle: $('filters-toggle'), badge: $('filter-count')
  };

  // ---------- state: URL hash for shareable filters, localStorage for personal ones ----------
  function load() {
    var s = JSON.parse(JSON.stringify(DEFAULTS));
    try {
      var saved = JSON.parse(localStorage.getItem('ugnews') || '{}');
      if (Array.isArray(saved.off)) s.off = saved.off;
      if (typeof saved.mute === 'string') s.mute = saved.mute;
      if (typeof saved.group === 'boolean') s.group = saved.group;
    } catch (e) { /* storage unavailable: use defaults */ }
    var h = new URLSearchParams(location.hash.slice(1));
    if (h.has('q')) s.q = h.get('q');
    if (h.has('t')) s.hours = Number(h.get('t')) || 0;
    if (h.has('topic')) s.topics = h.get('topic').split('|').filter(Boolean);
    if (h.has('region')) s.regions = h.get('region').split('|').filter(Boolean);
    if (h.has('multi')) s.multi = h.get('multi') === '1';
    if (h.has('sort')) s.sort = h.get('sort') === 'coverage' ? 'coverage' : 'new';
    return s;
  }
  function save() {
    try { localStorage.setItem('ugnews', JSON.stringify({ off: state.off, mute: state.mute, group: state.group })); } catch (e) { /* ignore */ }
    var h = new URLSearchParams();
    if (state.q) h.set('q', state.q);
    if (state.hours !== DEFAULTS.hours) h.set('t', String(state.hours));
    if (state.topics.length) h.set('topic', state.topics.join('|'));
    if (state.regions.length) h.set('region', state.regions.join('|'));
    if (state.multi) h.set('multi', '1');
    if (state.sort !== 'new') h.set('sort', state.sort);
    var str = h.toString();
    history.replaceState(null, '', str ? '#' + str : location.pathname + location.search);
  }

  // ---------- helpers ----------
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function terms() { return state.q.toLowerCase().split(/\s+/).filter(Boolean); }
  function muted() { return state.mute.toLowerCase().split(',').map(function (w) { return w.trim(); }).filter(Boolean); }
  function highlight(text) {
    var safe = esc(text);
    var t = terms();
    if (!t.length) return safe;
    var re = new RegExp('(' + t.map(function (w) { return esc(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'gi');
    return safe.replace(re, '<mark>$1</mark>');
  }
  function ago(iso) {
    if (!iso) return '';
    var m = Math.round((Date.now() - Date.parse(iso)) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60);
    if (h < 24) return h + 'h ago';
    var d = Math.round(h / 24);
    if (d < 7) return d + 'd ago';
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }
  function sourceName(id) {
    var s = data.sources.find(function (x) { return x.id === id; });
    return s ? s.name : id;
  }

  // ---------- filtering ----------
  // `skip` leaves one facet out so chip counts show what picking that chip would give.
  function matches(it, skip) {
    if (state.off.indexOf(it.source) !== -1) return false;
    if (state.hours && it.published && Date.now() - Date.parse(it.published) > state.hours * 36e5) return false;
    var hay = (it.title + ' ' + it.summary).toLowerCase();
    var mw = muted();
    for (var i = 0; i < mw.length; i++) if (hay.indexOf(mw[i]) !== -1) return false;
    var t = terms();
    var hay2 = hay + ' ' + sourceName(it.source).toLowerCase();
    for (var j = 0; j < t.length; j++) if (hay2.indexOf(t[j]) === -1) return false;
    if (state.multi && it.coverage < 2) return false;
    if (skip !== 'topics' && state.topics.length && !state.topics.some(function (x) { return it.topics.indexOf(x) !== -1; })) return false;
    if (skip !== 'regions' && state.regions.length && !state.regions.some(function (x) { return it.regions.indexOf(x) !== -1; })) return false;
    return true;
  }

  function results() {
    var items = data.items.filter(function (it) { return matches(it); });
    if (state.group) {
      var byCluster = {};
      var leads = [];
      items.forEach(function (it) {
        if (byCluster[it.cluster]) return;
        byCluster[it.cluster] = true;
        leads.push(it);
      });
      items = leads;
    }
    if (state.sort === 'coverage') {
      items = items.slice().sort(function (a, b) { return b.coverage - a.coverage || (b.published || '').localeCompare(a.published || ''); });
    }
    return items;
  }

  // ---------- rendering ----------
  function renderChips(container, list, selected, facet) {
    var counts = {};
    data.items.forEach(function (it) {
      if (!matches(it, facet)) return;
      it[facet].forEach(function (k) { counts[k] = (counts[k] || 0) + 1; });
    });
    container.innerHTML = list.map(function (k) {
      var on = selected.indexOf(k) !== -1;
      return '<button type="button" class="chip" aria-pressed="' + on + '" data-k="' + esc(k) + '">' + esc(k) + '<span class="n">' + (counts[k] || 0) + '</span></button>';
    }).join('');
  }

  function renderSources() {
    var counts = {};
    data.items.forEach(function (it) { counts[it.source] = (counts[it.source] || 0) + 1; });
    el.sources.innerHTML = data.sources.map(function (s) {
      var on = state.off.indexOf(s.id) === -1;
      var n = s.ok ? (counts[s.id] || 0) : '<span class="down" title="' + esc(s.error || 'unavailable') + '">offline</span>';
      return '<li><label><input type="checkbox" data-id="' + esc(s.id) + '"' + (on ? ' checked' : '') + (s.ok ? '' : ' disabled') + '> ' + esc(s.name) + '<span class="n">' + n + '</span></label></li>';
    }).join('');
  }

  function renderActive() {
    var pills = [];
    if (state.q) pills.push(['q', '', '“' + state.q + '”']);
    state.topics.forEach(function (t) { pills.push(['topic', t, t]); });
    state.regions.forEach(function (r) { pills.push(['region', r, r]); });
    if (state.multi) pills.push(['multi', '', '2+ outlets']);
    muted().forEach(function (w) { pills.push(['mute', w, 'Muted: ' + w]); });
    el.active.innerHTML = pills.map(function (p) {
      return '<span class="pill">' + esc(p[2]) + '<button type="button" aria-label="Remove ' + esc(p[2]) + '" data-kind="' + p[0] + '" data-v="' + esc(p[1]) + '">×</button></span>';
    }).join('');
    var n = state.topics.length + state.regions.length + (state.q ? 1 : 0) + (state.multi ? 1 : 0) + state.off.length + muted().length;
    el.badge.hidden = !n;
    el.badge.textContent = n;
  }

  function story(it) {
    var others = [];
    if (state.group && it.coverage > 1) {
      others = data.items.filter(function (o) { return o.cluster === it.cluster && o.id !== it.id && state.off.indexOf(o.source) === -1; });
    }
    var tags = it.topics.filter(function (t) { return t !== 'General'; }).map(function (t) {
      return '<button type="button" class="tag" data-topic="' + esc(t) + '">' + esc(t) + '</button>';
    }).concat(it.regions.map(function (r) {
      return '<button type="button" class="tag region" data-region="' + esc(r) + '">' + esc(r) + '</button>';
    })).join('');
    var cov = it.coverage > 1 ? '<span class="cov" title="Outlets covering this story">● ' + it.coverage + ' outlets</span>' : '';
    var img = it.image ? '<img class="thumb" src="' + esc(it.image) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '';
    var also = others.length ? '<details class="also"><summary>Also covered by ' + esc(others.map(function (o) { return sourceName(o.source); }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', ')) + '</summary><ul>' +
      others.map(function (o) {
        return '<li><span class="src">' + esc(sourceName(o.source)) + '</span><a href="' + esc(o.link) + '" target="_blank" rel="noopener">' + esc(o.title) + '</a> <span class="muted">· ' + ago(o.published) + '</span></li>';
      }).join('') + '</ul></details>' : '';
    return '<li class="story' + (img ? '' : ' no-img') + '"><div>' +
      '<div class="story-meta"><span class="src">' + esc(sourceName(it.source)) + '</span><time datetime="' + esc(it.published || '') + '">' + ago(it.published) + '</time>' + cov + '</div>' +
      '<h3><a href="' + esc(it.link) + '" target="_blank" rel="noopener">' + highlight(it.title) + '</a></h3>' +
      (it.summary ? '<p>' + highlight(it.summary) + '</p>' : '') +
      (tags ? '<div class="tags">' + tags + '</div>' : '') + also +
      '</div>' + img + '</li>';
  }

  function render() {
    if (!data) return;
    save();
    if (el.q.value.trim() !== state.q) el.q.value = state.q;
    if (el.mute.value !== state.mute) el.mute.value = state.mute;
    el.group.checked = state.group;
    el.multi.checked = state.multi;
    el.sort.value = state.sort;
    Array.prototype.forEach.call(el.time.children, function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.v) === state.hours)); });
    renderChips(el.topics, data.topics, state.topics, 'topics');
    renderChips(el.regions, data.regions, state.regions, 'regions');
    renderSources();
    renderActive();

    var items = results();
    el.count.textContent = items.length + (items.length === 1 ? ' story' : ' stories') + (state.group ? ' (same-story reports grouped)' : '');
    el.list.innerHTML = items.slice(0, shown).map(story).join('');
    el.empty.hidden = items.length > 0;
    el.more.hidden = items.length <= shown;
    el.more.textContent = 'Show more (' + (items.length - shown) + ' left)';
    Array.prototype.forEach.call(el.list.querySelectorAll('img.thumb'), function (img) {
      img.addEventListener('error', function () { img.closest('.story').classList.add('no-img'); img.remove(); }, { once: true });
    });
  }

  function update(fn) { fn(); shown = PAGE; render(); }

  // ---------- events ----------
  var qTimer;
  el.q.addEventListener('input', function () {
    clearTimeout(qTimer);
    qTimer = setTimeout(function () { update(function () { state.q = el.q.value.trim(); }); }, 180);
  });
  var mTimer;
  el.mute.addEventListener('input', function () {
    clearTimeout(mTimer);
    mTimer = setTimeout(function () { update(function () { state.mute = el.mute.value; }); }, 300);
  });
  el.time.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    update(function () { state.hours = Number(b.dataset.v); });
  });
  function toggleIn(arr, k) { var i = arr.indexOf(k); if (i === -1) arr.push(k); else arr.splice(i, 1); }
  el.topics.addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    update(function () { toggleIn(state.topics, b.dataset.k); });
  });
  el.regions.addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    update(function () { toggleIn(state.regions, b.dataset.k); });
  });
  el.sources.addEventListener('change', function (e) {
    var id = e.target.dataset.id; if (!id) return;
    update(function () { toggleIn(state.off, id); });
  });
  el.group.addEventListener('change', function () { update(function () { state.group = el.group.checked; }); });
  el.multi.addEventListener('change', function () { update(function () { state.multi = el.multi.checked; }); });
  el.sort.addEventListener('change', function () { update(function () { state.sort = el.sort.value; }); });
  el.more.addEventListener('click', function () { shown += PAGE; render(); });
  el.list.addEventListener('click', function (e) {
    var b = e.target.closest('.tag'); if (!b) return;
    update(function () {
      if (b.dataset.topic && state.topics.indexOf(b.dataset.topic) === -1) state.topics.push(b.dataset.topic);
      if (b.dataset.region && state.regions.indexOf(b.dataset.region) === -1) state.regions.push(b.dataset.region);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  el.active.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var k = b.dataset.kind, v = b.dataset.v;
    update(function () {
      if (k === 'q') state.q = '';
      if (k === 'topic') toggleIn(state.topics, v);
      if (k === 'region') toggleIn(state.regions, v);
      if (k === 'multi') state.multi = false;
      if (k === 'mute') state.mute = muted().filter(function (w) { return w !== v; }).join(', ');
    });
  });
  function reset() { update(function () { state = JSON.parse(JSON.stringify(DEFAULTS)); }); }
  $('reset').addEventListener('click', reset);
  $('empty-reset').addEventListener('click', reset);
  el.toggle.addEventListener('click', function () {
    var open = !el.filters.classList.contains('open');
    el.filters.classList.toggle('open', open);
    el.toggle.setAttribute('aria-expanded', String(open));
  });
  window.addEventListener('hashchange', function () {
    var next = load();
    next.off = state.off; next.mute = state.mute; next.group = state.group;
    state = next; shown = PAGE; render();
  });
  el.refresh.addEventListener('click', function () { fetchNews(true); });

  // ---------- data ----------
  function fetchNews(manual) {
    el.refresh.classList.add('spin');
    el.refresh.disabled = true;
    if (!data) el.list.innerHTML = '<li class="skeleton"></li><li class="skeleton"></li><li class="skeleton"></li>';
    return fetch('/api/news' + (manual ? '?t=' + Math.floor(Date.now() / 60000) : ''), { headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        data = d;
        var up = data.sources.filter(function (s) { return s.ok; }).length;
        el.updated.textContent = 'Updated ' + ago(data.generated) + ' · ' + up + '/' + data.sources.length + ' outlets';
        el.updated.title = new Date(data.generated).toLocaleString();
        render();
      })
      .catch(function () {
        if (!data) {
          el.list.innerHTML = '<li class="error"><strong>Couldn\'t load the news.</strong> Check your connection and press refresh.</li>';
          el.updated.textContent = 'Offline';
        }
      })
      .then(function () { el.refresh.classList.remove('spin'); el.refresh.disabled = false; });
  }

  fetchNews(false);
  // Keep relative times and stories fresh while the tab is open.
  setInterval(function () { if (document.visibilityState === 'visible') fetchNews(false); }, 10 * 60 * 1000);
})();
