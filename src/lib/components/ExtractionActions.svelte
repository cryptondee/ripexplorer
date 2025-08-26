<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  interface Props {
    ripUserId: string;
    extractedData: any;
    extractionInfo: any;
    loading: boolean;
    error: string;
    loadingMessage: string;
    forceRefresh?: boolean;
  }
  
  let {
    ripUserId,
    extractedData = $bindable(),
    extractionInfo = $bindable(),
    loading = $bindable(),
    error = $bindable(),
    loadingMessage = $bindable(),
    forceRefresh = false
  }: Props = $props();
  
  const dispatch = createEventDispatcher<{
    extractionComplete: { data: any; info: any };
    dataExported: { type: 'download' | 'clipboard' };
  }>();
  
  let retryAttempt = $state(0);

  async function runExtraction() {
    if (!ripUserId.trim()) {
      error = 'Please enter a rip.fun user ID';
      return;
    }

    // Proceed with extraction (Redis caching handled by backend)
    await performExtraction();
  }
  
  async function refreshData() {
    if (!ripUserId.trim()) {
      error = 'Please enter a rip.fun user ID';
      return;
    }
    
    // Set forceRefresh and run extraction
    await performExtraction();
  }
  
  async function performExtraction() {
    loading = true;
    error = '';
    extractedData = null;
    extractionInfo = null;
    retryAttempt = 0;
    loadingMessage = forceRefresh ? 'Refreshing profile data from rip.fun...' : 'Fetching profile data from rip.fun...';

    // Set up periodic message updates to show progress
    const messageInterval = setInterval(() => {
      if (loading) {
        retryAttempt++;
        if (retryAttempt <= 15) {
          loadingMessage = 'Fetching profile data from rip.fun...';
        } else if (retryAttempt <= 30) {
          loadingMessage = 'Page is taking longer than expected, please wait...';
        } else if (retryAttempt <= 45) {
          loadingMessage = 'Still loading... rip.fun may be experiencing high traffic...';
        } else {
          loadingMessage = 'This is taking unusually long. The request may timeout soon...';
        }
      }
    }, 1000);

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: ripUserId.trim(),
          forceRefresh: forceRefresh,
          method: 'api'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Extraction failed');
      }

      const result = await response.json();
      extractedData = result.extractedData;
      extractionInfo = {
        username: result.username,
        targetUrl: result.targetUrl,
        timestamp: result.timestamp,
        cached: false,
        source: 'live'
      };
      
      // Caching handled by Redis backend
      
      loadingMessage = 'Extraction completed successfully!';
      
      loadingMessage = 'Extraction completed successfully!';
      
      // Dispatch completion event
      dispatch('extractionComplete', { 
        data: extractedData, 
        info: extractionInfo 
      });
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      
      // Provide more helpful error messages based on the error type
      if (errorMsg.includes('timed out')) {
        error = `Request timed out: The rip.fun profile page took too long to load. This might be due to:\n• High server load on rip.fun\n• Network connectivity issues\n• The profile contains a large amount of data\n\nPlease try again in a moment.`;
      } else if (errorMsg.includes('HTTP error! status: 404')) {
        error = `Profile not found: The user ID "${ripUserId.trim()}" doesn't exist on rip.fun. Please check the user ID and try again.`;
      } else if (errorMsg.includes('HTTP error! status: 500')) {
        error = `Server error: rip.fun is experiencing technical difficulties. Please try again later.`;
      } else if (errorMsg.includes('Failed to fetch')) {
        error = `Network error: Unable to connect to rip.fun. Please check your internet connection and try again.`;
      } else {
        error = errorMsg;
      }
    } finally {
      clearInterval(messageInterval);
      loading = false;
      retryAttempt = 0;
    }
  }

  function downloadJSON() {
    if (!extractedData) return;
    
    const blob = new Blob([JSON.stringify(extractedData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rip-fun-${extractionInfo?.username || 'profile'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    dispatch('dataExported', { type: 'download' });
  }

  function copyToClipboard() {
    if (!extractedData) return;
    
    navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2)).then(() => {
      console.log('Copied to clipboard');
      dispatch('dataExported', { type: 'clipboard' });
    });
  }
</script>

<div class="extraction-actions">
  <!-- Extraction Controls -->
  <div class="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
    <div class="flex gap-2">
      <button
        class="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        onclick={runExtraction}
        disabled={loading}
      >
        {#if loading}
          <div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          Extracting...
        {:else}
          Extract Data
        {/if}
      </button>
      
      {#if extractedData && !loading}
        <button
          class="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm flex items-center gap-1"
          onclick={refreshData}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      {/if}
    </div>
    
    {#if extractedData}
      <div class="flex gap-2">
        <button
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          onclick={downloadJSON}
        >
          Download JSON
        </button>
        <button
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          onclick={copyToClipboard}
        >
          Copy to Clipboard
        </button>
      </div>
    {/if}
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
      <div class="flex items-center">
        <div class="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full mr-3"></div>
        <div class="text-blue-800">
          <p class="font-medium">{loadingMessage}</p>
          {#if retryAttempt > 30}
            <p class="text-sm mt-1">This extraction is taking longer than usual. Please be patient.</p>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- Error State -->
  {#if error}
    <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
      <div class="text-red-800">
        <p class="font-medium">Extraction Failed</p>
        <pre class="text-sm mt-2 whitespace-pre-wrap">{error}</pre>
      </div>
    </div>
  {/if}
</div>