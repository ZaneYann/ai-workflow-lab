const test = require('node:test');
const assert = require('node:assert/strict');

const { formatJson, formatOutput, formatTable } = require('../src/cli/format');

const ITEMS = [{
  fullName: 'octo/demo',
  description: 'A useful repository for demos',
  language: 'JavaScript',
  stars: 1234,
  forks: 56,
  dailyGrowth: 78,
  updatedAt: '2026-11-05T10:00:00Z',
}];

test('formatJson returns stable, machine-readable JSON', () => {
  assert.equal(formatJson(ITEMS), JSON.stringify(ITEMS, null, 2));
  assert.deepEqual(JSON.parse(formatJson(ITEMS)), ITEMS);
});

test('formatTable renders a readable table without ANSI codes when color is disabled', () => {
  const output = formatTable(ITEMS, { color: false });

  assert.match(output, /Repository/);
  assert.match(output, /octo\/demo/);
  assert.match(output, /1,234/);
  assert.match(output, /\+78/);
  assert.equal(/\u001b\[/.test(output), false);
});

test('formatTable uses a consistent placeholder for missing values', () => {
  const output = formatTable([{
    fullName: 'octo/empty',
    description: null,
    language: '',
    stars: 0,
    forks: 0,
    dailyGrowth: null,
    updatedAt: '',
  }], { color: false });

  assert.match(output, /octo\/empty/);
  assert.match(output, /│ -\s+│/);
});

test('formatOutput rejects unsupported formats', () => {
  assert.throws(() => formatOutput([], { format: 'xml' }), /format must be json or table/);
});
