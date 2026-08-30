// Client-side CSV export. The browser already holds the rows, so this needs no
// endpoint — but that also means it is not a permission boundary. Anything that
// must be denied to a role has to be denied server-side too.
const cell = (value) => {
  if (value == null) return '';
  const text = String(value);
  // Quote when the value would otherwise break the row, and double any quotes.
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (columns, rows) =>
  [
    columns.map(c => cell(c.label)).join(','),
    ...rows.map(row => columns.map(c => cell(c.value(row))).join(',')),
  ].join('\r\n');

export const downloadCsv = (filename, columns, rows) => {
  // BOM so Excel opens Burmese text as UTF-8 instead of mojibake.
  const blob = new Blob(['﻿' + toCsv(columns, rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
