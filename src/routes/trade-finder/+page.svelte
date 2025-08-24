<script lang="ts">
  import { onMount } from 'svelte';
  import TradeTable from '$lib/components/TradeTable.svelte';
  import UserSearchInput from '$lib/components/UserSearchInput.svelte';
  import SetSummaryTable from '$lib/components/trade/SetSummaryTable.svelte';
  import { buildUserSetSummaryFromCounts } from '$lib/utils/trade/summaries';
  
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

  // Caches and derived data for summaries
  let setTotals: Record<string, number> = {};
  let setNameById: Record<string, string> = {};
  let userSummaryA: any[] = [];
  let userSummaryB: any[] = [];
  let summariesLoading = false;

  function getSetName(id: string): string {
    // Special-case mapping consistent with extract page
    if (id === 'sv3pt5') return 'Scarlet & Violet 151';
    return setNameById[id] || id || 'Unknown Set';
  }

  async function getSetTotal(id: string): Promise<number> {
    if (!id) return 0;
    if (setTotals[id] !== undefined) return setTotals[id];
    try {
      const res = await fetch(`/api/set/${id}`);
      const data = await res.json();
      const total = Array.isArray(data?.cards) ? data.cards.length : 0;
      setTotals[id] = total;
      return total;
    } catch (e) {
      setTotals[id] = 0;
      return 0;
    }
  }

  async function refreshSummaries(): Promise<void> {
    if (!tradeResults) return;
    // Ensure setNameById from availableSets
    setNameById = Object.fromEntries((availableSets || []).map((s: any) => [s.id, s.name]));

    const ownedA: Record<string, number> = tradeResults.ownedBySetA || {};
    const ownedB: Record<string, number> = tradeResults.ownedBySetB || {};
    const missingA: Record<string, number> = tradeResults.missingBySetA || {};
    const missingB: Record<string, number> = tradeResults.missingBySetB || {};

    summariesLoading = true;
    try {
      // Preload totals for all involved set ids (owned or missing)
      const ids = Array.from(new Set([
        ...Object.keys(ownedA),
        ...Object.keys(ownedB),
        ...Object.keys(missingA),
        ...Object.keys(missingB)
      ]));
      await Promise.all(ids.map((id) => getSetTotal(id)));

      // Build from owned counts but enforce Owned = Total - Missing (unique)
      userSummaryA = buildUserSetSummaryFromCounts(ownedA, {
        getSetName,
        getSetTotal: (id: string) => setTotals[id] || 0,
      }).map((row: any) => {
        const total = setTotals[row.setId] ?? row.total ?? 0;
        const missing = Number(missingA[row.setId] || 0);
        const owned = Math.max(0, total - missing);
        const percent = total > 0 ? Math.min(100, Math.round((owned / total) * 100)) : 0;
        return { ...row, owned, total, percent };
      }).sort((a: any, b: any) => (b.percent - a.percent) || a.setName.localeCompare(b.setName));

      userSummaryB = buildUserSetSummaryFromCounts(ownedB, {
        getSetName,
        getSetTotal: (id: string) => setTotals[id] || 0,
      }).map((row: any) => {
        const total = setTotals[row.setId] ?? row.total ?? 0;
        const missing = Number(missingB[row.setId] || 0);
        const owned = Math.max(0, total - missing);
        const percent = total > 0 ? Math.min(100, Math.round((owned / total) * 100)) : 0;
        return { ...row, owned, total, percent };
      }).sort((a: any, b: any) => (b.percent - a.percent) || a.setName.localeCompare(b.setName));
    } finally {
      summariesLoading = false;
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

        // Build summaries
        await refreshSummaries();
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
        <UserSearchInput
          bind:value={userA}
          label="First User (Username or ID)"
          placeholder="Enter username..."
          on:change={() => {}}
        />

        <!-- User B Input -->
        <UserSearchInput
          bind:value={userB}
          label="Second User (Username or ID)"
          placeholder="Enter username..."
          on:change={() => {}}
        />
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

        <!-- Set Completion Summaries -->
        <div class="bg-white rounded-lg shadow-md p-8">
          <h2 class="text-xl font-bold mb-6">🗂️ Set Completion</h2>
          {#if summariesLoading}
            <div class="flex items-center text-gray-600">
              <div class="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
              Loading set summaries...
            </div>
          {:else if userSummaryA.length > 0 || userSummaryB.length > 0}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SetSummaryTable
                title={`${tradeResults.userA.username} — Sets Completed`}
                rows={userSummaryA}
                columns={[
                  { key: 'setName', header: 'Set' },
                  { key: 'owned', header: 'Owned', align: 'right' },
                  { key: 'total', header: 'Total', align: 'right' },
                  { key: 'percent', header: '%', align: 'right', formatter: (row) => `${row.percent}%` },
                ]}
              />
              <SetSummaryTable
                title={`${tradeResults.userB.username} — Sets Completed`}
                rows={userSummaryB}
                columns={[
                  { key: 'setName', header: 'Set' },
                  { key: 'owned', header: 'Owned', align: 'right' },
                  { key: 'total', header: 'Total', align: 'right' },
                  { key: 'percent', header: '%', align: 'right', formatter: (row) => `${row.percent}%` },
                ]}
              />
            </div>
          {:else}
            <div class="text-gray-600">No set summary data</div>
          {/if}
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
            {#if filteredTrades.length > 0}
              {@const giveTrades = filteredTrades.filter(trade => trade.tradeType === 'give' || trade.tradeType === 'perfect')}
              {#if giveTrades.length > 0}
                <TradeTable
                  title="➡️ {tradeResults.userA.username} Can Give"
                  trades={giveTrades}
                  userCountField="userACount"
                  titleColor="text-orange-600"
                />
              {/if}

              {@const receiveTrades = filteredTrades.filter(trade => trade.tradeType === 'receive' || trade.tradeType === 'perfect')}
              {#if receiveTrades.length > 0}
                <TradeTable
                  title="⬅️ {tradeResults.userA.username} Can Receive"
                  trades={receiveTrades}
                  userCountField="userBCount"
                  titleColor="text-blue-600"
                />
              {/if}

              <!-- No Trades Message -->
              {#if giveTrades.length === 0 && receiveTrades.length === 0}
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