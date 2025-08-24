// Lightweight helpers to build set-level summaries without duplicating logic
// These helpers are pure and expect callers to provide name/total lookups.

export type UserSetRow = {
  setId: string;
  setName: string;
  owned: number;
  total: number;
  percent: number; // 0..100
};

export function buildUserSetSummary(
  ownedCards: any[],
  opts: {
    getSetId: (card: any) => string | undefined;
    getSetName: (setId: string) => string; // caller can use resolveSetName(card) or a map
    getSetTotal: (setId: string) => number; // e.g. from setCardsData[setId].cards.length
  }
): UserSetRow[] {
  const counts = new Map<string, number>();

  for (const c of ownedCards || []) {
    const id = opts.getSetId(c);
    if (!id) continue;
    counts.set(id, (counts.get(id) || 0) + 1);
  }

  const rows: UserSetRow[] = [];
  for (const [setId, owned] of counts) {
    const total = Math.max(0, Number(opts.getSetTotal(setId) || 0));
    const pct = total > 0 ? Math.min(100, Math.round((owned / total) * 100)) : 0;
    rows.push({
      setId,
      setName: opts.getSetName(setId),
      owned,
      total,
      percent: pct,
    });
  }

  // Sort by percent desc, then setName asc
  rows.sort((a, b) => (b.percent - a.percent) || a.setName.localeCompare(b.setName));
  return rows;
}

// Variant: build from an owned-by-set counts map
export function buildUserSetSummaryFromCounts(
  countsMap: Record<string, number> | Map<string, number>,
  opts: {
    getSetName: (setId: string) => string;
    getSetTotal: (setId: string) => number;
  }
): UserSetRow[] {
  const rows: UserSetRow[] = [];
  const entries = countsMap instanceof Map ? countsMap.entries() : Object.entries(countsMap);
  for (const [setId, ownedVal] of entries as any) {
    const owned = Number(ownedVal) || 0;
    const total = Math.max(0, Number(opts.getSetTotal(setId) || 0));
    const pct = total > 0 ? Math.min(100, Math.round((owned / total) * 100)) : 0;
    rows.push({ setId, setName: opts.getSetName(setId), owned, total, percent: pct });
  }
  rows.sort((a, b) => (b.percent - a.percent) || a.setName.localeCompare(b.setName));
  return rows;
}

export type TradeSetRow = {
  setId: string;
  setName: string;
  receive: number;
  give: number;
};

export function buildTradeSetSummary(
  suggestions: Array<{
    fromA: Array<{ setId: string }>; // items A gives to B
    fromB: Array<{ setId: string }>; // items B gives to A
  }>,
  perspective: 'A' | 'B',
  getSetName: (setId: string) => string
): TradeSetRow[] {
  const totals = new Map<string, { receive: number; give: number }>();

  for (const s of suggestions || []) {
    const outgoing = perspective === 'A' ? s.fromA : s.fromB; // what this user gives
    const incoming = perspective === 'A' ? s.fromB : s.fromA; // what this user receives

    for (const it of outgoing || []) {
      const t = totals.get(it.setId) || { receive: 0, give: 0 };
      t.give += 1;
      totals.set(it.setId, t);
    }
    for (const it of incoming || []) {
      const t = totals.get(it.setId) || { receive: 0, give: 0 };
      t.receive += 1;
      totals.set(it.setId, t);
    }
  }

  const rows: TradeSetRow[] = [];
  for (const [setId, agg] of totals) {
    rows.push({ setId, setName: getSetName(setId), receive: agg.receive, give: agg.give });
  }

  // Sort by (receive - give) desc, then setName asc
  rows.sort((a, b) => (b.receive - b.give) - (a.receive - a.give) || a.setName.localeCompare(b.setName));
  return rows;
}
