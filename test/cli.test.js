const test = require('node:test');
const assert = require('node:assert/strict');

const { main } = require('../src/cli');

function captureStream() {
  let value = '';
  return {
    write(chunk) {
      value += chunk;
    },
    get value() {
      return value;
    },
  };
}

const RESPONSE = {
  items: [{
    full_name: 'octo/demo',
    description: 'demo project',
    html_url: 'https://github.com/octo/demo',
    language: 'JavaScript',
    stargazers_count: 12,
    forks_count: 3,
    updated_at: '2026-11-05T10:00:00Z',
  }],
};

test('main emits JSON by default and returns success', async () => {
  const stdout = captureStream();
  const stderr = captureStream();
  const exitCode = await main([], {
    request: async () => RESPONSE,
    stdout,
    stderr,
  });

  assert.equal(exitCode, 0);
  assert.equal(JSON.parse(stdout.value)[0].fullName, 'octo/demo');
  assert.equal(stderr.value, '');
});

test('main emits the terminal table when requested', async () => {
  const stdout = captureStream();
  const stderr = captureStream();
  const exitCode = await main(['--format', 'table'], {
    request: async () => RESPONSE,
    stdout,
    stderr,
  });

  assert.equal(exitCode, 0);
  assert.match(stdout.value, /Repository/);
  assert.match(stdout.value, /octo\/demo/);
  assert.equal(stderr.value, '');
});

test('main reports fetch errors on stderr and leaves stdout clean', async () => {
  const stdout = captureStream();
  const stderr = captureStream();
  const exitCode = await main([], {
    request: async () => {
      const error = new Error('timeout');
      error.code = 'ETIMEDOUT';
      throw error;
    },
    stdout,
    stderr,
  });

  assert.equal(exitCode, 1);
  assert.equal(stdout.value, '');
  assert.match(stderr.value, /timed out/);
});

test('main gives the language-specific no-data hint and never prints an empty table', async () => {
  const stdout = captureStream();
  const stderr = captureStream();
  const exitCode = await main(['--language', 'does-not-exist', '--format', 'table'], {
    request: async () => ({ items: [] }),
    stdout,
    stderr,
  });

  assert.equal(exitCode, 0);
  assert.equal(stdout.value, '[]\n');
  assert.equal(stderr.value, '未找到相关语言的趋势数据\n');
  assert.equal(stdout.value.includes('┌'), false);
});

test('main reports no language data after local filtering of an API response', async () => {
  const stdout = captureStream();
  const stderr = captureStream();
  const exitCode = await main(['--language', 'Ruby'], {
    request: async () => ({
      items: [{
        full_name: 'octo/js',
        language: 'JavaScript',
        stargazers_count: 1,
        forks_count: 0,
      }],
    }),
    stdout,
    stderr,
  });

  assert.equal(exitCode, 0);
  assert.equal(stdout.value, '[]\n');
  assert.equal(stderr.value, '未找到相关语言的趋势数据\n');
});
