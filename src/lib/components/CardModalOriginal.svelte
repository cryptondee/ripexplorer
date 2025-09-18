<!-- Card Detail Modal Component -->
<script lang="ts">
  import { isCardModalOpen, selectedCard, allCardsForModal, selectedCardIndex, closeCardModal, setSelectedCardIndex } from '$lib/stores/modalStore';
  import { getSetNameFromCard } from '$lib/utils/card';
  import { buildRipCardUrl } from '$lib/utils/url';
  
  // Modal is now fully self-contained and doesn't need external props
  // Set name resolution will fall back to set ID if no external data available
  
  // Helper function to get card data from either format
  $: cardData = $selectedCard ? extractCardData($selectedCard) : null;
  
  function extractCardData(rawCard: any) {
    // Handle different card data structures:
    // 1. Extract page format: { card: { name, large_image_url, ... } }
    // 2. Trade-finder format: { name, image_url, small_image_url, ... }
    
    const hasNestedCard = rawCard.card && typeof rawCard.card === 'object';
    const card = hasNestedCard ? rawCard.card : rawCard;
    
    return {
      // Basic card info
      name: card?.name || 'Unknown Card',
      card_number: card?.card_number || card?.formatted_card_number,
      rarity: card?.rarity,
      
      // Images - handle different field names
      large_image_url: card?.large_image_url || card?.image_url || card?.small_image_url,
      small_image_url: card?.small_image_url || card?.image_url,
      
      // Set information  
      set_id: card?.set_id || card?.set?.id,
      set_name: card?.set_name || card?.set?.name,
      
      // Card details
      hp: card?.hp,
      types: card?.types,
      supertype: card?.supertype,
      subtype: card?.subtype,
      illustrator: card?.illustrator,
      
      // Market info
      raw_price: card?.raw_price || card?.market_value,
      
      // Special features
      is_reverse: card?.is_reverse,
      is_holo: card?.is_holo,
      is_first_edition: card?.is_first_edition,
      is_shadowless: card?.is_shadowless,
      is_unlimited: card?.is_unlimited,
      is_promo: card?.is_promo,
      
      // Full card object for getSetNameFromCard utility
      _fullCard: rawCard
    };
  }
  
  // Helper function to determine foil type like in extract page
  function getFoilType(card: any) {
    if (card?.is_reverse) {
      return 'Reverse Holo';
    } else if (card?.is_holo) {
      return 'Holo';
    } else {
      return 'Normal';
    }
  }
  
  // Helper function to get foil icon
  function getFoilIcon(card: any) {
    if (card?.is_reverse) {
      return '🔄';
    } else if (card?.is_holo) {
      return '✨';
    } else {
      return '⚪';
    }
  }
</script>

{#if $isCardModalOpen && $selectedCard}
  <div 
    class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" 
    onclick={closeCardModal}
    onkeydown={(e) => e.key === 'Escape' && closeCardModal()}
    role="button"
    tabindex="0"
    aria-label="Close modal"
  >
    <div 
      class="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white" 
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">
          {cardData?.name || 'Unknown Card'}
          {#if cardData?.card_number}
            <span class="text-gray-500">#{cardData.card_number}</span>
          {/if}
        </h3>
        <button onclick={closeCardModal} class="text-gray-400 hover:text-gray-600" aria-label="Close modal">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <!-- Gallery Navigation for Duplicates -->
      {#if $allCardsForModal.length > 1}
        <div class="mb-4 p-4 bg-blue-50 rounded-lg">
          <div class="text-center mb-3">
            <span class="text-sm font-medium text-gray-900">
              Showing {$selectedCardIndex + 1} of {$allCardsForModal.length} copies
            </span>
          </div>
          
          <!-- Card Gallery Thumbnails -->
          <div class="flex justify-center gap-2 overflow-x-auto pb-2">
            {#each $allCardsForModal as card, index}
              <button 
                class="card-thumbnail {$selectedCardIndex === index ? 'card-thumbnail-selected' : 'card-thumbnail-unselected'}"
                onclick={() => setSelectedCardIndex(index)}
              >
                {#if card.card?.small_image_url}
                  <img 
                    src={card.card.small_image_url} 
                    alt={card.card?.name} 
                    class="w-full h-full object-cover"
                  />
                {:else}
                  <div class="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span class="text-xs text-gray-500">#{card.card?.card_number}</span>
                  </div>
                {/if}
              </button>
            {/each}
          </div>
          
          <!-- Navigation Buttons -->
          <div class="flex justify-center gap-2 mt-3">
            <button 
              onclick={() => setSelectedCardIndex(Math.max(0, $selectedCardIndex - 1))}
              disabled={$selectedCardIndex === 0}
              class="px-3 py-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded text-sm"
            >
              ← Previous
            </button>
            <button 
              onclick={() => setSelectedCardIndex(Math.min($allCardsForModal.length - 1, $selectedCardIndex + 1))}
              disabled={$selectedCardIndex === $allCardsForModal.length - 1}
              class="px-3 py-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded text-sm"
            >
              Next →
            </button>
          </div>
        </div>
      {/if}

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Card Image -->
        <div class="flex flex-col items-center">
          {#if cardData?.large_image_url}
            <div class="relative group">
              <button 
                class="card-detail-image"
                onclick={() => window.open(cardData.large_image_url, '_blank')}
                aria-label="Open full-size image in new tab"
              >
                <img 
                  src={cardData.large_image_url} 
                  alt={cardData?.name} 
                  class="max-w-full h-auto rounded-lg"
                />
                <div class="card-overlay">
                  <div class="card-overlay-content">
                    Click to enlarge
                  </div>
                </div>
              </button>
            </div>
          {:else if cardData?.small_image_url}
            <div class="relative group">
              <button 
                class="card-detail-image"
                onclick={() => window.open(cardData.small_image_url, '_blank')}
                aria-label="Open image in new tab"
              >
                <img 
                  src={cardData.small_image_url} 
                  alt={cardData?.name} 
                  class="max-w-full h-auto rounded-lg"
                />
                <div class="card-overlay">
                  <div class="card-overlay-content">
                    Click to enlarge
                  </div>
                </div>
              </button>
            </div>
          {:else}
            <div class="w-64 h-96 bg-gray-200 rounded-lg flex items-center justify-center">
              <span class="text-gray-500">No Image Available</span>
            </div>
          {/if}
          <p class="text-xs text-gray-500 mt-2 text-center">
            {cardData?.large_image_url ? 'High resolution image' : 'Standard resolution image'}
          </p>
        </div>
        
        <!-- Card Details -->
        <div class="space-y-4">
          <!-- Basic Info -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-900 mb-3">Card Information</h4>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-500">Set:</dt>
                <dd class="text-gray-900">{getSetNameFromCard(cardData?._fullCard)}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Rarity:</dt>
                <dd class="text-gray-900">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {cardData?.rarity || 'Unknown'}
                  </span>
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Foil:</dt>
                <dd class="text-gray-900">
                  <span class="badge {getFoilType(cardData) === 'Normal' ? 'badge-neutral' : getFoilType(cardData) === 'Reverse Holo' ? 'badge-mythic' : 'badge-warning'}">
                    <span class="mr-1">{getFoilIcon(cardData)}</span>
                    {getFoilType(cardData)}
                  </span>
                </dd>
              </div>
              {#if cardData?.types?.length}
                <div class="flex justify-between">
                  <dt class="text-gray-500">Type:</dt>
                  <dd class="text-gray-900">{cardData.types.join(', ')}</dd>
                </div>
              {/if}
              {#if cardData?.supertype}
                <div class="flex justify-between">
                  <dt class="text-gray-500">Supertype:</dt>
                  <dd class="text-gray-900">{cardData.supertype}</dd>
                </div>
              {/if}
              {#if cardData?.subtype?.length}
                <div class="flex justify-between">
                  <dt class="text-gray-500">Subtype:</dt>
                  <dd class="text-gray-900">{cardData.subtype.join(', ')}</dd>
                </div>
              {/if}
            </dl>
          </div>
          
          <!-- Card Features -->
          {#if cardData?.is_reverse || cardData?.is_holo || cardData?.is_first_edition || cardData?.is_shadowless || cardData?.is_unlimited || cardData?.is_promo}
            <div class="bg-purple-50 p-4 rounded-lg">
              <h4 class="font-semibold text-gray-900 mb-3">Special Features</h4>
              <div class="flex flex-wrap gap-2">
                {#if cardData?.is_reverse}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    🔄 Reverse Holo
                  </span>
                {/if}
                {#if cardData?.is_holo}
                  <span class="badge bg-gradient-to-r from-pink-100 to-blue-100 text-purple-800">
                    ✨ Holographic
                  </span>
                {/if}
                {#if cardData?.is_first_edition}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    🥇 First Edition
                  </span>
                {/if}
                {#if cardData?.is_shadowless}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    👤 Shadowless
                  </span>
                {/if}
                {#if cardData?.is_unlimited}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ♾️ Unlimited
                  </span>
                {/if}
                {#if cardData?.is_promo}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    🎁 Promo
                  </span>
                {/if}
              </div>
            </div>
          {/if}
          
          <!-- Market Info -->
          <div class="bg-green-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-900 mb-3">Market Information</h4>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-500">Status:</dt>
                <dd class="text-gray-900">
                  <span class="badge-sm {$selectedCard.is_listed ? 'badge-success' : 'badge-neutral'}">
                    {$selectedCard.is_listed ? 'Listed' : 'Owned'}
                  </span>
                </dd>
              </div>
              {#if $selectedCard.listing?.usd_price}
                <div class="flex justify-between">
                  <dt class="text-gray-500">Listed Price:</dt>
                  <dd class="text-green-600 font-semibold">${$selectedCard.listing.usd_price}</dd>
                </div>
              {/if}
              {#if cardData?.raw_price}
                <div class="flex justify-between">
                  <dt class="text-gray-500">Market Value:</dt>
                  <dd class="text-gray-900">${cardData.raw_price}</dd>
                </div>
              {/if}
            </dl>
          </div>
          
          <!-- Technical Details -->
          <div class="bg-blue-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-900 mb-3">Technical Details</h4>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-500">Card ID:</dt>
                <dd class="text-gray-900 font-mono">{cardData?.id || $selectedCard.id}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Token ID:</dt>
                <dd class="text-gray-900 font-mono">{$selectedCard.token_id}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Unique ID:</dt>
                <dd class="text-gray-900 font-mono text-xs break-all">{$selectedCard.unique_id}</dd>
              </div>
              {#if $allCardsForModal.length > 1}
                <div class="flex justify-between">
                  <dt class="text-gray-500">Instance:</dt>
                  <dd class="text-gray-900">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {$selectedCardIndex + 1} of {$allCardsForModal.length}
                    </span>
                  </dd>
                </div>
              {/if}
            </dl>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="mt-6 pt-4 border-t border-gray-200">
          <div class="flex justify-center gap-3">
            <a 
              href={buildRipCardUrl($selectedCard)}
              target="_blank"
              rel="noopener noreferrer"
              class="btn-primary-sm"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
              </svg>
              View on rip.fun
            </a>
            <button
              onclick={closeCardModal}
              class="btn-secondary-sm bg-gray-600 hover:bg-gray-700 text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @import './styles/buttons.css';
  @import './styles/badges.css';
  @import './styles/cards.css';
  @import './styles/modals.css';
</style>