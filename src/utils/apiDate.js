// The API serialises timestamps as "2026-08-25 08:35:09.923369 +00:00:00" —
// a space instead of "T" and a three-part offset, neither of which is ISO 8601.
// new Date() returns Invalid Date for that, so normalise before parsing.
export const parseApiDate = (value) => {
  if (!value) return null;
  const normalised = String(value)
    .trim()
    .replace(' ', 'T')                          // date/time separator
    .replace(/\s+/g, '')                        // space before the offset
    .replace(/([+-]\d{2}:\d{2}):\d{2}$/, '$1'); // "+00:00:00" -> "+00:00"
  const date = new Date(normalised);
  return Number.isNaN(date.getTime()) ? null : date;
};
