const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('../cli/args');
const { fetchTrendingSafe } = require('../services/github-fetcher');
const { formatOutput } = require('../cli/format');

const assets = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
};
const allowed = new Set(['period', 'language', 'keyword', 'limit', 'sort', 'date']);

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; base-uri 'none'; frame-ancestors 'none'" });
  res.end(body);
}

function createServer({ request } = {}) {
  return http.createServer(async (req, res) => {
    try {
      const host = req.headers.host || '';
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/i.test(host)) return send(res, 403, JSON.stringify({ error: 'Invalid host.' }));
      if (req.method !== 'GET') return send(res, 405, JSON.stringify({ error: 'Method not allowed.' }));
      const url = new URL(req.url, 'http://localhost');
      if (assets[url.pathname]) {
        const [file, type] = assets[url.pathname];
        return send(res, 200, fs.readFileSync(path.join(__dirname, file)), type);
      }
      if (url.pathname !== '/api/query') return send(res, 404, JSON.stringify({ error: 'Not found.' }));
      const argv = [];
      for (const [key, value] of url.searchParams) {
        if (!allowed.has(key) || url.searchParams.getAll(key).length !== 1) return send(res, 400, JSON.stringify({ error: 'Invalid query parameters.' }));
        argv.push(`--${key}`, value);
      }
      let options;
      try { options = parseArgs(argv); } catch (_) { return send(res, 400, JSON.stringify({ error: 'Invalid query parameters. Check the selected values.' })); }
      const result = await fetchTrendingSafe({ ...options, token: process.env.GITHUB_TOKEN }, { request });
      if (result.error) {
        const invalid = /date|period/i.test(result.error);
        return send(res, invalid ? 400 : 502, JSON.stringify({ error: result.error }));
      }
      return send(res, 200, JSON.stringify({ items: result.items, json: `${formatOutput(result.items, { format: 'json' })}\n`, table: `${formatOutput(result.items, { format: 'table', color: false })}\n` }));
    } catch (_) {
      return send(res, 500, JSON.stringify({ error: 'Unable to process the request.' }));
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, '127.0.0.1', () => console.log(`Local page: http://127.0.0.1:${port}`));
}
module.exports = { createServer };
