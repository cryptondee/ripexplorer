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
  
  // Card selection props
  export let enableSelection: boolean = false;
  export let selectedGiveCards: Set<string> = new Set();
  export let selectedReceiveCards: Set<string> = new Set();
  
  // Calculate selected trades when selection is enabled
  $: selectedGiveTrades = enableSelection 
    ? filteredTradeSummary.giveTrades.filter(trade => selectedGiveCards.has(trade.card.id))
    : filteredTradeSummary.giveTrades;
    
  $: selectedReceiveTrades = enableSelection
    ? filteredTradeSummary.receiveTrades.filter(trade => selectedReceiveCards.has(trade.card.id))
    : filteredTradeSummary.receiveTrades;
    
  $: selectedGiveValue = selectedGiveTrades.reduce((sum, trade) => sum + (trade.estimatedValue || 0), 0);
  $: selectedReceiveValue = selectedReceiveTrades.reduce((sum, trade) => sum + (trade.estimatedValue || 0), 0);

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    copySummary: void;
  }>();

  function handleCopySummary() {
    dispatch('copySummary');
  }

  // Computed balance difference (use selected values when selection is enabled)
  $: balanceDiff = selectedReceiveValue - selectedGiveValue;
  $: hasData = selectedGiveTrades.length > 0 || selectedReceiveTrades.length > 0;
</script>

{#if hasData}
  <div class="bg-white rounded-lg shadow-md p-8 mb-8">
    <div class="flex justify-between items-start mb-4">
      <h2 class="text-xl font-bold text-gray-900">
        💼 {enableSelection ? 'Selected Cards' : 'Current Filter'} Summary {showDuplicatesOnly ? '(Duplicates Only)' : ''}
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
        <p class="text-2xl font-bold text-orange-600">${selectedGiveValue.toFixed(2)}</p>
        <p class="text-sm text-orange-700">
          {selectedGiveTrades.length} Cards to Give
          {#if enableSelection && selectedGiveTrades.length !== filteredTradeSummary.giveTrades.length}
            <span class="text-orange-500">
              (of {filteredTradeSummary.giveTrades.length} total)
            </span>
          {/if}
        </p>
        {#if enableSelection && selectedGiveValue !== filteredTradeSummary.giveValue}
          <p class="text-xs text-orange-600 mt-1">
            Total available: ${filteredTradeSummary.giveValue.toFixed(2)}
          </p>
        {/if}
      </div>
      
      <!-- Receive Summary -->
      <div class="text-center p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
        <p class="text-2xl font-bold text-blue-600">${selectedReceiveValue.toFixed(2)}</p>
        <p class="text-sm text-blue-700">
          {selectedReceiveTrades.length} Cards to Receive
          {#if enableSelection && selectedReceiveTrades.length !== filteredTradeSummary.receiveTrades.length}
            <span class="text-blue-500">
              (of {filteredTradeSummary.receiveTrades.length} total)
            </span>
          {/if}
        </p>
        {#if enableSelection && selectedReceiveValue !== filteredTradeSummary.receiveValue}
          <p class="text-xs text-blue-600 mt-1">
            Total available: ${filteredTradeSummary.receiveValue.toFixed(2)}
          </p>
        {/if}
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