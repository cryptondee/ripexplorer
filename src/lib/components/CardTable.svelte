<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Props
  export let paginatedCards: any[] = [];
  export let sortColumn: string = '';
  export let sortDirection: 'asc' | 'desc' = 'asc';

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    cardClick: any;
    sort: { column: string; direction: 'asc' | 'desc' };
  }>();

  function handleCardClick(card: any) {
    dispatch('cardClick', card);
  }

  function handleSort(column: string) {
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    dispatch('sort', { column, direction: newDirection });
  }

  function getSetName(card: any): string {
    // Helper function to get human-readable set name
    if (card.set?.name) return card.set.name;
    if (card.card?.set?.name) return card.card.set.name;
    return card.card?.set_id || 'Unknown Set';
  }

  function getRowClass(card: any): string {
    return card.isMissing 
      ? 'bg-red-50 hover:bg-red-100 cursor-pointer border-l-4 border-red-400' 
      : 'hover:bg-gray-50 cursor-pointer';
  }

  function getActionButtonClass(card: any): string {
    return card.is_listed 
      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
      : 'bg-gray-500 hover:bg-gray-600 text-white';
  }

  function getBuyNowUrl(card: any): string {
    const cardIdentifier = card.card?.id || card.card?.name?.replace(/\s+/g, '-').toLowerCase();
    return `https://www.rip.fun/cards/${cardIdentifier}`;
  }

  function formatPrice(price: any): string {
    if (typeof price === 'number') {
      return price.toFixed(2);
    }
    return price || '—';
  }

  function getSortIcon(column: string): string {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? '↑' : '↓';
    }
    return '';
  }
</script>

<div class="mb-2">
  <p class="text-sm text-gray-600">
    💡 Click on any row to view detailed card information and high-resolution images
  </p>
</div>

<div class="overflow-x-auto">
  <table class="min-w-full divide-y divide-gray-200">
    <thead class="bg-gray-50">
      <tr>
        <!-- Card Column -->
        <th 
          scope="col" 
          class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
          on:click={() => handleSort('name')}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && handleSort('name')}
        >
          <div class="flex items-center space-x-1">
            <span>Card</span>
            {#if sortColumn === 'name'}
              <span class="text-indigo-600">{getSortIcon('name')}</span>
            {/if}
          </div>
        </th>

        <!-- Set Column -->
        <th 
          scope="col" 
          class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
          on:click={() => handleSort('set')}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && handleSort('set')}
        >
          <div class="flex items-center space-x-1">
            <span>Set</span>
            {#if sortColumn === 'set'}
              <span class="text-indigo-600">{getSortIcon('set')}</span>
            {/if}
          </div>
        </th>

        <!-- Rarity Column -->
        <th 
          scope="col" 
          class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
          on:click={() => handleSort('rarity')}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && handleSort('rarity')}
        >
          <div class="flex items-center space-x-1">
            <span>Rarity</span>
            {#if sortColumn === 'rarity'}
              <span class="text-indigo-600">{getSortIcon('rarity')}</span>
            {/if}
          </div>
        </th>

        <!-- Type Column -->
        <th 
          scope="col" 
          class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
          on:click={() => handleSort('type')}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && handleSort('type')}
        >
          <div class="flex items-center space-x-1">
            <span>Type</span>
            {#if sortColumn === 'type'}
              <span class="text-indigo-600">{getSortIcon('type')}</span>
            {/if}
          </div>
        </th>

        <!-- Value Column -->
        <th 
          scope="col" 
          class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
          on:click={() => handleSort('value')}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && handleSort('value')}
        >
          <div class="flex items-center space-x-1">
            <span>Value</span>
            {#if sortColumn === 'value'}
              <span class="text-indigo-600">{getSortIcon('value')}</span>
            {/if}
          </div>
        </th>

        <!-- Listed Price Column -->
        <th 
          scope="col" 
          class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
          on:click={() => handleSort('listedPrice')}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && handleSort('listedPrice')}
        >
          <div class="flex items-center space-x-1">
            <span>Listed Price</span>
            {#if sortColumn === 'listedPrice'}
              <span class="text-indigo-600">{getSortIcon('listedPrice')}</span>
            {/if}
          </div>
        </th>

        <!-- Available Column -->
        <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
          Available
        </th>

        <!-- Action Column -->
        <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
          Action
        </th>

        <!-- Status Column -->
        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Status
        </th>
      </tr>
    </thead>
    <tbody class="bg-white divide-y divide-gray-200">
      {#each paginatedCards as card}
        <tr 
          class={getRowClass(card)}
          on:click={() => handleCardClick(card)}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && handleCardClick(card)}
        >
          <!-- Card Column -->
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
              <div class="w-8 h-11 rounded border mr-3 flex items-center justify-center overflow-hidden bg-gray-100">
                {#if card.card?.small_image_url}
                  <img 
                    src={card.card.small_image_url} 
                    alt={card.card?.name || 'Card'} 
                    class="w-full h-full object-cover rounded"
                    loading="lazy"
                  />
                {:else}
                  <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                {/if}
              </div>
              <div>
                <div class="text-sm font-medium text-gray-900">
                  {card.card?.name || 'Unknown Card'}
                </div>
                {#if card.card?.card_number}
                  <div class="text-sm text-gray-500">#{card.card.card_number}</div>
                {/if}
              </div>
            </div>
          </td>

          <!-- Set Column -->
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            {getSetName(card)}
          </td>

          <!-- Rarity Column -->
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {card.card?.rarity || 'Unknown'}
            </span>
          </td>

          <!-- Type Column -->
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            {card.card?.types?.join(', ') || 'Unknown'}
          </td>

          <!-- Value Column -->
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            {#if card.isMissing && card.marketValue}
              ${formatPrice(card.marketValue)}
            {:else if card.listing}
              <span class="text-green-600 font-medium">${formatPrice(card.listing.usd_price)}</span>
            {:else if card.card?.raw_price}
              ${formatPrice(card.card.raw_price)}
            {:else}
              —
            {/if}
          </td>

          <!-- Listed Price Column -->
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            {#if card.isMissing && card.lowestPrice}
              ${formatPrice(card.lowestPrice)}
            {:else if card.listing}
              <span class="text-green-600 font-medium">${formatPrice(card.listing.usd_price)}</span>
            {:else if card.card?.raw_price}
              ${formatPrice(card.card.raw_price)}
            {:else}
              —
            {/if}
          </td>

          <!-- Available Column -->
          <td class="px-6 py-4 whitespace-nowrap text-center">
            {#if card.isMissing}
              {#if card.is_listed}
                <svg class="w-5 h-5 text-green-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              {:else}
                <svg class="w-5 h-5 text-red-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              {/if}
            {:else}
              <span class="text-gray-400 text-sm">N/A</span>
            {/if}
          </td>

          <!-- Action Column -->
          <td class="px-6 py-4 whitespace-nowrap text-center">
            {#if card.isMissing}
              <a 
                href={getBuyNowUrl(card)} 
                target="_blank" 
                rel="noopener noreferrer"
                class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium {getActionButtonClass(card)}"
                on:click|stopPropagation
              >
                {card.is_listed ? 'Buy Now' : 'Make Offer'}
              </a>
            {:else}
              <span class="text-gray-400 text-sm">N/A</span>
            {/if}
          </td>

          <!-- Status Column -->
          <td class="px-6 py-4 whitespace-nowrap">
            {#if card.isMissing}
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Missing
              </span>
            {:else if card.is_listed}
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Listed
              </span>
            {:else}
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Owned
              </span>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if paginatedCards.length === 0}
  <div class="text-center py-12">
    <div class="text-4xl mb-4">🔍</div>
    <h3 class="text-lg font-medium text-gray-900 mb-2">No cards found</h3>
    <p class="text-gray-600">Try adjusting your filters or search term.</p>
  </div>
{/if}