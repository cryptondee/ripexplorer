<!-- Card Image Viewer Component -->
<script lang="ts">
  // Props
  export let cardData: any;
</script>

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
</div>

<style>
  @import '../styles/cards.css';
</style>
