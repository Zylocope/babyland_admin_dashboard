// Sorting for report tables. A column opts in with `sort: row => value`; text
// sorts A–Z first, numbers largest first, and a second click flips it.

export const sortRows = (rows, columns, sort) => {
  const col = sort && columns.find(c => c.key === sort.key && c.sort);
  if (!col) return rows;
  const sign = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = col.sort(a);
    const y = col.sort(b);
    const cmp = typeof x === 'string' || typeof y === 'string'
      ? String(x).localeCompare(String(y))
      : (Number(x) || 0) - (Number(y) || 0);
    return sign * cmp;
  });
};

// The next sort after clicking a header: same column flips, a new column
// starts in that column's natural direction.
export const nextSort = (current, column) => {
  if (current?.key === column.key) return { key: column.key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { key: column.key, dir: column.firstDir ?? 'desc' };
};
