// Thin API client. Set VITE_API_URL to point at the Rust/Axum backend.
// When unset, callers fall back to mock data so the app still runs.
const BASE = import.meta.env.VITE_API_URL;

// backend product → the shape the Products page already uses
const mapProduct = (p) => ({
  id: p.id,
  barcode: p.barcode,
  name: p.name,
  category: p.category,
  stock: p.quantity_in_stock ?? 0,
  price: Number(p.price) || 0, // API sends price as a string
  visible: p.is_active,        // Active/Hidden badge tracks is_active
  unit: 'pcs',                 // ponytail: API has no unit yet
  image: null,                 // ponytail: API has no image yet
  lowStockThreshold: 5,        // ponytail: API has no threshold yet
});

// Returns null when no backend is configured (caller keeps mock data).
// ponytail: per_page=100 grabs the catalog in one page; add real pagination when it outgrows that.
export async function fetchProducts() {
  if (!BASE) return null;
  const res = await fetch(`${BASE}/api/products?per_page=100`);
  if (!res.ok) throw new Error(`GET /api/products -> ${res.status}`);
  const json = await res.json();
  return (json.data || []).map(mapProduct);
}
