const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildRequestPath,
  fetchTrending,
  fetchTrendingSafe,
  friendlyErrorMessage,
} = require('../src/services/github-fetcher');

const NOW = new Date('2026-11-05T12:00:00.000Z');

test('buildRequestPath targets the official GitHub repository search API', () => {
  const path = buildRequestPath({
    period: 'weekly',
    language: 'javascript',
    keyword: 'agent',
    limit: 5,
    sort: 'stars',
    date: '2026-11-05',
  });
  const query = new URL(`https://api.github.com${path}`).searchParams;

  assert.equal(new URL(`https://api.github.com${path}`).pathname, '/search/repositories');
  assert.match(query.get('q'), /created:>=2026-10-29/);
  assert.match(query.get('q'), /language:javascript/);
  assert.match(query.get('q'), /agent/);
  assert.equal(query.get('per_page'), '5');
  assert.equal(query.get('sort'), 'stars');
});

test('fetchTrending normalizes a successful API response', async () => {
  let requestedPath;
  const items = await fetchTrending({ period: 'daily', limit: 1 }, {
    now: NOW,
    request: async (path) => {
      requestedPath = path;
      return {
        items: [{
          full_name: 'octo/demo',
          name: 'demo',
          description: null,
          html_url: 'https://github.com/octo/demo',
          language: 'JavaScript',
          stargazers_count: 42,
          forks_count: 7,
          updated_at: '2026-11-05T10:00:00Z',
        }],
      };
    },
  });

  assert.match(requestedPath, /^\/search\/repositories\?/);
  assert.deepEqual(items[0], {
    trendDate: '2026-11-05',
    fullName: 'octo/demo',
    name: 'demo',
    description: '',
    url: 'https://github.com/octo/demo',
    language: 'JavaScript',
    stars: 42,
    forks: 7,
    dailyGrowth: null,
    updatedAt: '2026-11-05T10:00:00Z',
    fetchedAt: '2026-11-05T12:00:00.000Z',
  });
});

test('fetchTrendingSafe turns a 404 into a friendly result without throwing', async () => {
  const result = await fetchTrendingSafe({}, {
    request: async () => {
      const error = new Error('raw response should not leak');
      error.statusCode = 404;
      throw error;
    },
  });

  assert.deepEqual(result, {
    items: [],
    error: 'GitHub API resource was not found (404).',
  });
});

test('fetchTrendingSafe handles network timeout and never exposes token text', async () => {
  const result = await fetchTrendingSafe({ token: 'secret-token' }, {
    request: async () => {
      const error = new Error('request timed out with secret-token');
      error.code = 'ETIMEDOUT';
      throw error;
    },
  });

  assert.deepEqual(result, {
    items: [],
    error: 'GitHub API request timed out. Please try again.',
  });
  assert.equal(result.error.includes('secret-token'), false);
});

test('friendlyErrorMessage gives a useful rate-limit message', () => {
  assert.equal(
    friendlyErrorMessage({ status: 403 }),
    'GitHub API rate limit reached. Set GITHUB_TOKEN or try again later.',
  );
});
