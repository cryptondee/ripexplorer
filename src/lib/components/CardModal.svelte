<!-- Refactored Card Detail Modal Component -->
<script lang="ts">
  import { isCardModalOpen, selectedCard, closeCardModal } from '$lib/stores/modalStore';
  import CardThumbnails from './card/CardThumbnails.svelte';
  import CardImageViewer from './card/CardImageViewer.svelte';
  import CardDetails from './card/CardDetails.svelte';
  import CardMarketInfo from './card/CardMarketInfo.svelte';
  import CardActions from './card/CardActions.svelte';
  
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
      
      // Technical IDs
      id: card?.id,
      tokenId: card?.tokenId || rawCard?.token_id,
      uniqueId: card?.uniqueId || rawCard?.unique_id,
      
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
      
      // Special features - handle different field names
      is_reverse: card?.is_reverse || card?.reverse || card?.isReverse,
      is_holo: card?.is_holo || card?.holo || card?.isHolo || card?.holographic,
      is_first_edition: card?.is_first_edition || card?.first_edition || card?.isFirstEdition,
      is_shadowless: card?.is_shadowless || card?.shadowless || card?.isShadowless,
      is_unlimited: card?.is_unlimited || card?.unlimited || card?.isUnlimited,
      is_promo: card?.is_promo || card?.promo || card?.isPromo,
      
      // Full card reference for utilities
      _fullCard: rawCard
    };
  }
</script>

{#if $isCardModalOpen && $selectedCard}
  <div 
    class="modal-backdrop" 
    role="dialog" 
    aria-modal="true"
    tabindex="-1"
    onclick={closeCardModal}
    onkeydown={(e) => e.key === 'Escape' && closeCardModal()}
  >
    <div 
      class="modal-lg" 
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Modal Header -->
      <div class="modal-header">
        <h3 class="modal-title">
          {cardData?.name || 'Unknown Card'}
          {#if cardData?.card_number}
            <span class="text-gray-500">#{cardData.card_number}</span>
          {/if}
        </h3>
        <button onclick={closeCardModal} class="modal-close" aria-label="Close modal">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <!-- Gallery Navigation for Duplicates -->
        <CardThumbnails />

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Card Image -->
          <CardImageViewer {cardData} />
          
          <!-- Card Information -->
          <div class="space-y-4">
            <CardDetails {cardData} />
            <CardMarketInfo {cardData} />
          </div>
        </div>
        
        <!-- Action Buttons -->
        <CardActions />
      </div>
    </div>
  </div>
{/if}

<style>
  @import './styles/modals.css';
</style>
