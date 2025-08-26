<script lang="ts">
  import CardFilters from '$lib/components/CardFilters.svelte';
  import CardGrid from '$lib/components/CardGrid.svelte';
  import CardTable from '$lib/components/CardTable.svelte';
  import PackManager from '$lib/components/PackManager.svelte';
  import ExtractUserInput from '$lib/components/ExtractUserInput.svelte';
  import ErrorDisplay from '$lib/components/ErrorDisplay.svelte';
  import LoadingButton from '$lib/components/LoadingButton.svelte';
  import ExtractionInfo from '$lib/components/ExtractionInfo.svelte';
  import ProfileSummary from '$lib/components/ProfileSummary.svelte';
  import CollectionOverview from '$lib/components/CollectionOverview.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import { getSetNameFromCard } from '$lib/utils/card';
  import { getMarketValue, getListedPrice } from '$lib/utils/pricing';
  
  // Import Svelte stores for centralized state management
  import { 
    ripUserId, extractedData, loading, error, extractionInfo,
    selectedSet, viewMode, searchQuery, selectedRarity,
    sortColumn, sortDirection, showJsonData,
    currentPage, pageSize, showMissingCards, onlyMissingCards, availableOnly,
    setCardsData, loadingSetData, setDataErrors, fetchingAllSets, bulkFetchErrors,
    forceRefresh, retryAttempt, loadingMessage,
    searchResults, showSearchResults, searchLoading, syncStatus, syncLoading
  } from '$lib/stores/cardCollectionStore';
  
  import { openCardModal } from '$lib/stores/modalStore';

  // Cache operations now handled entirely by Redis backend
  function clearAllSetCaches(): void {
    // Clear in-memory set cache (Redis handles persistent caching)
    setCardsData.set({});
    console.log('Cleared in-memory set cache');
  }

  // Set name resolution handled by centralized utility
  
  // Local constants (not moved to store)
  let pageSizeOptions = [10, 20, 50, 100];
  
  // All state variables now imported from stores above
  // State management centralized in cardCollectionStore and modalStore
  
  // Sorting function
  function sortCards(cards: any[]) {
    return [...cards].sort((a, b) => {
      let aValue, bValue;
      
      switch ($sortColumn) {
        case 'card_number':
          aValue = parseInt(a.card?.card_number || '0');
          bValue = parseInt(b.card?.card_number || '0');
          break;
        case 'name':
          aValue = a.card?.name || '';
          bValue = b.card?.name || '';
          break;
        case 'set':
          aValue = getSetNameFromCard(a, $setCardsData);
          bValue = getSetNameFromCard(b, $setCardsData);
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
        return $sortDirection === 'asc' ? result : -result;
      } else {
        const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return $sortDirection === 'asc' ? result : -result;
      }
    });
  }
  
  // Handle column header clicks for sorting
  function handleSort(column: string) {
    if ($sortColumn === column) {
      sortDirection.set($sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      sortColumn.set(column);
      sortDirection.set('asc');
    }
    // Reset to first page when sorting changes
    currentPage.set(1);
  }
  
  // Pagination functions
  function goToPage(page: number) {
    currentPage.set(page);
  }
  
  function goToFirstPage() {
    currentPage.set(1);
  }
  
  function goToLastPage(totalPages: number) {
    currentPage.set(totalPages);
  }
  
  function previousPage() {
    if ($currentPage > 1) {
      currentPage.set($currentPage - 1);
    }
  }
  
  function nextPage(totalPages: number) {
    if ($currentPage < totalPages) {
      currentPage.set($currentPage + 1);
    }
  }
  
  // Handle page size change
  function handlePageSizeChange(newSize: number) {
    pageSize.set(newSize);
    currentPage.set(1); // Reset to first page when page size changes
  }

  function handleSetChange(newSet: string) {
    selectedSet.set(newSet);
    currentPage.set(1); // Reset to first page when set changes
  }

  function handleRarityChange(newRarity: string) {
    selectedRarity.set(newRarity);
    currentPage.set(1); // Reset to first page when rarity changes
  }
  
  // Paginate cards
  function paginateCards(cards: any[]) {
    const startIndex = ($currentPage - 1) * $pageSize;
    const endIndex = startIndex + $pageSize;
    return cards.slice(startIndex, endIndex);
  }
  
  
  // Reset pagination when filters change
  $effect(() => {
    // Access the dependencies to track them
    $searchQuery;
    $selectedRarity;
    $selectedSet;
    $onlyMissingCards;
    $availableOnly;
    currentPage.set(1);
  });
  
  // Handle card click to show modal
  // Card modal functions now use store-based state management
  function openCardModalHandler(card: any, allCardsOfSameType: any[] = []) {
    openCardModal(card);
  }
  

  // Function to fetch complete set data from rip.fun API
  async function fetchCompleteSetData(setId: string) {
    if ($setCardsData[setId]) {
      return $setCardsData[setId]; // Return cached data if available
    }

    // Skip localStorage check - Redis handles caching on backend

    loadingSetData.update(data => ({ ...data, [setId]: true }));
    setDataErrors.update(errors => ({ ...errors, [setId]: null }));

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
      setCardsData.update(cache => ({ ...cache, [setId]: data }));
      console.log(`Set data fetched: ${setId} (cached: ${data.cached ? 'yes' : 'no'})`);
      
      return data;
    } catch (err) {
      console.error(`Error fetching set ${setId} data:`, err);
      setDataErrors.update(errors => ({ ...errors, [setId]: err instanceof Error ? err.message : 'Failed to fetch set data' }));
      throw err;
    } finally {
      loadingSetData.update(data => ({ ...data, [setId]: false }));
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
    if (!$extractedData?.profile?.digital_cards || $selectedSet === 'all') {
      return [];
    }

    // Find the set ID for the selected set
    const userCardsForSet = cardsBySet[$selectedSet]?.cards || [];
    
    // Get the set ID from the first card in the set
    const setId = userCardsForSet[0]?.card?.set_id;
    
    if (!setId) {
      return [];
    }

    return await getMissingCards(setId, userCardsForSet);
  }

  // Function to fetch complete set data for all sets the user owns
  async function fetchAllUserSets() {
    if (!$extractedData?.profile?.digital_cards) {
      return;
    }

    fetchingAllSets.set(true);
    bulkFetchErrors.set([]);

    // Get all unique set IDs from user's cards
    const userSetIds = new Set<string>();
    $extractedData.profile.digital_cards.forEach((card: any) => {
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
        bulkFetchErrors.update(errors => [...errors, `Set ${setId}: ${errorMsg}`]);
      }
    });

    await Promise.all(fetchPromises);
    console.log('All set data fetching completed');
    fetchingAllSets.set(false);
  }

  // State to store missing cards with marketplace data
  let missingCardsWithListings: any[] = $state([]);
  let loadingMissingCards = $state(false);

  // Function to fetch missing cards with marketplace data
  async function fetchMissingCardsWithMarketplaceData(selectedSet: string) {
    if (selectedSet === 'all') {
      missingCardsWithListings = [];
      return;
    }

    const userCardsForSet = $extractedData.profile?.digital_cards?.filter(card => 
      getSetNameFromCard(card, $setCardsData) === selectedSet
    ) || [];
    
    const setId = userCardsForSet[0]?.card?.set_id;
    
    if (!setId || !$setCardsData[setId]) {
      missingCardsWithListings = [];
      return;
    }

    loadingMissingCards = true;
    try {
      const result = await getMissingCards(setId, userCardsForSet);
      missingCardsWithListings = result;
    } catch (err) {
      console.error('Error fetching missing cards with marketplace data:', err);
      missingCardsWithListings = [];
    } finally {
      loadingMissingCards = false;
    }
  }

  // Watch for changes to selectedSet and fetch missing cards when needed
  $effect(() => {
    if ($showMissingCards || $onlyMissingCards) {
      fetchMissingCardsWithMarketplaceData($selectedSet);
    }
  });

  // Derived state for card organization
  const combinedCards = $derived.by(() => {
    if (!$extractedData?.profile?.digital_cards) return [];
    
    // Start with deduplicated user cards
    let cards = deduplicateCards([...$extractedData.profile.digital_cards]);
    
    // Add missing cards if enabled for specific set
    if ($selectedSet !== 'all' && ($showMissingCards || $onlyMissingCards)) {
      if ($onlyMissingCards) {
        cards = missingCardsWithListings;
      } else if ($showMissingCards) {
        cards = [...cards, ...missingCardsWithListings];
      }
    }
    
    return cards;
  });
  
  // Deduplicate cards by ID
  function deduplicateCards(cards: any[]): any[] {
    const unique = new Map();
    cards.forEach(card => {
      const cardId = card.card?.id || card.id;
      if (cardId && !unique.has(cardId)) {
        unique.set(cardId, card);
      }
    });
    return Array.from(unique.values());
  }
  
  const cardsBySet = $derived.by(() => {
    const sets: Record<string, any> = {};
    combinedCards.forEach(card => {
      const setName = getSetNameFromCard(card, $setCardsData);
      if (!sets[setName]) {
        sets[setName] = { cards: [] };
      }
      sets[setName].cards.push(card);
    });
    return sets;
  });
  
  const allRarities = $derived.by(() => [...new Set(combinedCards.map(card => card.card?.rarity).filter(Boolean))].sort());
  
  const filteredCards = $derived.by(() => {
    let cards = $selectedSet === 'all' ? combinedCards : (cardsBySet[$selectedSet]?.cards || []);
    
    // Apply filters
    return cards.filter(card => {
      const matchesSearch = !$searchQuery || 
        (card.card?.name || '').toLowerCase().includes($searchQuery.toLowerCase()) ||
        (card.card?.card_number || '').includes($searchQuery) ||
        getSetNameFromCard(card, $setCardsData).toLowerCase().includes($searchQuery.toLowerCase());
      
      const matchesRarity = $selectedRarity === 'all' || card.card?.rarity === $selectedRarity;
      
      // Available only filter - only applies to missing cards  
      // For missing cards, check if they have actual marketplace listings
      const matchesAvailable = !$availableOnly || !card.isMissing || (card.is_listed && card.listing?.listings?.length > 0);
      
      return matchesSearch && matchesRarity && matchesAvailable;
    });
  });
  
  const sortedCards = $derived.by(() => sortCards(filteredCards));
  const totalPages = $derived.by(() => Math.ceil(sortedCards.length / $pageSize));
  const paginatedCards = $derived.by(() => paginateCards(sortedCards));

  async function runExtraction() {
    if (!$ripUserId.trim()) {
      error.set('Please enter a rip.fun user ID');
      return;
    }

    // Proceed with extraction (Redis caching handled by backend)
    await performExtraction();
  }
  
  
  
  async function performExtraction() {

    loading.set(true);
    error.set('');
    extractedData.set(null);
    extractionInfo.set(null);
    retryAttempt.set(0);
    loadingMessage.set($forceRefresh ? 'Refreshing profile data from rip.fun...' : 'Fetching profile data from rip.fun...');

    // Set up periodic message updates to show progress
    const messageInterval = setInterval(() => {
      if ($loading) {
        retryAttempt.update(n => n + 1);
        if ($retryAttempt <= 15) {
          loadingMessage.set('Fetching profile data from rip.fun...');
        } else if ($retryAttempt <= 30) {
          loadingMessage.set('Page is taking longer than expected, please wait...');
        } else if ($retryAttempt <= 45) {
          loadingMessage.set('Still loading... rip.fun may be experiencing high traffic...');
        } else {
          loadingMessage.set('This is taking unusually long. The request may timeout soon...');
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
          username: $ripUserId.trim(),
          method: 'api'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Extraction failed');
      }

      const result = await response.json();
      extractedData.set(result.extractedData);
      extractionInfo.set({
        username: result.username,
        targetUrl: result.targetUrl,
        timestamp: result.timestamp,
        cached: false,
        source: 'live'
      });
      
      // Caching handled by Redis backend
      
      loadingMessage.set('Extraction completed successfully!');
      
      // Automatically fetch complete set data for all sets the user owns
      loadingMessage.set('Loading complete set information...');
      try {
        await fetchAllUserSets();
        loadingMessage.set('All data loaded successfully!');
      } catch (err) {
        console.warn('Some set data failed to load:', err);
        loadingMessage.set('Extraction completed (some set data may be incomplete)');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      
      // Provide more helpful error messages based on the error type
      if (errorMsg.includes('timed out')) {
        error.set(`Request timed out: The rip.fun profile page took too long to load. This might be due to:\n• High server load on rip.fun\n• Network connectivity issues\n• The profile contains a large amount of data\n\nPlease try again in a moment.`);
      } else if (errorMsg.includes('HTTP error! status: 404')) {
        error.set(`Profile not found: The user ID "${$ripUserId.trim()}" doesn't exist on rip.fun. Please check the user ID and try again.`);
      } else if (errorMsg.includes('HTTP error! status: 500')) {
        error.set(`Server error: rip.fun is experiencing technical difficulties. Please try again later.`);
      } else if (errorMsg.includes('Failed to fetch')) {
        error.set(`Network error: Unable to connect to rip.fun. Please check your internet connection and try again.`);
      } else {
        error.set(errorMsg);
      }
    } finally {
      clearInterval(messageInterval);
      loading.set(false);
      retryAttempt.set(0);
      forceRefresh.set(false); // Reset force refresh flag
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
  let searchTimeout: ReturnType<typeof setTimeout>;
  
  function handleUserInput() {
    clearTimeout(searchTimeout);
    
    if ($ripUserId.trim().length < 2) {
      searchResults.set([]);
      showSearchResults.set(false);
      return;
    }
    
    searchTimeout = setTimeout(async () => {
      await searchUsers($ripUserId.trim());
    }, 300);
  }
  
  async function searchUsers(query: string) {
    try {
      searchLoading.set(true);
      const response = await fetch(`/api/search-users?q=${encodeURIComponent(query)}&limit=5`);
      
      if (response.ok) {
        const data = await response.json();
        searchResults.set(data.results);
        showSearchResults.set(true);
      } else {
        searchResults.set([]);
        showSearchResults.set(false);
      }
    } catch (err) {
      console.warn('User search failed:', err);
      searchResults.set([]);
      showSearchResults.set(false);
    } finally {
      searchLoading.set(false);
    }
  }
  
  function selectUser(user: any) {
    ripUserId.set(user.username);
    showSearchResults.set(false);
    searchResults.set([]);
  }
  
  function hideSearchResults() {
    setTimeout(() => {
      showSearchResults.set(false);
    }, 200);
  }

  // Sync functionality
  async function triggerSync() {
    try {
      syncLoading.set(true);
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
      syncLoading.set(false);
    }
  }
  
  async function checkSyncStatus() {
    try {
      const response = await fetch('/api/sync-users');
      if (response.ok) {
        const data = await response.json();
        syncStatus.set(data);
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
          <!-- User Search Input Component -->
          <ExtractUserInput
            bind:ripUserId={$ripUserId}
            searchResults={$searchResults}
            showSearchResults={$showSearchResults}
            searchLoading={$searchLoading}
            syncStatus={$syncStatus}
            syncLoading={$syncLoading}
            loading={$loading}
            on:userInput={handleUserInput}
            on:selectUser={(e) => selectUser(e.detail)}
            on:hideSearchResults={hideSearchResults}
            on:triggerSync={triggerSync}
          />

          <!-- Error Display Component -->
          <ErrorDisplay error={$error} />

          <!-- Loading Button Component -->
          <LoadingButton
            loading={$loading}
            loadingMessage={$loadingMessage}
            retryAttempt={$retryAttempt}
            extractedData={$extractedData}
            forceRefresh={$forceRefresh}
            on:runExtraction={runExtraction}
            on:refreshData={async () => { 
              forceRefresh.set(true); 
              await performExtraction(); 
            }}
          />
        </div>
      </div>
    </div>

    {#if $extractedData}
      <div class="space-y-6">
        <!-- Extraction Info Component -->
        <ExtractionInfo
          extractionInfo={$extractionInfo}
          ripUserId={$ripUserId}
          bind:showJsonData={$showJsonData}
          extractedData={$extractedData}
          on:copyToClipboard={copyToClipboard}
          on:downloadJSON={downloadJSON}
        />

        {#if $extractedData.profile}
          <div class="space-y-6">
            <!-- Profile Summary Component -->
            <ProfileSummary profile={$extractedData.profile} />

            <!-- Collection Overview Component -->
            <CollectionOverview extractedData={$extractedData} setCardsData={$setCardsData} />

            <!-- Digital Cards Section with Full Components -->
            {#if $extractedData.profile.digital_cards && $extractedData.profile.digital_cards.length > 0}
              <div class="space-y-6">
                <!-- Card Filters Component -->
                <CardFilters
                  selectedSet={$selectedSet}
                  selectedRarity={$selectedRarity}
                  viewMode={$viewMode}
                  showMissingCards={$showMissingCards}
                  onlyMissingCards={$onlyMissingCards}
                  availableOnly={$availableOnly}
                  searchTerm={$searchQuery}
                  pageSize={$pageSize}
                  maxPageSize={500}
                  cardsBySet={cardsBySet}
                  allRarities={allRarities}
                  fetchingAllSets={$fetchingAllSets || loadingMissingCards}
                  loadingSetData={$loadingSetData}
                  setDataErrors={$setDataErrors}
                  bulkFetchErrors={$bulkFetchErrors}
                  on:searchChange={(e) => searchQuery.set(e.detail)}
                  on:setChange={(e) => handleSetChange(e.detail)}
                  on:rarityChange={(e) => handleRarityChange(e.detail)}
                  on:viewModeChange={(e) => viewMode.set(e.detail)}
                  on:missingCardsToggle={(e) => showMissingCards.set(e.detail)}
                  on:onlyMissingToggle={(e) => onlyMissingCards.set(e.detail)}
                  on:availableOnlyToggle={(e) => availableOnly.set(e.detail)}
                  on:pageSizeChange={(e) => handlePageSizeChange(e.detail)}
                />
                
                <!-- Card Display Components -->
                {#if $viewMode === 'grid'}
                  <CardGrid
                    selectedSet={$selectedSet}
                    cardsBySet={cardsBySet}
                    paginatedCards={paginatedCards}
                    on:cardClick={(e) => openCardModalHandler(e.detail)}
                  />
                {:else}
                  <CardTable
                    paginatedCards={paginatedCards}
                    sortColumn={$sortColumn}
                    sortDirection={$sortDirection}
                    setNameById={{}}
                    resolveSetName={(card) => getSetNameFromCard(card, $setCardsData)}
                    on:cardClick={(e) => openCardModalHandler(e.detail)}
                    on:sort={(e) => handleSort(e.detail.column)}
                  />
                {/if}
                
                <!-- Pagination Component -->
                {#if totalPages > 1}
                  <Pagination
                    currentPage={$currentPage}
                    {totalPages}
                    on:goToPage={(e) => goToPage(e.detail)}
                    on:previousPage={previousPage}
                    on:nextPage={() => nextPage(totalPages)}
                    on:goToFirstPage={goToFirstPage}
                    on:goToLastPage={() => goToLastPage(totalPages)}
                  />
                {/if}
              </div>
            {/if}
            <!-- Digital Products Section -->
            {#if $extractedData.profile.digital_products && $extractedData.profile.digital_products.length > 0}
              <PackManager digitalProducts={$extractedData.profile.digital_products} />
            {/if}
          </div>
        {/if}
      </div>
    {/if}


  </div>
</div>