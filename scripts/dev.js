'use strict';
// Local preview with the news API: `node scripts/dev.js`, then open
// http://localhost:8000/news. Serves the static site and runs /api/news.
const http = require('http');
const fs = require('fs');
const path = require('path');
const handler = require('../api/news');

const root = path.join(__dirname, '..');
const port = Number(process.env.PORT) || 8000;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain' };

let cache = null;
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/news') {
    // Mimic the edge cache so reloads are quick while developing.
    if (cache && Date.now() - cache.at < 600e3) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(cache.body);
    }
    const chunks = [];
    const fake = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { chunks.push(b); } };
    await handler(req, fake);
    if (fake.statusCode === 200) cache = { at: Date.now(), body: chunks.join('') };
    res.writeHead(fake.statusCode, fake.headers);
    return res.end(chunks.join(''));
  }
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  let file = path.join(root, p);
  if (!file.startsWith(root) || p.includes('/api/') || p.includes('/.git')) { res.writeHead(404); return res.end('Not found'); }
  if (!path.extname(file)) {
    if (fs.existsSync(file + '.html')) file += '.html';
    else if (fs.existsSync(path.join(file, 'index.html'))) file = path.join(file, 'index.html');
  }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end(fs.readFileSync(path.join(root, '404.html'))); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(port, () => console.log('http://localhost:' + port + '/news'));
