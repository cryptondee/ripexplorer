<script lang="ts">
  // Props
  export let profile: any;
  export let extractionInfo: any = null;
  export let ripUserId: string = '';
  export let showJsonData: boolean = false;
  export let extractedData: any = null;
</script>

<div class="space-y-6">
  <!-- Extraction Information (if available) -->
  {#if extractionInfo}
    <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-blue-800">
              Data extracted for user: <span class="font-mono">{extractionInfo.username || ripUserId}</span>
            </h3>
            <div class="mt-1 text-sm text-blue-700">
              <p>Source: <span class="font-mono">{extractionInfo.targetUrl || 'rip.fun'}</span></p>
              {#if extractionInfo.timestamp}
                <p>Extracted: {new Date(extractionInfo.timestamp).toLocaleString()}</p>
              {/if}
              {#if extractionInfo.cached}
                <p>📦 <strong>Cached data</strong> - Use refresh to get latest information</p>
              {:else}
                <p>🌐 <strong>Fresh data</strong> - Just extracted from rip.fun</p>
              {/if}
            </div>
          </div>
        </div>
        
        <!-- JSON Toggle -->
        {#if extractedData}
          <div class="flex items-center space-x-2">
            <button 
              class="text-sm text-blue-600 hover:text-blue-800"
              onclick={() => showJsonData = !showJsonData}
            >
              {showJsonData ? 'Hide' : 'Show'} JSON
            </button>
          </div>
        {/if}
      </div>
      
      <!-- JSON Data Display -->
      {#if showJsonData && extractedData}
        <div class="mt-4 bg-gray-100 rounded p-4">
          <pre class="text-xs text-gray-800 overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">{JSON.stringify(extractedData, null, 2)}</pre>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Profile Summary -->
  {#if profile}
    <div class="bg-white shadow rounded-lg p-6">
      <h2 class="text-lg font-medium text-gray-900 mb-4">Profile Information</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 class="font-medium text-gray-900 mb-2">Basic Information</h3>
          <dl class="space-y-1">
            {#if profile.username}
              <div class="flex">
                <dt class="text-sm text-gray-500 w-24">User:</dt>
                <dd class="text-sm text-gray-900">{profile.username}</dd>
              </div>
            {/if}
            {#if profile.email}
              <div class="flex">
                <dt class="text-sm text-gray-500 w-24">Email:</dt>
                <dd class="text-sm text-gray-900">{profile.email}</dd>
              </div>
            {/if}
            {#if profile.id}
              <div class="flex">
                <dt class="text-sm text-gray-500 w-24">ID:</dt>
                <dd class="text-sm text-gray-900 font-mono">{profile.id}</dd>
              </div>
            {/if}
            {#if profile.created_at}
              <div class="flex">
                <dt class="text-sm text-gray-500 w-24">Joined:</dt>
                <dd class="text-sm text-gray-900">{new Date(profile.created_at).toLocaleDateString()}</dd>
              </div>
            {/if}
          </dl>
        </div>
        
        <div>
          <h3 class="font-medium text-gray-900 mb-2">Collection Stats</h3>
          <dl class="space-y-1">
            {#if profile.digital_cards}
              <div class="flex">
                <dt class="text-sm text-gray-500 w-24">Cards:</dt>
                <dd class="text-sm text-gray-900">{profile.digital_cards.length.toLocaleString()}</dd>
              </div>
            {/if}
            {#if profile.digital_products}
              <div class="flex">
                <dt class="text-sm text-gray-500 w-24">Packs:</dt>
                <dd class="text-sm text-gray-900">{profile.digital_products.length.toLocaleString()}</dd>
              </div>
            {/if}
            {#if profile.total_value}
              <div class="flex">
                <dt class="text-sm text-gray-500 w-24">Value:</dt>
                <dd class="text-sm text-gray-900">${profile.total_value}</dd>
              </div>
            {/if}
          </dl>
        </div>
      </div>
    </div>
  {/if}
</div>