<!-- Card Actions Component -->
<script lang="ts">
  import { selectedCard, closeCardModal } from '$lib/stores/modalStore';
  import { buildRipCardUrl } from '$lib/utils/url';
</script>

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

<style>
  @import '../styles/buttons.css';
</style>
