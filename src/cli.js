#!/usr/bin/env node

const { parseArgs } = require('./cli/args');
const { formatOutput } = require('./cli/format');
const { fetchTrendingSafe } = require('./services/github-fetcher');

async function main(argv = process.argv.slice(2), { request, stdout = process.stdout, stderr = process.stderr } = {}) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    if (error.code === 'commander.helpDisplayed' || error.code === 'commander.version') {
      return 0;
    }
    throw error;
  }
  const token = options.token || process.env.GITHUB_TOKEN;
  const result = await fetchTrendingSafe({ ...options, token }, { request });

  if (result.error) {
    stderr.write(`${result.error}\n`);
    return 1;
  }

  stdout.write(`${formatOutput(result.items, { format: options.format })}\n`);
  return 0;
}

if (require.main === module) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  });
}

module.exports = { main };
