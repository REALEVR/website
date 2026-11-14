'use strict';
// GET /api/news → JSON of recent stories from Ugandan outlets, tagged by topic
// and region. Cached at Vercel's edge for 10 minutes so outlets are not
// fetched on every page view.
const { collect } = require('./_lib/news');

module.exports = async function handler(req, res) {
  try {
    const data = await collect();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: 'Could not load news right now.' }));
  }
};
