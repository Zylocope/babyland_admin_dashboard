// A discount is not a separate record on the backend: the product's
// selling_price is lowered and the price before it is kept in original_price.
// Receipts, the POS and loyalty points already read that pair.

// The undiscounted price, whether or not a discount is running now.
export const basePrice = p =>
  (Number(p.original_price) > Number(p.selling_price) ? Number(p.original_price) : Number(p.selling_price));

export const isDiscounted = p => Number(p.original_price) > Number(p.selling_price);

export const percentOff = p =>
  (isDiscounted(p) ? Math.round((1 - Number(p.selling_price) / Number(p.original_price)) * 100) : 0);

// PUT /admin/products/{id} is a full replacement, so every field is echoed back
// from the raw AdminProduct; leaving one out would erase it.
const body = (p, selling, original) => ({
  barcode: p.barcode,
  name: p.name,
  category_id: p.category_id,
  sub_category_id: p.sub_category_id ?? null,
  selling_price: String(selling),
  original_price: original == null ? null : String(original),
  is_shown_online: p.is_shown_online,
  is_perishable: p.is_perishable,
  description: p.description ?? null,
  image_url: p.image_url ?? null,
});

// Re-discounting starts from the original price, so 20% then 10% is 10% off
// the original, not 28% off.
export const discountBody = (p, pct) => {
  const base = basePrice(p);
  return body(p, Math.max(1, Math.round(base * (1 - pct / 100))), base);
};

export const removeDiscountBody = p => body(p, basePrice(p), null);
