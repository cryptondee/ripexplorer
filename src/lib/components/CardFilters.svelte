<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Props
  export let selectedSet: string = 'all';
  export let selectedRarity: string = 'all';
  export let viewMode: 'grid' | 'table' = 'grid';
  export let showMissingCards: boolean = false;
  export let onlyMissingCards: boolean = false;
  export let availableOnly: boolean = false;
  export let searchTerm: string = '';
  export let pageSize: number = 50;
  export let maxPageSize: number = 500;

  // Data props
  export let cardsBySet: any = {};
  export let allRarities: string[] = [];
  export let fetchingAllSets: boolean = false;
  export let loadingSetData: any = {};
  export let setDataErrors: any = {};
  export let bulkFetchErrors: any[] = [];

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    searchChange: string;
    setChange: string;
    rarityChange: string;
    viewModeChange: 'grid' | 'table';
    missingCardsToggle: boolean;
    onlyMissingToggle: boolean;
    availableOnlyToggle: boolean;
    pageSizeChange: number;
    filtersChanged: { 
      searchTerm: string; 
      selectedSet: string; 
      selectedRarity: string; 
      showMissingCards: boolean; 
      onlyMissingCards: boolean; 
      availableOnly: boolean;
      pageSize: number;
      resetPagination: boolean;
    };
  }>();

  // Internal filter change handlers with pagination reset logic
  function handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    searchTerm = target.value;
    dispatch('searchChange', searchTerm);
    dispatchFiltersChanged(true);
  }

  function handleSetChange() {
    dispatch('setChange', selectedSet);
    dispatchFiltersChanged(true);
  }

  function handleRarityChange() {
    dispatch('rarityChange', selectedRarity);
    dispatchFiltersChanged(true);
  }

  function handleViewModeChange(mode: 'grid' | 'table') {
    viewMode = mode;
    dispatch('viewModeChange', viewMode);
    // View mode change doesn't reset pagination
    dispatchFiltersChanged(false);
  }

  function handleMissingCardsChange() {
    if (showMissingCards) onlyMissingCards = false;
    dispatch('missingCardsToggle', showMissingCards);
    dispatchFiltersChanged(true);
  }

  function handleOnlyMissingChange() {
    if (onlyMissingCards) showMissingCards = false;
    dispatch('onlyMissingToggle', onlyMissingCards);
    dispatchFiltersChanged(true);
  }

  function handleAvailableOnlyChange() {
    dispatch('availableOnlyToggle', availableOnly);
    dispatchFiltersChanged(true);
  }

  function handlePageSizeChange() {
    dispatch('pageSizeChange', pageSize);
    dispatchFiltersChanged(true);
  }

  // Centralized filter change dispatcher with pagination reset logic
  function dispatchFiltersChanged(resetPagination: boolean) {
    dispatch('filtersChanged', {
      searchTerm,
      selectedSet,
      selectedRarity,
      showMissingCards,
      onlyMissingCards,
      availableOnly,
      pageSize,
      resetPagination
    });
  }

  // Helper to check if set-specific features should be shown
  $: showSetSpecificFeatures = selectedSet !== 'all';
  $: currentSetId = showSetSpecificFeatures ? cardsBySet[selectedSet]?.cards[0]?.card?.set_id : null;
  $: isLoadingCurrentSet = currentSetId ? loadingSetData[currentSetId] : false;
  $: currentSetError = currentSetId ? setDataErrors[currentSetId] : null;
</script>

<div class="bg-white rounded-lg shadow-md p-6 mb-8">
  <h3 class="text-lg font-semibold text-gray-900 mb-4">🔍 Filter & Display Options</h3>
  
  <div class="space-y-6">
    <!-- Search and Basic Filters Row -->
    <div class="flex flex-col lg:flex-row gap-4">
      <!-- Search Bar -->
      <div class="flex-1">
        <label for="cardSearch" class="block text-sm font-medium text-gray-700 mb-1">
          Search Cards
        </label>
        <input
          type="text"
          id="cardSearch"
          bind:value={searchTerm}
          on:input={handleSearchInput}
          placeholder="Search by card name..."
          class="w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      
      <!-- Set Filter -->
      <div class="flex-1">
        <label for="setFilter" class="block text-sm font-medium text-gray-700 mb-1">
          Filter by Set
        </label>
        <select 
          id="setFilter"
          bind:value={selectedSet}
          on:change={handleSetChange}
          class="w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="all">All Sets ({Object.keys(cardsBySet).length} sets)</option>
          {#each Object.entries(cardsBySet) as [setName, setData]}
            <option value={setName}>{setName} ({setData.cards.length})</option>
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
          on:change={handleRarityChange}
          class="w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="all">All Rarities</option>
          {#each allRarities as rarity}
            <option value={rarity}>{rarity}</option>
          {/each}
        </select>
      </div>
    </div>

    <!-- Display Options Row -->
    <div class="flex flex-col lg:flex-row gap-4 items-start">
      <!-- View Mode Toggle -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          View Mode
        </label>
        <div class="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            type="button"
            on:click={() => handleViewModeChange('grid')}
            class="px-3 py-2 text-sm font-medium {viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}"
          >
            Grid
          </button>
          <button
            type="button"
            on:click={() => handleViewModeChange('table')}
            class="px-3 py-2 text-sm font-medium border-l border-gray-300 {viewMode === 'table' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}"
          >
            Table
          </button>
        </div>
      </div>
      
      <!-- Missing Cards Options (only show for specific sets) -->
      {#if showSetSpecificFeatures}
        <div class="flex flex-col gap-2">
          <!-- Missing Cards Toggle -->
          <div>
            <label class="flex items-center">
              <input
                type="checkbox"
                bind:checked={showMissingCards}
                on:change={handleMissingCardsChange}
                class="rounded border-gray-300 text-indigo-600 focus:border-indigo-500 focus:ring-indigo-500"
                disabled={fetchingAllSets || isLoadingCurrentSet}
              />
              <span class="ml-2 text-sm text-gray-700">Show missing cards</span>
              {#if fetchingAllSets || isLoadingCurrentSet}
                <svg class="ml-2 w-4 h-4 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              {/if}
            </label>
          </div>

          <!-- Only Missing Cards Toggle -->
          <div>
            <label class="flex items-center">
              <input
                type="checkbox"
                bind:checked={onlyMissingCards}
                on:change={handleOnlyMissingChange}
                class="rounded border-gray-300 text-indigo-600 focus:border-indigo-500 focus:ring-indigo-500"
                disabled={fetchingAllSets || isLoadingCurrentSet}
              />
              <span class="ml-2 text-sm text-gray-700">Only show missing cards</span>
            </label>
          </div>

          <!-- Available Only Toggle -->
          <div>
            <label class="flex items-center">
              <input
                type="checkbox"
                bind:checked={availableOnly}
                on:change={handleAvailableOnlyChange}
                class="rounded border-gray-300 text-indigo-600 focus:border-indigo-500 focus:ring-indigo-500"
                disabled={fetchingAllSets || isLoadingCurrentSet}
              />
              <span class="ml-2 text-sm text-gray-700">Available only</span>
            </label>
          </div>
        </div>
      {/if}
      
      <!-- Page Size Selector -->
      <div>
        <label for="pageSize" class="block text-sm font-medium text-gray-700 mb-1">
          Cards per page
        </label>
        <select 
          id="pageSize"
          bind:value={pageSize}
          on:change={handlePageSizeChange}
          class="rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
          <option value={maxPageSize}>All ({maxPageSize})</option>
        </select>
      </div>
    </div>

    <!-- Error Messages -->
    {#if currentSetError}
      <div class="text-xs text-red-600 bg-red-50 p-2 rounded">
        Error loading set data: {currentSetError}
      </div>
    {/if}
    
    {#if bulkFetchErrors.length > 0}
      <div class="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
        Some set data failed to load ({bulkFetchErrors.length} errors)
      </div>
    {/if}
  </div>
</div>