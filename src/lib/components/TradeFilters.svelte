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
  
  // Card selection props
  export let enableCardSelection: boolean = false;
  export let selectedGiveCards: Set<string> = new Set();
  export let selectedReceiveCards: Set<string> = new Set();
  export let filteredTrades: any[] = [];

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
    cardSelectionToggle: boolean;
    copyTradeSummary: void;
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
    // The checkbox binding will update enableCrossSetTrading automatically
    // We just need to handle the side effects
    if (!enableCrossSetTrading) {
      // When disabling cross-set mode, reset to single set mode
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
    enableCardSelection = false;
    dispatch('clearFilters');
  }
  
  function handleCardSelectionToggle() {
    dispatch('cardSelectionToggle', !enableCardSelection);
  }
  
  function handleCopyTradeSummary() {
    dispatch('copyTradeSummary');
  }
  
  // Computed values for summary display
  $: giveTrades = filteredTrades.filter(t => t.tradeType === 'give');
  $: receiveTrades = filteredTrades.filter(t => t.tradeType === 'receive');
  
  $: selectedGiveTrades = enableCardSelection 
    ? giveTrades.filter(t => selectedGiveCards.has(t.card.id))
    : giveTrades;
  $: selectedReceiveTrades = enableCardSelection 
    ? receiveTrades.filter(t => selectedReceiveCards.has(t.card.id))
    : receiveTrades;
    
  $: selectedGiveCount = selectedGiveTrades.length;
  $: selectedReceiveCount = selectedReceiveTrades.length;
  
  $: selectedGiveValue = selectedGiveTrades.reduce((sum, trade) => sum + (trade.estimatedValue || 0), 0);
  $: selectedReceiveValue = selectedReceiveTrades.reduce((sum, trade) => sum + (trade.estimatedValue || 0), 0);
  $: tradeBalance = selectedReceiveValue - selectedGiveValue;
  
  // Format currency helper
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
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
        on:change={() => {
          // At this point, enableCrossSetTrading has been updated by bind:checked
          if (!enableCrossSetTrading) {
            // Just disabled cross-set trading, reset to single set mode
            selectedSetA = 'all';
            selectedSetB = 'all';
          }
          // When enabling, selectedSetA and selectedSetB start as 'all' which is fine
          dispatch('crossSetToggle', enableCrossSetTrading);
        }}
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
          <option value="all">All Sets</option>
          {#each sortedAvailableSets as set}
            <option value={set.id}>{set.name} - {getSetCompletion(set.id, 'A')}% complete ({set.count})</option>
          {/each}
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
  
  <!-- Card Selection and Trade Actions -->
  <div class="mt-6 pt-6 border-t border-gray-200">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">🎯 Customize Trade Analysis</h3>
        <p class="text-sm text-gray-600 mt-1">Select specific cards to include in trade calculations</p>
      </div>
      <button
        type="button"
        on:click={handleCardSelectionToggle}
        class="px-4 py-2 rounded-lg font-medium transition-colors {enableCardSelection 
          ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
      >
        {enableCardSelection ? '✓ Selection Enabled' : '📝 Enable Selection'}
      </button>
    </div>
    
    {#if enableCardSelection}
      <div class="mb-4 p-3 bg-indigo-50 rounded-lg">
        <p class="text-sm text-indigo-800">
          <span class="font-medium">Selection Mode Active:</span> 
          Use checkboxes to select which cards to include in trades. 
          Deselected cards (grayed out) won't be included in trade calculations.
        </p>
      </div>
    {/if}
    
    <!-- Trade Summary Actions -->
    <div class="bg-gray-50 rounded-lg p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="text-sm text-gray-600">
          <span class="font-medium">Trade Summary:</span>
          {selectedGiveCount} cards to give • {selectedReceiveCount} cards to receive
          {#if enableCardSelection}
            <span class="text-indigo-600">(selected cards only)</span>
          {/if}
        </div>
        <button
          type="button"
          on:click={handleCopyTradeSummary}
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          disabled={selectedGiveCount === 0 && selectedReceiveCount === 0}
        >
          📋 Copy Trade Summary
        </button>
      </div>
      
      <!-- Value Summary -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div class="bg-white rounded-lg p-3 border border-orange-200">
          <div class="text-orange-600 font-medium">🎁 Giving Value</div>
          <div class="text-lg font-bold text-orange-700">{formatCurrency(selectedGiveValue)}</div>
        </div>
        <div class="bg-white rounded-lg p-3 border border-green-200">
          <div class="text-green-600 font-medium">💰 Receiving Value</div>
          <div class="text-lg font-bold text-green-700">{formatCurrency(selectedReceiveValue)}</div>
        </div>
        <div class="bg-white rounded-lg p-3 border {tradeBalance >= 0 ? 'border-green-200' : 'border-red-200'}">
          <div class="{tradeBalance >= 0 ? 'text-green-600' : 'text-red-600'} font-medium">
            ⚖️ Trade Balance
          </div>
          <div class="text-lg font-bold {tradeBalance >= 0 ? 'text-green-700' : 'text-red-700'}">
            {tradeBalance >= 0 ? '+' : ''}{formatCurrency(tradeBalance)}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>