// Excel export, sharing the same { label, value } column shape as the CSV
// helper so a screen describes its columns once and can offer both.
//
// Why both: CSV writes everything as text, so a manager who opens it cannot
// SUM a revenue column without converting it first. Here numbers stay numbers.
//
// SheetJS is loaded with a dynamic import inside the click handler. It is the
// heaviest dependency in the project after recharts, and nobody should pay for
// it on a page load where they never press Export — this keeps it out of every
// bundle until the moment it is needed.

// Values arrive already formatted for the screen ("12,500 MMK", "45"). Excel
// needs the underlying number to make a column summable, so a cell that is
// nothing but a formatted number is converted back.
//
// A column marked `text: true` is never converted. Identifiers are the reason:
// a barcode like 54354264637 becomes 5.4354E+10 in a narrow Excel column, and
// one with a leading zero loses it silently. Those are digits, not quantities,
// and nobody ever wants to sum them.
const NUMERIC = /^-?[\d,]+(\.\d+)?$/;

const coerce = (value) => {
  if (value == null) return '';
  if (typeof value === 'number') return value;
  const text = String(value).trim();
  const bare = text.replace(/\s*MMK$/, '').trim();
  if (NUMERIC.test(bare) && bare !== '') {
    const n = Number(bare.replace(/,/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return text;
};

export const downloadExcel = async (filename, columns, rows, sheetName = 'Sheet1') => {
  const XLSX = await import('xlsx');

  const data = [
    columns.map(c => c.label),
    ...rows.map(row => columns.map(c => (c.text ? String(c.value(row) ?? '') : coerce(c.value(row))))),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(data);
  // Without this every column is the default width and long Burmese product
  // names are invisible until the manager drags each border.
  sheet['!cols'] = columns.map(c => ({
    wch: Math.min(40, Math.max(
      String(c.label).length + 2,
      ...rows.slice(0, 200).map(r => String(c.value(r) ?? '').length + 2),
      10,
    )),
  }));

  const book = XLSX.utils.book_new();
  // Excel rejects sheet names over 31 chars or containing : \ / ? * [ ]
  XLSX.utils.book_append_sheet(book, sheet, sheetName.replace(/[:\\/?*[\]]/g, '').slice(0, 31));
  XLSX.writeFile(book, filename);
};
