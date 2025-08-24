<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { buildRipCardUrl } from '$lib/utils/url';

  // Props
  export let selectedSet: string = 'all';
  export let cardsBySet: any = {};
  export let paginatedCards: any[] = [];

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    cardClick: any;
  }>();

  function handleCardClick(card: any) {
    dispatch('cardClick', card);
  }

  // Helper function to deduplicate cards by ID
  function deduplicateCards(cards: any[]): any[] {
    return Object.values(cards.reduce((unique: any, card: any) => {
      const cardId = card.card?.id;
      if (!unique[cardId] || unique[cardId].listing) {
        unique[cardId] = card;
      }
      return unique;
    }, {}));
  }

  // Helper function to format card status
  function getCardStatus(card: any): { text: string; class: string } {
    if (card.isMissing) {
      return { text: 'Missing', class: 'text-red-600' };
    } else if (card.is_listed) {
      return { text: 'Listed', class: 'text-green-600' };
    } else {
      return { text: 'Owned', class: 'text-gray-600' };
    }
  }

  // Helper function to get card container styling
  function getCardContainerClass(card: any): string {
    return `border rounded-lg p-3 relative cursor-pointer hover:shadow-md transition-shadow ${
      card.isMissing 
        ? 'border-red-300 bg-red-50 hover:bg-red-100' 
        : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
    }`;
  }
</script>

<!-- Grid View -->
{#if selectedSet === 'all'}
  <!-- All Sets - Grouped Display -->
  {#each Object.entries(cardsBySet) as [setName, setData]}
    {@const set = setData as any}
    {@const setCards = deduplicateCards(set.cards)}
    
    <div class="mb-6 border rounded-lg p-4">
      <div class="flex justify-between items-center mb-3">
        <h3 class="font-medium text-gray-900">
          {setName}
          <span class="text-sm text-gray-500">({setCards.length} cards)</span>
        </h3>
        {#if set.releaseDate}
          <div class="text-sm text-gray-500">
            Release: {new Date(set.releaseDate).toLocaleDateString()}
          </div>
        {/if}
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each setCards as card}
          <div 
            class={getCardContainerClass(card)}
            on:click={() => handleCardClick(card)}
            role="button"
            tabindex="0"
            on:keydown={(e) => e.key === 'Enter' && handleCardClick(card)}
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1">
                <h4 class="font-medium text-sm text-gray-900">
                  {card.card?.name || 'Unknown Card'}
                  {#if card.card?.card_number}
                    <span class="text-gray-500">#{card.card.card_number}</span>
                  {/if}
                </h4>
                <p class="text-xs text-gray-600 mt-1">
                  {card.card?.rarity || 'Unknown Rarity'}
                  {#if card.card?.types}
                    • {card.card.types.join(', ')}
                  {/if}
                </p>
              </div>
              <div class="w-10 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded border ml-2 flex items-center justify-center">
                <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
            </div>
            
            <div class="space-y-1 text-xs">
              {#if card.card?.hp}
                <div class="flex justify-between">
                  <span class="text-gray-500">HP:</span>
                  <span class="text-gray-900">{card.card.hp}</span>
                </div>
              {/if}
              {#if card.listing}
                <div class="flex justify-between">
                  <span class="text-gray-500">Listed:</span>
                  <span class="text-green-600 font-medium">${card.listing.usd_price}</span>
                </div>
              {:else if card.card?.raw_price}
                <div class="flex justify-between">
                  <span class="text-gray-500">Value:</span>
                  <span class="text-gray-900">${card.card.raw_price}</span>
                </div>
              {/if}
              <div class="flex justify-between">
                <span class="text-gray-500">Status:</span>
                <span class={getCardStatus(card).class}>{getCardStatus(card).text}</span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/each}
{:else}
  <!-- Single Set - Grid Display -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each paginatedCards as card}
      <div 
        class={getCardContainerClass(card)}
        on:click={() => handleCardClick(card)}
        role="button"
        tabindex="0"
        on:keydown={(e) => e.key === 'Enter' && handleCardClick(card)}
      >
        <div class="flex items-start justify-between mb-2">
          <div class="flex-1">
            <h4 class="font-medium text-sm text-gray-900">
              {card.card?.name || 'Unknown Card'}
              {#if card.card?.card_number}
                <span class="text-gray-500">#{card.card.card_number}</span>
              {/if}
            </h4>
            <p class="text-xs text-gray-600 mt-1">
              {card.card?.rarity || 'Unknown Rarity'}
              {#if card.card?.types}
                • {card.card.types.join(', ')}
              {/if}
            </p>
          </div>
          <div class="w-10 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded border ml-2 flex items-center justify-center">
            <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
        </div>
        
        <div class="space-y-1 text-xs">
          {#if card.card?.hp}
            <div class="flex justify-between">
              <span class="text-gray-500">HP:</span>
              <span class="text-gray-900">{card.card.hp}</span>
            </div>
          {/if}
          {#if card.listing}
            <div class="flex justify-between">
              <span class="text-gray-500">Listed:</span>
              <span class="text-green-600 font-medium">${card.listing.usd_price}</span>
            </div>
          {:else if card.card?.raw_price}
            <div class="flex justify-between">
              <span class="text-gray-500">Value:</span>
              <span class="text-gray-900">${card.card.raw_price}</span>
            </div>
          {/if}
          <div class="flex justify-between">
            <span class="text-gray-500">Status:</span>
            <span class={getCardStatus(card).class}>{getCardStatus(card).text}</span>
          </div>

          <!-- Missing Card Actions -->
          {#if card.isMissing && card.marketplaceData}
            <div class="mt-2 pt-2 border-t border-red-200">
              {#if card.marketplaceData.lowestPrice}
                <div class="flex justify-between mb-1">
                  <span class="text-xs text-gray-500">Listed:</span>
                  <span class="text-xs font-medium text-green-600">${card.marketplaceData.lowestPrice}</span>
                </div>
              {/if}
              <div class="flex gap-1">
                {#if card.marketplaceData.hasListings}
                  <a 
                    href={buildRipCardUrl(card.card || card)}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 text-center"
                  >
                    Buy Now
                  </a>
                {:else}
                  <a 
                    href={buildRipCardUrl(card.card || card)}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex-1 px-2 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500 text-center"
                  >
                    Make Offer
                  </a>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}

{#if paginatedCards.length === 0 && selectedSet !== 'all'}
  <div class="text-center py-12">
    <div class="text-4xl mb-4">🔍</div>
    <h3 class="text-lg font-medium text-gray-900 mb-2">No cards found</h3>
    <p class="text-gray-600">Try adjusting your filters or search term.</p>
  </div>
{/if}