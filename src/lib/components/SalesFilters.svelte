<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let timeframe = '24h';
  export let cardSet: string | null = null;
  export let rarity: string | null = null;
  export let minPrice: string | null = null;
  export let maxPrice: string | null = null;
  export let loading = false;

  const timeframes = [
    { value: '1h', label: '1 Hour' },
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: 'all', label: 'All Time' }
  ];

  const rarities = [
    { value: '', label: 'All Rarities' },
    { value: 'Common', label: 'Common' },
    { value: 'Uncommon', label: 'Uncommon' },
    { value: 'Rare', label: 'Rare' },
    { value: 'Epic', label: 'Epic' },
    { value: 'Legendary', label: 'Legendary' }
  ];

  function handleFilterChange() {
    dispatch('filterChange', {
      timeframe,
      cardSet,
      rarity,
      minPrice,
      maxPrice
    });
  }

  function clearFilters() {
    timeframe = '24h';
    cardSet = null;
    rarity = null;
    minPrice = null;
    maxPrice = null;
    handleFilterChange();
  }

  // Reactive statement to dispatch changes
  $: {
    if (typeof window !== 'undefined') {
      handleFilterChange();
    }
  }
</script>

<div class="bg-white shadow rounded-lg p-6">
  <h3 class="text-lg font-medium text-gray-900 mb-4">Filters</h3>
  
  <div class="space-y-4">
    <!-- Timeframe -->
    <div>
      <label for="timeframe" class="block text-sm font-medium text-gray-700 mb-2">
        Timeframe
      </label>
      <select
        id="timeframe"
        bind:value={timeframe}
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        disabled={loading}
      >
        {#each timeframes as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>

    <!-- Card Set -->
    <div>
      <label for="cardSet" class="block text-sm font-medium text-gray-700 mb-2">
        Card Set
      </label>
      <input
        id="cardSet"
        type="text"
        bind:value={cardSet}
        placeholder="e.g., Paradox Rift"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        disabled={loading}
      />
    </div>

    <!-- Rarity -->
    <div>
      <label for="rarity" class="block text-sm font-medium text-gray-700 mb-2">
        Rarity
      </label>
      <select
        id="rarity"
        bind:value={rarity}
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        disabled={loading}
      >
        {#each rarities as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>

    <!-- Price Range -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Price Range (USDC)
      </label>
      <div class="grid grid-cols-2 gap-2">
        <input
          type="number"
          bind:value={minPrice}
          placeholder="Min"
          step="0.01"
          class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          disabled={loading}
        />
        <input
          type="number"
          bind:value={maxPrice}
          placeholder="Max"
          step="0.01"
          class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          disabled={loading}
        />
      </div>
    </div>

    <!-- Clear Filters -->
    <button
      type="button"
      on:click={clearFilters}
      disabled={loading}
      class="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
    >
      Clear Filters
    </button>
  </div>
</div>