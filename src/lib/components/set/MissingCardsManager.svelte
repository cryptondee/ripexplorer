<!-- Missing Cards Manager Component -->
<script lang="ts">
  import { SetDataService } from '$lib/services/SetDataService';
  import { logger } from '$lib/utils/logger';
  import { createEventDispatcher } from 'svelte';

  // Props
  export let extractedData: any = null;
  export let selectedSet: string = 'all';
  export let cardsBySet: any = {};
  export let loadingMissingCards: boolean = $bindable(false);

  // Internal state
  let missingCardsWithListings: any[] = $state([]);
  
  // Service instance
  const setDataService = new SetDataService();
  const dispatch = createEventDispatcher();

  // Function to get missing cards for a specific set
  async function getMissingCards(setId: string, userCards: any[], skipListings: boolean = false) {
    return await setDataService.getMissingCards(setId, userCards, skipListings);
  }

  // Function to get all missing cards for the current set selection
  async function getAllMissingCards() {
    if (!extractedData?.profile?.digital_cards || selectedSet === 'all') {
      return [];
    }

    loadingMissingCards = true;
    
    try {
      const missing = await setDataService.getAllMissingCards(selectedSet, cardsBySet, extractedData);
      missingCardsWithListings = missing;
      
      dispatch('missingCardsLoaded', { 
        setId: selectedSet, 
        count: missing.length,
        cards: missing 
      });
      
      return missing;
    } catch (err) {
      logger.error('MissingCardsManager: Error getting missing cards', { 
        selectedSet, 
        error: err instanceof Error ? err.message : String(err) 
      });
      return [];
    } finally {
      loadingMissingCards = false;
    }
  }

  // Function to refresh missing cards (clear cache and refetch)
  async function refreshMissingCards() {
    setDataService.clearCache();
    return await getAllMissingCards();
  }

  // Function to get missing cards count for a specific set
  async function getMissingCardsCount(setId: string, userCards: any[]): Promise<number> {
    try {
      const missing = await getMissingCards(setId, userCards, true); // Skip listings for count
      return missing.length;
    } catch (err) {
      logger.error('MissingCardsManager: Error getting missing cards count', { 
        setId, 
        error: err instanceof Error ? err.message : String(err) 
      });
      return 0;
    }
  }

  // Function to check if a card is missing from user's collection
  function isCardMissing(cardId: string, userCards: any[]): boolean {
    const userCardIds = new Set(userCards.map(card => card.card?.id).filter(Boolean));
    return !userCardIds.has(cardId);
  }

  // Get cache statistics
  function getCacheStats() {
    return setDataService.getCacheStats();
  }

  // Expose functions and state to parent
  export { 
    getMissingCards, 
    getAllMissingCards, 
    refreshMissingCards,
    getMissingCardsCount,
    isCardMissing,
    getCacheStats,
    missingCardsWithListings 
  };
</script>

<!-- This component is purely functional - no UI -->
<!-- All missing cards logic is handled through the exported functions -->
