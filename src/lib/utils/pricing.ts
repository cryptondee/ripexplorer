// Centralized pricing helpers to keep components and pages in sync
// Row can be either an owned card or a synthesized missing-card row
export function getMarketValue(row: any): number {
  if (!row) return 0;
  if (row.isMissing) {
    const v = row.marketValue ?? row.card?.raw_price ?? 0;
    return typeof v === 'string' ? parseFloat(v) : Number(v) || 0;
  }
  const v = row.card?.raw_price ?? 0;
  return typeof v === 'string' ? parseFloat(v) : Number(v) || 0;
}

export function getListedPrice(row: any): number {
  if (!row) return 0;
  if (row.isMissing) {
    return row.is_listed ? Number(row.lowestPrice || 0) : 0;
  }
  const v = row.listing?.usd_price ?? 0;
  return typeof v === 'string' ? parseFloat(v) : Number(v) || 0;
}
