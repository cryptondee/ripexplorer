<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getSetNameFromCard } from '$lib/utils/card';
  import { browser } from '$app/environment';
  import { deduplicatedFetch } from '$lib/utils/setDataDeduplication';

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

  // Internal state for missing cards
  let missingCardsWithListings: any[] = $state([]);
  
  // Cache for missing cards by set ID to avoid re-fetching
  let missingCardsCache: Record<string, any[]> = {};

  // Request deduplication now handled by dedicated utility module
  
  // Component instance identifier for debugging
  const componentId = Math.random().toString(36).substring(2, 8);
  console.log(`🏗️ SetDataManager: Component instance ${componentId} created`);

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    dataLoaded: { type: string; setId?: string };
    combinedCardsChanged: any[];
    cardsBySetChanged: any;
  }>();

  // Function to fetch complete set data from rip.fun API (moved from page)
  async function fetchCompleteSetData(setId: string) {
    // Only run on client-side to prevent SSR duplicate requests
    if (!browser) {
      console.log(`🚫 SetDataManager[${componentId}]: Skipping fetch for ${setId} (SSR)`);
      return null;
    }

    // Check if data is already cached
    if (setCardsData[setId]) {
      console.log(`🎯 SetDataManager[${componentId}]: Using cached data for set ${setId}`);
      return setCardsData[setId];
    }

    // Use deduplication utility to prevent multiple concurrent requests
    return await deduplicatedFetch(setId, async () => {
      console.log(`🚀 SetDataManager[${componentId}]: Executing fetch for set ${setId}`);
      
      loadingSetData = { ...loadingSetData, [setId]: true };
      setDataErrors = { ...setDataErrors, [setId]: null };

      try {
        const response = await fetch(`/api/set/${setId}?page=1&limit=1000&sort=number-asc&all=true`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to fetch set data: ${response.status} ${response.statusText}. ${errorData.details || ''}`);
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.details || data.error);
        }

        // Cache the data in memory only (Redis handles persistent caching)
        setCardsData = { ...setCardsData, [setId]: data };
        console.log(`✅ SetDataManager[${componentId}]: Set data fetched for ${setId} (cached: ${data.cached ? 'yes' : 'no'})`);
        
        dispatch('dataLoaded', { type: 'setData', setId });
        return data;
      } catch (err) {
        console.error(`❌ SetDataManager[${componentId}]: Error fetching set ${setId} data:`, err);
        setDataErrors = { ...setDataErrors, [setId]: err instanceof Error ? err.message : 'Failed to fetch set data' };
        throw err;
      } finally {
        loadingSetData = { ...loadingSetData, [setId]: false };
      }
    });
  }

  // Function to get missing cards for a specific set (moved from page)
  async function getMissingCards(setId: string, userCards: any[], skipListings: boolean = false) {
    try {
      // Create a cache key based on setId and user cards
      const userCardIds = new Set(userCards.map(card => card.card?.id).filter(Boolean));
      const cacheKey = `${setId}_${Array.from(userCardIds).sort().join(',')}`;
      
      // Check cache first
      if (missingCardsCache[cacheKey] && !skipListings) {
        console.log(`✨ SetDataManager: Using cached missing cards for set ${setId}`);
        return missingCardsCache[cacheKey];
      }
      
      const completeSetData = await fetchCompleteSetData(setId);
      
      if (!completeSetData?.cards) {
        return [];
      }
      
      // Find cards from the complete set that the user doesn't have
      // Note: Complete set cards have ID at root level, user cards have nested structure
      const missingCards = completeSetData.cards.filter((setCard: any) => {
        return setCard.id && !userCardIds.has(setCard.id);
      });

      // If we're skipping listings (for quick toggle), return cards without listing data
      if (skipListings) {
        return missingCards.map((card: any) => ({
          card: card,
          isMissing: true,
          is_listed: false,
          listing: null,
          lowestPrice: null,
          marketValue: card.market_price || card.raw_price
        }));
      }

      // Transform missing cards and fetch listing data for each
      const missingCardsWithListings = await Promise.all(
        missingCards.map(async (card: any) => {
          let listingData = null;
          let isListed = false;
          let lowestPrice = null;
          
          try {
            // Fetch listing data for this missing card
            const listingResponse = await fetch(`/api/card/${card.id}/listings`);
            if (listingResponse.ok) {
              listingData = await listingResponse.json();
              
              // Check if there are any active listings
              if (listingData.listings && listingData.listings.length > 0) {
                isListed = true;
                // Find the lowest price from active listings using usd_price
                const prices = listingData.listings
                  .filter((listing: any) => listing.usd_price)
                  .map((listing: any) => parseFloat(listing.usd_price));
                  
                if (prices.length > 0) {
                  lowestPrice = Math.min(...prices);
                }
              }
            }
          } catch (err) {
            console.error(`Error fetching listings for card ${card.id}:`, err);
          }
          
          return {
            card: card, // Wrap the card data in a 'card' property to match user card structure
            isMissing: true, // Mark as missing for UI purposes
            is_listed: isListed, // Whether the card has active listings
            listing: listingData, // Full listing data
            lowestPrice: lowestPrice, // Lowest available price
            marketValue: card.market_price || card.raw_price // Market value for missing cards
          };
        })
      );
      
      // Cache the result
      missingCardsCache[cacheKey] = missingCardsWithListings;
      console.log(`💾 SetDataManager: Cached ${missingCardsWithListings.length} missing cards for set ${setId}`);
      
      return missingCardsWithListings;
    } catch (err) {
      console.error(`Error getting missing cards for set ${setId}:`, err);
      return [];
    }
  }

  // Function to get all missing cards for the current set selection (moved from page)
  async function getAllMissingCards() {
    if (!extractedData?.profile?.digital_cards || selectedSet === 'all') {
      return [];
    }

    // Find the set ID for the selected set
    const userCardsForSet = cardsBySet[selectedSet]?.cards || [];
    
    // Get the set ID from the first card in the set
    const setId = userCardsForSet[0]?.card?.set_id;
    
    if (!setId) {
      return [];
    }

    return await getMissingCards(setId, userCardsForSet);
  }

  // Function to fetch complete set data for all sets the user owns (moved from page)
  async function fetchAllUserSets() {
    console.log(`📞 SetDataManager[${componentId}]: fetchAllUserSets() called`);
    
    // Only run on client-side to prevent SSR duplicate requests
    if (!browser) {
      console.log(`🚫 SetDataManager[${componentId}]: Skipping fetchAllUserSets (SSR)`);
      return;
    }
    
    if (!extractedData?.profile?.digital_cards) {
      console.log(`❌ SetDataManager[${componentId}]: No extractedData available, returning`);
      return;
    }

    fetchingAllSets = true;
    bulkFetchErrors = [];

    // Get all unique set IDs from user's cards
    const userSetIds = new Set<string>();
    extractedData.profile.digital_cards.forEach((card: any) => {
      const setId = card.card?.set_id;
      if (setId) {
        userSetIds.add(setId);
      }
    });

    console.log(`🔄 SetDataManager[${componentId}]: Fetching complete set data for sets:`, Array.from(userSetIds));

    // Fetch complete set data for each unique set
    const fetchPromises = Array.from(userSetIds).map(async (setId) => {
      try {
        await fetchCompleteSetData(setId);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Failed to fetch complete set data for ${setId}:`, err);
        bulkFetchErrors = [...bulkFetchErrors, `Set ${setId}: ${errorMsg}`];
      }
    });

    await Promise.all(fetchPromises);
    console.log('All set data fetching completed');
    fetchingAllSets = false;
    dispatch('dataLoaded', { type: 'allSets' });
  }

  // Function to fetch missing cards with marketplace data (moved from page)
  async function fetchMissingCardsWithMarketplaceData(selectedSetValue: string, forceRefresh: boolean = false) {
    console.log(`🎯 SetDataManager: fetchMissingCardsWithMarketplaceData called for set: ${selectedSetValue}`);
    
    if (selectedSetValue === 'all') {
      missingCardsWithListings = [];
      return;
    }

    const userCardsForSet = extractedData.profile?.digital_cards?.filter((card: any) => 
      getSetNameFromCard(card, setCardsData) === selectedSetValue
    ) || [];
    
    console.log(`🎯 SetDataManager: Found ${userCardsForSet.length} user cards for set ${selectedSetValue}`);
    
    const setId = userCardsForSet[0]?.card?.set_id;
    
    if (!setId) {
      console.log(`❌ SetDataManager: No setId found for ${selectedSetValue}`);
      missingCardsWithListings = [];
      return;
    }

    // Check if we already have cached missing cards for this set
    const userCardIds = new Set(userCardsForSet.map(card => card.card?.id).filter(Boolean));
    const cacheKey = `${setId}_${Array.from(userCardIds).sort().join(',')}`;
    
    if (!forceRefresh && missingCardsCache[cacheKey]) {
      console.log(`🚀 SetDataManager: Using cached missing cards for instant display`);
      missingCardsWithListings = missingCardsCache[cacheKey];
      return;
    }

    console.log(`🎯 SetDataManager: Set ID is ${setId}`);

    // Ensure we have the complete set data before checking for missing cards
    if (!setCardsData[setId]) {
      console.log(`📥 SetDataManager: Fetching complete set data for ${setId} before checking missing cards`);
      try {
        await fetchCompleteSetData(setId);
      } catch (err) {
        console.error(`Failed to fetch complete set data for ${setId}:`, err);
        missingCardsWithListings = [];
        return;
      }
    }

    loadingMissingCards = true;
    try {
      const result = await getMissingCards(setId, userCardsForSet);
      missingCardsWithListings = result;
      console.log(`✅ SetDataManager: Got ${result.length} missing cards for set ${setId}`);
    } catch (err) {
      console.error('Error fetching missing cards with marketplace data:', err);
      missingCardsWithListings = [];
    } finally {
      loadingMissingCards = false;
    }
  }

  // Deduplicate cards by ID (moved from page)
  function deduplicateCards(cards: any[]): any[] {
    const unique = new Map();
    cards.forEach((card: any) => {
      const cardId = card.card?.id || card.id;
      if (cardId && !unique.has(cardId)) {
        unique.set(cardId, card);
      }
    });
    return Array.from(unique.values());
  }

  // Track previous selectedSet to detect changes
  let previousSelectedSet = $state(selectedSet);
  
  // Watch for changes to selectedSet and fetch missing cards when needed
  $effect(() => {
    // Only run on the client side to prevent SSR duplicate requests
    if (browser) {
      // Check if set changed - if so, we might need to clear cache for a fresh fetch
      const setChanged = previousSelectedSet !== selectedSet;
      if (setChanged) {
        console.log(`📍 SetDataManager: Set changed from ${previousSelectedSet} to ${selectedSet}`);
        previousSelectedSet = selectedSet;
      }
      
      if (showMissingCards || onlyMissingCards) {
        // Use cached data for same set, force refresh only if set changed
        fetchMissingCardsWithMarketplaceData(selectedSet, false);
      } else {
        // Clear missing cards when both flags are turned off
        missingCardsWithListings = [];
      }
    }
  });

  // Watch for extractedData changes and trigger set fetching (only when extractedData first becomes available)
  let hasTriggeredInitialFetch = $state(false);
  $effect(() => {
    // Only run on the client side to prevent SSR duplicate requests
    if (browser && extractedData?.profile?.digital_cards && !hasTriggeredInitialFetch) {
      console.log(`🔄 SetDataManager[${componentId}]: Triggering initial fetch of all user sets (hasTriggeredInitialFetch was:`, hasTriggeredInitialFetch, ')');
      hasTriggeredInitialFetch = true;
      fetchAllUserSets();
    }
  });

  // Derived state for combined cards (moved from page)
  const combinedCards = $derived.by(() => {
    if (!extractedData?.profile?.digital_cards) return [];
    
    // Start with deduplicated user cards
    let cards = deduplicateCards([...extractedData.profile.digital_cards]);
    
    console.log(`🔍 SetDataManager: combinedCards derived - selectedSet: ${selectedSet}, showMissingCards: ${showMissingCards}, onlyMissingCards: ${onlyMissingCards}, missingCardsWithListings.length: ${missingCardsWithListings.length}`);
    
    // Add missing cards if enabled for specific set
    if (selectedSet !== 'all' && (showMissingCards || onlyMissingCards)) {
      if (onlyMissingCards) {
        cards = missingCardsWithListings;
        console.log(`🔍 SetDataManager: Using only missing cards (${missingCardsWithListings.length} cards)`);
      } else if (showMissingCards) {
        cards = [...cards, ...missingCardsWithListings];
        console.log(`🔍 SetDataManager: Adding missing cards to user cards (${cards.length} total cards)`);
      }
    }
    
    return cards;
  });

  // Derived state for cards by set (moved from page)
  const cardsBySet = $derived.by(() => {
    const sets: Record<string, any> = {};
    combinedCards.forEach((card: any) => {
      const setName = getSetNameFromCard(card, setCardsData);
      if (!sets[setName]) {
        sets[setName] = { cards: [] };
      }
      sets[setName].cards.push(card);
    });
    return sets;
  });

  // Notify parent component when derived state changes (with throttling to prevent loops)
  let lastCombinedCardsLength = $state(0);
  let lastCardsBySetKeys = $state('');
  
  $effect(() => {
    if (combinedCards.length !== lastCombinedCardsLength) {
      lastCombinedCardsLength = combinedCards.length;
      dispatch('combinedCardsChanged', combinedCards);
    }
  });

  $effect(() => {
    const currentKeys = Object.keys(cardsBySet).sort().join(',');
    if (currentKeys !== lastCardsBySetKeys) {
      lastCardsBySetKeys = currentKeys;
      dispatch('cardsBySetChanged', cardsBySet);
    }
  });

  // Expose functions for parent component use
  export function triggerFetchAllSets() {
    return fetchAllUserSets();
  }
</script>

<!-- This component is invisible - it just manages data -->
<div style="display: none;"></div>