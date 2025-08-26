<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  // Props
  export let loading: boolean = false;
  export let loadingMessage: string = 'Loading...';
  export let retryAttempt: number = 0;
  export let extractedData: any = null;
  export let forceRefresh: boolean = false;
  
  // Event dispatcher
  const dispatch = createEventDispatcher<{
    runExtraction: void;
    refreshData: void;
  }>();
  
  function handleRunExtraction() {
    dispatch('runExtraction');
  }
  
  function handleRefreshData() {
    dispatch('refreshData');
  }
</script>

<div class="flex space-x-3">
  <button
    onclick={handleRunExtraction}
    disabled={loading}
    class="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
  >
    {#if loading}
      <div class="flex items-center">
        <div class="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
        <div class="flex flex-col items-start">
          <span class="font-medium">{loadingMessage}</span>
          {#if retryAttempt > 15}
            <span class="text-xs text-indigo-200 mt-1">Elapsed: {retryAttempt}s</span>
          {/if}
        </div>
      </div>
    {:else}
      🔍 Fetch Card Collection
    {/if}
  </button>
  
  {#if extractedData}
    <button
      onclick={handleRefreshData}
      disabled={loading}
      class="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
      title="Refresh user data from server (preserves set data cache)"
    >
      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
      </svg>
      Refresh
    </button>
  {/if}
</div>