const https = require('node:https');

const GITHUB_API_HOST = 'api.github.com';
const GITHUB_REPOSITORIES_PATH = '/search/repositories';
const PERIOD_DAYS = Object.freeze({
  daily: 1,
  weekly: 7,
  monthly: 30,
});

class GithubApiError extends Error {
  constructor(message, { status, code, cause } = {}) {
    super(message);
    this.name = 'GithubApiError';
    this.status = status;
    this.code = code;
    if (cause) {
      this.cause = cause;
    }
  }
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getReferenceDate(date) {
  if (!date) {
    return new Date();
  }

  const referenceDate = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(referenceDate.getTime())) {
    throw new GithubApiError('The trend date must use YYYY-MM-DD format.', {
      code: 'INVALID_DATE',
    });
  }
  return referenceDate;
}

function getPeriodStartDate(period = 'daily', date) {
  const days = PERIOD_DAYS[period];
  if (!days) {
    throw new GithubApiError('The period must be daily, weekly, or monthly.', {
      code: 'INVALID_PERIOD',
    });
  }

  const referenceDate = getReferenceDate(date);
  referenceDate.setUTCDate(referenceDate.getUTCDate() - days);
  return formatDate(referenceDate);
}

function buildSearchQuery(options = {}) {
  const query = [`created:>=${getPeriodStartDate(options.period, options.date)}`];
  if (options.language) {
    query.push(`language:${options.language}`);
  }
  if (options.minStars !== undefined) {
    query.push(`stars:>=${options.minStars}`);
  }
  if (options.keyword) {
    query.push(options.keyword);
  }
  return query.join(' ');
}

function buildRequestPath(options = {}) {
  const params = new URLSearchParams({
    q: buildSearchQuery(options),
    sort: options.sort === 'updated' ? 'updated' : 'stars',
    order: 'desc',
    per_page: String(Math.min(options.limit || 10, 100)),
  });
  return `${GITHUB_REPOSITORIES_PATH}?${params.toString()}`;
}

function requestGithub(path, { token } = {}) {
  return new Promise((resolve, reject) => {
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'github-trend-cli',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const request = https.request({
      hostname: GITHUB_API_HOST,
      path,
      method: 'GET',
      headers,
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        let payload;
        try {
          payload = body ? JSON.parse(body) : {};
        } catch (error) {
          reject(new GithubApiError('GitHub API returned an invalid response.', {
            status: response.statusCode,
            code: 'INVALID_RESPONSE',
            cause: error,
          }));
          return;
        }

        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new GithubApiError(`GitHub API request failed with status ${response.statusCode}.`, {
            status: response.statusCode,
            code: 'HTTP_ERROR',
          }));
          return;
        }
        resolve(payload);
      });
    });

    request.setTimeout(10000, () => {
      request.destroy(new Error('request timed out'));
    });
    request.on('error', (error) => reject(error));
    request.end();
  });
}

function normalizeRepository(repository, trendDate = new Date(), fetchedAt = trendDate) {
  return {
    trendDate: formatDate(trendDate),
    fullName: repository.full_name || '',
    name: repository.name || '',
    description: repository.description || '',
    url: repository.html_url || repository.url || '',
    language: repository.language || '',
    stars: Number.isFinite(repository.stargazers_count) ? repository.stargazers_count : 0,
    forks: Number.isFinite(repository.forks_count) ? repository.forks_count : 0,
    dailyGrowth: repository.stars_today ?? repository.daily_growth ?? null,
    updatedAt: repository.updated_at || '',
    fetchedAt: fetchedAt.toISOString(),
  };
}

function filterByLanguage(items, language) {
  if (!language) {
    return items;
  }

  const expectedLanguage = String(language).trim().toLocaleLowerCase();
  return items.filter((item) => (
    String(item.language || '').trim().toLocaleLowerCase() === expectedLanguage
  ));
}

function friendlyErrorMessage(error) {
  if (error instanceof GithubApiError && error.code === 'INVALID_DATE') {
    return error.message;
  }
  if (error instanceof GithubApiError && error.code === 'INVALID_PERIOD') {
    return error.message;
  }

  const status = error && (error.status || error.statusCode);
  if (status === 404) {
    return 'GitHub API resource was not found (404).';
  }
  if (status === 403 || status === 429) {
    return 'GitHub API rate limit reached. Set GITHUB_TOKEN or try again later.';
  }
  if (status >= 400) {
    return `GitHub API request failed with status ${status}.`;
  }

  const code = error && error.code;
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT' || /timed out/i.test(error?.message || '')) {
    return 'GitHub API request timed out. Please try again.';
  }
  return 'Unable to reach GitHub API. Please check your network connection.';
}

async function fetchTrending(options = {}, { request = requestGithub, now = new Date() } = {}) {
  const path = buildRequestPath(options);
  const payload = await request(path, { token: options.token });
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const normalizedItems = items
    .slice(0, options.limit || 10)
    .map((repository) => normalizeRepository(repository, now, now));
  return filterByLanguage(normalizedItems, options.language);
}

async function fetchTrendingSafe(options = {}, dependencies = {}) {
  try {
    return { items: await fetchTrending(options, dependencies), error: null };
  } catch (error) {
    return { items: [], error: friendlyErrorMessage(error) };
  }
}

module.exports = {
  GITHUB_API_HOST,
  GithubApiError,
  PERIOD_DAYS,
  buildRequestPath,
  buildSearchQuery,
  fetchTrending,
  fetchTrendingSafe,
  filterByLanguage,
  friendlyErrorMessage,
  getPeriodStartDate,
  normalizeRepository,
  requestGithub,
};
