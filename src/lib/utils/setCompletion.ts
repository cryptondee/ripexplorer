// Set completion utility functions
// Shared between extract and trade-finder pages

// Cache for set totals to avoid repeated API calls across the application
const setTotalCache = new Map<string, number>();

/**
 * Fetch total cards in a Pokemon TCG set from the API
 */
export async function getSetTotal(setId: string): Promise<number> {
  if (!setId || setId === 'all') return 0;
  
  // Check cache first
  if (setTotalCache.has(setId)) {
    return setTotalCache.get(setId)!;
  }

  try {
    const response = await fetch(`/api/set/${setId}`);
    const data = await response.json();
    
    if (response.ok && data.cards) {
      const total = Array.isArray(data.cards) ? data.cards.length : 0;
      setTotalCache.set(setId, total);
      return total;
    } else {
      console.warn(`Failed to fetch set ${setId} data:`, data.error);
      setTotalCache.set(setId, 0);
      return 0;
    }
  } catch (err) {
    console.warn(`Error fetching set ${setId} total:`, err);
    setTotalCache.set(setId, 0);
    return 0;
  }
}

/**
 * Calculate completion percentage for a set
 */
export function calculateCompletionPercentage(owned: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((owned / total) * 100);
}

/**
 * Get completion data for a set (async)
 */
export async function getSetCompletion(setId: string, ownedCards: number): Promise<{
  total: number;
  owned: number;
  percentage: number;
}> {
  const total = await getSetTotal(setId);
  const percentage = calculateCompletionPercentage(ownedCards, total);
  
  return {
    total,
    owned: ownedCards,
    percentage
  };
}

/**
 * Batch fetch set totals for multiple sets
 */
export async function batchFetchSetTotals(setIds: string[]): Promise<Record<string, number>> {
  const uniqueSetIds = [...new Set(setIds.filter(id => id && id !== 'all'))];
  const results: Record<string, number> = {};
  
  // Check cache first
  const uncachedIds: string[] = [];
  uniqueSetIds.forEach(setId => {
    if (setTotalCache.has(setId)) {
      results[setId] = setTotalCache.get(setId)!;
    } else {
      uncachedIds.push(setId);
    }
  });
  
  // Fetch uncached sets in parallel
  if (uncachedIds.length > 0) {
    const promises = uncachedIds.map(async setId => {
      const total = await getSetTotal(setId);
      results[setId] = total;
      return { setId, total };
    });
    
    await Promise.all(promises);
  }
  
  return results;
}

/**
 * Get completion color class for UI styling
 */
export function getCompletionColor(percentage: number): string {
  if (percentage >= 90) return 'text-green-600';
  if (percentage >= 70) return 'text-yellow-600';  
  if (percentage >= 50) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Get completion badge color for UI styling
 */
export function getCompletionBadgeColor(percentage: number): string {
  if (percentage >= 90) return 'bg-green-100 text-green-800';
  if (percentage >= 70) return 'bg-yellow-100 text-yellow-800';
  if (percentage >= 50) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

/**
 * Clear the set total cache (useful for testing or forcing refresh)
 */
export function clearSetTotalCache(): void {
  setTotalCache.clear();
}

/**
 * Get cached set total without API call
 */
export function getCachedSetTotal(setId: string): number | undefined {
  return setTotalCache.get(setId);
}