const Table = require('cli-table3');
const chalk = require('chalk');

const TABLE_HEADERS = [
  'Rank',
  'Repository',
  'Description',
  'Language',
  'Stars',
  'Forks',
  'Daily Growth',
  'Updated At',
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

function formatTable(items = [], { color } = {}) {
  const colors = new chalk.Instance({ level: shouldUseColor(color) ? 1 : 0 });
  const table = new Table({
    head: TABLE_HEADERS.map((header) => colors.bold(header)),
    style: {
      head: [],
      border: [],
    },
    colWidths: [6, 28, 42, 16, 12, 12, 16, 22],
    wordWrap: true,
  });

  items.forEach((item, index) => {
    table.push([
      String(index + 1),
      displayValue(item.fullName || item.name),
      truncate(item.description, 40),
      displayValue(item.language),
      formatNumber(item.stars),
      formatNumber(item.forks),
      item.dailyGrowth === null || item.dailyGrowth === undefined
        ? '-'
        : `+${formatNumber(item.dailyGrowth)}`,
      displayValue(item.updatedAt),
    ]);
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
