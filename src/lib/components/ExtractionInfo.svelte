<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  // Props
  export let extractionInfo: any;
  export let ripUserId: string;
  export let showJsonData: boolean = false;
  export let extractedData: any;
  
  // Event dispatcher
  const dispatch = createEventDispatcher<{
    copyToClipboard: void;
    downloadJSON: void;
  }>();
  
  function handleCopyToClipboard() {
    dispatch('copyToClipboard');
  }
  
  function handleDownloadJSON() {
    dispatch('downloadJSON');
  }
</script>

<div class="bg-white shadow rounded-lg p-6">
  <div class="flex justify-between items-center mb-4">
    <h2 class="text-lg font-medium text-gray-900">Extracted Data</h2>
    <div class="flex items-center space-x-3">
      <label class="flex items-center">
        <input
          type="checkbox"
          bind:checked={showJsonData}
          class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <span class="ml-2 text-sm text-gray-700">Show JSON Data</span>
      </label>
      <div class="flex space-x-2">
        <button
          onclick={handleCopyToClipboard}
          class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          📋 Copy
        </button>
        <button
          onclick={handleDownloadJSON}
          class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          📁 Download JSON
        </button>
      </div>
    </div>
  </div>
  
  {#if extractionInfo}
    <div class="bg-gray-50 rounded p-4 mb-4">
      <dl class="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-4">
        <div>
          <dt class="text-sm font-medium text-gray-500">User</dt>
          <dd class="text-sm text-gray-900">{extractionInfo.username || ripUserId}</dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-gray-500">Source</dt>
          <dd class="text-sm text-gray-900">
            {#if extractionInfo.source === 'cache'}
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800" title="{extractionInfo.cacheAge ? `Data from ${extractionInfo.cacheAge}` : 'Cached data'}">
                📦 Cached {extractionInfo.cacheAge ? `(${extractionInfo.cacheAge})` : ''}
              </span>
            {:else}
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800" title="Fresh data from rip.fun">
                🌐 Live
              </span>
            {/if}
          </dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-gray-500">Profile URL</dt>
          <dd class="text-sm text-gray-900">
            {#if extractionInfo.targetUrl}
              <a href={extractionInfo.targetUrl} target="_blank" class="text-indigo-600 hover:text-indigo-900">
                View Profile
              </a>
            {:else}
              <a href="https://www.rip.fun/user/{ripUserId}" target="_blank" class="text-indigo-600 hover:text-indigo-900">
                View Profile
              </a>
            {/if}
          </dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-gray-500">Last Updated</dt>
          <dd class="text-sm text-gray-900">{new Date(extractionInfo.timestamp).toLocaleString()}</dd>
        </div>
      </dl>
      
      <!-- Advanced Cache Management -->
      <div class="mt-3 pt-3 border-t border-gray-200">
        <details class="text-sm">
          <summary class="cursor-pointer text-gray-600 hover:text-gray-900 select-none">
            Advanced Cache Options
          </summary>
          <div class="mt-2 text-xs text-gray-600">
            Cache management now handled by Redis backend
          </div>
        </details>
      </div>
    </div>
  {/if}
  
  {#if showJsonData}
    <div class="bg-gray-900 rounded p-4 overflow-auto max-h-96">
      <pre class="text-xs text-green-400 font-mono whitespace-pre-wrap">{JSON.stringify(extractedData, null, 2)}</pre>
    </div>
  {/if}
</div>