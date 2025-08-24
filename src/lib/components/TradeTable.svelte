<script lang="ts">
  // Props for the reusable trade table component
  export let title: string;
  export let trades: any[];
  export let userCountField: 'userACount' | 'userBCount';
  export let titleColor: string = 'text-gray-900';

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

<div class="bg-white rounded-lg shadow-md p-8">
  <h3 class="text-lg font-bold mb-4 {titleColor}">
    {title} ({trades.length})
  </h3>
  
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Card</th>
          <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set</th>
          <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rarity</th>
          <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
          <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        {#each trades as trade}
          <tr class="{getRowHighlighting(trade)}" style="{getRowStyle(trade)}">
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