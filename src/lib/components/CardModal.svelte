<!-- Card Detail Modal Component -->
<script lang="ts">
  import { isCardModalOpen, selectedCard, closeCardModal } from '$lib/stores/modalStore';
  import { getSetNameFromCard } from '$lib/utils/card';
  
  // Get set cards data from card collection store
  import { writable } from 'svelte/store';
  
  // For now, we'll accept this as a prop until fully integrated
  let { setCardsData = {} }: { setCardsData?: any } = $props();
</script>

{#if $isCardModalOpen && $selectedCard}
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onclick={closeCardModal}>
    <div class="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white" onclick={(e) => e.stopPropagation()}>
      <!-- Modal Header -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">
          {$selectedCard.card?.name || 'Unknown Card'}
          {#if $selectedCard.card?.card_number}
            <span class="text-gray-500">#{$selectedCard.card.card_number}</span>
          {/if}
        </h3>
        <button onclick={closeCardModal} class="text-gray-400 hover:text-gray-600" aria-label="Close modal">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Card Image -->
        <div class="flex flex-col items-center">
          {#if $selectedCard.card?.large_image_url}
            <div class="relative group">
              <button 
                class="max-w-full h-auto rounded-lg shadow-md hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onclick={() => window.open($selectedCard.card.large_image_url, '_blank')}
                aria-label="Open full-size image in new tab"
              >
                <img 
                  src={$selectedCard.card.large_image_url} 
                  alt={$selectedCard.card?.name} 
                  class="max-w-full h-auto rounded-lg"
                />
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                  <div class="opacity-0 group-hover:opacity-100 bg-white bg-opacity-90 px-3 py-1 rounded-full text-sm text-gray-800 transition-opacity">
                    Click to enlarge
                  </div>
                </div>
              </button>
            </div>
          {:else if $selectedCard.card?.small_image_url}
            <div class="relative group">
              <button 
                class="max-w-full h-auto rounded-lg shadow-md hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onclick={() => window.open($selectedCard.card.small_image_url, '_blank')}
                aria-label="Open image in new tab"
              >
                <img 
                  src={$selectedCard.card.small_image_url} 
                  alt={$selectedCard.card?.name} 
                  class="max-w-full h-auto rounded-lg"
                />
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                  <div class="opacity-0 group-hover:opacity-100 bg-white bg-opacity-90 px-3 py-1 rounded-full text-sm text-gray-800 transition-opacity">
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
            {$selectedCard.card?.large_image_url ? 'High resolution image' : 'Standard resolution image'}
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
                <dd class="text-gray-900">{getSetNameFromCard($selectedCard, setCardsData)}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Rarity:</dt>
                <dd class="text-gray-900">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {$selectedCard.card?.rarity || 'Unknown'}
                  </span>
                </dd>
              </div>
              {#if $selectedCard.card?.types?.length}
                <div class="flex justify-between">
                  <dt class="text-gray-500">Type:</dt>
                  <dd class="text-gray-900">{$selectedCard.card.types.join(', ')}</dd>
                </div>
              {/if}
              {#if $selectedCard.card?.hp}
                <div class="flex justify-between">
                  <dt class="text-gray-500">HP:</dt>
                  <dd class="text-gray-900">{$selectedCard.card.hp}</dd>
                </div>
              {/if}
              {#if $selectedCard.card?.supertype}
                <div class="flex justify-between">
                  <dt class="text-gray-500">Supertype:</dt>
                  <dd class="text-gray-900">{$selectedCard.card.supertype}</dd>
                </div>
              {/if}
              {#if $selectedCard.card?.subtype?.length}
                <div class="flex justify-between">
                  <dt class="text-gray-500">Subtype:</dt>
                  <dd class="text-gray-900">{$selectedCard.card.subtype.join(', ')}</dd>
                </div>
              {/if}
            </dl>
          </div>
          
          <!-- Card Features -->
          {#if $selectedCard.card?.is_reverse || $selectedCard.card?.is_holo || $selectedCard.card?.is_first_edition || $selectedCard.card?.is_shadowless || $selectedCard.card?.is_unlimited || $selectedCard.card?.is_promo}
            <div class="bg-purple-50 p-4 rounded-lg">
              <h4 class="font-semibold text-gray-900 mb-3">Special Features</h4>
              <div class="flex flex-wrap gap-2">
                {#if $selectedCard.card?.is_reverse}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    🔄 Reverse Holo
                  </span>
                {/if}
                {#if $selectedCard.card?.is_holo}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rainbow-100 text-rainbow-800 bg-gradient-to-r from-pink-100 to-blue-100">
                    ✨ Holographic
                  </span>
                {/if}
                {#if $selectedCard.card?.is_first_edition}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    🥇 First Edition
                  </span>
                {/if}
                {#if $selectedCard.card?.is_shadowless}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    👤 Shadowless
                  </span>
                {/if}
                {#if $selectedCard.card?.is_unlimited}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ♾️ Unlimited
                  </span>
                {/if}
                {#if $selectedCard.card?.is_promo}
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
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {$selectedCard.is_listed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
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
              {#if $selectedCard.card?.raw_price}
                <div class="flex justify-between">
                  <dt class="text-gray-500">Market Value:</dt>
                  <dd class="text-gray-900">${$selectedCard.card.raw_price}</dd>
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
                <dd class="text-gray-900 font-mono">{$selectedCard.card?.id || $selectedCard.id}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Token ID:</dt>
                <dd class="text-gray-900 font-mono">{$selectedCard.token_id}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Unique ID:</dt>
                <dd class="text-gray-900 font-mono text-xs">{$selectedCard.unique_id}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}