const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../src/web/server');
const { formatOutput } = require('../src/cli/format');

test('local service handles queries, formats, errors and token safely over HTTP', async (t) => {
  const oldToken = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = 'secret-web-token';
  t.after(() => { if (oldToken === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = oldToken; });
  let scenario = 'normal'; let called = 0;
  const server = createServer({ request: async (path, { token }) => {
    called++; assert.equal(token, 'secret-web-token');
    if (scenario === 'rate') throw Object.assign(new Error('secret-web-token'), { status: 403 });
    if (scenario === 'network') throw Object.assign(new Error('secret-web-token'), { code: 'ETIMEDOUT' });
    if (scenario === 'empty') return { items: [] };
    assert.match(path, /language%3AJavaScript/);
    return { items: [{ full_name: 'octo/demo', name: 'demo', html_url: 'https://github.com/octo/demo', language: 'JavaScript', description: 'line\nnext', stargazers_count: 12 }] };
  }});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  assert.equal(server.address().address, '127.0.0.1');
  const base = `http://127.0.0.1:${server.address().port}`;
  const page = await fetch(base); assert.equal(page.status, 200); assert.match(await page.text(), /查询仓库/);
  let response = await fetch(`${base}/api/query?period=weekly&language=JavaScript&keyword=demo&limit=4&sort=updated&date=2026-11-05`);
  assert.equal(response.status, 200); let raw = await response.text(); assert.doesNotMatch(raw, /secret-web-token/);
  const result = JSON.parse(raw); assert.equal(result.items[0].fullName, 'octo/demo');
  for (const format of ['json', 'table']) assert.equal(result[format], `${formatOutput(result.items, { format, color: false })}\n`);
  assert.match(result.table, /line\\nnext/);
  for (const query of ['limit=0', 'period=bad', 'date=invalid', 'token=secret-web-token', 'sort=stars&sort=updated']) {
    response = await fetch(`${base}/api/query?${query}`); assert.equal(response.status, 400); assert.doesNotMatch(await response.text(), /secret-web-token/);
  }
  scenario = 'empty'; response = await fetch(`${base}/api/query`); assert.equal(response.status, 200); let empty = await response.json(); assert.equal(empty.json, '[]\n'); assert.equal(empty.table, '[]\n');
  for (scenario of ['rate', 'network']) { response = await fetch(`${base}/api/query`); assert.equal(response.status, 502); raw = await response.text(); assert.doesNotMatch(raw, /secret-web-token/); assert.match(raw, scenario === 'rate' ? /rate limit/i : /timed out/i); }
  assert.ok(called >= 4);
  const badHostStatus = await new Promise((resolve, reject) => require('node:http').get(base + '/api/query', { headers: { Host: 'attacker.example' } }, res => { res.resume(); resolve(res.statusCode); }).on('error', reject)); assert.equal(badHostStatus, 403);
});
