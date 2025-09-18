<!-- Card Gallery Thumbnails Component -->
<script lang="ts">
  import { allCardsForModal, selectedCardIndex, setSelectedCardIndex } from '$lib/stores/modalStore';

  // Props - none needed, uses stores directly
</script>

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
          {#if card.card?.small_image_url || card.card?.large_image_url}
            <img 
              src={card.card?.small_image_url || card.card?.large_image_url} 
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

<style>
  .card-thumbnail {
    @apply w-16 h-20 border-2 rounded cursor-pointer transition-all;
  }
  
  .card-thumbnail-selected {
    @apply border-blue-500 ring-2 ring-blue-200;
  }
  
  .card-thumbnail-unselected {
    @apply border-gray-300 hover:border-gray-400;
  }
</style>
