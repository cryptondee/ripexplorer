<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Props
  export let filteredTradeSummary: {
    giveTrades: any[];
    receiveTrades: any[];
    giveValue: number;
    receiveValue: number;
  };
  export let showDuplicatesOnly: boolean = false;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    copySummary: void;
  }>();

  function handleCopySummary() {
    dispatch('copySummary');
  }

  // Computed balance difference
  $: balanceDiff = filteredTradeSummary.receiveValue - filteredTradeSummary.giveValue;
  $: hasData = filteredTradeSummary.giveTrades.length > 0 || filteredTradeSummary.receiveTrades.length > 0;
</script>

{#if hasData}
  <div class="bg-white rounded-lg shadow-md p-8 mb-8">
    <div class="flex justify-between items-start mb-4">
      <h2 class="text-xl font-bold text-gray-900">
        💼 Current Filter Summary {showDuplicatesOnly ? '(Duplicates Only)' : ''}
      </h2>
      <button
        type="button"
        on:click={handleCopySummary}
        class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
      >
        📋 Copy Summary
      </button>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Give Summary -->
      <div class="text-center p-6 bg-orange-50 rounded-lg border-2 border-orange-200">
        <p class="text-2xl font-bold text-orange-600">${filteredTradeSummary.giveValue.toFixed(2)}</p>
        <p class="text-sm text-orange-700">{filteredTradeSummary.giveTrades.length} Cards to Give</p>
      </div>
      
      <!-- Receive Summary -->
      <div class="text-center p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
        <p class="text-2xl font-bold text-blue-600">${filteredTradeSummary.receiveValue.toFixed(2)}</p>
        <p class="text-sm text-blue-700">{filteredTradeSummary.receiveTrades.length} Cards to Receive</p>
      </div>
      
      <!-- Balance -->
      <div class="text-center p-6 rounded-lg border-2 {balanceDiff > 0 ? 'bg-green-50 border-green-200' : balanceDiff < 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}">
        <p class="text-2xl font-bold {balanceDiff > 0 ? 'text-green-600' : balanceDiff < 0 ? 'text-red-600' : 'text-gray-600'}">
          {balanceDiff > 0 ? '+' : ''}${balanceDiff.toFixed(2)}
        </p>
        <p class="text-sm {balanceDiff > 0 ? 'text-green-700' : balanceDiff < 0 ? 'text-red-700' : 'text-gray-700'}">Trade Balance</p>
      </div>
    </div>
  </div>
{/if}