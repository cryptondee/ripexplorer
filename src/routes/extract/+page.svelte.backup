<script lang="ts">
  import CardFilters from '$lib/components/CardFilters.svelte';
  import CardGrid from '$lib/components/CardGrid.svelte';
  import CardTable from '$lib/components/CardTable.svelte';
  import PackManager from '$lib/components/PackManager.svelte';
  import { getSetNameFromCard } from '$lib/utils/card';
  import { getMarketValue, getListedPrice } from '$lib/utils/pricing';

  // Cache operations now handled entirely by Redis backend
  function clearAllSetCaches(): void {
    // Clear in-memory set cache (Redis handles persistent caching)
    setCardsData = {};
    console.log('Cleared in-memory set cache');
  }

  // Set name resolution handled by centralized utility

  let ripUserId = $state('');
  let searchResults = $state<any[]>([]);
  let showSearchResults = $state(false);
  let searchLoading = $state(false);
  let syncStatus = $state<any>(null);
  let syncLoading = $state(false);
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
  
  // JSON display toggle
  let showJsonData = $state(false);
  
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
          aValue = getSetNameFromCard(a, setCardsData);
          bValue = getSetNameFromCard(b, setCardsData);
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
          aValue = getMarketValue(a);
          bValue = getMarketValue(b);
          break;
        case 'listedPrice':
          aValue = getListedPrice(a);
          bValue = getListedPrice(b);
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

  function handleSetChange() {
    currentPage = 1; // Reset to first page when set changes
  }

  function handleRarityChange() {
    currentPage = 1; // Reset to first page when rarity changes
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
        getSetNameFromCard(card, setCardsData).toLowerCase().includes(searchQuery.toLowerCase());
      
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

    // Skip localStorage check - Redis handles caching on backend

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

      // Cache the data in memory only (Redis handles persistent caching)
      setCardsData[setId] = data;
      console.log(`Set data fetched: ${setId} (cached: ${data.cached ? 'yes' : 'no'})`);
      
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
  let setNameById = $state<Record<string, string>>({});

  // Calculate cardsBySet when extractedData changes
  $effect(() => {
    if (!extractedData?.profile?.digital_cards) {
      cardsBySet = {};
      return;
    }

    cardsBySet = extractedData.profile.digital_cards.reduce((sets: any, card: any) => {
      const setName = getSetNameFromCard(card, setCardsData);
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

    // Build setNameById from setCardsData cache, preferring set metadata name and skipping numeric-only names
    const numericOnly = (s: any) => typeof s === 'string' && /^\d+$/.test(s.trim());
    const map: Record<string, string> = {};
    for (const [id, data] of Object.entries(setCardsData || {})) {
      const metaName = (data as any)?.set?.name as string | undefined;
      const cardName = (data as any)?.cards?.[0]?.set?.name as string | undefined;
      const chosen = metaName && !numericOnly(metaName) ? metaName : (cardName && !numericOnly(cardName) ? cardName : undefined);
      if (id && chosen) map[id] = chosen;
    }
    // Ensure known mappings exist even if cache lacks proper names
    map['sv3pt5'] = map['sv3pt5'] || 'Scarlet & Violet 151';
    setNameById = map;
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

    // Proceed with extraction (Redis caching handled by backend)
    await performExtraction();
  }
  
  
  
  async function performExtraction() {

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
        timestamp: result.timestamp,
        cached: false,
        source: 'live'
      };
      
      // Caching handled by Redis backend
      
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

  // Username search functionality
  let searchTimeout: number;
  
  function handleUsernameInput() {
    clearTimeout(searchTimeout);
    
    if (ripUserId.trim().length < 2) {
      searchResults = [];
      showSearchResults = false;
      return;
    }
    
    searchTimeout = setTimeout(async () => {
      await searchUsers(ripUserId.trim());
    }, 300);
  }
  
  async function searchUsers(query: string) {
    try {
      searchLoading = true;
      const response = await fetch(`/api/search-users?q=${encodeURIComponent(query)}&limit=5`);
      
      if (response.ok) {
        const data = await response.json();
        searchResults = data.results;
        showSearchResults = true;
      } else {
        searchResults = [];
        showSearchResults = false;
      }
    } catch (err) {
      console.warn('User search failed:', err);
      searchResults = [];
      showSearchResults = false;
    } finally {
      searchLoading = false;
    }
  }
  
  function selectUser(user: any) {
    ripUserId = user.username;
    showSearchResults = false;
    searchResults = [];
  }
  
  function hideSearchResults() {
    setTimeout(() => {
      showSearchResults = false;
    }, 200);
  }

  // Sync functionality
  async function triggerSync() {
    try {
      syncLoading = true;
      const response = await fetch('/api/sync-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Sync started:', data);
        await checkSyncStatus();
      } else {
        const errorData = await response.json();
        console.error('Sync failed:', errorData);
      }
    } catch (err) {
      console.error('Sync request failed:', err);
    } finally {
      syncLoading = false;
    }
  }
  
  async function checkSyncStatus() {
    try {
      const response = await fetch('/api/sync-users');
      if (response.ok) {
        const data = await response.json();
        syncStatus = data;
      }
    } catch (err) {
      console.warn('Failed to check sync status:', err);
    }
  }
  
  // Check sync status on component mount
  $effect(() => {
    checkSyncStatus();
  });
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
          <div class="relative">
            <label for="ripUsername" class="block text-sm font-medium text-gray-700">
              rip.fun Username or User ID
            </label>
            <div class="mt-1 flex rounded-md shadow-sm">
              <span class="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                👤
              </span>
              <input
                type="text"
                id="ripUsername"
                bind:value={ripUserId}
                oninput={handleUsernameInput}
                onblur={hideSearchResults}
                class="block w-full rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="username (e.g., Poketard) or user ID (e.g., 2010)"
                autocomplete="off"
              />
            </div>
            
            <!-- Search Results Dropdown -->
            {#if showSearchResults && (searchResults.length > 0 || searchLoading)}
              <div class="absolute z-10 mt-1 w-full bg-white shadow-lg border border-gray-300 rounded-md max-h-60 overflow-auto">
                {#if searchLoading}
                  <div class="px-4 py-3 text-sm text-gray-500">
                    <div class="flex items-center">
                      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Searching...
                    </div>
                  </div>
                {:else if searchResults.length > 0}
                  {#each searchResults as user}
                    <button
                      onmousedown={() => selectUser(user)}
                      class="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div class="flex items-center space-x-3">
                        {#if user.avatar}
                          <img src={user.avatar} alt={user.username} class="w-8 h-8 rounded-full">
                        {:else}
                          <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span class="text-xs text-gray-500">👤</span>
                          </div>
                        {/if}
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-medium text-gray-900 truncate">{user.username}</p>
                          <p class="text-xs text-gray-500">ID: {user.id}</p>
                        </div>
                      </div>
                    </button>
                  {/each}
                {:else}
                  <div class="px-4 py-3 text-sm text-gray-500">
                    No users found. Try running a sync to update the database.
                  </div>
                {/if}
              </div>
            {/if}
            
            <div class="mt-2 flex justify-between items-start">
              <p class="text-sm text-gray-500">
                Enter a username (e.g., "Poketard") or user ID (e.g., "2010") to extract their complete card collection.
              </p>
              
              <!-- Sync Button -->
              <div class="flex items-center space-x-2">
                {#if syncStatus}
                  <span class="text-xs text-gray-500">
                    Last sync: {syncStatus.status === 'never_run' ? 'Never' : new Date(syncStatus.lastSyncAt).toLocaleDateString()}
                  </span>
                {/if}
                <button
                  onclick={triggerSync}
                  disabled={syncLoading}
                  class="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  title="Sync blockchain data to update username database"
                >
                  {#if syncLoading}
                    <svg class="animate-spin -ml-1 mr-1 h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  {:else}
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                  {/if}
                  Sync
                </button>
              </div>
            </div>
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
                onclick={async () => { 
                  forceRefresh = true; 
                  await performExtraction(); 
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
            <div class="flex items-center space-x-3">
              <label class="flex items-center">
                <input
                  type="checkbox"
                  bind:checked={showJsonData}
                  class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span class="ml-2 text-sm text-gray-700">Show JSON Data</span>
              </label>
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
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800" title="{extractionInfo.cacheAge ? `Data from ${extractionInfo.cacheAge}` : 'Cached data'}">
                        📦 Cached {extractionInfo.cacheAge ? `(${extractionInfo.cacheAge})` : ''}
                      </span>
                    {:else}
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800" title="Fresh data from rip.fun">
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
                  <div class="mt-2 text-xs text-gray-600">
                    Cache management now handled by Redis backend
                  </div>
                </details>
              </div>
            </div>
          {/if}
          
          {#if showJsonData}
            <div class="bg-gray-900 rounded p-4 overflow-auto max-h-96">
              <pre class="text-xs text-green-400 font-mono whitespace-pre-wrap">{JSON.stringify(extractedData, null, 2)}</pre>
            </div>
          {/if}
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
                const setName = getSetNameFromCard(card, setCardsData);
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
                  
                  <!-- Filters Component -->
                  <CardFilters
                    bind:selectedSet
                    bind:selectedRarity
                    bind:viewMode
                    bind:showMissingCards
                    bind:onlyMissingCards
                    bind:availableOnly
                    bind:searchTerm={searchQuery}
                    bind:pageSize
                    maxPageSize={filteredCards.length}
                    {cardsBySet}
                    {allRarities}
                    {fetchingAllSets}
                    {loadingSetData}
                    {setDataErrors}
                    {bulkFetchErrors}
                    on:searchChange={(e) => searchQuery = e.detail}
                    on:setChange={() => handleSetChange()}
                    on:rarityChange={() => handleRarityChange()}
                    on:viewModeChange={(e) => viewMode = e.detail}
                    on:missingCardsToggle={(e) => showMissingCards = e.detail}
                    on:onlyMissingToggle={(e) => onlyMissingCards = e.detail}
                    on:availableOnlyToggle={(e) => availableOnly = e.detail}
                    on:pageSizeChange={(e) => handlePageSizeChange(e.detail)}
                  />

                <!-- Cards Display -->
                {#if viewMode === 'grid'}
                  <CardGrid
                    {selectedSet}
                    {cardsBySet}
                    paginatedCards={paginatedCards}
                    on:cardClick={(e) => openCardModal(e.detail)}
                  />
                {:else}
                  <CardTable
                    paginatedCards={paginatedCards}
                    {sortColumn}
                    {sortDirection}
                    {setNameById}
                    resolveSetName={(card) => getSetNameFromCard(card, setCardsData)}
                    on:cardClick={(e) => openCardModal(e.detail)}
                    on:sort={(e) => handleSort(e.detail.column)}
                  />
                {/if}

                <!-- Pagination -->
                {#if totalPages > 1}
                  <div class="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div class="text-sm text-gray-700">
                      Showing page {currentPage} of {totalPages}
                    </div>
                    
                    <div class="flex items-center gap-2">
                      <button
                        onclick={() => goToFirstPage()}
                        disabled={currentPage === 1}
                        class="px-3 py-1 text-sm border rounded-md {currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                      >
                        First
                      </button>
                      
                      <button
                        onclick={() => previousPage()}
                        disabled={currentPage === 1}
                        class="px-3 py-1 text-sm border rounded-md {currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                      >
                        Previous
                      </button>
                      
                      <span class="px-3 py-1 text-sm text-gray-700">
                        {currentPage}
                      </span>
                      
                      <button
                        onclick={() => nextPage(totalPages)}
                        disabled={currentPage === totalPages}
                        class="px-3 py-1 text-sm border rounded-md {currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                      >
                        Next
                      </button>
                      
                      <button
                        onclick={() => goToLastPage(totalPages)}
                        disabled={currentPage === totalPages}
                        class="px-3 py-1 text-sm border rounded-md {currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                      >
                        Last
                      </button>
                    </div>
                  </div>
                {/if}
              </div>

              <!-- Digital Products Section -->
              {#if extractedData.profile.digital_products && extractedData.profile.digital_products.length > 0}
                <PackManager digitalProducts={extractedData.profile.digital_products} />
              {/if}
            </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}

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
                <dd class="text-gray-900">{getSetNameFromCard(selectedCard, setCardsData)}</dd>
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

  </div>
</div>