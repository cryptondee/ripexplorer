<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Props
  export let selectedSet: string = 'all';
  export let selectedRarity: string = 'all';
  export let selectedTradeType: string = 'all';
  export let showDuplicatesOnly: boolean = false;

  // Data props
  export let sortedAvailableSets: any[] = [];
  export let availableRarities: string[] = [];

  // Functions passed from parent
  export let getSetCompletion: (setId: string, user: 'A' | 'B') => number;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    setChange: string;
    rarityChange: string;
    tradeTypeChange: string;
    duplicatesToggle: boolean;
    clearFilters: void;
  }>();

  function handleSetChange() {
    dispatch('setChange', selectedSet);
  }

  function handleRarityChange() {
    dispatch('rarityChange', selectedRarity);
  }

  function handleTradeTypeChange() {
    dispatch('tradeTypeChange', selectedTradeType);
  }

  function handleDuplicatesToggle() {
    dispatch('duplicatesToggle', showDuplicatesOnly);
  }

  function handleClearFilters() {
    selectedSet = 'all';
    selectedRarity = 'all';
    selectedTradeType = 'all';
    showDuplicatesOnly = false;
    dispatch('clearFilters');
  }
</script>

<div class="bg-white rounded-lg shadow-md p-8 mb-8">
  <h2 class="text-xl font-bold mb-4">🔄 Trade Opportunities</h2>
  
  <div class="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-8 bg-gray-50 p-6 rounded-lg">
    <!-- Set Filter -->
    <div class="flex items-center space-x-2">
      <label for="setFilter" class="text-sm font-medium text-gray-700 whitespace-nowrap">Set:</label>
      <select 
        id="setFilter" 
        bind:value={selectedSet}
        on:change={handleSetChange}
        class="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {#each sortedAvailableSets as set}
          <option value={set.id}>{set.name} - {getSetCompletion(set.id, 'A')}% complete ({set.count})</option>
        {/each}
        <option value="all">All Sets</option>
      </select>
    </div>

    <!-- Rarity Filter -->
    <div class="flex items-center space-x-2">
      <label for="rarityFilter" class="text-sm font-medium text-gray-700 whitespace-nowrap">Rarity:</label>
      <select 
        id="rarityFilter" 
        bind:value={selectedRarity}
        on:change={handleRarityChange}
        class="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All Rarities</option>
        {#each availableRarities as rarity}
          <option value={rarity}>{rarity.charAt(0).toUpperCase() + rarity.slice(1)}</option>
        {/each}
      </select>
    </div>

    <!-- Show Duplicates Only -->
    <div class="flex items-center space-x-2">
      <label class="flex items-center text-sm text-gray-700">
        <input
          type="checkbox"
          bind:checked={showDuplicatesOnly}
          on:change={handleDuplicatesToggle}
          class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        Show Duplicates Only
      </label>
    </div>

    <!-- Clear Filters -->
    <button
      type="button"
      on:click={handleClearFilters}
      class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-white transition-colors"
    >
      Clear Filters
    </button>
  </div>
</div>