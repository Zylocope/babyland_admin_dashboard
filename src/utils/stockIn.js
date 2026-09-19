// Mirrors the backend rules so staff see the problem before the round trip:
// quantity and cost must be positive, and expiry is required for perishable
// products and rejected for the rest.
//
// Shared by the per-product modal and the barcode stock-in screen. It lives
// here rather than in either of them so the two cannot drift apart from the
// backend, or from each other.
export const validateStockIn = (form, product, t) => {
  if (!(Number(form.quantity) > 0)) return t('stockIn.errQty');
  if (!(Number(form.unitCost) > 0)) return t('stockIn.errCost');
  if (product.is_perishable && !form.expiry) return t('stockIn.errExpiry');
  return '';
};
