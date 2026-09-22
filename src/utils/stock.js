// One definition of "low stock" for the whole app.
//
// It was 10 in Products.jsx, 10 in Dashboard.jsx and 5 in the assistant's
// low_stock tool, so the dashboard and the AI answered the same question with
// different numbers.
//
// ponytail: a single number across every product is crude and the shop is
// right that it is wrong — five watches is not low the way five pencils is.
// The honest fix is a per-product reorder level, which needs a column the
// backend does not have yet; velocity ("days of stock left") would be better
// still but needs per-product sales, which is the same top-products endpoint
// that is still missing. Until one of those exists, one consistent number beats
// three inconsistent ones.
export const LOW_STOCK_AT = 10;

export const isLowStock = (product) => {
  const qty = Number(product?.quantity_in_stock ?? 0);
  return qty > 0 && qty <= LOW_STOCK_AT;
};

export const isOutOfStock = (product) => Number(product?.quantity_in_stock ?? 0) === 0;

// Low OR out — what the dashboard counter and the assistant both mean by
// "needs attention".
export const needsRestock = (product) => Number(product?.quantity_in_stock ?? 0) <= LOW_STOCK_AT;
