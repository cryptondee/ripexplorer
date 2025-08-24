<script lang="ts">
  import { onMount } from 'svelte';
  
  let userA = '';
  let userB = '';
  let tradeResults: any = null;
  let loading = false;
  let error = '';

  // Filtering and pagination
  let selectedSet = 'all';
  let selectedRarity = 'all';
  let selectedTradeType = 'all';
  let currentPage = 1;
  let itemsPerPage = 50;
  let filteredTrades: any[] = [];
  let availableSets: any[] = [];
  let availableRarities: string[] = [];
  let totalPages = 1;

  // Search functionality for usernames
  let searchResultsA: any[] = [];
  let searchResultsB: any[] = [];
  let showSearchA = false;
  let showSearchB = false;
  let searchLoadingA = false;
  let searchLoadingB = false;

  async function searchUsers(query: string, forUserA: boolean = true): Promise<void> {
    if (query.length < 2) {
      if (forUserA) {
        searchResultsA = [];
        showSearchA = false;
      } else {
        searchResultsB = [];
        showSearchB = false;
      }
      return;
    }

    if (forUserA) {
      searchLoadingA = true;
    } else {
      searchLoadingB = true;
    }

    try {
      const response = await fetch(`/api/search-users?q=${encodeURIComponent(query)}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        if (forUserA) {
          searchResultsA = data.results;
          showSearchA = true;
        } else {
          searchResultsB = data.results;
          showSearchB = true;
        }
      }
    } catch (err) {
      console.warn('User search failed:', err);
    } finally {
      if (forUserA) {
        searchLoadingA = false;
      } else {
        searchLoadingB = false;
      }
    }
  }

  function selectUser(user: any, forUserA: boolean = true): void {
    if (forUserA) {
      userA = user.username;
      showSearchA = false;
      searchResultsA = [];
    } else {
      userB = user.username;
      showSearchB = false;
      searchResultsB = [];
    }
  }

  async function compareUsers(): Promise<void> {
    if (!userA || !userB) {
      error = 'Please enter both usernames';
      return;
    }

    if (userA === userB) {
      error = 'Cannot compare user with themselves';
      return;
    }

    loading = true;
    error = '';
    tradeResults = null;

    try {
      const response = await fetch('/api/trade-compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userA, userB })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        tradeResults = data;
        availableSets = data.availableSets || [];
        
        // Extract available rarities from trade results
        const raritySet = new Set<string>();
        const allTrades = [
          ...(data.tradeAnalysis.perfectTrades || []),
          ...(data.tradeAnalysis.userACanReceive || []),
          ...(data.tradeAnalysis.userACanGive || [])
        ];
        
        allTrades.forEach((trade: any) => {
          if (trade.card.rarity) {
            raritySet.add(trade.card.rarity);
          }
        });
        
        availableRarities = Array.from(raritySet).sort();
        console.log('Trade comparison results:', data);
        console.log('Available rarities:', availableRarities);
        
        // Load filtered trades for the first time
        await loadFilteredTrades();
      } else {
        error = data.error || 'Failed to compare users';
      }
    } catch (err) {
      error = 'Network error occurred';
      console.error('Trade comparison error:', err);
    } finally {
      loading = false;
    }
  }

  async function loadFilteredTrades(): Promise<void> {
    if (!userA || !userB) return;

    try {
      const params = new URLSearchParams({
        userA,
        userB,
        set: selectedSet,
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      });

      const response = await fetch(`/api/trade-compare?${params}`);
      const data = await response.json();

      if (response.ok && data.success) {
        let trades = data.trades || [];
        
        // Apply client-side filtering for rarity and trade type
        if (selectedRarity !== 'all') {
          trades = trades.filter((trade: any) => trade.card.rarity === selectedRarity);
        }
        
        if (selectedTradeType !== 'all') {
          trades = trades.filter((trade: any) => trade.tradeType === selectedTradeType);
        }
        
        filteredTrades = trades;
        totalPages = data.pagination?.totalPages || 1;
        console.log(`Loaded ${filteredTrades.length} trades for set ${selectedSet}, rarity ${selectedRarity}, type ${selectedTradeType}, page ${currentPage}`);
      } else {
        console.error('Failed to load filtered trades:', data.error);
      }
    } catch (err) {
      console.error('Error loading filtered trades:', err);
    }
  }

  // Handle filter changes
  async function handleSetChange(): Promise<void> {
    currentPage = 1; // Reset to first page
    await loadFilteredTrades();
  }

  async function handleRarityChange(): Promise<void> {
    currentPage = 1; // Reset to first page
    await loadFilteredTrades();
  }

  async function handleTradeTypeChange(): Promise<void> {
    currentPage = 1; // Reset to first page
    await loadFilteredTrades();
  }

  // Handle page changes
  async function goToPage(page: number): Promise<void> {
    currentPage = page;
    await loadFilteredTrades();
  }

  function getTradeTypeColor(tradeType: string): string {
    switch (tradeType) {
      case 'perfect': return 'bg-green-100 text-green-800 border-green-300';
      case 'receive': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'give': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'impossible': return 'bg-gray-100 text-gray-600 border-gray-300';
      default: return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  }

  function getTradeTypeIcon(tradeType: string): string {
    switch (tradeType) {
      case 'perfect': return '🎯';
      case 'receive': return '⬅️';
      case 'give': return '➡️';  
      case 'impossible': return '❌';
      default: return '❔';
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  }

  function getRowHighlighting(trade: any): string {
    // Only highlight rows for 'give' trades where userA is giving away cards
    if (trade.tradeType === 'give' && trade.userACount > 0) {
      if (trade.userACount === 1) {
        return 'cursor-pointer'; // Will use inline styles for orange
      } else {
        return 'cursor-pointer'; // Will use inline styles for green
      }
    }
    return 'hover:bg-gray-50 cursor-pointer'; // Default styling
  }

  function getRowStyle(trade: any): string {
    // Only highlight rows for 'give' trades where userA is giving away cards
    if (trade.tradeType === 'give' && trade.userACount > 0) {
      if (trade.userACount === 1) {
        return 'background-color: #fed7aa; border-left: 4px solid #ea580c;'; // Single card - orange
      } else {
        return 'background-color: #bbf7d0; border-left: 4px solid #16a34a;'; // Duplicate - green
      }
    }
    return ''; // Default styling
  }

  // Close search dropdowns when clicking outside
  function handleClickOutside(event: MouseEvent): void {
    const target = event.target as Element;
    if (!target.closest('.search-container')) {
      showSearchA = false;
      showSearchB = false;
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<svelte:head>
  <title>Trade Finder - rip.fun Data Extractor</title>
</svelte:head>

<div class="min-h-[90vh] container mx-auto px-6 py-12">
  <div class="max-w-[1400px] mx-auto">
    <!-- Header -->
    <div class="text-center mb-12">
      <h1 class="text-3xl font-bold text-gray-900 mb-4">🔄 Trade Finder</h1>
      <p class="text-lg text-gray-600 max-w-2xl mx-auto">
        Compare two rip.fun users to find perfect trading opportunities. See which cards you can trade with each other!
      </p>
    </div>

    <!-- User Input Form -->
    <div class="bg-white rounded-lg shadow-md p-8 mb-12">
      <div class="grid md:grid-cols-2 gap-8">
        <!-- User A Input -->
        <div class="search-container relative">
          <label for="userA" class="block text-sm font-medium text-gray-700 mb-2">
            First User (Username or ID)
          </label>
          <input
            type="text"
            id="userA"
            bind:value={userA}
            on:input={() => searchUsers(userA, true)}
            placeholder="Enter username..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          {#if searchLoadingA}
            <div class="absolute right-3 top-9">
              <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          {/if}
          
          {#if showSearchA && searchResultsA.length > 0}
            <div class="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
              {#each searchResultsA as user}
                <button
                  type="button"
                  class="w-full px-4 py-2 text-left hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                  on:click={() => selectUser(user, true)}
                >
                  <div class="flex items-center space-x-3">
                    {#if user.avatar}
                      <img src={user.avatar} alt="" class="w-6 h-6 rounded-full" />
                    {/if}
                    <span class="font-medium">{user.username}</span>
                    <span class="text-sm text-gray-500">ID: {user.id}</span>
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- User B Input -->
        <div class="search-container relative">
          <label for="userB" class="block text-sm font-medium text-gray-700 mb-2">
            Second User (Username or ID)
          </label>
          <input
            type="text"
            id="userB"
            bind:value={userB}
            on:input={() => searchUsers(userB, false)}
            placeholder="Enter username..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          {#if searchLoadingB}
            <div class="absolute right-3 top-9">
              <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          {/if}
          
          {#if showSearchB && searchResultsB.length > 0}
            <div class="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
              {#each searchResultsB as user}
                <button
                  type="button"
                  class="w-full px-4 py-2 text-left hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                  on:click={() => selectUser(user, false)}
                >
                  <div class="flex items-center space-x-3">
                    {#if user.avatar}
                      <img src={user.avatar} alt="" class="w-6 h-6 rounded-full" />
                    {/if}
                    <span class="font-medium">{user.username}</span>
                    <span class="text-sm text-gray-500">ID: {user.id}</span>
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Compare Button -->
      <div class="mt-8 text-center">
        <button
          type="button"
          on:click={compareUsers}
          disabled={loading || !userA || !userB}
          class="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {#if loading}
            <span class="flex items-center justify-center">
              <div class="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Analyzing Trades...
            </span>
          {:else}
            🔍 Find Trade Opportunities
          {/if}
        </button>
      </div>

      {#if error}
        <div class="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
          {error}
        </div>
      {/if}
    </div>

    <!-- Results -->
    {#if tradeResults}
      <div class="space-y-12">
        <!-- User Summary -->
        <div class="bg-white rounded-lg shadow-md p-8">
          <h2 class="text-xl font-bold mb-4">👥 User Comparison</h2>
          <div class="grid md:grid-cols-2 gap-8">
            <div class="text-center p-6 bg-blue-50 rounded-lg">
              <h3 class="text-lg font-semibold text-blue-900">{tradeResults.userA.username}</h3>
              <p class="text-2xl font-bold text-blue-600">{tradeResults.userA.totalCards}</p>
              <p class="text-sm text-blue-700">Cards Owned</p>
            </div>
            <div class="text-center p-6 bg-green-50 rounded-lg">
              <h3 class="text-lg font-semibold text-green-900">{tradeResults.userB.username}</h3>
              <p class="text-2xl font-bold text-green-600">{tradeResults.userB.totalCards}</p>
              <p class="text-sm text-green-700">Cards Owned</p>
            </div>
          </div>
        </div>

        <!-- Trade Summary -->
        <div class="bg-white rounded-lg shadow-md p-8">
          <h2 class="text-xl font-bold mb-4">📊 Trade Summary</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div class="text-center p-6 bg-green-50 rounded-lg border-2 border-green-200">
              <p class="text-2xl font-bold text-green-600">{tradeResults.tradeAnalysis.summary.totalPerfectTrades}</p>
              <p class="text-sm text-green-700">Perfect Trades</p>
            </div>
            <div class="text-center p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
              <p class="text-2xl font-bold text-blue-600">{tradeResults.tradeAnalysis.summary.totalOneWayToA}</p>
              <p class="text-sm text-blue-700">Can Receive</p>
            </div>
            <div class="text-center p-6 bg-orange-50 rounded-lg border-2 border-orange-200">
              <p class="text-2xl font-bold text-orange-600">{tradeResults.tradeAnalysis.summary.totalOneWayToB}</p>
              <p class="text-sm text-orange-700">Can Give</p>
            </div>
            <div class="text-center p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
              <p class="text-2xl font-bold text-gray-600">{tradeResults.tradeAnalysis.summary.totalImpossible}</p>
              <p class="text-sm text-gray-700">Both Missing</p>
            </div>
          </div>
        </div>

        <!-- Recommendations -->
        {#if tradeResults.recommendations && tradeResults.recommendations.length > 0}
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-bold mb-4">💡 Trade Recommendations</h2>
            <div class="space-y-2">
              {#each tradeResults.recommendations as recommendation}
                <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
                  {recommendation}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Trade Results Tables -->
        {#if availableSets.length > 0}
          <!-- Filters -->
          <div class="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 class="text-xl font-bold mb-4">🔄 Trade Opportunities</h2>
            
            <div class="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-8 bg-gray-50 p-6 rounded-lg">
              <!-- Set Filter -->
              <div class="flex items-center space-x-2">
                <label for="setFilter" class="text-sm font-medium text-gray-700 whitespace-nowrap">Set:</label>
                <select 
                  id="setFilter" 
                  bind:value={selectedSet}
                  on:change={handleSetChange}
                  class="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Sets</option>
                  {#each availableSets as set}
                    <option value={set.id}>{set.name} ({set.count})</option>
                  {/each}
                </select>
              </div>

              <!-- Rarity Filter -->
              <div class="flex items-center space-x-2">
                <label for="rarityFilter" class="text-sm font-medium text-gray-700 whitespace-nowrap">Rarity:</label>
                <select 
                  id="rarityFilter" 
                  bind:value={selectedRarity}
                  on:change={handleRarityChange}
                  class="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Rarities</option>
                  {#each availableRarities as rarity}
                    <option value={rarity}>{rarity.charAt(0).toUpperCase() + rarity.slice(1)}</option>
                  {/each}
                </select>
              </div>

              <!-- Clear Filters -->
              <button
                type="button"
                on:click={() => {
                  selectedSet = 'all';
                  selectedRarity = 'all';
                  selectedTradeType = 'all';
                  handleSetChange();
                }}
                class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-white transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          <!-- Two Tables Side by Side -->
          <div class="grid grid-cols-1 xl:grid-cols-2 gap-12">
            <!-- Cards User A Can Give -->
            {#if filteredTrades.length > 0}
              {@const giveTrades = filteredTrades.filter(trade => trade.tradeType === 'give' || trade.tradeType === 'perfect')}
              {#if giveTrades.length > 0}
              <div class="bg-white rounded-lg shadow-md p-8">
                <h3 class="text-lg font-bold mb-4 text-orange-600">➡️ {tradeResults.userA.username} Can Give ({giveTrades.length})</h3>
                
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Card</th>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set</th>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rarity</th>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      {#each giveTrades as trade}
                        <tr class="{getRowHighlighting(trade)}" style="{getRowStyle(trade)}">
                          <!-- Card -->
                          <td class="px-4 py-3 whitespace-nowrap">
                            <div class="flex items-center">
                              <div class="w-8 h-11 rounded border mr-3 flex items-center justify-center overflow-hidden bg-gray-100">
                                {#if trade.card.small_image_url}
                                  <img 
                                    src={trade.card.small_image_url} 
                                    alt={trade.card.name} 
                                    class="w-full h-full object-cover rounded"
                                    loading="lazy"
                                  />
                                {:else}
                                  <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"></path>
                                  </svg>
                                {/if}
                              </div>
                              <div>
                                <div class="text-sm font-medium text-gray-900">
                                  {trade.card.name}
                                </div>
                                {#if trade.card.card_number}
                                  <div class="text-sm text-gray-500">#{trade.card.card_number}</div>
                                {/if}
                              </div>
                            </div>
                          </td>
                          
                          <!-- Set -->
                          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            <div class="max-w-xs">
                              <p class="truncate text-xs">{trade.card.set_name || trade.card.set_id}</p>
                            </div>
                          </td>
                          
                          <!-- Rarity -->
                          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
                              {trade.card.rarity === 'common' ? 'bg-gray-100 text-gray-800' : 
                               trade.card.rarity === 'uncommon' ? 'bg-green-100 text-green-800' :
                               trade.card.rarity === 'rare' ? 'bg-blue-100 text-blue-800' :
                               trade.card.rarity === 'mythic' ? 'bg-purple-100 text-purple-800' :
                               'bg-yellow-100 text-yellow-800'}">
                              {trade.card.rarity || 'Unknown'}
                            </span>
                          </td>
                          
                          <!-- Count -->
                          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            <div class="text-center">
                              <span class="font-medium">{trade.userACount || 0}</span>
                            </div>
                          </td>
                          
                          <!-- Value -->
                          <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(trade.estimatedValue || 0)}
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>
              {/if}

              <!-- Cards User A Can Receive -->
              {@const receiveTrades = filteredTrades.filter(trade => trade.tradeType === 'receive' || trade.tradeType === 'perfect')}
              {#if receiveTrades.length > 0}
              <div class="bg-white rounded-lg shadow-md p-8">
                <h3 class="text-lg font-bold mb-4 text-blue-600">⬅️ {tradeResults.userA.username} Can Receive ({receiveTrades.length})</h3>
                
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Card</th>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set</th>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rarity</th>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      {#each receiveTrades as trade}
                        <tr class="hover:bg-gray-50 cursor-pointer">
                          <!-- Card -->
                          <td class="px-4 py-3 whitespace-nowrap">
                            <div class="flex items-center">
                              <div class="w-8 h-11 rounded border mr-3 flex items-center justify-center overflow-hidden bg-gray-100">
                                {#if trade.card.small_image_url}
                                  <img 
                                    src={trade.card.small_image_url} 
                                    alt={trade.card.name} 
                                    class="w-full h-full object-cover rounded"
                                    loading="lazy"
                                  />
                                {:else}
                                  <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"></path>
                                  </svg>
                                {/if}
                              </div>
                              <div>
                                <div class="text-sm font-medium text-gray-900">
                                  {trade.card.name}
                                </div>
                                {#if trade.card.card_number}
                                  <div class="text-sm text-gray-500">#{trade.card.card_number}</div>
                                {/if}
                              </div>
                            </div>
                          </td>
                          
                          <!-- Set -->
                          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            <div class="max-w-xs">
                              <p class="truncate text-xs">{trade.card.set_name || trade.card.set_id}</p>
                            </div>
                          </td>
                          
                          <!-- Rarity -->
                          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
                              {trade.card.rarity === 'common' ? 'bg-gray-100 text-gray-800' : 
                               trade.card.rarity === 'uncommon' ? 'bg-green-100 text-green-800' :
                               trade.card.rarity === 'rare' ? 'bg-blue-100 text-blue-800' :
                               trade.card.rarity === 'mythic' ? 'bg-purple-100 text-purple-800' :
                               'bg-yellow-100 text-yellow-800'}">
                              {trade.card.rarity || 'Unknown'}
                            </span>
                          </td>
                          
                          <!-- Count -->
                          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            <div class="text-center">
                              <span class="font-medium">{trade.userBCount || 0}</span>
                            </div>
                          </td>
                          
                          <!-- Value -->
                          <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(trade.estimatedValue || 0)}
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>
              {/if}

              <!-- No Trades Message -->
              {#if filteredTrades.filter(trade => trade.tradeType === 'give' || trade.tradeType === 'perfect').length === 0 && filteredTrades.filter(trade => trade.tradeType === 'receive' || trade.tradeType === 'perfect').length === 0}
                <div class="col-span-full">
                  <div class="bg-white rounded-lg shadow-md p-8">
                    <div class="text-center py-8">
                      <div class="text-4xl mb-4">🔍</div>
                      <h3 class="text-lg font-medium text-gray-900 mb-2">No trades found</h3>
                      <p class="text-gray-600">Try selecting a different set or check if both users have cards.</p>
                    </div>
                  </div>
                </div>
              {/if}
            {/if}
          </div>
        {/if}

        <!-- Trade Balance Analysis -->
        {#if tradeResults.tradeAnalysis.summary.estimatedPerfectTradeValue > 0 || tradeResults.tradeAnalysis.summary.estimatedOneWayToAValue > 0 || tradeResults.tradeAnalysis.summary.estimatedOneWayToBValue > 0}
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-bold mb-4">⚖️ Trade Value Analysis</h2>
            <div class="grid md:grid-cols-3 gap-4">
              <div class="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <p class="text-lg font-bold text-green-600">
                  {formatCurrency(tradeResults.tradeAnalysis.summary.estimatedPerfectTradeValue)}
                </p>
                <p class="text-sm text-green-700">Perfect Trades Value</p>
              </div>
              <div class="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p class="text-lg font-bold text-blue-600">
                  {formatCurrency(tradeResults.tradeAnalysis.summary.estimatedOneWayToAValue)}
                </p>
                <p class="text-sm text-blue-700">{tradeResults.userA.username} Can Receive</p>
              </div>
              <div class="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p class="text-lg font-bold text-orange-600">
                  {formatCurrency(tradeResults.tradeAnalysis.summary.estimatedOneWayToBValue)}
                </p>
                <p class="text-sm text-orange-700">{tradeResults.userA.username} Can Give</p>
              </div>
            </div>
            
            <!-- Trade Balance Indicator -->
            <div class="mt-4 p-4 rounded-lg {tradeResults.tradeAnalysis.summary.tradeBalance === 'even' ? 'bg-gray-50 border border-gray-200' : tradeResults.tradeAnalysis.summary.tradeBalance === 'favors_a' ? 'bg-blue-50 border border-blue-200' : 'bg-orange-50 border border-orange-200'}">
              <div class="flex items-center justify-center space-x-2">
                <span class="text-lg">
                  {#if tradeResults.tradeAnalysis.summary.tradeBalance === 'even'}
                    ⚖️
                  {:else if tradeResults.tradeAnalysis.summary.tradeBalance === 'favors_a'}
                    ⬅️
                  {:else}
                    ➡️
                  {/if}
                </span>
                <span class="font-medium {tradeResults.tradeAnalysis.summary.tradeBalance === 'even' ? 'text-gray-700' : tradeResults.tradeAnalysis.summary.tradeBalance === 'favors_a' ? 'text-blue-700' : 'text-orange-700'}">
                  {#if tradeResults.tradeAnalysis.summary.tradeBalance === 'even'}
                    Trade values are well balanced
                  {:else if tradeResults.tradeAnalysis.summary.tradeBalance === 'favors_a'}
                    Trade favors {tradeResults.userA.username}
                  {:else}
                    Trade favors {tradeResults.userB.username}
                  {/if}
                </span>
              </div>
            </div>
          </div>
        {/if}

        <!-- Quick Action Buttons -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-bold mb-4">🚀 Quick Actions</h2>
          <div class="flex flex-wrap gap-4">
            <button 
              type="button"
              on:click={() => window.open(`https://www.rip.fun/profile/${tradeResults.userA.username}`, '_blank')}
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔗 View {tradeResults.userA.username} on rip.fun
            </button>
            <button 
              type="button"
              on:click={() => window.open(`https://www.rip.fun/profile/${tradeResults.userB.username}`, '_blank')}
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              🔗 View {tradeResults.userB.username} on rip.fun
            </button>
            <button 
              type="button"
              on:click={() => {
                const summary = `Trade Analysis: ${tradeResults.userA.username} vs ${tradeResults.userB.username}\n` +
                               `Perfect Trades: ${tradeResults.tradeAnalysis.summary.totalPerfectTrades}\n` +
                               `${tradeResults.userA.username} can receive: ${tradeResults.tradeAnalysis.summary.totalOneWayToA} cards\n` +
                               `${tradeResults.userA.username} can give: ${tradeResults.tradeAnalysis.summary.totalOneWayToB} cards\n` +
                               `Generated on: ${new Date().toLocaleDateString()}`;
                navigator.clipboard.writeText(summary);
                alert('Trade summary copied to clipboard!');
              }}
              class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              📋 Copy Trade Summary
            </button>
          </div>
        </div>

        <!-- No Trades Available -->
        {#if tradeResults && availableSets.length === 0}
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="text-center py-8">
              <div class="text-4xl mb-4">😔</div>
              <h2 class="text-xl font-bold text-gray-900 mb-2">No Trade Opportunities Found</h2>
              <p class="text-gray-600 max-w-md mx-auto">
                Unfortunately, these users don't have any cards that the other needs. Try comparing with other users or check back after collections are updated.
              </p>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>