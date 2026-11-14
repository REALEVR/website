'use strict';
// Uganda news filtering network: fetches RSS feeds from Ugandan outlets,
// normalises them, tags each story with topics and regions, and groups
// stories that several outlets are covering. No dependencies.

const SOURCES = [
  { id: 'monitor', name: 'Daily Monitor', url: 'https://www.monitor.co.ug/rss.xml', home: 'https://www.monitor.co.ug' },
  { id: 'nilepost', name: 'Nile Post', url: 'https://nilepost.co.ug/feed', home: 'https://nilepost.co.ug' },
  { id: 'independent', name: 'The Independent', url: 'https://www.independent.co.ug/feed/', home: 'https://www.independent.co.ug' },
  { id: 'observer', name: 'The Observer', url: 'https://observer.ug/feed', home: 'https://observer.ug' },
  { id: 'softpower', name: 'SoftPower', url: 'https://www.softpower.ug/feed/', home: 'https://www.softpower.ug' },
  { id: 'watchdog', name: 'Watchdog Uganda', url: 'https://www.watchdoguganda.com/feed', home: 'https://www.watchdoguganda.com' },
  { id: 'ceo', name: 'CEO Magazine Uganda', url: 'https://www.ceo.co.ug/feed/', home: 'https://www.ceo.co.ug' },
  { id: 'cooperator', name: 'The Cooperator', url: 'https://thecooperator.news/feed', home: 'https://thecooperator.news' }
];

// Keyword lists are matched on whole words against title + summary.
const TOPICS = {
  'Politics': ['parliament', 'mp', 'mps', 'speaker', 'nrm', 'nup', 'fdc', 'election', 'elections', 'electoral', 'museveni', 'kyagulanyi', 'bobi wine', 'besigye', 'minister', 'cabinet', 'opposition', 'president', 'presidential', 'party', 'vote', 'voters', 'constituency', 'lc5', 'rdc', 'state house'],
  'Business & Economy': ['business', 'economy', 'economic', 'bank', 'banks', 'banking', 'tax', 'taxes', 'ura', 'budget', 'trade', 'traders', 'investors', 'investment', 'market', 'shilling', 'inflation', 'bou', 'bank of uganda', 'loan', 'loans', 'revenue', 'export', 'exports', 'import', 'imports', 'kacita', 'stock', 'profit', 'sacco', 'saccos', 'finance', 'financial', 'oil', 'eacop', 'mining', 'manufacturing', 'sme', 'smes'],
  'Property & Land': ['land', 'property', 'properties', 'real estate', 'housing', 'house', 'houses', 'homes', 'mortgage', 'mortgages', 'rent', 'rental', 'tenant', 'tenants', 'landlord', 'landlords', 'eviction', 'evictions', 'evicted', 'land title', 'land titles', 'plot', 'plots', 'apartment', 'apartments', 'developer', 'developers', 'construction', 'buildings', 'nhcc', 'mailo', 'squatters', 'land grabbing', 'land wrangle', 'land dispute', 'urban planning', 'kcca'],
  'Infrastructure & Transport': ['road', 'roads', 'unra', 'bridge', 'railway', 'sgr', 'airport', 'entebbe airport', 'uganda airlines', 'expressway', 'boda', 'bodas', 'boda boda', 'taxi', 'traffic', 'transport', 'electricity', 'umeme', 'uedcl', 'power supply', 'power outage', 'hydropower', 'dam', 'water supply', 'nwsc', 'infrastructure'],
  'Health': ['health', 'hospital', 'hospitals', 'doctor', 'doctors', 'nurse', 'nurses', 'patients', 'disease', 'outbreak', 'ebola', 'malaria', 'hiv', 'aids', 'tb', 'cholera', 'mpox', 'vaccine', 'vaccination', 'medical', 'medicine', 'medicines', 'mulago', 'clinic', 'maternal', 'cancer'],
  'Education': ['school', 'schools', 'pupils', 'students', 'student', 'teacher', 'teachers', 'university', 'makerere', 'education', 'uneb', 'ple', 'uce', 'uace', 'exams', 'examinations', 'learners', 'curriculum', 'tuition', 'graduation', 'bursary', 'kyambogo'],
  'Security & Justice': ['police', 'updf', 'army', 'soldiers', 'arrested', 'arrest', 'court', 'courts', 'judge', 'magistrate', 'suspect', 'suspects', 'murder', 'killed', 'robbery', 'theft', 'fraud', 'corruption', 'jail', 'prison', 'prisons', 'charged', 'trial', 'bail', 'crime', 'criminal', 'igg', 'dpp', 'shot', 'attack', 'adf'],
  'Agriculture': ['agriculture', 'farmers', 'farmer', 'farming', 'coffee', 'tea', 'cotton', 'maize', 'beans', 'cattle', 'livestock', 'dairy', 'fish', 'fisheries', 'crop', 'crops', 'harvest', 'parish development model', 'pdm', 'hunger', 'food security', 'famine', 'naads', 'operation wealth creation', 'agro', 'agribusiness', 'cooperative', 'cooperatives'],
  'Technology': ['technology', 'tech', 'digital', 'internet', 'mobile money', 'mtn', 'airtel', 'telecom', 'ict', 'startup', 'startups', 'ai', 'artificial intelligence', 'cyber', 'software', 'innovation', 'fintech'],
  'Environment & Climate': ['climate', 'environment', 'environmental', 'nema', 'forest', 'forests', 'wetland', 'wetlands', 'floods', 'flooding', 'landslide', 'landslides', 'drought', 'rain', 'rains', 'weather', 'pollution', 'lake victoria', 'wildlife', 'uwa', 'tourism', 'tourists', 'national park'],
  'Sports': ['sport', 'sports', 'football', 'cranes', 'fufa', 'upl', 'match', 'league', 'goal', 'goals', 'athletics', 'cheptegei', 'kiplimo', 'cricket', 'rugby', 'boxing', 'basketball', 'netball', 'she cranes', 'afcon', 'chan', 'coach', 'tournament', 'olympics'],
  'Entertainment & Culture': ['music', 'musician', 'artist', 'concert', 'film', 'movie', 'celebrity', 'festival', 'culture', 'cultural', 'kabaka', 'buganda', 'kingdom', 'fashion', 'comedy', 'nyege nyege']
};

const REGIONS = {
  'Kampala': ['kampala', 'kcca', 'nakawa', 'kawempe', 'rubaga', 'lubaga', 'makindye', 'ntinda', 'kololo', 'nakasero', 'bugolobi', 'kisenyi', 'owino', 'kiteezi'],
  'Central': ['wakiso', 'mukono', 'entebbe', 'masaka', 'mpigi', 'luweero', 'luwero', 'mityana', 'mubende', 'kayunga', 'buikwe', 'lugazi', 'nakasongola', 'nakaseke', 'kalangala', 'rakai', 'lyantonde', 'sembabule', 'kalungu', 'bukomansimbi', 'gomba', 'butambala', 'kyotera', 'kiboga', 'kyankwanzi', 'kira', 'nansana', 'buganda'],
  'Eastern': ['jinja', 'mbale', 'soroti', 'tororo', 'busia', 'iganga', 'kamuli', 'mayuge', 'bugiri', 'pallisa', 'kumi', 'kapchorwa', 'bududa', 'namayingo', 'kaliro', 'butaleja', 'sironko', 'bukedea', 'katakwi', 'amuria', 'serere', 'ngora', 'busoga', 'teso', 'elgon', 'bugisu', 'namutumba', 'luuka', 'buyende'],
  'Northern': ['gulu', 'lira', 'arua', 'kitgum', 'pader', 'moroto', 'kotido', 'kaabong', 'nebbi', 'adjumani', 'moyo', 'yumbe', 'koboko', 'apac', 'oyam', 'amuru', 'nwoya', 'agago', 'otuke', 'alebtong', 'dokolo', 'kole', 'abim', 'napak', 'nakapiripirit', 'amudat', 'karamoja', 'acholi', 'lango', 'west nile', 'zombo', 'obongi', 'madi'],
  'Western': ['mbarara', 'fort portal', 'kasese', 'hoima', 'kabale', 'bushenyi', 'isingiro', 'masindi', 'ntungamo', 'rukungiri', 'kisoro', 'kanungu', 'ibanda', 'kiruhura', 'kyenjojo', 'kamwenge', 'bundibugyo', 'kibaale', 'kagadi', 'kikuube', 'buliisa', 'kyegegwa', 'sheema', 'mitooma', 'rubirizi', 'buhweju', 'rwampara', 'kazo', 'ankole', 'kigezi', 'bunyoro', 'tooro', 'rwenzori', 'albertine'],
  'East Africa & World': ['kenya', 'tanzania', 'rwanda', 'burundi', 'south sudan', 'drc', 'congo', 'somalia', 'ethiopia', 'eac', 'east african community', 'nairobi', 'kigali', 'dar es salaam', 'juba', 'usa', 'america', 'trump', 'china', 'britain', 'europe', 'russia', 'ukraine', 'israel', 'gaza', 'united nations', 'imf', 'world bank']
};

const PER_SOURCE = 60;

const STOP = new Set('a an the and or of to in on for with at by from as is are was were be been it its this that over after into new says say said about up out his her their they he she we you our not no but how why what who will has have had more than amid uganda ugandan ugandans'.split(' '));

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function compile(map) {
  const out = {};
  for (const [k, words] of Object.entries(map)) {
    out[k] = new RegExp('\\b(' + words.map(escapeRe).join('|') + ')\\b', 'i');
  }
  return out;
}
const TOPIC_RE = compile(TOPICS);
const REGION_RE = compile(REGIONS);

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
function decode(s) {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}
function unwrap(s) { return s ? s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1') : ''; }
function stripHtml(s) {
  return decode(s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ').trim();
}
function tag(block, name) {
  const m = block.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>', 'i'));
  return m ? unwrap(m[1]) : '';
}
function attr(block, re) { const m = block.match(re); return m ? decode(m[1]) : ''; }

function clip(s, n) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  return cut.slice(0, cut.lastIndexOf(' ') > n * 0.6 ? cut.lastIndexOf(' ') : n).replace(/[,.;:\s]+$/, '') + '…';
}

function parseFeed(xml, source) {
  const items = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    const title = stripHtml(tag(b, 'title'));
    let link = stripHtml(tag(b, 'link')) || attr(b, /<link[^>]+href="([^"]+)"/i);
    if (!title || !/^https?:\/\//.test(link)) continue;
    const rawDesc = tag(b, 'description') || tag(b, 'summary') || tag(b, 'content:encoded') || tag(b, 'content');
    let summary = stripHtml(rawDesc).replace(/The post .* appeared first on .*$/i, '').trim();
    if (summary === title) summary = '';
    const dateStr = tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date');
    const t = Date.parse(dateStr.trim());
    const image = attr(b, /<media:content[^>]+url="([^"]+)"/i) ||
      attr(b, /<media:thumbnail[^>]+url="([^"]+)"/i) ||
      attr(b, /<enclosure[^>]+url="([^"]+\.(?:jpe?g|png|webp|gif)[^"]*)"/i) ||
      attr(tag(b, 'content:encoded') || rawDesc, /<img[^>]+src="([^"]+)"/i);
    items.push({
      id: '',
      title,
      link: link.trim(),
      summary: clip(summary, 280),
      published: Number.isFinite(t) ? new Date(t).toISOString() : null,
      image: /^https?:\/\//.test(image) ? image : null,
      source: source.id
    });
  }
  return items;
}

function classify(item) {
  const text = (item.title + ' ' + item.summary).toLowerCase();
  const head = item.title.toLowerCase();
  const topics = [];
  for (const [k, re] of Object.entries(TOPIC_RE)) if (re.test(text)) topics.push(k);
  const regions = [];
  for (const [k, re] of Object.entries(REGION_RE)) {
    // Foreign place names in a summary are often passing mentions, so they must be in the headline.
    if (k === 'East Africa & World' ? re.test(head) : re.test(text)) regions.push(k);
  }
  item.topics = topics.length ? topics : ['General'];
  item.regions = regions;
  return item;
}

function tokens(title) {
  return new Set(title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w)).map(w => w.replace(/(ing|ed|es|s)$/, '')));
}
function similarity(a, b) {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / Math.min(a.size, b.size || 1);
}

// Groups stories about the same event across outlets. Each group gets the
// id of its earliest story; every story records how many outlets carry it.
function cluster(items) {
  const toks = items.map(i => tokens(i.title));
  const parent = items.map((_, i) => i);
  const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (items[i].source === items[j].source) continue;
      if (toks[i].size < 3 || toks[j].size < 3) continue;
      const ti = Date.parse(items[i].published || 0), tj = Date.parse(items[j].published || 0);
      if (Math.abs(ti - tj) > 3 * 864e5) continue;
      if (similarity(toks[i], toks[j]) >= 0.6) parent[find(j)] = find(i);
    }
  }
  const groups = new Map();
  items.forEach((it, i) => {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(it);
  });
  for (const members of groups.values()) {
    members.sort((a, b) => (a.published || '').localeCompare(b.published || ''));
    const cid = members[0].id;
    const outlets = [...new Set(members.map(m => m.source))];
    for (const m of members) { m.cluster = cid; m.coverage = outlets.length; }
  }
  return items;
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

async function fetchSource(source, timeoutMs) {
  const started = Date.now();
  try {
    const res = await fetch(source.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UgandaNewsFilter/1.0)', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow'
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const xml = await res.text();
    const items = parseFeed(xml, source);
    if (!items.length) throw new Error('No stories found in feed');
    return { items, status: { id: source.id, ok: true, count: items.length, ms: Date.now() - started } };
  } catch (err) {
    return { items: [], status: { id: source.id, ok: false, error: String(err && err.message || err), ms: Date.now() - started } };
  }
}

async function collect({ timeoutMs = 9000 } = {}) {
  const results = await Promise.all(SOURCES.map(s => fetchSource(s, timeoutMs)));
  const seen = new Set();
  const items = [];
  for (const r of results) {
    for (const it of r.items.slice(0, PER_SOURCE)) {
      const key = it.link.replace(/[?#].*$/, '').replace(/\/$/, '');
      if (seen.has(key)) continue;
      seen.add(key);
      it.id = hash(key);
      items.push(classify(it));
    }
  }
  items.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
  cluster(items);
  return {
    generated: new Date().toISOString(),
    sources: SOURCES.map(s => {
      const st = results.find(r => r.status.id === s.id).status;
      return { id: s.id, name: s.name, home: s.home, ok: st.ok, count: st.count || 0, error: st.error || null };
    }),
    topics: [...Object.keys(TOPICS), 'General'],
    regions: Object.keys(REGIONS),
    items
  };
}

module.exports = { SOURCES, TOPICS, REGIONS, parseFeed, classify, cluster, collect, stripHtml };
