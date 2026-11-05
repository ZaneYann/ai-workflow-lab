const https = require('node:https');
const { EventEmitter } = require('node:events');
https.request = (options, callback) => {
  const request = new EventEmitter();
  request.setTimeout = () => request;
  request.end = () => process.nextTick(() => {
    if (process.env.EXPORT_TEST_SCENARIO === 'failure') {
      const error = new Error('timed out secret-token');
      error.code = 'ETIMEDOUT';
      request.emit('error', error);
      return;
    }
    const response = new EventEmitter();
    response.statusCode = 200;
    response.setEncoding = () => {};
    callback(response);
    let items = process.env.EXPORT_TEST_SCENARIO === 'empty' ? [] : [
      { full_name: 'octo/first', language: 'JavaScript', stargazers_count: 9 },
      { full_name: 'octo/second', language: 'Python', stargazers_count: 4 },
      { full_name: 'octo/third', language: 'JavaScript', stargazers_count: 2 },
    ];
    if (process.env.EXPORT_TEST_SCENARIO === 'special') {
      items = [{ full_name: 'octo/special', name: 'special', description: 'A long description '.repeat(5) + 'line\nnext\tcell\u001b[31m', html_url: 'https://github.com/octo/special', language: 'JavaScript', stargazers_count: 1234, forks_count: 45, stars_today: 6, updated_at: '2026-11-05T10:00:00Z' }];
    }
    const params = new URL(`https://api.github.com${options.path}`).searchParams;
    if (params.get('sort') === 'updated') {
      if (!params.get('q').includes('language:JavaScript') || !params.get('q').includes('demo') || !['2', '4'].includes(params.get('per_page'))) {
        throw new Error('query options were not forwarded');
      }
      // Simulate GitHub's updated-descending order, including a nonmatching language.
      items = [
        { full_name: 'octo/third', language: 'JavaScript', updated_at: '2026-11-05T12:00:00Z' },
        { full_name: 'octo/second', language: 'JavaScript', updated_at: '2026-11-05T11:00:00Z' },
        { full_name: 'octo/first', language: 'JavaScript', updated_at: '2026-11-05T10:00:00Z' },
        { full_name: 'octo/python', language: 'Python', updated_at: '2026-11-05T09:00:00Z' },
      ];
    }
    response.emit('data', JSON.stringify({ items }));
    response.emit('end');
  });
  return request;
};
