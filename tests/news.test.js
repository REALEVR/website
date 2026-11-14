'use strict';
// Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const { parseFeed, classify, cluster } = require('../api/_lib/news');

const RSS = `<?xml version="1.0"?><rss><channel>
<item><title><![CDATA[KCCA evicts traders from Kampala plots &amp; markets]]></title>
<link>https://example.ug/a?utm=x</link>
<description><![CDATA[<p>Land row in <b>Nakawa</b>.</p><img src="https://example.ug/a.jpg">]]></description>
<pubDate>Sat, 14 Nov 2026 10:00:00 +0300</pubDate></item>
<item><title>No link here</title></item>
</channel></rss>`;

test('parseFeed reads CDATA, entities, images and dates, and skips broken items', () => {
  const items = parseFeed(RSS, { id: 'ex' });
  assert.strictEqual(items.length, 1);
  const it = items[0];
  assert.strictEqual(it.title, 'KCCA evicts traders from Kampala plots & markets');
  assert.strictEqual(it.summary, 'Land row in Nakawa .');
  assert.strictEqual(it.image, 'https://example.ug/a.jpg');
  assert.strictEqual(it.published, '2026-11-14T07:00:00.000Z');
  assert.strictEqual(it.source, 'ex');
});

test('parseFeed handles Atom entries', () => {
  const atom = '<feed><entry><title>Cranes beat Kenya</title><link href="https://x.ug/c"/><updated>2026-11-01T00:00:00Z</updated><summary>Football</summary></entry></feed>';
  const [it] = parseFeed(atom, { id: 'x' });
  assert.strictEqual(it.link, 'https://x.ug/c');
  assert.strictEqual(it.summary, 'Football');
});

test('classify tags topics and regions by whole word', () => {
  const it = classify({ title: 'Gulu farmers get coffee seedlings', summary: 'The minister spoke in Lira.' });
  assert.ok(it.topics.includes('Agriculture'));
  assert.ok(it.topics.includes('Politics'));
  assert.deepStrictEqual(it.regions, ['Northern']);
  const plain = classify({ title: 'Something happened', summary: '' });
  assert.deepStrictEqual(plain.topics, ['General']);
  // "Lands" in "Netherlands" must not tag Property & Land.
  assert.ok(!classify({ title: 'Netherlands team arrives', summary: '' }).topics.includes('Property & Land'));
});

test('cluster groups the same story across outlets only', () => {
  const t = '2026-11-14T08:00:00.000Z';
  const items = [
    { id: '1', source: 'a', published: t, title: 'Standard Chartered hands over retail banking to Absa after 114 years' },
    { id: '2', source: 'b', published: t, title: 'StanChart transfers retail banking to Absa after 114 years' },
    { id: '3', source: 'a', published: t, title: 'Standard Chartered retail banking Absa 114 years explainer' },
    { id: '4', source: 'c', published: t, title: 'Cranes name squad for Afcon qualifier' }
  ];
  cluster(items);
  assert.strictEqual(items[0].cluster, items[1].cluster);
  assert.strictEqual(items[0].coverage, 2);
  assert.strictEqual(items[3].coverage, 1);
  assert.notStrictEqual(items[3].cluster, items[0].cluster);
});
