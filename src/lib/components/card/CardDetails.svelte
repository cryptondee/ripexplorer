<!-- Card Details Component -->
<script lang="ts">
  import { getSetNameFromCard } from '$lib/utils/card';

  // Props
  export let cardData: any;

  // Helper functions for foil type display
  function getFoilType(card: any): string {
    if (card?.is_reverse) return 'Reverse Holo';
    if (card?.is_holo) return 'Holographic';
    return 'Normal';
  }

  function getFoilIcon(card: any): string {
    if (card?.is_reverse) return '🔄';
    if (card?.is_holo) return '✨';
    return '🃏';
  }
</script>

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
      {#if cardData?.hp}
        <div class="flex justify-between">
          <dt class="text-gray-500">HP:</dt>
          <dd class="text-gray-900">{cardData.hp}</dd>
        </div>
      {/if}
      {#if cardData?.illustrator}
        <div class="flex justify-between">
          <dt class="text-gray-500">Illustrator:</dt>
          <dd class="text-gray-900">{cardData.illustrator}</dd>
        </div>
      {/if}
    </dl>
  </div>
  
  <!-- Technical Details -->
  <div class="bg-blue-50 p-4 rounded-lg">
    <h4 class="font-semibold text-gray-900 mb-3">Technical Details</h4>
    <dl class="space-y-2 text-sm">
      {#if cardData?._fullCard?.card?.id || cardData?.id}
        <div class="flex justify-between">
          <dt class="text-gray-500">Card ID:</dt>
          <dd class="text-gray-900 font-mono text-xs">{cardData?._fullCard?.card?.id || cardData?.id || 'N/A'}</dd>
        </div>
      {/if}
      {#if cardData?._fullCard?.token_id || cardData?.tokenId}
        <div class="flex justify-between">
          <dt class="text-gray-500">Token ID:</dt>
          <dd class="text-gray-900 font-mono text-xs">{cardData?._fullCard?.token_id || cardData?.tokenId || 'N/A'}</dd>
        </div>
      {/if}
      {#if cardData?._fullCard?.unique_id || cardData?.uniqueId}
        <div class="flex justify-between">
          <dt class="text-gray-500">Unique ID:</dt>
          <dd class="text-gray-900 font-mono text-xs">{cardData?._fullCard?.unique_id || cardData?.uniqueId || 'N/A'}</dd>
        </div>
      {/if}
    </dl>
  </div>

  <!-- Special Features -->
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
</div>

<style>
  @import '../styles/badges.css';
</style>
