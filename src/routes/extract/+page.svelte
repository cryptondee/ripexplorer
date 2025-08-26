<script lang="ts">
  import CardFilters from '$lib/components/CardFilters.svelte';
  import CardDisplay from '$lib/components/CardDisplay.svelte';
  import PackManager from '$lib/components/PackManager.svelte';
  import ExtractUserInput from '$lib/components/ExtractUserInput.svelte';
  import SetDataManager from '$lib/components/SetDataManager.svelte';
  import ExtractionActions from '$lib/components/ExtractionActions.svelte';
  import ErrorDisplay from '$lib/components/ErrorDisplay.svelte';
  import ProfileInfo from '$lib/components/ProfileInfo.svelte';
  import CollectionOverview from '$lib/components/CollectionOverview.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  
  // Import Svelte stores for centralized state management
  import { 
    ripUserId, extractedData, loading, error, extractionInfo,
    selectedSet, viewMode, searchQuery, selectedRarity,
    sortColumn, sortDirection, showJsonData,
    currentPage, pageSize, showMissingCards, onlyMissingCards, availableOnly,
    setCardsData, loadingSetData, setDataErrors, fetchingAllSets, bulkFetchErrors,
    forceRefresh, loadingMessage
  } from '$lib/stores/cardCollectionStore';
  
  import { openCardModal } from '$lib/stores/modalStore';

  // Cache operations now handled entirely by Redis backend
  function clearAllSetCaches(): void {
    // Clear in-memory set cache (Redis handles persistent caching)
    setCardsData.set({});
    console.log('Cleared in-memory set cache');
  }
  
  // All state variables now imported from stores above
  // State management centralized in cardCollectionStore and modalStore
  
  // Event handlers for CardDisplay component
  function handleCardDisplaySort(event: CustomEvent) {
    const { column } = event.detail;
    console.log('Sort changed:', column);
  }
  
  // Event handler for Pagination component
  function handlePageChanged(event: CustomEvent) {
    const { page, action } = event.detail;
    console.log(`Page changed to ${page} via ${action}`);
  }
  
  // Handle page size change
  // Enhanced filter handling - now managed by CardFilters component
  function handleFiltersChanged(event: CustomEvent) {
    const { resetPagination } = event.detail;
    if (resetPagination) {
      currentPage.set(1);
    }
  }
  
  
  
  // Handle card click to show modal
  // Card modal functions now use store-based state management
  // Enhanced modal handler to show duplicate cards as gallery
  function handleCardClick(card: any) {
    // Pass all digital_cards to enable duplicate detection
    const allCards = $extractedData?.profile?.digital_cards || [];
    openCardModal(card, allCards);
  }
  

  // State managed by SetDataManager component
  let combinedCards: any[] = $state([]);
  let cardsBySet: any = $state({});
  
  // Event handlers for SetDataManager
  function handleSetDataLoaded(event: CustomEvent) {
    const { type, setId } = event.detail;
    console.log(`Set data loaded: ${type}`, setId ? `for set ${setId}` : '');
    
    if (type === 'allSets') {
      console.log('All user sets loaded successfully');
    }
  }
  
  function handleCombinedCardsChanged(event: CustomEvent) {
    combinedCards = event.detail;
  }
  
  function handleCardsBySetChanged(event: CustomEvent) {
    cardsBySet = event.detail;
  }
  
  const allRarities = $derived.by(() => [...new Set(combinedCards.map(card => card.card?.rarity).filter(Boolean))].sort());
  
  // CardDisplay component handles filtering, sorting, and pagination
  let totalPages = $state(1);
  let filteredCardsCount = $state(0);

  // Event handlers for ExtractionActions component
  function handleExtractionComplete(event: CustomEvent) {
    const { data, info } = event.detail;
    console.log('Extraction completed:', { data, info });
    // Data is already bound to the stores via the component
  }

  function handleDataExported(event: CustomEvent) {
    const { type } = event.detail;
    console.log(`Data exported via ${type}`);
    // Could add toast notification here
  }

  // Simplified event handlers for enhanced components
  function handleUserSelected(event: CustomEvent) {
    const { username } = event.detail;
    ripUserId.set(username);
    console.log('User selected:', username);
  }
  
  function handleSyncComplete(event: CustomEvent) {
    console.log('Sync completed:', event.detail);
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
          <!-- User Search Input Component (Enhanced - Self-Contained) -->
          <ExtractUserInput
            bind:selectedUserId={$ripUserId}
            disabled={$loading}
            on:userSelected={handleUserSelected}
            on:syncComplete={handleSyncComplete}
          />

          <!-- Error Display Component -->
          <ErrorDisplay error={$error} />

          <!-- Extraction Actions Component -->
          <ExtractionActions
            ripUserId={$ripUserId}
            bind:extractedData={$extractedData}
            bind:extractionInfo={$extractionInfo}
            bind:loading={$loading}
            bind:error={$error}
            bind:loadingMessage={$loadingMessage}
            forceRefresh={$forceRefresh}
            on:extractionComplete={handleExtractionComplete}
            on:dataExported={handleDataExported}
          />
        </div>
      </div>
    </div>

    {#if $extractedData}
      <div class="space-y-6">
        <!-- Profile Info Component (combines ExtractionInfo + ProfileSummary) -->
        <ProfileInfo
          profile={$extractedData?.profile}
          extractionInfo={$extractionInfo}
          ripUserId={$ripUserId}
          bind:showJsonData={$showJsonData}
          extractedData={$extractedData}
        />

        {#if $extractedData.profile}
          <div class="space-y-6">
            <!-- Set Data Manager Component (Invisible - Handles all set data operations) -->
            <SetDataManager
              extractedData={$extractedData}
              selectedSet={$selectedSet}
              showMissingCards={$showMissingCards}
              onlyMissingCards={$onlyMissingCards}
              availableOnly={$availableOnly}
              bind:setCardsData={$setCardsData}
              bind:loadingSetData={$loadingSetData}
              bind:setDataErrors={$setDataErrors}
              bind:fetchingAllSets={$fetchingAllSets}
              bind:bulkFetchErrors={$bulkFetchErrors}
              on:dataLoaded={handleSetDataLoaded}
              on:combinedCardsChanged={handleCombinedCardsChanged}
              on:cardsBySetChanged={handleCardsBySetChanged}
            />

            <!-- Collection Overview Component -->
            <CollectionOverview extractedData={$extractedData} setCardsData={$setCardsData} />

            <!-- Digital Cards Section with Full Components -->
            {#if $extractedData.profile.digital_cards && $extractedData.profile.digital_cards.length > 0}
              <div class="space-y-6">
                <!-- Card Filters Component -->
                <CardFilters
                  bind:selectedSet={$selectedSet}
                  bind:selectedRarity={$selectedRarity}
                  bind:viewMode={$viewMode}
                  bind:showMissingCards={$showMissingCards}
                  bind:onlyMissingCards={$onlyMissingCards}
                  bind:availableOnly={$availableOnly}
                  bind:searchTerm={$searchQuery}
                  bind:pageSize={$pageSize}
                  maxPageSize={500}
                  cardsBySet={cardsBySet}
                  allRarities={allRarities}
                  fetchingAllSets={$fetchingAllSets}
                  loadingSetData={$loadingSetData}
                  setDataErrors={$setDataErrors}
                  bulkFetchErrors={$bulkFetchErrors}
                  on:filtersChanged={handleFiltersChanged}
                />
                
                <!-- Card Display Component -->
                <CardDisplay
                  extractedData={$extractedData}
                  {combinedCards}
                  {cardsBySet}
                  setCardsData={$setCardsData}
                  bind:viewMode={$viewMode}
                  bind:sortColumn={$sortColumn}
                  bind:sortDirection={$sortDirection}
                  selectedSet={$selectedSet}
                  selectedRarity={$selectedRarity}
                  searchQuery={$searchQuery}
                  availableOnly={$availableOnly}
                  pageSize={$pageSize}
                  bind:currentPage={$currentPage}
                  bind:totalPages
                  bind:filteredCardsCount
                  on:cardClick={(e) => handleCardClick(e.detail)}
                  on:sortChange={handleCardDisplaySort}
                />
                
                <!-- Pagination Component -->
                {#if totalPages > 1}
                  <Pagination
                    bind:currentPage={$currentPage}
                    {totalPages}
                    on:pageChanged={handlePageChanged}
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