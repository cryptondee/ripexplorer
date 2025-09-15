<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Props
  export let selectedSet: string = 'all';
  export let selectedSetA: string = 'all';  // New: Set for User A
  export let selectedSetB: string = 'all';  // New: Set for User B
  export let selectedRarity: string = 'all';
  export let selectedTradeType: string = 'all';
  export let showDuplicatesOnly: boolean = false;
  export let enableCrossSetTrading: boolean = false;  // New: Toggle for cross-set trading

  // Data props
  export let sortedAvailableSets: any[] = [];
  export let availableRarities: string[] = [];
  export let userA: any = null;  // New: User A info
  export let userB: any = null;  // New: User B info

  // Functions passed from parent
  export let getSetCompletion: (setId: string, user: 'A' | 'B') => number;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    setChange: string;
    setAChange: string;  // New event for User A set change
    setBChange: string;  // New event for User B set change
    rarityChange: string;
    tradeTypeChange: string;
    duplicatesToggle: boolean;
    crossSetToggle: boolean;  // New event for cross-set toggle
    clearFilters: void;
  }>();

  function handleSetChange() {
    dispatch('setChange', selectedSet);
  }

  function handleSetAChange() {
    dispatch('setAChange', selectedSetA);
  }

  function handleSetBChange() {
    dispatch('setBChange', selectedSetB);
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

  function handleCrossSetToggle() {
    enableCrossSetTrading = !enableCrossSetTrading;
    if (!enableCrossSetTrading) {
      // Reset to single set mode
      selectedSetA = 'all';
      selectedSetB = 'all';
    }
    dispatch('crossSetToggle', enableCrossSetTrading);
  }

  function handleClearFilters() {
    selectedSet = 'all';
    selectedSetA = 'all';
    selectedSetB = 'all';
    selectedRarity = 'all';
    selectedTradeType = 'all';
    showDuplicatesOnly = false;
    enableCrossSetTrading = false;
    dispatch('clearFilters');
  }
</script>

<div class="bg-white rounded-lg shadow-md p-8 mb-8">
  <h2 class="text-xl font-bold mb-4">🔄 Trade Opportunities</h2>
  
  <!-- Cross-Set Trading Toggle -->
  <div class="mb-4">
    <label class="flex items-center text-sm text-gray-700">
      <input
        type="checkbox"
        bind:checked={enableCrossSetTrading}
        on:change={handleCrossSetToggle}
        class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
      />
      <span class="font-medium">Enable Cross-Set Trading</span>
      <span class="ml-2 text-gray-500">(Trade different sets between users)</span>
    </label>
  </div>
  
  <div class="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-8 bg-gray-50 p-6 rounded-lg">
    {#if !enableCrossSetTrading}
      <!-- Single Set Filter (Default) -->
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
    {:else}
      <!-- Cross-Set Filters -->
      <div class="flex flex-col space-y-2 flex-1">
        <div class="flex items-center space-x-2">
          <label for="setFilterA" class="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[120px]">
            {userA?.username || 'User A'} Set:
          </label>
          <select 
            id="setFilterA" 
            bind:value={selectedSetA}
            on:change={handleSetAChange}
            class="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
          >
            <option value="all">All Sets</option>
            {#each sortedAvailableSets as set}
              <option value={set.id}>{set.name} - {getSetCompletion(set.id, 'A')}% complete</option>
            {/each}
          </select>
        </div>
        
        <div class="flex items-center space-x-2">
          <label for="setFilterB" class="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[120px]">
            {userB?.username || 'User B'} Set:
          </label>
          <select 
            id="setFilterB" 
            bind:value={selectedSetB}
            on:change={handleSetBChange}
            class="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
          >
            <option value="all">All Sets</option>
            {#each sortedAvailableSets as set}
              <option value={set.id}>{set.name} - {getSetCompletion(set.id, 'B')}% complete</option>
            {/each}
          </select>
        </div>
      </div>
    {/if}

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