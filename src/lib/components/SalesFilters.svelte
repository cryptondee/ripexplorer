<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { TIMEFRAMES, RARITIES, DEFAULT_FILTERS } from '$lib/constants/sales';
  import type { SalesFilters } from '$lib/types/sales';

  const dispatch = createEventDispatcher<{
    filterChange: SalesFilters;
  }>();

  export let timeframe = DEFAULT_FILTERS.timeframe;
  export let cardSet: string | null = DEFAULT_FILTERS.cardSet;
  export let rarity: string | null = DEFAULT_FILTERS.rarity;
  export let minPrice: string | null = DEFAULT_FILTERS.minPrice;
  export let maxPrice: string | null = DEFAULT_FILTERS.maxPrice;
  export let loading = false;

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
    timeframe = DEFAULT_FILTERS.timeframe;
    cardSet = DEFAULT_FILTERS.cardSet;
    rarity = DEFAULT_FILTERS.rarity;
    minPrice = DEFAULT_FILTERS.minPrice;
    maxPrice = DEFAULT_FILTERS.maxPrice;
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
        {#each TIMEFRAMES as option}
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
        {#each RARITIES as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>

    <!-- Price Range -->
    <div>
      <label for="price-range-min" class="block text-sm font-medium text-gray-700 mb-2">
        Price Range (USDC)
      </label>
      <div class="grid grid-cols-2 gap-2">
        <input
          id="price-range-min"
          type="number"
          bind:value={minPrice}
          placeholder="Min"
          step="0.01"
          class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          disabled={loading}
          aria-label="Minimum price"
        />
        <input
          id="price-range-max"
          type="number"
          bind:value={maxPrice}
          placeholder="Max"
          step="0.01"
          class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          disabled={loading}
          aria-label="Maximum price"
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