<!-- Set Data Fetcher Component -->
<script lang="ts">
  import { SetDataService } from '$lib/services/SetDataService';
  import { logger } from '$lib/utils/logger';
  import { browser } from '$app/environment';
  import { createEventDispatcher } from 'svelte';

  // Props
  export let extractedData: any = null;
  export let setCardsData: any = $bindable({});
  export let loadingSetData: any = $bindable({});
  export let setDataErrors: any = $bindable({});
  export let fetchingAllSets: boolean = $bindable(false);
  export let bulkFetchErrors: any[] = $bindable([]);

  // Service instance
  const setDataService = new SetDataService();
  const dispatch = createEventDispatcher();

  // Function to fetch complete set data for a specific set
  async function fetchCompleteSetData(setId: string) {
    if (!setId) return null;

    // Check if we already have this data
    if (setCardsData[setId]) {
      logger.debug('SetDataFetcher: Using cached set data', { setId });
      return setCardsData[setId];
    }

    // Set loading state
    loadingSetData = { ...loadingSetData, [setId]: true };
    
    try {
      const data = await setDataService.fetchCompleteSetData(setId);
      
      // Store the data
      setCardsData = { ...setCardsData, [setId]: data };
      
      // Clear any previous errors
      if (setDataErrors[setId]) {
        const { [setId]: removed, ...rest } = setDataErrors;
        setDataErrors = rest;
      }

      dispatch('dataLoaded', { type: 'set', setId });
      return data;
    } catch (err) {
      setDataErrors = { 
        ...setDataErrors, 
        [setId]: err instanceof Error ? err.message : 'Failed to fetch set data' 
      };
      throw err;
    } finally {
      loadingSetData = { ...loadingSetData, [setId]: false };
    }
  }

  // Function to fetch complete set data for all sets the user owns
  async function fetchAllUserSets() {
    logger.debug('SetDataFetcher: fetchAllUserSets called');
    
    // Only run on client-side to prevent SSR duplicate requests
    if (!browser) {
      logger.debug('SetDataFetcher: Skipping fetchAllUserSets (SSR)');
      return;
    }
    
    if (!extractedData?.profile?.digital_cards) {
      logger.debug('SetDataFetcher: No extractedData available');
      return;
    }

    fetchingAllSets = true;
    bulkFetchErrors = [];

    // Get all unique set IDs from user's cards
    const userSetIds = setDataService.getUserSetIds(extractedData);

    logger.debug('SetDataFetcher: Found user sets', { 
      setCount: userSetIds.size,
      setIds: Array.from(userSetIds)
    });

    // Fetch data for each set with controlled concurrency
    const MAX_CONCURRENT = 3;
    const setIdArray = Array.from(userSetIds);
    const results = [];

    for (let i = 0; i < setIdArray.length; i += MAX_CONCURRENT) {
      const batch = setIdArray.slice(i, i + MAX_CONCURRENT);
      
      const batchPromises = batch.map(async (setId) => {
        try {
          await fetchCompleteSetData(setId);
          return { setId, success: true };
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          bulkFetchErrors = [...bulkFetchErrors, { setId, error: errorMsg }];
          return { setId, success: false, error: errorMsg };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to be nice to the server
      if (i + MAX_CONCURRENT < setIdArray.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    fetchingAllSets = false;

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    logger.debug('SetDataFetcher: Bulk fetch completed', {
      total: results.length,
      successful: successCount,
      errors: errorCount
    });

    dispatch('dataLoaded', { type: 'bulk', successCount, errorCount });
  }

  // Expose functions to parent
  export { fetchCompleteSetData, fetchAllUserSets };
</script>

<!-- This component is purely functional - no UI -->
<!-- All fetching logic is handled through the exported functions -->
