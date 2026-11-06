const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { createServer } = require('../src/web/server');

const chrome = process.env.CHROME_PATH || 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, message) {
  for (let n = 0; n < 100; n++) { const value = await fn(); if (value) return value; await delay(100); }
  throw new Error(`Timed out: ${message}`);
}
async function main() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'github-page-e2e-'));
  const profile = path.join(root, 'profile'); const downloads = path.join(root, 'downloads');
  await fs.mkdir(downloads);
  let browser; let socket; let server;
  const oldToken = process.env.GITHUB_TOKEN; process.env.GITHUB_TOKEN = 'browser-test-secret';
  try {
    const calls = [];
    server = createServer({ request: async (requestPath, { token }) => {
      assert.equal(token, 'browser-test-secret'); calls.push(requestPath);
      const query = new URL('https://api.github.com' + requestPath).searchParams.get('q');
      if (query.includes('empty-test')) return { items: [] };
      if (query.includes('error-test')) throw Object.assign(new Error('browser-test-secret'), { code: 'ETIMEDOUT' });
      return { items: [{ full_name: 'octo/example', name: 'example', description: 'Demo repository', html_url: 'https://github.com/octo/example', language: 'JavaScript', stargazers_count: 123, forks_count: 4, updated_at: '2026-11-05T00:00:00Z' }] };
    }});
    await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));
    const base = `http://127.0.0.1:${server.address().port}`;
    browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, base], { stdio: 'ignore' });
    let spawnError; browser.on('error', error => { spawnError = error; });
    const debugPort = await until(async () => { if (spawnError) throw spawnError; if (browser.exitCode !== null) throw Error(`Chrome exited: ${browser.exitCode}`); try { return (await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { return null; } }, 'Chrome DevTools');
    const target = await until(async () => (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()).find(x => x.type === 'page' && x.url.startsWith(base)), 'page target');
    socket = new WebSocket(target.webSocketDebuggerUrl); await once(socket, 'open');
    let nextId = 0; const pending = new Map();
    socket.addEventListener('message', event => { const msg = JSON.parse(event.data); const waiter = pending.get(msg.id); if (waiter) { pending.delete(msg.id); msg.error ? waiter.reject(Error(msg.error.message)) : waiter.resolve(msg.result); } });
    const command = (method, params = {}) => new Promise((resolve, reject) => { const id = ++nextId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    const evaluate = async expression => { const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(result.exceptionDetails.text); return result.result.value; };
    await command('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
    await until(() => evaluate("document.readyState === 'complete' && !!document.querySelector('#query-form')"), 'page ready');
    assert.equal((await fs.readdir(downloads)).length, 0);
    for (const value of ['-1', '1.5']) { assert.equal(await evaluate(`(() => { const input = document.querySelector('[name=min-stars]'); input.value = '${value}'; return input.checkValidity(); })()`), false); }
    await evaluate("document.querySelector('[name=min-stars]').value=''");
    await evaluate(`document.querySelector('[name=min-stars]').value='100'; document.querySelector('[name=language]').value='JavaScript'; document.querySelector('[name=keyword]').value='demo'; document.querySelector('[name=period]').value='weekly'; document.querySelector('[name=limit]').value='2'; document.querySelector('[name=sort]').value='updated'; document.querySelector('[name=date]').value='2026-11-05'; document.querySelector('#submit').click()`);
    await until(() => evaluate("document.querySelector('#status').textContent.includes('查询完成')"), 'successful query');
    assert.match(await evaluate("document.querySelector('#cards').textContent"), /octo\/example/);
    const json = await evaluate("document.querySelector('#output').textContent"); assert.equal(JSON.parse(json)[0].stars, 123);
    const params = new URL('https://api.github.com' + calls[0]).searchParams; assert.match(params.get('q'), /stars:>=100/); assert.match(params.get('q'), /language:JavaScript/); assert.match(params.get('q'), /demo/); assert.match(params.get('q'), /2026-10-29/); assert.equal(params.get('sort'), 'updated'); assert.equal(params.get('per_page'), '2');
    assert.equal((await fs.readdir(downloads)).length, 0, 'query must not download');
    await evaluate("document.querySelector('#download').click()");
    const jsonFile = path.join(downloads, 'github-repositories.json'); await until(async () => { try { return (await fs.readFile(jsonFile, 'utf8')) === json; } catch { return false; } }, 'JSON download');
    await evaluate("document.querySelector('#format').value='table'; document.querySelector('#format').dispatchEvent(new Event('change', {bubbles:true}))");
    const table = await evaluate("document.querySelector('#output').textContent"); assert.match(table, /octo\/example/); assert.match(table, /dailyGrowth/); assert.doesNotMatch(table, /\x1b/);
    await evaluate("document.querySelector('#download').click()");
    const tableFile = path.join(downloads, 'github-repositories.txt'); await until(async () => { try { return (await fs.readFile(tableFile, 'utf8')) === table; } catch { return false; } }, 'table download');
    await evaluate("document.querySelector('[name=min-stars]').value='0'; document.querySelector('[name=keyword]').value='empty-test'; document.querySelector('#submit').click()");
    await until(() => evaluate("document.querySelector('#status').textContent.includes('没有找到结果')"), 'empty state'); assert.equal(await evaluate("document.querySelector('#output').textContent"), '[]\n');
    assert.match(new URL('https://api.github.com' + calls.at(-1)).searchParams.get('q'), /stars:>=0/);
    await evaluate("document.querySelector('[name=min-stars]').value=''; document.querySelector('[name=keyword]').value='error-test'; document.querySelector('#submit').click()");
    await until(() => evaluate("document.querySelector('#status').textContent.includes('查询失败')"), 'error state'); assert.doesNotMatch(new URL('https://api.github.com' + calls.at(-1)).searchParams.get('q'), /stars:>=/); assert.match(await evaluate("document.querySelector('#status').textContent"), /timed out/i); assert.equal(await evaluate("document.querySelector('#download').disabled"), true);
    assert.doesNotMatch(await evaluate('document.documentElement.outerHTML'), /browser-test-secret/);
    await evaluate("document.querySelector('[name=keyword]').value='demo'; document.querySelector('#submit').click()");
    await until(() => evaluate("document.querySelector('#status').textContent.includes('查询完成')"), 'retry');
    console.log('PASS: headless Chrome normal query, options, no automatic download, JSON/table actual downloads, empty, timeout, token secrecy and retry; GitHub requests mocked.');
  } finally {
    if (socket) socket.close();
    if (browser && browser.exitCode === null) { browser.kill(); await Promise.race([once(browser, 'exit').catch(() => {}), delay(3000)]); }
    if (server) await new Promise(resolve => server.close(resolve));
    if (oldToken === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = oldToken;
    await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
