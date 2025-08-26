<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  // Props
  interface Props {
    currentPage: number;
    totalPages: number;
  }
  
  let { currentPage = $bindable(), totalPages }: Props = $props();
  
  // Event dispatcher
  const dispatch = createEventDispatcher<{
    pageChanged: { page: number; action: 'goToPage' | 'goToFirst' | 'goToLast' | 'previous' | 'next' };
  }>();
  
  // Internal pagination logic with automatic page updates
  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      currentPage = page;
      dispatch('pageChanged', { page: currentPage, action: 'goToPage' });
    }
  }
  
  function goToFirstPage() {
    if (currentPage !== 1) {
      currentPage = 1;
      dispatch('pageChanged', { page: currentPage, action: 'goToFirst' });
    }
  }
  
  function goToLastPage() {
    if (currentPage !== totalPages) {
      currentPage = totalPages;
      dispatch('pageChanged', { page: currentPage, action: 'goToLast' });
    }
  }
  
  function previousPage() {
    if (currentPage > 1) {
      currentPage = currentPage - 1;
      dispatch('pageChanged', { page: currentPage, action: 'previous' });
    }
  }
  
  function nextPage() {
    if (currentPage < totalPages) {
      currentPage = currentPage + 1;
      dispatch('pageChanged', { page: currentPage, action: 'next' });
    }
  }
  
  // Generate page numbers for display
  const getVisiblePages = (current: number, total: number, maxVisible: number = 5) => {
    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    
    const halfVisible = Math.floor(maxVisible / 2);
    let start = Math.max(1, current - halfVisible);
    let end = Math.min(total, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };
  
  const visiblePages = $derived(getVisiblePages(currentPage, totalPages));
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
      
      <!-- Page number buttons -->
      {#each visiblePages as page}
        <button
          onclick={() => goToPage(page)}
          class="px-3 py-1 text-sm border rounded-md {page === currentPage ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 hover:bg-gray-50'}"
        >
          {page}
        </button>
      {/each}
      
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