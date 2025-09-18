<!-- Card Market Information Component -->
<script lang="ts">
  import { selectedCard, allCardsForModal, selectedCardIndex } from '$lib/stores/modalStore';

  // Props
  export let cardData: any;
</script>

<div class="space-y-4">
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

<style>
  @import '../styles/badges.css';
</style>
