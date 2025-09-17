<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  // Props for the reusable trade table component
  export let title: string;
  export let trades: any[];
  export let userCountField: 'userACount' | 'userBCount';
  export let titleColor: string = 'text-gray-900';
  
  // Card selection props
  export let enableSelection: boolean = false;
  export let selectedCards: Set<string> = new Set();
  
  // Sorting state
  let sortColumn: 'card' | 'set' | 'rarity' | 'count' | 'value' = 'card';
  let sortDirection: 'asc' | 'desc' = 'asc';
  
  // Event dispatcher
  const dispatch = createEventDispatcher<{
    cardClick: any;
    selectionChange: { cardId: string; selected: boolean };
    selectAll: boolean;
  }>();
  
  function handleCardClick(trade: any) {
    dispatch('cardClick', trade);
  }
  
  function handleSelectionChange(trade: any, selected: boolean) {
    dispatch('selectionChange', { cardId: trade.card.id, selected });
  }
  
  function handleSelectAll(selectAll: boolean) {
    dispatch('selectAll', selectAll);
  }
  
  // Sorting function
  function handleSort(column: 'card' | 'set' | 'rarity' | 'count' | 'value') {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'asc';
    }
  }
  
  // Sort trades based on current sort settings
  $: sortedTrades = [...trades].sort((a, b) => {
    let comparison = 0;
    
    switch (sortColumn) {
      case 'card':
        // Sort by card number numerically
        const numA = parseInt(a.card.card_number || '0', 10);
        const numB = parseInt(b.card.card_number || '0', 10);
        comparison = numA - numB;
        break;
      case 'set':
        comparison = (a.card.set_name || a.card.set_id || '').localeCompare(b.card.set_name || b.card.set_id || '');
        break;
      case 'rarity':
        comparison = (a.card.rarity || '').localeCompare(b.card.rarity || '');
        break;
      case 'count':
        comparison = (a[userCountField] || 0) - (b[userCountField] || 0);
        break;
      case 'value':
        comparison = (a.estimatedValue || 0) - (b.estimatedValue || 0);
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  // Check if all visible cards are selected
  $: allSelected = enableSelection && sortedTrades.length > 0 && sortedTrades.every(trade => selectedCards.has(trade.card.id));
  $: someSelected = enableSelection && sortedTrades.some(trade => selectedCards.has(trade.card.id));
  $: selectedCount = enableSelection ? sortedTrades.filter(trade => selectedCards.has(trade.card.id)).length : sortedTrades.length;

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  }

  function getRowHighlighting(trade: any): string {
    // Highlight rows based on card count for both give and receive trades
    const count = userCountField === 'userACount' ? trade.userACount : trade.userBCount;
    if ((trade.tradeType === 'give' || trade.tradeType === 'receive' || trade.tradeType === 'perfect') && count > 0) {
      return 'cursor-pointer'; // Will use inline styles for coloring
    }
    return 'hover:bg-gray-50 cursor-pointer'; // Default styling
  }

  function getRowStyle(trade: any): string {
    const isSelected = enableSelection ? selectedCards.has(trade.card.id) : true;
    
    // If card is deselected, gray it out
    if (enableSelection && !isSelected) {
      return 'background-color: #f9fafb; color: #9ca3af; opacity: 0.6;';
    }
    
    // Highlight rows based on card count for both give and receive trades
    const count = userCountField === 'userACount' ? trade.userACount : trade.userBCount;
    if ((trade.tradeType === 'give' || trade.tradeType === 'receive' || trade.tradeType === 'perfect') && count > 0) {
      if (count === 1) {
        return 'background-color: #fed7aa; border-left: 4px solid #ea580c;'; // Single card - orange
      } else {
        return 'background-color: #bbf7d0; border-left: 4px solid #16a34a;'; // Multiple cards - green
      }
    }
    return ''; // Default styling
  }

  function getRarityBadgeClass(rarity: string): string {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800';
      case 'uncommon': return 'bg-green-100 text-green-800';
      case 'rare': return 'bg-blue-100 text-blue-800';
      case 'mythic': return 'bg-purple-100 text-purple-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  }
</script>

<div class="bg-white rounded-lg shadow-md p-6">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-bold {titleColor}">
      {title} ({enableSelection ? selectedCount : trades.length}{#if enableSelection && selectedCount !== trades.length} of {trades.length}{/if})
    </h3>
    
    {#if enableSelection && trades.length > 0}
      <div class="flex items-center space-x-3 text-sm">
        <button
          type="button"
          class="text-indigo-600 hover:text-indigo-500 font-medium"
          on:click={() => handleSelectAll(true)}
        >
          Select All
        </button>
        <button
          type="button"
          class="text-gray-600 hover:text-gray-500 font-medium"
          on:click={() => handleSelectAll(false)}
        >
          Clear All
        </button>
      </div>
    {/if}
  </div>
  
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          {#if enableSelection}
            <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
              <input
                type="checkbox"
                class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                on:change={(e) => handleSelectAll((e.target as HTMLInputElement).checked)}
              />
            </th>
          {/if}
          <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" on:click={() => handleSort('card')}>
            <div class="flex items-center space-x-1">
              <span>Card</span>
              {#if sortColumn === 'card'}
                <span class="text-gray-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              {/if}
            </div>
          </th>
          <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" on:click={() => handleSort('set')}>
            <div class="flex items-center space-x-1">
              <span>Set</span>
              {#if sortColumn === 'set'}
                <span class="text-gray-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              {/if}
            </div>
          </th>
          <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" on:click={() => handleSort('rarity')}>
            <div class="flex items-center space-x-1">
              <span>Rarity</span>
              {#if sortColumn === 'rarity'}
                <span class="text-gray-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              {/if}
            </div>
          </th>
          <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" on:click={() => handleSort('count')}>
            <div class="flex items-center space-x-1">
              <span>Count</span>
              {#if sortColumn === 'count'}
                <span class="text-gray-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              {/if}
            </div>
          </th>
          <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" on:click={() => handleSort('value')}>
            <div class="flex items-center space-x-1">
              <span>Value</span>
              {#if sortColumn === 'value'}
                <span class="text-gray-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              {/if}
            </div>
          </th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        {#each sortedTrades as trade}
          <tr 
            class="{getRowHighlighting(trade)} cursor-pointer hover:bg-gray-50 transition-colors" 
            style="{getRowStyle(trade)}"
            on:click={() => {
              console.log('Card clicked:', trade.card.name);
              handleCardClick(trade);
            }}
          >
            {#if enableSelection}
              <td class="px-4 py-3 whitespace-nowrap w-10" on:click|stopPropagation>
                <input
                  type="checkbox"
                  class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  checked={selectedCards.has(trade.card.id)}
                  on:change={(e) => handleSelectionChange(trade, (e.target as HTMLInputElement).checked)}
                />
              </td>
            {/if}
            <!-- Card -->
            <td class="px-4 py-3 whitespace-nowrap">
              <div class="flex items-center">
                <div class="w-8 h-11 rounded border mr-3 flex items-center justify-center overflow-hidden bg-gray-100">
                  {#if trade.card.small_image_url}
                    <img 
                      src={trade.card.small_image_url} 
                      alt={trade.card.name} 
                      class="w-full h-full object-cover rounded"
                      loading="lazy"
                    />
                  {:else}
                    <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"></path>
                    </svg>
                  {/if}
                </div>
                <div>
                  <div class="text-sm font-medium text-gray-900">
                    {trade.card.name}
                  </div>
                  {#if trade.card.card_number}
                    <div class="text-sm text-gray-500">#{trade.card.card_number}</div>
                  {/if}
                </div>
              </div>
            </td>
            
            <!-- Set -->
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
              <div class="max-w-xs">
                <p class="truncate text-xs">{trade.card.set_name || trade.card.set_id}</p>
              </div>
            </td>
            
            <!-- Rarity -->
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {getRarityBadgeClass(trade.card.rarity)}">
                {trade.card.rarity || 'Unknown'}
              </span>
            </td>
            
            <!-- Count -->
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
              <div class="text-center">
                <span class="font-medium">{trade[userCountField] || 0}</span>
              </div>
            </td>
            
            <!-- Value -->
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
              {formatCurrency(trade.estimatedValue || 0)}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>