const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const cli = path.resolve(__dirname, '../src/cli.js');
const preload = path.resolve(__dirname, '../test-support/github-preload.cjs');
function run(cwd, args = [], scenario = 'normal') {
  return spawnSync(process.execPath, ['--require', preload, cli, ...args], {
    cwd, encoding: 'utf8', env: { ...process.env, EXPORT_TEST_SCENARIO: scenario, GITHUB_TOKEN: 'secret-token' },
  });
}
function temp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trend-export-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('CLI exports the filtered and limited result in stdout order to a relative path', (t) => {
  const dir = temp(t);
  const all = run(dir, ['--language', 'JavaScript', '--keyword', 'demo', '--sort', 'updated', '--limit', '4']);
  assert.equal(all.status, 0, all.stderr);
  assert.deepEqual(JSON.parse(all.stdout).map(item => item.fullName), [
    'octo/third', 'octo/second', 'octo/first',
  ]);

  const result = run(dir, ['--language', 'JavaScript', '--keyword', 'demo', '--sort', 'updated', '--limit', '2', '--output', 'result.json']);
  assert.equal(result.status, 0, result.stderr);
  const items = JSON.parse(result.stdout);
  const exported = JSON.parse(fs.readFileSync(path.join(dir, 'result.json'), 'utf8'));
  assert.deepEqual(items.map(item => item.fullName), ['octo/third', 'octo/second']);
  assert.deepEqual(exported.map(item => item.fullName), ['octo/third', 'octo/second']);
  assert.deepEqual(exported, items);
});

test('CLI exports empty results and preserves table and no-export behavior', (t) => {
  const dir = temp(t);
  const empty = run(dir, ['--output', 'empty.json'], 'empty');
  assert.equal(empty.status, 0, empty.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'empty.json'), 'utf8')), []);
  assert.deepEqual(JSON.parse(empty.stdout), []);
  const table = run(dir, ['--format', 'table', '--output', 'table.json']);
  assert.equal(table.status, 0, table.stderr);
  assert.match(table.stdout, /Repository/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'table.json'), 'utf8'))[0].fullName, 'octo/first');
  const before = fs.readdirSync(dir);
  const normal = run(dir);
  assert.equal(normal.status, 0, normal.stderr);
  assert.equal(JSON.parse(normal.stdout)[0].fullName, 'octo/first');
  assert.deepEqual(fs.readdirSync(dir), before);
});

test('CLI protects existing files unless force is specified', (t) => {
  const dir = temp(t);
  const target = path.join(dir, 'result.json');
  fs.writeFileSync(target, 'original');
  const blocked = run(dir, ['--output', target]);
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /exist/i);
  assert.equal(fs.readFileSync(target, 'utf8'), 'original');
  const forced = run(dir, ['--output', target, '--force']);
  assert.equal(forced.status, 0, forced.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')), JSON.parse(forced.stdout));
});

test('CLI leaves existing and missing targets untouched on query failure', (t) => {
  const dir = temp(t);
  const existing = path.join(dir, 'existing.json');
  fs.writeFileSync(existing, 'original');
  for (const target of [existing, path.join(dir, 'missing.json')]) {
    const result = run(dir, ['--output', target, '--force'], 'failure');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /timed out/i);
    assert.doesNotMatch(result.stderr, /secret-token/);
  }
  assert.equal(fs.readFileSync(existing, 'utf8'), 'original');
  assert.equal(fs.existsSync(path.join(dir, 'missing.json')), false);
});

test('CLI reports missing parent and other write failures without leaking token', (t) => {
  const dir = temp(t);
  for (const target of [path.join(dir, 'missing', 'file.json'), dir]) {
    const result = run(dir, ['--output', target, '--force']);
    assert.notEqual(result.status, 0);
    assert.notEqual(result.stderr.trim(), '');
    assert.doesNotMatch(result.stderr, /secret-token/);
  }
  assert.equal(fs.existsSync(path.join(dir, 'missing')), false);
});

test('CLI help documents export options', () => {
  const result = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /--output/);
  assert.match(result.stdout, /--force/);
});
