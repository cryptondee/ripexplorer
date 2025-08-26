<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  // Props
  export let currentPage: number;
  export let totalPages: number;
  
  // Event dispatcher
  const dispatch = createEventDispatcher<{
    goToPage: number;
    goToFirst: void;
    goToLast: void;
    previousPage: void;
    nextPage: void;
  }>();
  
  function goToPage(page: number) {
    dispatch('goToPage', page);
  }
  
  function goToFirstPage() {
    dispatch('goToFirst');
  }
  
  function goToLastPage() {
    dispatch('goToLast');
  }
  
  function previousPage() {
    dispatch('previousPage');
  }
  
  function nextPage() {
    dispatch('nextPage');
  }
</script>

{#if totalPages > 1}
  <div class="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
    <div class="text-sm text-gray-700">
      Showing page {currentPage} of {totalPages}
    </div>
    
    <div class="flex items-center gap-2">
      <button
        onclick={goToFirstPage}
        disabled={currentPage === 1}
        class="px-3 py-1 text-sm border rounded-md {currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
      >
        First
      </button>
      
      <button
        onclick={previousPage}
        disabled={currentPage === 1}
        class="px-3 py-1 text-sm border rounded-md {currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
      >
        Previous
      </button>
      
      <span class="px-3 py-1 text-sm text-gray-700">
        {currentPage}
      </span>
      
      <button
        onclick={nextPage}
        disabled={currentPage === totalPages}
        class="px-3 py-1 text-sm border rounded-md {currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
      >
        Next
      </button>
      
      <button
        onclick={goToLastPage}
        disabled={currentPage === totalPages}
        class="px-3 py-1 text-sm border rounded-md {currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
      >
        Last
      </button>
    </div>
  </div>
{/if}