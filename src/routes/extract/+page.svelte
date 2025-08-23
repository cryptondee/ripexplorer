<script lang="ts">
  let ripUserId = $state('');
  let extractedData = $state<any>(null);
  let loading = $state(false);
  let error = $state('');
  let extractionInfo = $state<any>(null);
  let retryAttempt = $state(0);
  let loadingMessage = $state('Starting extraction...');
  
  // Cards display state
  let selectedSet = $state('all');
  let viewMode = $state<'grid' | 'table'>('grid');
  let showDuplicates = $state(true);

  async function runExtraction() {
    if (!ripUserId.trim()) {
      error = 'Please enter a rip.fun user ID';
      return;
    }

    loading = true;
    error = '';
    extractedData = null;
    extractionInfo = null;
    retryAttempt = 0;
    loadingMessage = 'Fetching profile data from rip.fun...';

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
        timestamp: result.timestamp
      };
      loadingMessage = 'Extraction completed successfully!';
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
  }

  function copyToClipboard() {
    if (!extractedData) return;
    
    navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2)).then(() => {
      // Could add a toast notification here
      console.log('Copied to clipboard');
    });
  }
</script>

<div class="px-4 py-8">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-4">rip.fun Data Extractor</h1>
      <p class="text-lg text-gray-600 max-w-2xl mx-auto">
        Extract complete profile data from any rip.fun user. Get all profile information, digital cards, packs, and collection data with clip_embedding data automatically filtered out.
      </p>
    </div>

    <div class="max-w-2xl mx-auto mb-8">
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Extract Profile Data</h2>
        
        <div class="space-y-4">
          <div>
            <label for="ripUsername" class="block text-sm font-medium text-gray-700">
              rip.fun Username
            </label>
            <div class="mt-1 flex rounded-md shadow-sm">
              <span class="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                https://www.rip.fun/profile/
              </span>
              <input
                type="text"
                id="ripUsername"
                bind:value={ripUserId}
                class="block w-full rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="user ID (e.g., 2010)"
              />
            </div>
            <p class="mt-1 text-sm text-gray-500">
              Enter a rip.fun user ID to extract their complete card collection. Examples: 2010 (ndw), 1169 (cryptondee). This uses the direct API for all cards.
            </p>
          </div>

          {#if error}
            <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <div class="ml-3">
                  <div class="text-sm font-medium">
                    {#if error.includes('\n')}
                      {#each error.split('\n') as line}
                        <div class="mb-1">{line}</div>
                      {/each}
                    {:else}
                      {error}
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          {/if}

          <button
            onclick={runExtraction}
            disabled={loading}
            class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
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
              Extract Profile Data
            {/if}
          </button>
        </div>
      </div>
    </div>

    {#if extractedData}
      <div class="space-y-6">
        <div class="bg-white shadow rounded-lg p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-medium text-gray-900">Extracted Data</h2>
            <div class="flex space-x-2">
              <button
                onclick={copyToClipboard}
                class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                📋 Copy
              </button>
              <button
                onclick={downloadJSON}
                class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                📁 Download JSON
              </button>
            </div>
          </div>
          
          {#if extractionInfo}
            <div class="bg-gray-50 rounded p-4 mb-4">
              <dl class="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-3">
                <div>
                  <dt class="text-sm font-medium text-gray-500">Username</dt>
                  <dd class="text-sm text-gray-900">{extractionInfo.username}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">Source URL</dt>
                  <dd class="text-sm text-gray-900">
                    <a href={extractionInfo.targetUrl} target="_blank" class="text-indigo-600 hover:text-indigo-900">
                      {extractionInfo.targetUrl}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">Extracted</dt>
                  <dd class="text-sm text-gray-900">{new Date(extractionInfo.timestamp).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          {/if}
          
          <div class="bg-gray-900 rounded p-4 overflow-auto max-h-96">
            <pre class="text-xs text-green-400 font-mono whitespace-pre-wrap">{JSON.stringify(extractedData, null, 2)}</pre>
          </div>
        </div>

        {#if extractedData.profile}
          <div class="space-y-6">
            <div class="bg-white shadow rounded-lg p-6">
              <h2 class="text-lg font-medium text-gray-900 mb-4">Profile Summary</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 class="font-medium text-gray-900 mb-2">Basic Information</h3>
                  <dl class="space-y-1">
                    {#if extractedData.profile.username}
                      <div class="flex">
                        <dt class="text-sm text-gray-500 w-24">Username:</dt>
                        <dd class="text-sm text-gray-900">{extractedData.profile.username}</dd>
                      </div>
                    {/if}
                    {#if extractedData.profile.email}
                      <div class="flex">
                        <dt class="text-sm text-gray-500 w-24">Email:</dt>
                        <dd class="text-sm text-gray-900">{extractedData.profile.email}</dd>
                      </div>
                    {/if}
                    {#if extractedData.profile.bio}
                      <div class="flex">
                        <dt class="text-sm text-gray-500 w-24">Bio:</dt>
                        <dd class="text-sm text-gray-900">{extractedData.profile.bio}</dd>
                      </div>
                    {/if}
                    {#if extractedData.profile.login_provider}
                      <div class="flex">
                        <dt class="text-sm text-gray-500 w-24">Provider:</dt>
                        <dd class="text-sm text-gray-900 capitalize">{extractedData.profile.login_provider}</dd>
                      </div>
                    {/if}
                    {#if extractedData.profile.verified !== undefined}
                      <div class="flex">
                        <dt class="text-sm text-gray-500 w-24">Verified:</dt>
                        <dd class="text-sm text-gray-900">
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {extractedData.profile.verified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                            {extractedData.profile.verified ? '✅ Verified' : '❌ Not Verified'}
                          </span>
                        </dd>
                      </div>
                    {/if}
                  </dl>
                  
                  {#if extractedData.profile.smart_wallet_address || extractedData.profile.owner_wallet_address}
                    <h3 class="font-medium text-gray-900 mb-2 mt-4">Wallet Addresses</h3>
                    <dl class="space-y-1">
                      {#if extractedData.profile.smart_wallet_address}
                        <div class="flex">
                          <dt class="text-sm text-gray-500 w-24">Smart:</dt>
                          <dd class="text-xs text-gray-900 font-mono break-all">{extractedData.profile.smart_wallet_address}</dd>
                        </div>
                      {/if}
                      {#if extractedData.profile.owner_wallet_address && extractedData.profile.owner_wallet_address !== extractedData.profile.smart_wallet_address}
                        <div class="flex">
                          <dt class="text-sm text-gray-500 w-24">Owner:</dt>
                          <dd class="text-xs text-gray-900 font-mono break-all">{extractedData.profile.owner_wallet_address}</dd>
                        </div>
                      {/if}
                    </dl>
                  {/if}
                </div>
                
                <div>
                  <h3 class="font-medium text-gray-900 mb-2">Collection Stats</h3>
                  <dl class="space-y-1">
                    {#if extractedData.profile.digital_cards?.length}
                      <div class="flex">
                        <dt class="text-sm text-gray-500 w-32">Digital Cards:</dt>
                        <dd class="text-sm text-gray-900">{extractedData.profile.digital_cards.length}</dd>
                      </div>
                    {/if}
                    {#if extractedData.profile.digital_products?.length}
                      <div class="flex">
                        <dt class="text-sm text-gray-500 w-32">Digital Products:</dt>
                        <dd class="text-sm text-gray-900">{extractedData.profile.digital_products.length}</dd>
                      </div>
                    {/if}
                    {#if extractedData.stats?.totalCards}
                      <div class="flex">
                        <dt class="text-sm text-gray-500 w-32">Total Cards:</dt>
                        <dd class="text-sm text-gray-900">{extractedData.stats.totalCards}</dd>
                      </div>
                    {/if}
                    {#if extractedData.stats?.totalValue}
                      <div class="flex">
                        <dt class="text-sm text-gray-500 w-32">Total Value:</dt>
                        <dd class="text-sm text-gray-900">{extractedData.stats.totalValue}</dd>
                      </div>
                    {/if}
                  </dl>
                </div>
              </div>
            </div>

            <!-- Set Statistics -->
            {#if extractedData.profile.digital_cards && extractedData.profile.digital_cards.length > 0}
              {@const setStats = extractedData.profile.digital_cards.reduce((stats: any, card: any) => {
                const setName = card.set?.name || card.card?.set_id || 'Unknown Set';
                const rarity = card.card?.rarity || 'Unknown';
                const value = parseFloat(card.listing?.usd_price || card.card?.raw_price || '0');
                
                if (!stats[setName]) {
                  stats[setName] = {
                    name: setName,
                    count: 0,
                    totalValue: 0,
                    rarities: {},
                    releaseDate: card.card?.set?.release_date,
                    setId: card.card?.set_id
                  };
                }
                
                stats[setName].count++;
                stats[setName].totalValue += value;
                stats[setName].rarities[rarity] = (stats[setName].rarities[rarity] || 0) + 1;
                
                return stats;
              }, {})}

              <div class="bg-white shadow rounded-lg p-6">
                <h2 class="text-lg font-medium text-gray-900 mb-4">Collection Overview</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {#each Object.values(setStats) as set}
                    {@const setData = set as any}
                    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                      <div class="flex justify-between items-start mb-2">
                        <h3 class="font-medium text-gray-900 text-sm">{setData.name}</h3>
                        <span class="text-xs text-gray-500">{setData.count} cards</span>
                      </div>
                      
                      <div class="space-y-1 text-xs text-gray-600">
                        <div class="flex justify-between">
                          <span>Total Value:</span>
                          <span class="font-medium text-gray-900">${setData.totalValue.toFixed(2)}</span>
                        </div>
                        {#if setData.releaseDate}
                          <div class="flex justify-between">
                            <span>Released:</span>
                            <span>{new Date(setData.releaseDate).getFullYear()}</span>
                          </div>
                        {/if}
                      </div>
                      
                      <div class="mt-2 pt-2 border-t border-blue-200">
                        <div class="flex flex-wrap gap-1">
                          {#each Object.entries(setData.rarities) as [rarity, count]}
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {rarity}: {count}
                            </span>
                          {/each}
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Digital Cards Section -->
              {#snippet cardsSection()}
                {@const cardsBySet = extractedData.profile.digital_cards.reduce((sets: any, card: any) => {
                  const setName = card.set?.name || card.card?.set_id || 'Unknown Set';
                  const setId = card.set?.id || card.card?.set_id || 'unknown';
                  if (!sets[setName]) {
                    sets[setName] = {
                      name: setName,
                      id: setId,
                      cards: [],
                      totalValue: 0,
                      releaseDate: card.card?.set?.release_date
                    };
                  }
                  sets[setName].cards.push(card);
                  sets[setName].totalValue += parseFloat(card.listing?.usd_price || card.card?.raw_price || '0');
                  return sets;
                }, {})}
                
                {@const processedCards = showDuplicates 
                  ? (selectedSet === 'all' 
                      ? extractedData.profile.digital_cards 
                      : cardsBySet[selectedSet]?.cards || [])
                  : (selectedSet === 'all'
                      ? Object.values(extractedData.profile.digital_cards.reduce((unique: any, card: any) => {
                          const cardId = card.card?.id;
                          if (!unique[cardId] || unique[cardId].listing) {
                            unique[cardId] = card;
                          }
                          return unique;
                        }, {})) as any[]
                      : Object.values((cardsBySet[selectedSet]?.cards || []).reduce((unique: any, card: any) => {
                          const cardId = card.card?.id;
                          if (!unique[cardId] || unique[cardId].listing) {
                            unique[cardId] = card;
                          }
                          return unique;
                        }, {})) as any[])
                }
                
              <div class="bg-white shadow rounded-lg p-6">
                
                <div class="mb-6">
                  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h2 class="text-lg font-medium text-gray-900">
                      Digital Cards 
                      <span class="text-base text-gray-500">
                        ({processedCards.length} {showDuplicates ? 'total' : 'unique'} cards)
                      </span>
                    </h2>
                    
                    <div class="flex flex-wrap items-center gap-3">
                      <div class="text-sm text-gray-500">
                        Total Value: ${processedCards.reduce((sum: number, card: any) => {
                          const price = parseFloat(card.listing?.usd_price || card.card?.raw_price || '0');
                          return sum + price;
                        }, 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  <!-- Filters and View Controls -->
                  <div class="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
                    <!-- Set Filter -->
                    <div class="flex-1">
                      <label for="setFilter" class="block text-sm font-medium text-gray-700 mb-1">
                        Filter by Set
                      </label>
                      <select 
                        id="setFilter"
                        bind:value={selectedSet}
                        class="w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                      >
                        <option value="all">All Sets ({extractedData.profile.digital_cards.length} cards)</option>
                        {#each Object.entries(cardsBySet) as [setName, setData]}
                          {@const set = setData as any}
                          <option value={setName}>
                            {setName} ({set.cards.length} cards)
                          </option>
                        {/each}
                      </select>
                    </div>
                    
                    <!-- View Mode Toggle -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        View Mode
                      </label>
                      <div class="flex rounded-lg border border-gray-300 overflow-hidden">
                        <button
                          onclick={() => viewMode = 'grid'}
                          class="px-3 py-2 text-sm font-medium {viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                        >
                          Grid
                        </button>
                        <button
                          onclick={() => viewMode = 'table'}
                          class="px-3 py-2 text-sm font-medium border-l border-gray-300 {viewMode === 'table' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                        >
                          Table
                        </button>
                      </div>
                    </div>
                    
                    <!-- Duplicate Toggle -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Duplicates
                      </label>
                      <label class="flex items-center">
                        <input
                          type="checkbox"
                          bind:checked={showDuplicates}
                          class="rounded border-gray-300 text-indigo-600 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <span class="ml-2 text-sm text-gray-700">Show duplicates</span>
                      </label>
                    </div>
                  </div>
                </div>

                <!-- Cards Display -->
                {#if viewMode === 'grid'}
                  <!-- Grid View -->
                  {#if selectedSet === 'all'}
                    <!-- All Sets - Grouped Display -->
                    {#each Object.entries(cardsBySet) as [setName, setData]}
                      {@const set = setData as any}
                      {@const setCards = showDuplicates 
                        ? set.cards 
                        : Object.values(set.cards.reduce((unique: any, card: any) => {
                            const cardId = card.card?.id;
                            if (!unique[cardId] || unique[cardId].listing) {
                              unique[cardId] = card;
                            }
                            return unique;
                          }, {})) as any[]
                      }
                      
                      <div class="mb-6 border rounded-lg p-4">
                        <div class="flex justify-between items-center mb-3">
                          <h3 class="font-medium text-gray-900">
                            {setName}
                            <span class="text-sm text-gray-500">({setCards.length} cards)</span>
                          </h3>
                          {#if set.releaseDate}
                            <div class="text-sm text-gray-500">
                              Release: {new Date(set.releaseDate).toLocaleDateString()}
                            </div>
                          {/if}
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {#each setCards as card}
                            {@const duplicateCount = showDuplicates ? 1 : set.cards.filter((c: any) => c.card?.id === card.card?.id).length}
                            <div class="border border-gray-200 rounded-lg p-3 bg-gray-50 relative">
                              {#if duplicateCount > 1}
                                <div class="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold">
                                  {duplicateCount}
                                </div>
                              {/if}
                              <div class="flex items-start justify-between mb-2">
                                <div class="flex-1">
                                  <h4 class="font-medium text-sm text-gray-900">
                                    {card.card?.name || 'Unknown Card'}
                                    {#if card.card?.card_number}
                                      <span class="text-gray-500">#{card.card.card_number}</span>
                                    {/if}
                                  </h4>
                                  <p class="text-xs text-gray-600 mt-1">
                                    {card.card?.rarity || 'Unknown Rarity'}
                                    {#if card.card?.types}
                                      • {card.card.types.join(', ')}
                                    {/if}
                                  </p>
                                </div>
                                {#if card.card?.small_image_url}
                                  <img 
                                    src={card.card.small_image_url} 
                                    alt={card.card?.name} 
                                    class="w-10 h-14 object-cover rounded border ml-2"
                                    loading="lazy"
                                  />
                                {/if}
                              </div>
                              
                              <div class="space-y-1 text-xs">
                                {#if card.card?.hp}
                                  <div class="flex justify-between">
                                    <span class="text-gray-500">HP:</span>
                                    <span class="text-gray-900">{card.card.hp}</span>
                                  </div>
                                {/if}
                                {#if card.listing}
                                  <div class="flex justify-between">
                                    <span class="text-gray-500">Listed:</span>
                                    <span class="text-green-600 font-medium">${card.listing.usd_price}</span>
                                  </div>
                                {:else if card.card?.raw_price}
                                  <div class="flex justify-between">
                                    <span class="text-gray-500">Value:</span>
                                    <span class="text-gray-900">${card.card.raw_price}</span>
                                  </div>
                                {/if}
                                <div class="flex justify-between">
                                  <span class="text-gray-500">Status:</span>
                                  <span class="text-gray-900">
                                    {#if card.is_listed}
                                      <span class="text-green-600">Listed</span>
                                    {:else}
                                      <span class="text-gray-600">Owned</span>
                                    {/if}
                                  </span>
                                </div>
                              </div>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/each}
                  {:else}
                    <!-- Single Set - Grid Display -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {#each processedCards as card}
                        {@const duplicateCount = showDuplicates ? 1 : cardsBySet[selectedSet]?.cards.filter((c: any) => c.card?.id === card.card?.id).length || 1}
                        <div class="border border-gray-200 rounded-lg p-3 bg-gray-50 relative">
                          {#if duplicateCount > 1}
                            <div class="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold">
                              {duplicateCount}
                            </div>
                          {/if}
                          <div class="flex items-start justify-between mb-2">
                            <div class="flex-1">
                              <h4 class="font-medium text-sm text-gray-900">
                                {card.card?.name || 'Unknown Card'}
                                {#if card.card?.card_number}
                                  <span class="text-gray-500">#{card.card.card_number}</span>
                                {/if}
                              </h4>
                              <p class="text-xs text-gray-600 mt-1">
                                {card.card?.rarity || 'Unknown Rarity'}
                                {#if card.card?.types}
                                  • {card.card.types.join(', ')}
                                {/if}
                              </p>
                            </div>
                            {#if card.card?.small_image_url}
                              <img 
                                src={card.card.small_image_url} 
                                alt={card.card?.name} 
                                class="w-10 h-14 object-cover rounded border ml-2"
                                loading="lazy"
                              />
                            {/if}
                          </div>
                          
                          <div class="space-y-1 text-xs">
                            {#if card.card?.hp}
                              <div class="flex justify-between">
                                <span class="text-gray-500">HP:</span>
                                <span class="text-gray-900">{card.card.hp}</span>
                              </div>
                            {/if}
                            {#if card.listing}
                              <div class="flex justify-between">
                                <span class="text-gray-500">Listed:</span>
                                <span class="text-green-600 font-medium">${card.listing.usd_price}</span>
                              </div>
                            {:else if card.card?.raw_price}
                              <div class="flex justify-between">
                                <span class="text-gray-500">Value:</span>
                                <span class="text-gray-900">${card.card.raw_price}</span>
                              </div>
                            {/if}
                            <div class="flex justify-between">
                              <span class="text-gray-500">Status:</span>
                              <span class="text-gray-900">
                                {#if card.is_listed}
                                  <span class="text-green-600">Listed</span>
                                {:else}
                                  <span class="text-gray-600">Owned</span>
                                {/if}
                              </span>
                            </div>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}
                {:else}
                  <!-- Table View -->
                  <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                      <thead class="bg-gray-50">
                        <tr>
                          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Card
                          </th>
                          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Set
                          </th>
                          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rarity
                          </th>
                          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            HP
                          </th>
                          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Value
                          </th>
                          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          {#if !showDuplicates}
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Count
                            </th>
                          {/if}
                        </tr>
                      </thead>
                      <tbody class="bg-white divide-y divide-gray-200">
                        {#each processedCards as card}
                          {@const duplicateCount = showDuplicates ? 1 : (selectedSet === 'all' 
                            ? extractedData.profile.digital_cards.filter((c: any) => c.card?.id === card.card?.id).length
                            : cardsBySet[selectedSet]?.cards.filter((c: any) => c.card?.id === card.card?.id).length || 1)}
                          <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap">
                              <div class="flex items-center">
                                {#if card.card?.small_image_url}
                                  <img 
                                    src={card.card.small_image_url} 
                                    alt={card.card?.name} 
                                    class="w-8 h-11 object-cover rounded border mr-3"
                                    loading="lazy"
                                  />
                                {/if}
                                <div>
                                  <div class="text-sm font-medium text-gray-900">
                                    {card.card?.name || 'Unknown Card'}
                                  </div>
                                  {#if card.card?.card_number}
                                    <div class="text-sm text-gray-500">#{card.card.card_number}</div>
                                  {/if}
                                </div>
                              </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {card.set?.name || card.card?.set_id || 'Unknown'}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {card.card?.rarity || 'Unknown'}
                              </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {card.card?.types?.join(', ') || 'Unknown'}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {card.card?.hp || '—'}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {#if card.listing}
                                <span class="text-green-600 font-medium">${card.listing.usd_price}</span>
                              {:else if card.card?.raw_price}
                                ${card.card.raw_price}
                              {:else}
                                —
                              {/if}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {card.is_listed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                                {card.is_listed ? 'Listed' : 'Owned'}
                              </span>
                            </td>
                            {#if !showDuplicates}
                              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {duplicateCount > 1 ? duplicateCount : '1'}
                              </td>
                            {/if}
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                {/if}
              </div>
              {/snippet}
              
              {@render cardsSection()}
            {/if}

            <!-- Digital Products Section -->
            {#if extractedData.profile.digital_products && extractedData.profile.digital_products.length > 0}
              {@const groupedPacks = extractedData.profile.digital_products.reduce((groups: any, product: any) => {
                const packName = product.name || 'Unknown Pack';
                if (!groups[packName]) {
                  groups[packName] = {
                    name: packName,
                    items: [],
                    totalValue: 0,
                    listedCount: 0,
                    ownedCount: 0,
                    openedCount: 0,
                    sealedCount: 0,
                    pendingOpenCount: 0,
                    sampleImage: null
                  };
                }
                
                groups[packName].items.push(product);
                groups[packName].totalValue += parseFloat(product.product?.current_value || '0');
                
                if (product.is_listed) {
                  groups[packName].listedCount++;
                } else {
                  groups[packName].ownedCount++;
                }
                
                // Count pack statuses based on open_status
                const status = product.open_status?.toLowerCase() || 'unknown';
                if (status.includes('opened') || status === 'opened') {
                  groups[packName].openedCount++;
                } else if (status.includes('sealed') || status === 'sealed' || status === 'unopened') {
                  groups[packName].sealedCount++;
                } else if (status.includes('pending') || status.includes('opening')) {
                  groups[packName].pendingOpenCount++;
                } else if (!product.is_listed) {
                  // If no specific status but owned, assume sealed
                  groups[packName].sealedCount++;
                }
                
                if (!groups[packName].sampleImage && product.front_image_url) {
                  groups[packName].sampleImage = product.front_image_url;
                }
                
                return groups;
              }, {})}
              
              <div class="bg-white shadow rounded-lg p-6">
                <div class="flex justify-between items-center mb-6">
                  <h2 class="text-lg font-medium text-gray-900">Digital Products ({extractedData.profile.digital_products.length})</h2>
                  <div class="text-sm text-gray-500">
                    {Object.keys(groupedPacks).length} unique pack types
                  </div>
                </div>

                <!-- Grouped Pack Display -->
                <div class="space-y-6">
                  {#each Object.values(groupedPacks) as packGroup, index}
                    {@const group = packGroup as any}
                    {@const groupId = `group-${index}`}
                    
                    <div class="border border-gray-200 rounded-lg overflow-hidden">
                      <!-- Pack Group Header -->
                      <button
                        class="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 border-b border-gray-200 flex items-center justify-between transition-colors"
                        onclick={() => {
                          const details = document.getElementById(`details-${groupId}`);
                          const icon = document.getElementById(`icon-${groupId}`);
                          if (details && icon) {
                            details.classList.toggle('hidden');
                            icon.classList.toggle('rotate-180');
                          }
                        }}
                      >
                        <div class="flex items-center space-x-4">
                          {#if group.sampleImage}
                            <img 
                              src={group.sampleImage} 
                              alt={group.name} 
                              class="w-12 h-16 object-cover rounded border"
                              loading="lazy"
                            />
                          {/if}
                          <div class="text-left">
                            <h3 class="text-lg font-semibold text-gray-900">{group.name}</h3>
                            <p class="text-sm text-gray-600">
                              {group.items.length} packs • 
                              <span class="text-green-600 font-medium">{group.openedCount} opened</span> • 
                              <span class="text-blue-600 font-medium">{group.sealedCount} sealed</span>
                              {#if group.pendingOpenCount > 0}
                                • <span class="text-orange-600 font-medium">{group.pendingOpenCount} pending</span>
                              {/if}
                              {#if group.totalValue > 0}
                                • ${group.totalValue.toFixed(2)} value
                              {/if}
                            </p>
                          </div>
                        </div>
                        
                        <div class="flex items-center space-x-2">
                          <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {group.items.length}
                          </span>
                          <svg 
                            id="icon-{groupId}"
                            class="h-5 w-5 text-gray-500 transition-transform transform rotate-0"
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      <!-- Expandable Pack Details -->
                      <div id="details-{groupId}" class="hidden bg-white">
                        <!-- Summary Section -->
                        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-200">
                          <h4 class="text-sm font-semibold text-gray-900 mb-3">{group.name} Summary</h4>
                          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div class="text-center">
                              <div class="text-2xl font-bold text-green-600">{group.openedCount}</div>
                              <div class="text-xs text-gray-600 uppercase tracking-wide">Opened</div>
                            </div>
                            <div class="text-center">
                              <div class="text-2xl font-bold text-blue-600">{group.sealedCount}</div>
                              <div class="text-xs text-gray-600 uppercase tracking-wide">Sealed</div>
                            </div>
                            <div class="text-center">
                              <div class="text-2xl font-bold text-orange-600">{group.pendingOpenCount}</div>
                              <div class="text-xs text-gray-600 uppercase tracking-wide">Pending Open</div>
                            </div>
                            <div class="text-center">
                              <div class="text-2xl font-bold text-gray-800">{group.items.length}</div>
                              <div class="text-xs text-gray-600 uppercase tracking-wide">Total Packs</div>
                            </div>
                          </div>
                          {#if group.totalValue > 0}
                            <div class="mt-3 text-center">
                              <div class="text-lg font-semibold text-gray-900">
                                Total Value: ${group.totalValue.toFixed(2)}
                              </div>
                            </div>
                          {/if}
                        </div>
                        
                        <div class="overflow-x-auto">
                          <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                              <tr>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  ID
                                </th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                              {#each group.items as product}
                                <tr class="hover:bg-gray-50">
                                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    #{product.id}
                                  </td>
                                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {product.is_listed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                                      {product.is_listed ? 'Listed' : (product.open_status || 'Owned')}
                                    </span>
                                  </td>
                                </tr>
                              {/each}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>

                <!-- Individual Cards Section (if any exist separately) -->
                {#if extractedData.profile.digital_products.filter((product: any) => 
                  product.product?.type !== 'pack' && product.product?.type !== 'Pack' && 
                  !product.name?.toLowerCase().includes('pack') && 
                  !product.name?.toLowerCase().includes('booster')
                ).length > 0}
                  {@const nonPackProducts = extractedData.profile.digital_products.filter((product: any) => 
                    product.product?.type !== 'pack' && product.product?.type !== 'Pack' && 
                    !product.name?.toLowerCase().includes('pack') && 
                    !product.name?.toLowerCase().includes('booster')
                  )}
                  <div class="mt-8 pt-6 border-t border-gray-200">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Individual Cards & Products ({nonPackProducts.length})</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {#each nonPackProducts as product}
                        <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div class="flex items-start justify-between mb-2">
                            <div class="flex-1">
                              <h4 class="font-medium text-sm text-gray-900">{product.name || 'Unknown Product'}</h4>
                              <p class="text-xs text-gray-600 mt-1">
                                {#if product.set?.name}
                                  {product.set.name}
                                {/if}
                              </p>
                            </div>
                            {#if product.front_image_url}
                              <img 
                                src={product.front_image_url} 
                                alt={product.name} 
                                class="w-12 h-16 object-cover rounded border ml-2"
                                loading="lazy"
                              />
                            {/if}
                          </div>
                          
                          <div class="space-y-1 text-xs">
                            <div class="flex justify-between">
                              <span class="text-gray-500">Type:</span>
                              <span class="text-gray-900">{product.product?.type || 'Unknown'}</span>
                            </div>
                            {#if product.product?.current_value}
                              <div class="flex justify-between">
                                <span class="text-gray-500">Value:</span>
                                <span class="text-gray-900">${product.product.current_value}</span>
                              </div>
                            {/if}
                            <div class="flex justify-between">
                              <span class="text-gray-500">Status:</span>
                              <span class="text-gray-900">
                                {#if product.is_listed}
                                  <span class="text-green-600">Listed</span>
                                {:else}
                                  <span class="text-gray-600">{product.open_status || 'Owned'}</span>
                                {/if}
                              </span>
                            </div>
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>