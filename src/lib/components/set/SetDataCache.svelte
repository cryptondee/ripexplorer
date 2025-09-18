<!-- Set Data Cache Manager Component -->
<script lang="ts">
  import { logger } from '$lib/utils/logger';
  import { createEventDispatcher } from 'svelte';

  // Props
  export let setCardsData: any = $bindable({});
  export let loadingSetData: any = $bindable({});
  export let setDataErrors: any = $bindable({});

  const dispatch = createEventDispatcher();

  // Cache statistics
  $: cacheStats = {
    totalSets: Object.keys(setCardsData).length,
    loadingSets: Object.keys(loadingSetData).filter(key => loadingSetData[key]).length,
    errorSets: Object.keys(setDataErrors).length,
    cacheSize: calculateCacheSize()
  };

  // Calculate approximate cache size in bytes
  function calculateCacheSize(): number {
    try {
      return JSON.stringify(setCardsData).length;
    } catch {
      return 0;
    }
  }

  // Clear all cached set data
  function clearAllCache() {
    logger.debug('SetDataCache: Clearing all cache');
    setCardsData = {};
    loadingSetData = {};
    setDataErrors = {};
    
    dispatch('cacheCleared', { type: 'all' });
  }

  // Clear cache for a specific set
  function clearSetCache(setId: string) {
    logger.debug('SetDataCache: Clearing cache for set', { setId });
    
    const { [setId]: removedData, ...restData } = setCardsData;
    const { [setId]: removedLoading, ...restLoading } = loadingSetData;
    const { [setId]: removedError, ...restErrors } = setDataErrors;
    
    setCardsData = restData;
    loadingSetData = restLoading;
    setDataErrors = restErrors;
    
    dispatch('cacheCleared', { type: 'set', setId });
  }

  // Clear only error states
  function clearErrors() {
    logger.debug('SetDataCache: Clearing all errors');
    setDataErrors = {};
    
    dispatch('errorsCleared');
  }

  // Check if a set is cached
  function isSetCached(setId: string): boolean {
    return setId in setCardsData && setCardsData[setId] !== null;
  }

  // Check if a set is currently loading
  function isSetLoading(setId: string): boolean {
    return loadingSetData[setId] === true;
  }

  // Check if a set has an error
  function hasSetError(setId: string): boolean {
    return setId in setDataErrors;
  }

  // Get error message for a set
  function getSetError(setId: string): string | null {
    return setDataErrors[setId] || null;
  }

  // Get cached set data
  function getCachedSetData(setId: string): any {
    return setCardsData[setId] || null;
  }

  // Get all cached set IDs
  function getCachedSetIds(): string[] {
    return Object.keys(setCardsData);
  }

  // Get sets with errors
  function getSetsWithErrors(): Array<{ setId: string; error: string }> {
    return Object.entries(setDataErrors).map(([setId, error]) => ({
      setId,
      error: error as string
    }));
  }

  // Get loading sets
  function getLoadingSets(): string[] {
    return Object.keys(loadingSetData).filter(setId => loadingSetData[setId]);
  }

  // Validate cache integrity
  function validateCache(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for sets that are both loading and have data
    Object.keys(setCardsData).forEach(setId => {
      if (isSetLoading(setId)) {
        issues.push(`Set ${setId} has data but is marked as loading`);
      }
    });
    
    // Check for sets that are loading and have errors
    Object.keys(setDataErrors).forEach(setId => {
      if (isSetLoading(setId)) {
        issues.push(`Set ${setId} has error but is marked as loading`);
      }
    });
    
    return {
      valid: issues.length === 0,
      issues
    };
  }

  // Export functions and reactive state
  export {
    clearAllCache,
    clearSetCache,
    clearErrors,
    isSetCached,
    isSetLoading,
    hasSetError,
    getSetError,
    getCachedSetData,
    getCachedSetIds,
    getSetsWithErrors,
    getLoadingSets,
    validateCache,
    cacheStats
  };
</script>

<!-- This component is purely functional - no UI -->
<!-- All cache management is handled through the exported functions -->
