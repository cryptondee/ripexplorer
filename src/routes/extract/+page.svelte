<script lang="ts">
  // localStorage utility functions
  function getCacheKey(userId: string): string {
    return `ripexplorer_cache_${userId}`;
  }

  function getSetCacheKey(setId: string): string {
    return `ripexplorer_set_${setId}`;
  }

  function saveToCache(userId: string, data: any): void {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        userId
      };
      localStorage.setItem(getCacheKey(userId), JSON.stringify(cacheData));
    } catch (err) {
      console.warn('Failed to save data to localStorage:', err);
    }
  }

  function loadFromCache(userId: string): any | null {
    try {
      const cached = localStorage.getItem(getCacheKey(userId));
      if (cached) {
        const cacheData = JSON.parse(cached);
        // Check if cache is for the same user
        if (cacheData.userId === userId) {
          return cacheData;
        }
      }
      return null;
    } catch (err) {
      console.warn('Failed to load data from localStorage:', err);
      return null;
    }
  }

  function saveSetToCache(setId: string, data: any): void {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        setId
      };
      localStorage.setItem(getSetCacheKey(setId), JSON.stringify(cacheData));
    } catch (err) {
      console.warn('Failed to save set data to localStorage:', err);
    }
  }

  function loadSetFromCache(setId: string): any | null {
    try {
      const cached = localStorage.getItem(getSetCacheKey(setId));
      if (cached) {
        const cacheData = JSON.parse(cached);
        return cacheData;
      }
      return null;
    } catch (err) {
      console.warn('Failed to load set data from localStorage:', err);
      return null;
    }
  }

  function clearUserCache(userId: string): void {
    try {
      localStorage.removeItem(getCacheKey(userId));
    } catch (err) {
      console.warn('Failed to clear user cache:', err);
    }
  }

  function clearAllSetCaches(): void {
    try {
      // Get all localStorage keys
      const keys = Object.keys(localStorage);
      // Remove all set cache keys
      keys.forEach(key => {
        if (key.startsWith('ripexplorer_set_')) {
          localStorage.removeItem(key);
        }
      });
      setCardsData = {}; // Clear in-memory set cache too
      console.log('Cleared all set caches');
    } catch (err) {
      console.warn('Failed to clear set caches:', err);
    }
  }

  function clearAllCaches(): void {
    try {
      // Clear all user and set caches
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('ripexplorer_')) {
          localStorage.removeItem(key);
        }
      });
      setCardsData = {};
      console.log('Cleared all caches (user + set data)');
    } catch (err) {
      console.warn('Failed to clear all caches:', err);
    }
  }

  // Helper function to get human-readable set name
  function getSetName(card: any): string {
    // First try to get from the set object
    if (card.set?.name) return card.set.name;
    
    // If no set object, try to derive from setCardsData using set_id
    const setId = card.card?.set_id;
    if (setId && setCardsData[setId]?.cards?.[0]?.set?.name) {
      return setCardsData[setId].cards[0].set.name;
    }
    
    // Fallback to set_id or Unknown
    return card.card?.set_id || 'Unknown';
  }

  let ripUserId = $state('');
  let extractedData = $state<any>(null);
  let loading = $state(false);
  let error = $state('');
  let extractionInfo = $state<any>(null);
  let forceRefresh = $state(false);
  let retryAttempt = $state(0);
  let loadingMessage = $state('Starting extraction...');
  
  // Cards display state
  let selectedSet = $state('all');
  let viewMode = $state<'grid' | 'table'>('table');
  let searchQuery = $state('');
  let selectedRarity = $state('all');
  let sortColumn = $state('card_number');
  let sortDirection = $state<'asc' | 'desc'>('asc');
  let selectedCard = $state<any>(null);
  let showCardModal = $state(false);
  
  // Pagination state
  let currentPage = $state(1);
  let pageSize = $state(50);
  let pageSizeOptions = [10, 20, 50, 100];
  
  // Missing cards state
  let showMissingCards = $state(false);
  let onlyMissingCards = $state(false);
  let availableOnly = $state(false);
  let setCardsData = $state<any>({});
  let loadingSetData = $state<any>({});
  let setDataErrors = $state<any>({});
  let fetchingAllSets = $state(false);
  let bulkFetchErrors = $state<string[]>([]);
  
  // Sorting function
  function sortCards(cards: any[]) {
    return [...cards].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortColumn) {
        case 'card_number':
          aValue = parseInt(a.card?.card_number || '0');
          bValue = parseInt(b.card?.card_number || '0');
          break;
        case 'name':
          aValue = a.card?.name || '';
          bValue = b.card?.name || '';
          break;
        case 'set':
          aValue = getSetName(a);
          bValue = getSetName(b);
          break;
        case 'rarity':
          aValue = a.card?.rarity || '';
          bValue = b.card?.rarity || '';
          break;
        case 'type':
          aValue = a.card?.types?.join(', ') || '';
          bValue = b.card?.types?.join(', ') || '';
          break;
        case 'value':
          aValue = parseFloat(a.listing?.usd_price || a.card?.raw_price || '0');
          bValue = parseFloat(b.listing?.usd_price || b.card?.raw_price || '0');
          break;
        case 'listedPrice':
          // For missing cards, use lowestPrice; for owned cards, use existing price logic
          aValue = a.isMissing ? (a.lowestPrice || 0) : parseFloat(a.listing?.usd_price || a.card?.raw_price || '0');
          bValue = b.isMissing ? (b.lowestPrice || 0) : parseFloat(b.listing?.usd_price || b.card?.raw_price || '0');
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const result = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? result : -result;
      } else {
        const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return sortDirection === 'asc' ? result : -result;
      }
    });
  }
  
  // Handle column header clicks for sorting
  function handleSort(column: string) {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'asc';
    }
    // Reset to first page when sorting changes
    currentPage = 1;
  }
  
  // Pagination functions
  function goToPage(page: number) {
    currentPage = page;
  }
  
  function goToFirstPage() {
    currentPage = 1;
  }
  
  function goToLastPage(totalPages: number) {
    currentPage = totalPages;
  }
  
  function previousPage() {
    if (currentPage > 1) {
      currentPage--;
    }
  }
  
  function nextPage(totalPages: number) {
    if (currentPage < totalPages) {
      currentPage++;
    }
  }
  
  // Handle page size change
  function handlePageSizeChange(newSize: number) {
    pageSize = newSize;
    currentPage = 1; // Reset to first page when page size changes
  }
  
  // Paginate cards
  function paginateCards(cards: any[]) {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return cards.slice(startIndex, endIndex);
  }
  
  // Filter cards by search query and rarity
  function filterCards(cards: any[]) {
    return cards.filter(card => {
      const matchesSearch = !searchQuery || 
        (card.card?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (card.card?.card_number || '').includes(searchQuery) ||
        getSetName(card).toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRarity = selectedRarity === 'all' || card.card?.rarity === selectedRarity;
      
      // Available only filter - only applies to missing cards
      const matchesAvailable = !availableOnly || !card.isMissing || card.is_listed;
      
      return matchesSearch && matchesRarity && matchesAvailable;
    });
  }
  
  // Reset pagination when filters change
  $effect(() => {
    // Access the dependencies to track them
    searchQuery;
    selectedRarity;
    selectedSet;
    onlyMissingCards;
    availableOnly;
    currentPage = 1;
  });
  
  // Handle card click to show modal
  function openCardModal(card: any, allCardsOfSameType: any[] = []) {
    selectedCard = card;
    showCardModal = true;
  }
  
  function closeCardModal() {
    showCardModal = false;
    selectedCard = null;
  }

  // Function to fetch complete set data from rip.fun API
  async function fetchCompleteSetData(setId: string) {
    if (setCardsData[setId]) {
      return setCardsData[setId]; // Return cached data if available
    }

    // Check localStorage cache unless force refresh is requested
    if (!forceRefresh) {
      const cached = loadSetFromCache(setId);
      if (cached) {
        console.log('Loading set data from cache:', setId);
        setCardsData[setId] = cached.data;
        return cached.data;
      }
    }

    loadingSetData[setId] = true;
    setDataErrors[setId] = null;

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

      // Cache the data (already cleaned by backend)
      setCardsData[setId] = data;
      
      // Save to localStorage cache
      saveSetToCache(setId, data);
      console.log('Saved set data to cache:', setId);
      
      return data;
    } catch (err) {
      console.error(`Error fetching set ${setId} data:`, err);
      setDataErrors[setId] = err instanceof Error ? err.message : 'Failed to fetch set data';
      throw err;
    } finally {
      loadingSetData[setId] = false;
    }
  }

  // Function to get missing cards for a specific set
  async function getMissingCards(setId: string, userCards: any[]) {
    try {
      const completeSetData = await fetchCompleteSetData(setId);
      
      if (!completeSetData?.cards) {
        return [];
      }

      // Get all card IDs that the user owns from this set
      const userCardIds = new Set(userCards.map(card => card.card?.id).filter(Boolean));
      
      // Find cards from the complete set that the user doesn't have
      // Note: Complete set cards have ID at root level, user cards have nested structure
      const missingCards = completeSetData.cards.filter((setCard: any) => {
        return setCard.id && !userCardIds.has(setCard.id);
      });

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
            buyNowUrl: `https://www.rip.fun/card/${card.id}`, // Buy now URL
            marketValue: card.market_price || card.raw_price // Market value for missing cards
          };
        })
      );
      
      return missingCardsWithListings;
    } catch (err) {
      console.error(`Error getting missing cards for set ${setId}:`, err);
      return [];
    }
  }

  // Function to get all missing cards for the current set selection
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

  // Function to fetch complete set data for all sets the user owns
  async function fetchAllUserSets() {
    if (!extractedData?.profile?.digital_cards) {
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

    console.log('Fetching complete set data for sets:', Array.from(userSetIds));

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
  }

  // Reactive state for combined cards (owned + missing)
  let combinedCards = $state<any[]>([]);
  
  // Reactive cardsBySet calculation
  let cardsBySet = $state<any>({});

  // Calculate cardsBySet when extractedData changes
  $effect(() => {
    if (!extractedData?.profile?.digital_cards) {
      cardsBySet = {};
      return;
    }

    cardsBySet = extractedData.profile.digital_cards.reduce((sets: any, card: any) => {
      const setName = getSetName(card);
      const setId = card.set?.id || card.card?.set_id || 'unknown';
      if (!sets[setName]) {
        sets[setName] = {
          name: setName,
          id: setId,
          cards: [],
          totalValue: 0,
          listedCount: 0,
          ownedCount: 0,
          releaseDate: card.card?.set?.release_date
        };
      }
      
      sets[setName].cards.push(card);
      sets[setName].totalValue += parseFloat(card.listing?.usd_price || card.card?.raw_price || '0');
      
      if (card.is_listed) {
        sets[setName].listedCount++;
      } else {
        sets[setName].ownedCount++;
      }
      
      return sets;
    }, {});
  });

  // Update combined cards when relevant state changes
  $effect(async () => {
    if (!extractedData?.profile?.digital_cards) {
      combinedCards = [];
      return;
    }

    // Get base owned cards (deduplicated for cleaner display)
    const ownedCards = selectedSet === 'all'
      ? Object.values(extractedData.profile.digital_cards.reduce((unique: any, card: any) => {
          const cardId = card.card?.id;
          if (!unique[cardId] || unique[cardId].listing) {
            unique[cardId] = card;
          }
          return unique;
        }, {})) as any[]
      : Object.values((cardsBySet[selectedSet]?.cards || []).reduce((unique: any, card: any) => {
          const cardId = card.card?.id;
          if (!unique[cardId] || unique[cardId].listing) {
            unique[cardId] = card;
          }
          return unique;
        }, {})) as any[];

    // Handle missing cards based on toggles
    if (selectedSet !== 'all' && (showMissingCards || onlyMissingCards)) {
      console.log('Missing cards logic triggered:', { showMissingCards, onlyMissingCards, selectedSet });
      try {
        const missingCards = await getAllMissingCards();
        console.log('Got missing cards:', missingCards.length);
        
        if (onlyMissingCards) {
          // Show only missing cards
          console.log('Showing only missing cards');
          combinedCards = missingCards;
        } else if (showMissingCards && !onlyMissingCards) {
          // Show both owned and missing cards
          console.log('Showing owned + missing cards');
          combinedCards = [...ownedCards, ...missingCards];
        }
      } catch (err) {
        console.error('Error loading missing cards:', err);
        combinedCards = ownedCards;
      }
    } else {
      console.log('Not showing missing cards:', { selectedSet, showMissingCards, onlyMissingCards });
      combinedCards = ownedCards;
    }
  });

  async function runExtraction() {
    if (!ripUserId.trim()) {
      error = 'Please enter a rip.fun user ID';
      return;
    }

    // Check cache first unless force refresh is requested
    if (!forceRefresh) {
      const cached = loadFromCache(ripUserId.trim());
      if (cached) {
        console.log('Loading data from cache for user:', ripUserId.trim());
        extractedData = cached.data;
        extractionInfo = {
          source: 'cache',
          timestamp: cached.timestamp,
          userId: ripUserId.trim()
        };
        // Don't return here, let the normal flow continue to populate cardsBySet
        return;
      }
    }

    loading = true;
    error = '';
    extractedData = null;
    extractionInfo = null;
    retryAttempt = 0;
    loadingMessage = forceRefresh ? 'Refreshing profile data from rip.fun...' : 'Fetching profile data from rip.fun...';

    // Set up periodic message updates to show progress
    const messageInterval = setInterval(() => {
      if (loading) {
        retryAttempt++;
        if (retryAttempt <= 15) {
          loadingMessage = 'Fetching profile data from rip.fun...';
        } else if (retryAttempt <= 30) {
          loadingMessage = 'Page is taking longer than expected, please wait...';
        } else if (retryAttempt <= 45) {
          loadingMessage = 'Still loading... rip.fun may be experiencing high traffic...';
        } else {
          loadingMessage = 'This is taking unusually long. The request may timeout soon...';
        }
      }
    }, 1000);

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: ripUserId.trim(),
          method: 'api'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Extraction failed');
      }

      const result = await response.json();
      extractedData = result.extractedData;
      extractionInfo = {
        username: result.username,
        targetUrl: result.targetUrl,
        timestamp: result.timestamp
      };
      
      // Save to cache
      saveToCache(ripUserId.trim(), extractedData);
      console.log('Saved user data to cache for:', ripUserId.trim());
      
      loadingMessage = 'Extraction completed successfully!';
      
      // Automatically fetch complete set data for all sets the user owns
      loadingMessage = 'Loading complete set information...';
      try {
        await fetchAllUserSets();
        loadingMessage = 'All data loaded successfully!';
      } catch (err) {
        console.warn('Some set data failed to load:', err);
        loadingMessage = 'Extraction completed (some set data may be incomplete)';
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      
      // Provide more helpful error messages based on the error type
      if (errorMsg.includes('timed out')) {
        error = `Request timed out: The rip.fun profile page took too long to load. This might be due to:\n• High server load on rip.fun\n• Network connectivity issues\n• The profile contains a large amount of data\n\nPlease try again in a moment.`;
      } else if (errorMsg.includes('HTTP error! status: 404')) {
        error = `Profile not found: The user ID "${ripUserId.trim()}" doesn't exist on rip.fun. Please check the user ID and try again.`;
      } else if (errorMsg.includes('HTTP error! status: 500')) {
        error = `Server error: rip.fun is experiencing technical difficulties. Please try again later.`;
      } else if (errorMsg.includes('Failed to fetch')) {
        error = `Network error: Unable to connect to rip.fun. Please check your internet connection and try again.`;
      } else {
        error = errorMsg;
      }
    } finally {
      clearInterval(messageInterval);
      loading = false;
      retryAttempt = 0;
      forceRefresh = false; // Reset force refresh flag
    }
  }

  function downloadJSON() {
    if (!extractedData) return;
    
    const blob = new Blob([JSON.stringify(extractedData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rip-fun-${extractionInfo?.username || 'profile'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function copyToClipboard() {
    if (!extractedData) return;
    
    navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2)).then(() => {
      // Could add a toast notification here
      console.log('Copied to clipboard');
    });
  }
</script>

<div class="px-4 py-8">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-4">rip.fun Data Extractor</h1>
      <p class="text-lg text-gray-600 max-w-2xl mx-auto">
        Extract complete profile data from any rip.fun user. Get all profile information, digital cards, packs, and collection data with clip_embedding data automatically filtered out.
      </p>
    </div>

    <div class="max-w-2xl mx-auto mb-8">
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Extract Profile Data</h2>
        
        <div class="space-y-4">
          <div>
            <label for="ripUsername" class="block text-sm font-medium text-gray-700">
              rip.fun Username
            </label>
            <div class="mt-1 flex rounded-md shadow-sm">
              <span class="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                https://www.rip.fun/profile/
              </span>
              <input
                type="text"
                id="ripUsername"
                bind:value={ripUserId}
                class="block w-full rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="user ID (e.g., 2010)"
              />
            </div>
            <p class="mt-1 text-sm text-gray-500">
              Enter a rip.fun user ID to extract their complete card collection. Examples: 2010 (ndw), 1169 (cryptondee). This uses the direct API for all cards.
            </p>
          </div>

          {#if error}
            <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <div class="ml-3">
                  <div class="text-sm font-medium">
                    {#if error.includes('\n')}
                      {#each error.split('\n') as line}
                        <div class="mb-1">{line}</div>
                      {/each}
                    {:else}
                      {error}
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          {/if}

          <div class="flex space-x-3">
            <button
              onclick={runExtraction}
              disabled={loading}
              class="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {#if loading}
                <div class="flex items-center">
                  <div class="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <div class="flex flex-col items-start">
                    <span class="font-medium">{loadingMessage}</span>
                    {#if retryAttempt > 15}
                      <span class="text-xs text-indigo-200 mt-1">Elapsed: {retryAttempt}s</span>
                    {/if}
                  </div>
                </div>
              {:else}
                Extract Profile Data
              {/if}
            </button>
            
            {#if extractedData}
              <button
                onclick={() => { 
                  forceRefresh = true; 
                  clearUserCache(ripUserId.trim());
                  // Note: We don't clear set caches since set data is static and doesn't change
                  runExtraction(); 
                }}
                disabled={loading}
                class="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                title="Refresh user data from server (preserves set data cache)"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Refresh
              </button>
            {/if}
          </div>
        </div>
      </div>
    </div>

    {#if extractedData}
      <div class="space-y-6">
        <div class="bg-white shadow rounded-lg p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-medium text-gray-900">Extracted Data</h2>
            <div class="flex space-x-2">
              <button
                onclick={copyToClipboard}
                class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                📋 Copy
              </button>
              <button
                onclick={downloadJSON}
                class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                📁 Download JSON
              </button>
            </div>
          </div>
          
          {#if extractionInfo}
            <div class="bg-gray-50 rounded p-4 mb-4">
              <dl class="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-4">
                <div>
                  <dt class="text-sm font-medium text-gray-500">Username</dt>
                  <dd class="text-sm text-gray-900">{extractionInfo.username || ripUserId}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">Source</dt>
                  <dd class="text-sm text-gray-900">
                    {#if extractionInfo.source === 'cache'}
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        📦 Cached
                      </span>
                    {:else}
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        🌐 Live
                      </span>
                    {/if}
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">Profile URL</dt>
                  <dd class="text-sm text-gray-900">
                    {#if extractionInfo.targetUrl}
                      <a href={extractionInfo.targetUrl} target="_blank" class="text-indigo-600 hover:text-indigo-900">
                        View Profile
                      </a>
                    {:else}
                      <a href="https://www.rip.fun/user/{ripUserId}" target="_blank" class="text-indigo-600 hover:text-indigo-900">
                        View Profile
                      </a>
                    {/if}
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd class="text-sm text-gray-900">{new Date(extractionInfo.timestamp).toLocaleString()}</dd>
                </div>
              </dl>
              
              <!-- Advanced Cache Management -->
              <div class="mt-3 pt-3 border-t border-gray-200">
                <details class="text-sm">
                  <summary class="cursor-pointer text-gray-600 hover:text-gray-900 select-none">
                    Advanced Cache Options
                  </summary>
                  <div class="mt-2 space-x-2">
                    <button
                      onclick={clearAllSetCaches}
                      class="text-xs px-2 py-1 border border-gray-300 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      title="Clear all Pokemon TCG set data caches"
                    >
                      Clear Set Caches
                    </button>
                    <button
                      onclick={clearAllCaches}
                      class="text-xs px-2 py-1 border border-red-300 rounded text-red-600 hover:text-red-900 hover:bg-red-50"
                      title="Clear all cached data (user + set data)"
                    >
                      Clear All Caches
                    </button>
                  </div>
                </details>
              </div>
            </div>
          {/if}
          
          <div class="bg-gray-900 rounded p-4 overflow-auto max-h-96">
            <pre class="text-xs text-green-400 font-mono whitespace-pre-wrap">{JSON.stringify(extractedData, null, 2)}</pre>
          </div>
        </div>

        {#if extractedData.profile}
          <div class="space-y-6">
            <div class="bg-white shadow rounded-lg p-6">
              <h2 class="text-lg font-medium text-gray-900 mb-4">Profile Summary</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 class="font-medium text-gray-900 mb-2">Basic Information</h3>
                  <dl class="space-y-1">
                    {#if extractedData.profile.username}
                      <div class="flex">
                        <dt class="text-sm text-gray-500 w-24">Username:</dt>
                        <dd class="text-sm text-gray-900">{extractedData.profile.username}</dd>
                      </div>
                    {/if}
                    {#if extractedData.profile.email}
                      <div class="flex">
                        <dt class="text-sm text-gray-500 w-24">Email:</dt>
                        <dd class="text-sm text-gray-900">{extractedData.profile.email}</dd>
                      </div>
                    {/if}
                    {#if extractedData.profile.bio}
                      <div class="flex">
                        <dt class="text-sm text-gray-500 w-24">Bio:</dt>
                        <dd class="text-sm text-gray-900">{extractedData.profile.bio}</dd>
                      </div>
                    {/if}
                    {#if extractedData.profile.login_provider}
                      <div class="flex">
                        <dt class="text-sm text-gray-500 w-24">Provider:</dt>
                        <dd class="text-sm text-gray-900 capitalize">{extractedData.profile.login_provider}</dd>
                      </div>
                    {/if}
                    {#if extractedData.profile.verified !== undefined}
                      <div class="flex">
                        <dt class="text-sm text-gray-500 w-24">Verified:</dt>
                        <dd class="text-sm text-gray-900">
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {extractedData.profile.verified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                            {extractedData.profile.verified ? '✅ Verified' : '❌ Not Verified'}
                          </span>
                        </dd>
                      </div>
                    {/if}
                  </dl>
                  
                  {#if extractedData.profile.smart_wallet_address || extractedData.profile.owner_wallet_address}
                    <h3 class="font-medium text-gray-900 mb-2 mt-4">Wallet Addresses</h3>
                    <dl class="space-y-1">
                      {#if extractedData.profile.smart_wallet_address}
                        <div class="flex">
                          <dt class="text-sm text-gray-500 w-24">Smart:</dt>
                          <dd class="text-xs text-gray-900 font-mono break-all">{extractedData.profile.smart_wallet_address}</dd>
                        </div>
                      {/if}
                      {#if extractedData.profile.owner_wallet_address && extractedData.profile.owner_wallet_address !== extractedData.profile.smart_wallet_address}
                        <div class="flex">
                          <dt class="text-sm text-gray-500 w-24">Owner:</dt>
                          <dd class="text-xs text-gray-900 font-mono break-all">{extractedData.profile.owner_wallet_address}</dd>
                        </div>
                      {/if}
                    </dl>
                  {/if}
                </div>
                
                <div>
                  <h3 class="font-medium text-gray-900 mb-2">Collection Stats</h3>
                  <dl class="space-y-1">
                    {#if extractedData.profile.digital_cards?.length}
                      <div class="flex">
                        <dt class="text-sm text-gray-500 w-32">Digital Cards:</dt>
                        <dd class="text-sm text-gray-900">{extractedData.profile.digital_cards.length}</dd>
                      </div>
                    {/if}
                    {#if extractedData.profile.digital_products?.length}
                      <div class="flex">
                        <dt class="text-sm text-gray-500 w-32">Digital Products:</dt>
                        <dd class="text-sm text-gray-900">{extractedData.profile.digital_products.length}</dd>
                      </div>
                    {/if}
                    {#if extractedData.stats?.totalCards}
                      <div class="flex">
                        <dt class="text-sm text-gray-500 w-32">Total Cards:</dt>
                        <dd class="text-sm text-gray-900">{extractedData.stats.totalCards}</dd>
                      </div>
                    {/if}
                    {#if extractedData.stats?.totalValue}
                      <div class="flex">
                        <dt class="text-sm text-gray-500 w-32">Total Value:</dt>
                        <dd class="text-sm text-gray-900">{extractedData.stats.totalValue}</dd>
                      </div>
                    {/if}
                  </dl>
                </div>
              </div>
            </div>

            <!-- Set Statistics -->
            {#if extractedData.profile.digital_cards && extractedData.profile.digital_cards.length > 0}
              {@const setStats = extractedData.profile.digital_cards.reduce((stats: any, card: any) => {
                const setName = getSetName(card);
                const rarity = card.card?.rarity || 'Unknown';
                const value = parseFloat(card.listing?.usd_price || card.card?.raw_price || '0');
                
                if (!stats[setName]) {
                  stats[setName] = {
                    name: setName,
                    count: 0,
                    totalValue: 0,
                    rarities: {},
                    releaseDate: card.card?.set?.release_date,
                    setId: card.card?.set_id
                  };
                }
                
                stats[setName].count++;
                stats[setName].totalValue += value;
                stats[setName].rarities[rarity] = (stats[setName].rarities[rarity] || 0) + 1;
                
                return stats;
              }, {})}

              <div class="bg-white shadow rounded-lg p-6">
                <h2 class="text-lg font-medium text-gray-900 mb-4">Collection Overview</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {#each Object.values(setStats) as set}
                    {@const setData = set as any}
                    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                      <div class="flex justify-between items-start mb-2">
                        <h3 class="font-medium text-gray-900 text-sm">{setData.name}</h3>
                        <span class="text-xs text-gray-500">{setData.count} cards</span>
                      </div>
                      
                      <div class="space-y-1 text-xs text-gray-600">
                        <div class="flex justify-between">
                          <span>Total Value:</span>
                          <span class="font-medium text-gray-900">${setData.totalValue.toFixed(2)}</span>
                        </div>
                        {#if setData.releaseDate}
                          <div class="flex justify-between">
                            <span>Released:</span>
                            <span>{new Date(setData.releaseDate).getFullYear()}</span>
                          </div>
                        {/if}
                      </div>
                      
                      <div class="mt-2 pt-2 border-t border-blue-200">
                        <div class="flex flex-wrap gap-1">
                          {#each Object.entries(setData.rarities) as [rarity, count]}
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {rarity}: {count}
                            </span>
                          {/each}
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Digital Cards Section -->
              {#snippet cardsSection()}
                {@const baseCards = combinedCards}
                {@const filteredCards = filterCards(baseCards)}
                {@const sortedCards = sortCards(filteredCards)}
                {@const totalCards = sortedCards.length}
                {@const totalPages = Math.ceil(totalCards / pageSize)}
                {@const paginatedCards = paginateCards(sortedCards)}
                {@const allRarities = [...new Set(extractedData.profile.digital_cards.map((card: any) => card.card?.rarity).filter(Boolean))].sort()}
                
              <div class="bg-white shadow rounded-lg p-6">
                
                <div class="mb-6">
                  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h2 class="text-lg font-medium text-gray-900">
                      Digital Cards 
                      <span class="text-base text-gray-500">
                        (Showing {paginatedCards.length} of {totalCards} cards)
                      </span>
                    </h2>
                    
                    <div class="flex flex-wrap items-center gap-3">
                      <div class="text-sm text-gray-500">
                        Page Value: ${paginatedCards.reduce((sum: number, card: any) => {
                          const price = parseFloat(card.listing?.usd_price || card.card?.raw_price || '0');
                          return sum + price;
                        }, 0).toFixed(2)}
                      </div>
                      <div class="text-sm text-gray-500">
                        Total Value: ${sortedCards.reduce((sum: number, card: any) => {
                          const price = parseFloat(card.listing?.usd_price || card.card?.raw_price || '0');
                          return sum + price;
                        }, 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  <!-- Filters and View Controls -->
                  <div class="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <!-- Search Bar -->
                    <div>
                      <label for="searchCards" class="block text-sm font-medium text-gray-700 mb-1">
                        Search Cards
                      </label>
                      <input
                        type="text"
                        id="searchCards"
                        bind:value={searchQuery}
                        placeholder="Search by name, card number, or set..."
                        class="w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    
                    <div class="flex flex-col sm:flex-row gap-4">
                      <!-- Set Filter -->
                      <div class="flex-1">
                        <label for="setFilter" class="block text-sm font-medium text-gray-700 mb-1">
                          Filter by Set
                        </label>
                        <select 
                          id="setFilter"
                          bind:value={selectedSet}
                          class="w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                          <option value="all">All Sets ({extractedData.profile.digital_cards.length} cards)</option>
                          {#each Object.entries(cardsBySet) as [setName, setData]}
                            {@const set = setData as any}
                            <option value={setName}>
                              {setName} ({set.cards.length} cards)
                            </option>
                          {/each}
                        </select>
                      </div>
                      
                      <!-- Rarity Filter -->
                      <div class="flex-1">
                        <label for="rarityFilter" class="block text-sm font-medium text-gray-700 mb-1">
                          Filter by Rarity
                        </label>
                        <select 
                          id="rarityFilter"
                          bind:value={selectedRarity}
                          class="w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                          <option value="all">All Rarities</option>
                          {#each allRarities as rarity}
                            <option value={rarity}>{rarity}</option>
                          {/each}
                        </select>
                      </div>
                      
                      <!-- View Mode Toggle -->
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                          View Mode
                        </label>
                        <div class="flex rounded-lg border border-gray-300 overflow-hidden">
                          <button
                            onclick={() => viewMode = 'grid'}
                            class="px-3 py-2 text-sm font-medium {viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                          >
                            Grid
                          </button>
                          <button
                            onclick={() => viewMode = 'table'}
                            class="px-3 py-2 text-sm font-medium border-l border-gray-300 {viewMode === 'table' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                          >
                            Table
                          </button>
                        </div>
                      </div>
                      
                      
                      <!-- Missing Cards Toggle -->
                      {#if selectedSet !== 'all'}
                        <div>
                          <label class="block text-sm font-medium text-gray-700 mb-1">
                            Missing Cards
                          </label>
                          <label class="flex items-center">
                            <input
                              type="checkbox"
                              bind:checked={showMissingCards}
                              onchange={() => { if (showMissingCards) onlyMissingCards = false; }}
                              class="rounded border-gray-300 text-indigo-600 focus:border-indigo-500 focus:ring-indigo-500"
                              disabled={fetchingAllSets || loadingSetData[cardsBySet[selectedSet]?.cards[0]?.card?.set_id]}
                            />
                            <span class="ml-2 text-sm text-gray-700">Show missing cards</span>
                            {#if fetchingAllSets}
                              <svg class="ml-2 w-4 h-4 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            {:else if loadingSetData[cardsBySet[selectedSet]?.cards[0]?.card?.set_id]}
                              <svg class="ml-2 w-4 h-4 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            {/if}
                          </label>
                          {#if setDataErrors[cardsBySet[selectedSet]?.cards[0]?.card?.set_id]}
                            <div class="mt-1 text-xs text-red-600">
                              Error loading set data: {setDataErrors[cardsBySet[selectedSet]?.cards[0]?.card?.set_id]}
                            </div>
                          {/if}
                          {#if bulkFetchErrors.length > 0}
                            <div class="mt-1 text-xs text-yellow-600">
                              Some set data failed to load ({bulkFetchErrors.length} errors)
                            </div>
                          {/if}
                        </div>
                        
                        <!-- Only Missing Cards Toggle -->
                        <div>
                          <label class="block text-sm font-medium text-gray-700 mb-1">
                            Filter Options
                          </label>
                          <label class="flex items-center">
                            <input
                              type="checkbox"
                              bind:checked={onlyMissingCards}
                              onchange={() => { if (onlyMissingCards) showMissingCards = false; }}
                              class="rounded border-gray-300 text-indigo-600 focus:border-indigo-500 focus:ring-indigo-500"
                              disabled={fetchingAllSets || loadingSetData[cardsBySet[selectedSet]?.cards[0]?.card?.set_id]}
                            />
                            <span class="ml-2 text-sm text-gray-700">Only show missing cards</span>
                            {#if fetchingAllSets}
                              <svg class="ml-2 w-4 h-4 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            {:else if loadingSetData[cardsBySet[selectedSet]?.cards[0]?.card?.set_id]}
                              <svg class="ml-2 w-4 h-4 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            {/if}
                          </label>
                          
                          <!-- Available Only Toggle -->
                          <label class="flex items-center mt-2">
                            <input
                              type="checkbox"
                              bind:checked={availableOnly}
                              class="rounded border-gray-300 text-indigo-600 focus:border-indigo-500 focus:ring-indigo-500"
                              disabled={fetchingAllSets || loadingSetData[cardsBySet[selectedSet]?.cards[0]?.card?.set_id]}
                            />
                            <span class="ml-2 text-sm text-gray-700">Available only (for missing cards)</span>
                          </label>
                        </div>
                      {/if}
                      
                      <!-- Page Size Selector -->
                      <div>
                        <label for="pageSizeSelect" class="block text-sm font-medium text-gray-700 mb-1">
                          Page Size
                        </label>
                        <select 
                          id="pageSizeSelect"
                          bind:value={pageSize}
                          onchange={(e) => handlePageSizeChange(parseInt((e.target as HTMLSelectElement).value))}
                          class="rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                          {#each pageSizeOptions as size}
                            <option value={size}>{size} cards</option>
                          {/each}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Cards Display -->
                {#if viewMode === 'grid'}
                  <!-- Grid View -->
                  {#if selectedSet === 'all'}
                    <!-- All Sets - Grouped Display -->
                    {#each Object.entries(cardsBySet) as [setName, setData]}
                      {@const set = setData as any}
                      {@const setCards = Object.values(set.cards.reduce((unique: any, card: any) => {
                        const cardId = card.card?.id;
                        if (!unique[cardId] || unique[cardId].listing) {
                          unique[cardId] = card;
                        }
                        return unique;
                      }, {}))}
                      
                      <div class="mb-6 border rounded-lg p-4">
                        <div class="flex justify-between items-center mb-3">
                          <h3 class="font-medium text-gray-900">
                            {setName}
                            <span class="text-sm text-gray-500">({setCards.length} cards)</span>
                          </h3>
                          {#if set.releaseDate}
                            <div class="text-sm text-gray-500">
                              Release: {new Date(set.releaseDate).toLocaleDateString()}
                            </div>
                          {/if}
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {#each setCards as card}
                            <div class="border border-gray-200 rounded-lg p-3 bg-gray-50 relative">
                              <div class="flex items-start justify-between mb-2">
                                <div class="flex-1">
                                  <h4 class="font-medium text-sm text-gray-900">
                                    {card.card?.name || 'Unknown Card'}
                                    {#if card.card?.card_number}
                                      <span class="text-gray-500">#{card.card.card_number}</span>
                                    {/if}
                                  </h4>
                                  <p class="text-xs text-gray-600 mt-1">
                                    {card.card?.rarity || 'Unknown Rarity'}
                                    {#if card.card?.types}
                                      • {card.card.types.join(', ')}
                                    {/if}
                                  </p>
                                </div>
                                <div class="w-10 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded border ml-2 flex items-center justify-center">
                                  <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                  </svg>
                                </div>
                              </div>
                              
                              <div class="space-y-1 text-xs">
                                {#if card.card?.hp}
                                  <div class="flex justify-between">
                                    <span class="text-gray-500">HP:</span>
                                    <span class="text-gray-900">{card.card.hp}</span>
                                  </div>
                                {/if}
                                {#if card.listing}
                                  <div class="flex justify-between">
                                    <span class="text-gray-500">Listed:</span>
                                    <span class="text-green-600 font-medium">${card.listing.usd_price}</span>
                                  </div>
                                {:else if card.card?.raw_price}
                                  <div class="flex justify-between">
                                    <span class="text-gray-500">Value:</span>
                                    <span class="text-gray-900">${card.card.raw_price}</span>
                                  </div>
                                {/if}
                                <div class="flex justify-between">
                                  <span class="text-gray-500">Status:</span>
                                  <span class="text-gray-900">
                                    {#if card.is_listed}
                                      <span class="text-green-600">Listed</span>
                                    {:else}
                                      <span class="text-gray-600">Owned</span>
                                    {/if}
                                  </span>
                                </div>
                              </div>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/each}
                  {:else}
                    <!-- Single Set - Grid Display -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {#each paginatedCards as card}
                        <div class="border {card.isMissing ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'} rounded-lg p-3 relative">
                          <div class="flex items-start justify-between mb-2">
                            <div class="flex-1">
                              <h4 class="font-medium text-sm text-gray-900">
                                {card.card?.name || 'Unknown Card'}
                                {#if card.card?.card_number}
                                  <span class="text-gray-500">#{card.card.card_number}</span>
                                {/if}
                              </h4>
                              <p class="text-xs text-gray-600 mt-1">
                                {card.card?.rarity || 'Unknown Rarity'}
                                {#if card.card?.types}
                                  • {card.card.types.join(', ')}
                                {/if}
                              </p>
                            </div>
                            <div class="w-10 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded border ml-2 flex items-center justify-center">
                              <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                              </svg>
                            </div>
                          </div>
                          
                          <div class="space-y-1 text-xs">
                            {#if card.card?.hp}
                              <div class="flex justify-between">
                                <span class="text-gray-500">HP:</span>
                                <span class="text-gray-900">{card.card.hp}</span>
                              </div>
                            {/if}
                            {#if card.listing}
                              <div class="flex justify-between">
                                <span class="text-gray-500">Listed:</span>
                                <span class="text-green-600 font-medium">${card.listing.usd_price}</span>
                              </div>
                            {:else if card.card?.raw_price}
                              <div class="flex justify-between">
                                <span class="text-gray-500">Value:</span>
                                <span class="text-gray-900">${card.card.raw_price}</span>
                              </div>
                            {/if}
                            <div class="flex justify-between">
                              <span class="text-gray-500">Status:</span>
                              <span class="text-gray-900">
                                {#if card.isMissing}
                                  <span class="text-red-600">Missing</span>
                                {:else if card.is_listed}
                                  <span class="text-green-600">Listed</span>
                                {:else}
                                  <span class="text-gray-600">Owned</span>
                                {/if}
                              </span>
                            </div>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}
                {:else}
                  <!-- Table View -->
                  <div class="mb-2">
                    <p class="text-sm text-gray-600">
                      💡 Click on any row to view detailed card information and high-resolution images
                    </p>
                  </div>
                  <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                      <thead class="bg-gray-50">
                        <tr>
                          <th 
                            scope="col" 
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onclick={() => handleSort('name')}
                          >
                            <div class="flex items-center space-x-1">
                              <span>Card</span>
                              {#if sortColumn === 'name'}
                                <span class="text-indigo-600">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              {/if}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onclick={() => handleSort('set')}
                          >
                            <div class="flex items-center space-x-1">
                              <span>Set</span>
                              {#if sortColumn === 'set'}
                                <span class="text-indigo-600">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              {/if}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onclick={() => handleSort('rarity')}
                          >
                            <div class="flex items-center space-x-1">
                              <span>Rarity</span>
                              {#if sortColumn === 'rarity'}
                                <span class="text-indigo-600">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              {/if}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onclick={() => handleSort('type')}
                          >
                            <div class="flex items-center space-x-1">
                              <span>Type</span>
                              {#if sortColumn === 'type'}
                                <span class="text-indigo-600">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              {/if}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onclick={() => handleSort('value')}
                          >
                            <div class="flex items-center space-x-1">
                              <span>Value</span>
                              {#if sortColumn === 'value'}
                                <span class="text-indigo-600">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              {/if}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onclick={() => handleSort('listedPrice')}
                          >
                            <div class="flex items-center space-x-1">
                              <span>Listed Price</span>
                              {#if sortColumn === 'listedPrice'}
                                <span class="text-indigo-600">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              {/if}
                            </div>
                          </th>
                          <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Available
                          </th>
                          <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody class="bg-white divide-y divide-gray-200">
                        {#each paginatedCards as card}
                          <tr 
                            class="{card.isMissing ? 'bg-red-50 hover:bg-red-100 cursor-pointer border-l-4 border-red-400' : 'hover:bg-gray-50 cursor-pointer'}"
                            onclick={() => openCardModal(card, [card])}
                          >
                            <td class="px-6 py-4 whitespace-nowrap">
                              <div class="flex items-center">
                                <div class="w-8 h-11 rounded border mr-3 flex items-center justify-center overflow-hidden bg-gray-100">
                                  {#if card.card?.small_image_url}
                                    <img 
                                      src={card.card.small_image_url} 
                                      alt={card.card?.name || 'Card'} 
                                      class="w-full h-full object-cover rounded"
                                      loading="lazy"
                                    />
                                  {:else}
                                    <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                  {/if}
                                </div>
                                <div>
                                  <div class="text-sm font-medium text-gray-900">
                                    {card.card?.name || 'Unknown Card'}
                                  </div>
                                  {#if card.card?.card_number}
                                    <div class="text-sm text-gray-500">#{card.card.card_number}</div>
                                  {/if}
                                </div>
                              </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {getSetName(card)}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {card.card?.rarity || 'Unknown'}
                              </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {card.card?.types?.join(', ') || 'Unknown'}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {#if card.isMissing && card.marketValue}
                                ${card.marketValue}
                              {:else if card.listing}
                                <span class="text-green-600 font-medium">${card.listing.usd_price}</span>
                              {:else if card.card?.raw_price}
                                ${card.card.raw_price}
                              {:else}
                                —
                              {/if}
                            </td>
                            <!-- Listed Price Column -->
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {#if card.isMissing && card.lowestPrice}
                                ${card.lowestPrice.toFixed(2)}
                              {:else if card.listing}
                                <span class="text-green-600 font-medium">${card.listing.usd_price}</span>
                              {:else if card.card?.raw_price}
                                ${card.card.raw_price}
                              {:else}
                                —
                              {/if}
                            </td>
                            <!-- Available Column -->
                            <td class="px-6 py-4 whitespace-nowrap text-center">
                              {#if card.isMissing}
                                {#if card.is_listed}
                                  <svg class="w-5 h-5 text-green-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                  </svg>
                                {:else}
                                  <svg class="w-5 h-5 text-red-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                  </svg>
                                {/if}
                              {:else}
                                <span class="text-gray-400 text-sm">N/A</span>
                              {/if}
                            </td>
                            <!-- Action Column -->
                            <td class="px-6 py-4 whitespace-nowrap text-center">
                              {#if card.isMissing}
                                <a 
                                  href={card.buyNowUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white {card.is_listed ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500 hover:bg-gray-600'}"
                                >
                                  {card.is_listed ? 'Buy Now' : 'Make Offer'}
                                </a>
                              {:else}
                                <span class="text-gray-400 text-sm">N/A</span>
                              {/if}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {card.isMissing ? 'bg-red-100 text-red-800' : (card.is_listed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}">
                                {card.isMissing ? 'Missing' : (card.is_listed ? 'Listed' : 'Owned')}
                              </span>
                            </td>
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                  
                  <!-- Pagination Controls -->
                  <div class="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 px-4 py-3 rounded-lg">
                    <!-- Pagination Info -->
                    <div class="text-sm text-gray-700">
                      Showing page {currentPage} of {totalPages} 
                      ({((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCards)} of {totalCards} cards)
                    </div>
                    
                    <!-- Pagination Buttons -->
                    <div class="flex items-center space-x-2">
                      <!-- First Page -->
                      <button
                        onclick={goToFirstPage}
                        disabled={currentPage === 1}
                        class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ««
                      </button>
                      
                      <!-- Previous Page -->
                      <button
                        onclick={previousPage}
                        disabled={currentPage === 1}
                        class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ‹ Prev
                      </button>
                      
                      <!-- Page Numbers -->
                      {#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const start = Math.max(1, currentPage - 2);
                        const end = Math.min(totalPages, start + 4);
                        return start + i;
                      }).filter(page => page <= totalPages) as page}
                        <button
                          onclick={() => goToPage(page)}
                          class="px-3 py-2 text-sm font-medium {currentPage === page 
                            ? 'text-indigo-600 bg-indigo-50 border-indigo-500' 
                            : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-50'} border rounded-md"
                        >
                          {page}
                        </button>
                      {/each}
                      
                      <!-- Next Page -->
                      <button
                        onclick={() => nextPage(totalPages)}
                        disabled={currentPage === totalPages}
                        class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next ›
                      </button>
                      
                      <!-- Last Page -->
                      <button
                        onclick={() => goToLastPage(totalPages)}
                        disabled={currentPage === totalPages}
                        class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        »»
                      </button>
                    </div>
                  </div>
                {/if}
              </div>
              {/snippet}
              
              {@render cardsSection()}
            {/if}

            <!-- Digital Products Section -->
            {#if extractedData.profile.digital_products && extractedData.profile.digital_products.length > 0}
              {@const groupedPacks = extractedData.profile.digital_products.reduce((groups: any, product: any) => {
                const packName = product.name || 'Unknown Pack';
                if (!groups[packName]) {
                  groups[packName] = {
                    name: packName,
                    items: [],
                    totalValue: 0,
                    listedCount: 0,
                    ownedCount: 0,
                    openedCount: 0,
                    sealedCount: 0,
                    pendingOpenCount: 0,
                    sampleImage: null
                  };
                }
                
                groups[packName].items.push(product);
                groups[packName].totalValue += parseFloat(product.product?.current_value || '0');
                
                if (product.is_listed) {
                  groups[packName].listedCount++;
                } else {
                  groups[packName].ownedCount++;
                }
                
                // Count pack statuses based on open_status
                const status = product.open_status?.toLowerCase() || 'unknown';
                if (status.includes('opened') || status === 'opened') {
                  groups[packName].openedCount++;
                } else if (status.includes('sealed') || status === 'sealed' || status === 'unopened') {
                  groups[packName].sealedCount++;
                } else if (status.includes('pending') || status.includes('opening')) {
                  groups[packName].pendingOpenCount++;
                } else if (!product.is_listed) {
                  // If no specific status but owned, assume sealed
                  groups[packName].sealedCount++;
                }
                
                if (!groups[packName].sampleImage && product.front_image_url) {
                  groups[packName].sampleImage = product.front_image_url;
                }
                
                return groups;
              }, {})}
              
              <div class="bg-white shadow rounded-lg p-6">
                <div class="flex justify-between items-center mb-6">
                  <h2 class="text-lg font-medium text-gray-900">Digital Products ({extractedData.profile.digital_products.length})</h2>
                  <div class="text-sm text-gray-500">
                    {Object.keys(groupedPacks).length} unique pack types
                  </div>
                </div>

                <!-- Grouped Pack Display -->
                <div class="space-y-6">
                  {#each Object.values(groupedPacks) as packGroup, index}
                    {@const group = packGroup as any}
                    {@const groupId = `group-${index}`}
                    
                    <div class="border border-gray-200 rounded-lg overflow-hidden">
                      <!-- Pack Group Header -->
                      <button
                        class="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 border-b border-gray-200 flex items-center justify-between transition-colors"
                        onclick={() => {
                          const details = document.getElementById(`details-${groupId}`);
                          const icon = document.getElementById(`icon-${groupId}`);
                          if (details && icon) {
                            details.classList.toggle('hidden');
                            icon.classList.toggle('rotate-180');
                          }
                        }}
                      >
                        <div class="flex items-center space-x-4">
                          {#if group.sampleImage}
                            <img 
                              src={group.sampleImage} 
                              alt={group.name} 
                              class="w-12 h-16 object-cover rounded border"
                              loading="lazy"
                            />
                          {/if}
                          <div class="text-left">
                            <h3 class="text-lg font-semibold text-gray-900">{group.name}</h3>
                            <p class="text-sm text-gray-600">
                              {group.items.length} packs • 
                              <span class="text-green-600 font-medium">{group.openedCount} opened</span> • 
                              <span class="text-blue-600 font-medium">{group.sealedCount} sealed</span>
                              {#if group.pendingOpenCount > 0}
                                • <span class="text-orange-600 font-medium">{group.pendingOpenCount} pending</span>
                              {/if}
                              {#if group.totalValue > 0}
                                • ${group.totalValue.toFixed(2)} value
                              {/if}
                            </p>
                          </div>
                        </div>
                        
                        <div class="flex items-center space-x-2">
                          <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {group.items.length}
                          </span>
                          <svg 
                            id="icon-{groupId}"
                            class="h-5 w-5 text-gray-500 transition-transform transform rotate-0"
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      <!-- Expandable Pack Details -->
                      <div id="details-{groupId}" class="hidden bg-white">
                        <!-- Summary Section -->
                        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-200">
                          <h4 class="text-sm font-semibold text-gray-900 mb-3">{group.name} Summary</h4>
                          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div class="text-center">
                              <div class="text-2xl font-bold text-green-600">{group.openedCount}</div>
                              <div class="text-xs text-gray-600 uppercase tracking-wide">Opened</div>
                            </div>
                            <div class="text-center">
                              <div class="text-2xl font-bold text-blue-600">{group.sealedCount}</div>
                              <div class="text-xs text-gray-600 uppercase tracking-wide">Sealed</div>
                            </div>
                            <div class="text-center">
                              <div class="text-2xl font-bold text-orange-600">{group.pendingOpenCount}</div>
                              <div class="text-xs text-gray-600 uppercase tracking-wide">Pending Open</div>
                            </div>
                            <div class="text-center">
                              <div class="text-2xl font-bold text-gray-800">{group.items.length}</div>
                              <div class="text-xs text-gray-600 uppercase tracking-wide">Total Packs</div>
                            </div>
                          </div>
                          {#if group.totalValue > 0}
                            <div class="mt-3 text-center">
                              <div class="text-lg font-semibold text-gray-900">
                                Total Value: ${group.totalValue.toFixed(2)}
                              </div>
                            </div>
                          {/if}
                        </div>
                        
                        <div class="overflow-x-auto">
                          <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                              <tr>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  ID
                                </th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                              {#each group.items as product}
                                <tr class="hover:bg-gray-50">
                                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    #{product.id}
                                  </td>
                                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {product.is_listed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                                      {product.is_listed ? 'Listed' : (product.open_status || 'Owned')}
                                    </span>
                                  </td>
                                </tr>
                              {/each}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>

                <!-- Individual Cards Section (if any exist separately) -->
                {#if extractedData.profile.digital_products.filter((product: any) => 
                  product.product?.type !== 'pack' && product.product?.type !== 'Pack' && 
                  !product.name?.toLowerCase().includes('pack') && 
                  !product.name?.toLowerCase().includes('booster')
                ).length > 0}
                  {@const nonPackProducts = extractedData.profile.digital_products.filter((product: any) => 
                    product.product?.type !== 'pack' && product.product?.type !== 'Pack' && 
                    !product.name?.toLowerCase().includes('pack') && 
                    !product.name?.toLowerCase().includes('booster')
                  )}
                  <div class="mt-8 pt-6 border-t border-gray-200">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Individual Cards & Products ({nonPackProducts.length})</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {#each nonPackProducts as product}
                        <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div class="flex items-start justify-between mb-2">
                            <div class="flex-1">
                              <h4 class="font-medium text-sm text-gray-900">{product.name || 'Unknown Product'}</h4>
                              <p class="text-xs text-gray-600 mt-1">
                                {#if product.set?.name}
                                  {product.set.name}
                                {/if}
                              </p>
                            </div>
                            {#if product.front_image_url}
                              <img 
                                src={product.front_image_url} 
                                alt={product.name} 
                                class="w-12 h-16 object-cover rounded border ml-2"
                                loading="lazy"
                              />
                            {/if}
                          </div>
                          
                          <div class="space-y-1 text-xs">
                            <div class="flex justify-between">
                              <span class="text-gray-500">Type:</span>
                              <span class="text-gray-900">{product.product?.type || 'Unknown'}</span>
                            </div>
                            {#if product.product?.current_value}
                              <div class="flex justify-between">
                                <span class="text-gray-500">Value:</span>
                                <span class="text-gray-900">${product.product.current_value}</span>
                              </div>
                            {/if}
                            <div class="flex justify-between">
                              <span class="text-gray-500">Status:</span>
                              <span class="text-gray-900">
                                {#if product.is_listed}
                                  <span class="text-green-600">Listed</span>
                                {:else}
                                  <span class="text-gray-600">{product.open_status || 'Owned'}</span>
                                {/if}
                              </span>
                            </div>
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<!-- Card Detail Modal -->
{#if showCardModal && selectedCard}
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onclick={closeCardModal}>
    <div class="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white" onclick={(e) => e.stopPropagation()}>
      <!-- Modal Header -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">
          {selectedCard.card?.name || 'Unknown Card'}
          {#if selectedCard.card?.card_number}
            <span class="text-gray-500">#{selectedCard.card.card_number}</span>
          {/if}
        </h3>
        <button onclick={closeCardModal} class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Card Image -->
        <div class="flex flex-col items-center">
          {#if selectedCard.card?.large_image_url}
            <div class="relative group">
              <img 
                src={selectedCard.card.large_image_url} 
                alt={selectedCard.card?.name} 
                class="max-w-full h-auto rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                onclick={() => window.open(selectedCard.card.large_image_url, '_blank')}
              />
              <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                <div class="opacity-0 group-hover:opacity-100 bg-white bg-opacity-90 px-3 py-1 rounded-full text-sm text-gray-800 transition-opacity">
                  Click to enlarge
                </div>
              </div>
            </div>
          {:else if selectedCard.card?.small_image_url}
            <div class="relative group">
              <img 
                src={selectedCard.card.small_image_url} 
                alt={selectedCard.card?.name} 
                class="max-w-full h-auto rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                onclick={() => window.open(selectedCard.card.small_image_url, '_blank')}
              />
              <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                <div class="opacity-0 group-hover:opacity-100 bg-white bg-opacity-90 px-3 py-1 rounded-full text-sm text-gray-800 transition-opacity">
                  Click to enlarge
                </div>
              </div>
            </div>
          {:else}
            <div class="w-64 h-96 bg-gray-200 rounded-lg flex items-center justify-center">
              <span class="text-gray-500">No Image Available</span>
            </div>
          {/if}
          <p class="text-xs text-gray-500 mt-2 text-center">
            {selectedCard.card?.large_image_url ? 'High resolution image' : 'Standard resolution image'}
          </p>
        </div>
        
        <!-- Card Details -->
        <div class="space-y-4">
          <!-- Basic Info -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-900 mb-3">Card Information</h4>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-500">Set:</dt>
                <dd class="text-gray-900">{getSetName(selectedCard)}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Rarity:</dt>
                <dd class="text-gray-900">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {selectedCard.card?.rarity || 'Unknown'}
                  </span>
                </dd>
              </div>
              {#if selectedCard.card?.types?.length}
                <div class="flex justify-between">
                  <dt class="text-gray-500">Type:</dt>
                  <dd class="text-gray-900">{selectedCard.card.types.join(', ')}</dd>
                </div>
              {/if}
              {#if selectedCard.card?.hp}
                <div class="flex justify-between">
                  <dt class="text-gray-500">HP:</dt>
                  <dd class="text-gray-900">{selectedCard.card.hp}</dd>
                </div>
              {/if}
              {#if selectedCard.card?.supertype}
                <div class="flex justify-between">
                  <dt class="text-gray-500">Supertype:</dt>
                  <dd class="text-gray-900">{selectedCard.card.supertype}</dd>
                </div>
              {/if}
              {#if selectedCard.card?.subtype?.length}
                <div class="flex justify-between">
                  <dt class="text-gray-500">Subtype:</dt>
                  <dd class="text-gray-900">{selectedCard.card.subtype.join(', ')}</dd>
                </div>
              {/if}
            </dl>
          </div>
          
          <!-- Card Features -->
          {#if selectedCard.card?.is_reverse || selectedCard.card?.is_holo || selectedCard.card?.is_first_edition || selectedCard.card?.is_shadowless || selectedCard.card?.is_unlimited || selectedCard.card?.is_promo}
            <div class="bg-purple-50 p-4 rounded-lg">
              <h4 class="font-semibold text-gray-900 mb-3">Special Features</h4>
              <div class="flex flex-wrap gap-2">
                {#if selectedCard.card?.is_reverse}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    🔄 Reverse Holo
                  </span>
                {/if}
                {#if selectedCard.card?.is_holo}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rainbow-100 text-rainbow-800 bg-gradient-to-r from-pink-100 to-blue-100">
                    ✨ Holographic
                  </span>
                {/if}
                {#if selectedCard.card?.is_first_edition}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    🥇 First Edition
                  </span>
                {/if}
                {#if selectedCard.card?.is_shadowless}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    👤 Shadowless
                  </span>
                {/if}
                {#if selectedCard.card?.is_unlimited}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ♾️ Unlimited
                  </span>
                {/if}
                {#if selectedCard.card?.is_promo}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    🎁 Promo
                  </span>
                {/if}
              </div>
            </div>
          {/if}
          
          <!-- Market Info -->
          <div class="bg-green-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-900 mb-3">Market Information</h4>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-500">Status:</dt>
                <dd class="text-gray-900">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {selectedCard.is_listed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                    {selectedCard.is_listed ? 'Listed' : 'Owned'}
                  </span>
                </dd>
              </div>
              {#if selectedCard.listing?.usd_price}
                <div class="flex justify-between">
                  <dt class="text-gray-500">Listed Price:</dt>
                  <dd class="text-green-600 font-semibold">${selectedCard.listing.usd_price}</dd>
                </div>
              {/if}
              {#if selectedCard.card?.raw_price}
                <div class="flex justify-between">
                  <dt class="text-gray-500">Market Value:</dt>
                  <dd class="text-gray-900">${selectedCard.card.raw_price}</dd>
                </div>
              {/if}
            </dl>
          </div>
          
          <!-- Technical Details -->
          <div class="bg-blue-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-900 mb-3">Technical Details</h4>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-500">Card ID:</dt>
                <dd class="text-gray-900 font-mono">{selectedCard.card?.id || selectedCard.id}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Token ID:</dt>
                <dd class="text-gray-900 font-mono">{selectedCard.token_id}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Unique ID:</dt>
                <dd class="text-gray-900 font-mono text-xs">{selectedCard.unique_id}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}