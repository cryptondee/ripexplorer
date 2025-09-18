<!-- Refactored Set Data Manager - Orchestrator Component -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getSetNameFromCard } from '$lib/utils/card';
  import { logger } from '$lib/utils/logger';
  
  // Import sub-components
  import SetDataFetcher from './set/SetDataFetcher.svelte';
  import MissingCardsManager from './set/MissingCardsManager.svelte';
  import SetDataCache from './set/SetDataCache.svelte';

  // Props using Svelte 5 runes syntax
  let {
    extractedData = null,
    selectedSet = 'all',
    showMissingCards = false,
    onlyMissingCards = false,
    availableOnly = false,
    setCardsData = $bindable({}),
    loadingSetData = $bindable({}),
    setDataErrors = $bindable({}),
    fetchingAllSets = $bindable(false),
    bulkFetchErrors = $bindable([]),
    loadingMissingCards = $bindable(false)
  }: {
    extractedData?: any;
    selectedSet?: string;
    showMissingCards?: boolean;
    onlyMissingCards?: boolean;
    availableOnly?: boolean;
    setCardsData?: any;
    loadingSetData?: any;
    setDataErrors?: any;
    fetchingAllSets?: boolean;
    bulkFetchErrors?: any[];
    loadingMissingCards?: boolean;
  } = $props();

  // Component references
  let setDataFetcher: SetDataFetcher;
  let missingCardsManager: MissingCardsManager;
  let setDataCache: SetDataCache;

  // Component instance identifier for debugging
  const componentId = Math.random().toString(36).substring(2, 8);
  logger.debug('SetDataManager: Component created', { componentId });

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    dataLoaded: { type: string; setId?: string };
    combinedCardsChanged: any[];
    missingCardsChanged: any[];
  }>();

  // Computed: Cards organized by set
  function getCardsBySet() {
    if (!extractedData?.profile?.digital_cards) return {};
    
    return extractedData.profile.digital_cards.reduce((acc: any, userCard: any) => {
      const setId = userCard.card?.set_id;
      const setName = getSetNameFromCard(userCard);
      
      if (setId) {
        if (!acc[setId]) {
          acc[setId] = {
            id: setId,
            name: setName,
            cards: []
          };
        }
        acc[setId].cards.push(userCard);
      }
      
      return acc;
    }, {});
  }
  
  let cardsBySet = $derived(getCardsBySet());

  // Computed: Combined cards (user cards + missing cards if enabled)
  function getCombinedCards() {
    if (!extractedData?.profile?.digital_cards) return [];
    
    let cards = [...extractedData.profile.digital_cards];
    
    // Add missing cards if enabled
    if (showMissingCards && missingCardsManager?.missingCardsWithListings) {
      cards = [...cards, ...missingCardsManager.missingCardsWithListings];
    }
    
    // Filter by selected set
    if (selectedSet !== 'all') {
      cards = cards.filter((card: any) => {
        const cardSetId = card.card?.set_id;
        return cardSetId === selectedSet;
      });
    }
    
    // Filter by availability if needed
    if (availableOnly) {
      cards = cards.filter((card: any) => card.is_listed);
    }
    
    // Filter to only missing cards if enabled
    if (onlyMissingCards) {
      cards = cards.filter((card: any) => card.isMissing);
    }
    
    return cards;
  }
  
  let combinedCards = $derived(getCombinedCards());

  // Watch for combined cards changes and dispatch event
  $effect(() => {
    if (combinedCards) {
      dispatch('combinedCardsChanged', combinedCards);
    }
  });

  // Expose functions from sub-components
  export async function fetchCompleteSetData(setId: string) {
    return await setDataFetcher?.fetchCompleteSetData(setId);
  }

  export async function fetchAllUserSets() {
    return await setDataFetcher?.fetchAllUserSets();
  }

  export async function getMissingCards(setId: string, userCards: any[], skipListings?: boolean) {
    return await missingCardsManager?.getMissingCards(setId, userCards, skipListings);
  }

  export async function getAllMissingCards() {
    return await missingCardsManager?.getAllMissingCards();
  }

  export async function refreshMissingCards() {
    return await missingCardsManager?.refreshMissingCards();
  }

  export function clearAllCache() {
    setDataCache?.clearAllCache();
  }

  export function clearSetCache(setId: string) {
    setDataCache?.clearSetCache(setId);
  }

  export function getCacheStats() {
    return setDataCache?.cacheStats || {};
  }

  // Handle events from sub-components
  function handleDataLoaded(event: CustomEvent) {
    dispatch('dataLoaded', event.detail);
  }

  function handleMissingCardsLoaded(event: CustomEvent) {
    dispatch('missingCardsChanged', event.detail.cards);
  }

  function handleCacheCleared(event: CustomEvent) {
    logger.debug('SetDataManager: Cache cleared', { 
      componentId, 
      type: event.detail.type,
      setId: event.detail.setId 
    });
  }
</script>

<!-- Sub-components (functional, no UI) -->
<SetDataFetcher 
  bind:this={setDataFetcher}
  {extractedData}
  bind:setCardsData
  bind:loadingSetData
  bind:setDataErrors
  bind:fetchingAllSets
  bind:bulkFetchErrors
  on:dataLoaded={handleDataLoaded}
/>

<MissingCardsManager 
  bind:this={missingCardsManager}
  {extractedData}
  {selectedSet}
  {cardsBySet}
  bind:loadingMissingCards
  on:missingCardsLoaded={handleMissingCardsLoaded}
/>

<SetDataCache 
  bind:this={setDataCache}
  bind:setCardsData
  bind:loadingSetData
  bind:setDataErrors
  on:cacheCleared={handleCacheCleared}
/>

<!-- This component is purely functional - no UI -->
<!-- All UI is handled by parent components that use this manager -->
