// The sales list is newest first and has no date filter, so a period is read by
// walking pages until one reaches back past its start. Reading only page one is
// the cap this replaces: a busy month quietly lost its older receipts.
//
// `complete` is false only when the page cap stopped the walk early; callers
// must say so rather than present part of the period as all of it.
import { parseApiDate } from '../utils/apiDate.js';

export const salesSince = async ({ listSales, since, pageSize = 100, maxPages = 30 }) => {
  const rows = [];
  let page = 1;
  let pages;
  let reached;
  let totalItems = 0;
  do {
    const res = await listSales(page, pageSize);
    const data = Array.isArray(res?.data) ? res.data : [];
    rows.push(...data);
    pages = Math.max(1, Number(res?.total_pages) || 1);
    if (page === 1) totalItems = Number(res?.total_items) || 0;
    const oldest = data.length ? parseApiDate(data[data.length - 1].created_at) : null;
    reached = !oldest || oldest < since;
    page += 1;
  } while (!reached && page <= pages && page <= maxPages);
  // totalItems is every sale the shop has ever made, not this period.
  return { rows, totalItems, complete: reached || page > pages };
};
