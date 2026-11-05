const { Command, InvalidArgumentError } = require('commander');

const DEFAULT_OPTIONS = Object.freeze({
  period: 'daily',
  language: undefined,
  keyword: undefined,
  limit: 10,
  sort: 'stars',
  format: 'json',
  date: undefined,
  token: undefined,
});

function parseLimit(value) {
  const limit = Number.parseInt(value, 10);
  if (!Number.isInteger(limit) || limit < 1) {
    throw new InvalidArgumentError('limit must be a positive integer');
  }
  return limit;
}

function createProgram() {
  return new Command()
    .name('github-trend')
    .description('Query GitHub trending repositories as JSON or a terminal table.')
    .configureOutput({ writeErr: () => {} })
    .version('0.1.0')
    .option('--period <period>', 'trend period: daily, weekly, or monthly', DEFAULT_OPTIONS.period)
    .option('--language <language>', 'filter by the primary programming language')
    .option('--keyword <keyword>', 'filter by repository name or description')
    .option('--limit <number>', 'maximum number of repositories to return', parseLimit, DEFAULT_OPTIONS.limit)
    .option('--sort <field>', 'sort by stars or daily growth', DEFAULT_OPTIONS.sort)
    .option('--format <format>', 'output format: json or table', DEFAULT_OPTIONS.format)
    .option('--date <date>', 'trend date in YYYY-MM-DD format')
    .option('--token <token>', 'GitHub token (prefer GITHUB_TOKEN for scripts)');
}

function parseArgs(argv = process.argv.slice(2)) {
  const program = createProgram();
  program.exitOverride();
  program.parse(argv, { from: 'user' });

  const options = program.opts();
  return {
    ...DEFAULT_OPTIONS,
    ...options,
  };
}

module.exports = {
  DEFAULT_OPTIONS,
  createProgram,
  parseArgs,
  parseLimit,
};
