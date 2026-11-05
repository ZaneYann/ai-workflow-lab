const test = require('node:test');
const assert = require('node:assert/strict');

const { DEFAULT_OPTIONS, parseArgs } = require('../src/cli/args');

test('parseArgs returns the documented defaults when no arguments are supplied', () => {
  assert.deepEqual(parseArgs([]), DEFAULT_OPTIONS);
});

test('parseArgs accepts period and language filters', () => {
  assert.deepEqual(parseArgs(['--period', 'weekly', '--language', 'javascript']), {
    ...DEFAULT_OPTIONS,
    period: 'weekly',
    language: 'javascript',
  });
});

test('parseArgs parses the common query options', () => {
  assert.deepEqual(parseArgs([
    '--keyword', 'agent',
    '--limit', '5',
    '--sort', 'growth',
    '--date', '2026-11-05',
  ]), {
    ...DEFAULT_OPTIONS,
    keyword: 'agent',
    limit: 5,
    sort: 'growth',
    date: '2026-11-05',
  });
});

test('parseArgs rejects a non-positive limit', () => {
  assert.throws(() => parseArgs(['--limit', '0']), /limit must be a positive integer/);
});
