export const ADJUST_REASONS = ['damaged', 'expired', 'miscounted', 'corrected'];

// Mirrors the backend: a removal may name a batch or leave it to FIFO, an
// addition must name the batch it goes back into, and a batch cannot give up
// more than it holds. Returns the request body, or the key of the first problem.
export const buildAdjustment = (form, product, batches) => {
  const qty = Number(form.quantity);
  if (!Number.isInteger(qty) || qty <= 0) return { error: 'adjustStock.errQty' };
  if (!ADJUST_REASONS.includes(form.reason)) return { error: 'adjustStock.errReason' };

  const batch = batches.find(b => b.id === form.batchId);
  if (form.direction === 'add') {
    if (!batch) return { error: 'adjustStock.errBatch' };
  } else {
    const available = batch ? batch.quantity_remaining : Number(product.quantity_in_stock ?? 0);
    if (qty > available) return { error: 'adjustStock.errTooMany', available };
  }

  const note = form.note.trim();
  return {
    payload: {
      product_id: product.id,
      quantity_change: form.direction === 'add' ? qty : -qty,
      reason: form.reason,
      ...(batch ? { inventory_id: batch.id } : {}),
      ...(note ? { note } : {}),
    },
  };
};
