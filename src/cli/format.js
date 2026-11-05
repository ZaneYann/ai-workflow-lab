const Table = require('cli-table3');
const chalk = require('chalk');

const TABLE_HEADERS = [
  'trendDate', 'fullName (Repository)', 'name', 'description', 'url',
  'language', 'stars', 'forks', 'dailyGrowth', 'updatedAt', 'fetchedAt',
];

const TABLE_FIELDS = [
  'trendDate', 'fullName', 'name', 'description', 'url',
  'language', 'stars', 'forks', 'dailyGrowth', 'updatedAt', 'fetchedAt',
];

function displayValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return String(value);
}

function truncate(value, maxLength) {
  const text = displayValue(value);
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('en-US') : displayValue(value);
}

function shouldUseColor(color) {
  if (typeof color === 'boolean') {
    return color;
  }
  return Boolean(process.stdout.isTTY && !process.env.NO_COLOR);
}

function formatJson(items) {
  return JSON.stringify(items, null, 2);
}

// Escape control characters so each repository stays on one physical line and
// data cannot inject terminal control sequences. Preserve all other characters.
function tableValue(value) {
  return JSON.stringify(displayValue(value)).slice(1, -1)
    .replace(/[\u007f-\u009f\u2028\u2029\u2500-\u257f]/g, (char) =>
      `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

function formatTable(items = [], { color } = {}) {
  if (items.length === 0) {
    return '[]';
  }

  const colors = new chalk.Instance({ level: shouldUseColor(color) ? 1 : 0 });
  const table = new Table({
    head: TABLE_HEADERS.map((header) => colors.bold(header)),
    style: {
      head: [],
      border: [],
    },
  });

  items.forEach((item) => {
    table.push(TABLE_FIELDS.map((field) => tableValue(item[field])));
  });

  return table.toString();
}

function formatOutput(items, { format = 'json', color } = {}) {
  if (format === 'json') {
    return formatJson(items);
  }
  if (format === 'table') {
    return formatTable(items, { color });
  }
  throw new Error('format must be json or table');
}

module.exports = {
  TABLE_HEADERS,
  displayValue,
  formatJson,
  formatNumber,
  formatOutput,
  formatTable,
  truncate,
};
