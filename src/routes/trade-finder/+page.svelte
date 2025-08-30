<script lang="ts">
  import TradeTable from '$lib/components/TradeTable.svelte';
  import ExtractUserInput from '$lib/components/ExtractUserInput.svelte';
  import SetSummaryTable from '$lib/components/trade/SetSummaryTable.svelte';
  import TradeFilters from '$lib/components/TradeFilters.svelte';
  import FilteredTradeSummary from '$lib/components/FilteredTradeSummary.svelte';
  import TradeSummaryCards from '$lib/components/TradeSummaryCards.svelte';
  import TradeValueAnalysis from '$lib/components/TradeValueAnalysis.svelte';
  import TradeQuickActions from '$lib/components/TradeQuickActions.svelte';
  import { batchFetchSetTotals, calculateCompletionPercentage } from '$lib/utils/setCompletion';
  import { buildUserSetSummaryFromCounts } from '$lib/utils/trade/summaries';
  import { openCardModal } from '$lib/stores/modalStore';
  
  let userA = '';
  let userB = '';
  let tradeResults: any = null;
  let loading = false;
  let error = '';

  // Filtering and pagination
  let selectedSet = 'all';
  let selectedRarity = 'all';
  let selectedTradeType = 'all';
  let showDuplicatesOnly = false;
  let currentPage = 1;
  let itemsPerPage = 50;
  let filteredTrades: any[] = [];
  let availableSets: any[] = [];
  let availableRarities: string[] = [];

  // Caches and derived data for summaries
  let setTotals: Record<string, number> = {};
  let setNameById: Record<string, string> = {};
  let userSummaryA: any[] = [];
  let userSummaryB: any[] = [];
  let summariesLoading = false;
  
  // Card selection state
  let enableCardSelection = false;
  let selectedGiveCards: Set<string> = new Set();
  let selectedReceiveCards: Set<string> = new Set();
  
  // Computed sorted sets with completion rates
  $: sortedAvailableSets = [...availableSets].sort((a, b) => {
    // Get completion rates for User A (first user)
    const aCompletion = getSetCompletion(a.id, 'A');
    const bCompletion = getSetCompletion(b.id, 'A');
    
    // Sort by least completed to most completed
    return aCompletion - bCompletion;
  });
  
  function getSetCompletion(setId: string, user: 'A' | 'B'): number {
    if (!tradeResults) return 0;
    
    const owned = user === 'A' ? (tradeResults.ownedBySetA || {})[setId] : (tradeResults.ownedBySetB || {})[setId];
    const total = setTotals[setId];
    
    if (!owned || !total) return 0;
    return calculateCompletionPercentage(owned, total);
  }

  // Handle card clicks to show modal
  function handleCardClick(trade: any) {
    if (trade && trade.card && tradeResults) {
      // Determine which user's collection to use for duplicates
      // If both users have the card, prefer showing User A's collection
      let allCards = [];
      
      if (trade.userAHas && trade.userBHas) {
        // Both have it - show User A's duplicates by default
        allCards = tradeResults.userA?.allCards || [];
      } else if (trade.userAHas) {
        // Only User A has this card
        allCards = tradeResults.userA?.allCards || [];
      } else if (trade.userBHas) {
        // Only User B has this card
        allCards = tradeResults.userB?.allCards || [];
      }
      
      // Pass complete collection for duplicate detection
      console.log('Opening modal with cards:', {
        tradeCard: trade.card,
        allCardsLength: allCards.length,
        sampleCard: allCards[0]
      });
      openCardModal(trade.card, allCards);
    }
  }
  
  // Handle card selection changes
  function handleGiveCardSelection(event: CustomEvent<{ cardId: string; selected: boolean }>) {
    const { cardId, selected } = event.detail;
    if (selected) {
      selectedGiveCards.add(cardId);
    } else {
      selectedGiveCards.delete(cardId);
    }
    selectedGiveCards = selectedGiveCards; // Trigger reactivity
  }
  
  function handleReceiveCardSelection(event: CustomEvent<{ cardId: string; selected: boolean }>) {
    const { cardId, selected } = event.detail;
    if (selected) {
      selectedReceiveCards.add(cardId);
    } else {
      selectedReceiveCards.delete(cardId);
    }
    selectedReceiveCards = selectedReceiveCards; // Trigger reactivity
  }
  
  // Handle select all for give cards
  function handleGiveSelectAll(event: CustomEvent<boolean>) {
    const selectAll = event.detail;
    const giveTrades = filteredTrades.filter(trade => trade.tradeType === 'give' || trade.tradeType === 'perfect');
    
    if (selectAll) {
      giveTrades.forEach(trade => selectedGiveCards.add(trade.card.id));
    } else {
      giveTrades.forEach(trade => selectedGiveCards.delete(trade.card.id));
    }
    selectedGiveCards = selectedGiveCards; // Trigger reactivity
  }
  
  // Handle select all for receive cards
  function handleReceiveSelectAll(event: CustomEvent<boolean>) {
    const selectAll = event.detail;
    const receiveTrades = filteredTrades.filter(trade => trade.tradeType === 'receive' || trade.tradeType === 'perfect');
    
    if (selectAll) {
      receiveTrades.forEach(trade => selectedReceiveCards.add(trade.card.id));
    } else {
      receiveTrades.forEach(trade => selectedReceiveCards.delete(trade.card.id));
    }
    selectedReceiveCards = selectedReceiveCards; // Trigger reactivity
  }
  
  // Toggle card selection mode
  function toggleCardSelection() {
    enableCardSelection = !enableCardSelection;
    if (!enableCardSelection) {
      // Clear selections when disabling
      selectedGiveCards.clear();
      selectedReceiveCards.clear();
      selectedGiveCards = selectedGiveCards;
      selectedReceiveCards = selectedReceiveCards;
    } else {
      // Select all cards by default when enabling
      const allGiveTrades = filteredTrades.filter(trade => trade.tradeType === 'give' || trade.tradeType === 'perfect');
      const allReceiveTrades = filteredTrades.filter(trade => trade.tradeType === 'receive' || trade.tradeType === 'perfect');
      
      allGiveTrades.forEach(trade => selectedGiveCards.add(trade.card.id));
      allReceiveTrades.forEach(trade => selectedReceiveCards.add(trade.card.id));
      selectedGiveCards = selectedGiveCards;
      selectedReceiveCards = selectedReceiveCards;
    }
  }

  // Calculate filtered trade summary
  $: filteredTradeSummary = {
    giveTrades: filteredTrades.filter(trade => {
      const isGiveOrPerfect = trade.tradeType === 'give' || trade.tradeType === 'perfect';
      if (!isGiveOrPerfect) return false;
      
      // Apply duplicates filter to give trades in summary
      if (showDuplicatesOnly) {
        return trade.userACount > 1;
      }
      
      return true;
    }),
    receiveTrades: filteredTrades.filter(trade => {
      const isReceiveOrPerfect = trade.tradeType === 'receive' || trade.tradeType === 'perfect';
      if (!isReceiveOrPerfect) return false;
      
      if (showDuplicatesOnly) {
        return trade.userBCount > 1;
      }
      
      return true;
    }),
    get giveValue() {
      return this.giveTrades.reduce((sum, trade) => sum + (trade.estimatedValue || 0), 0);
    },
    get receiveValue() {
      return this.receiveTrades.reduce((sum, trade) => sum + (trade.estimatedValue || 0), 0);
    },
    get giveCardsList() {
      return this.giveTrades.map(trade => `${trade.card.name} (#${trade.card.card_number}) [${getFoilTypeWithIcon(trade.card)}] - $${(trade.estimatedValue || 0).toFixed(2)}`);
    },
    get receiveCardsList() {
      return this.receiveTrades.map(trade => `${trade.card.name} (#${trade.card.card_number}) [${getFoilTypeWithIcon(trade.card)}] - $${(trade.estimatedValue || 0).toFixed(2)}`);
    }
  };

  // Copy trade summary to clipboard
  function copyTradeSummary() {
    // Use selected cards when selection is enabled, otherwise use all cards
    let giveTradesToCopy = filteredTradeSummary.giveTrades;
    let receiveTradesToCopy = filteredTradeSummary.receiveTrades;
    
    if (enableCardSelection) {
      // Filter to only include selected cards
      giveTradesToCopy = filteredTradeSummary.giveTrades.filter(trade => selectedGiveCards.has(trade.card.id));
      receiveTradesToCopy = filteredTradeSummary.receiveTrades.filter(trade => selectedReceiveCards.has(trade.card.id));
    }
    
    // Calculate values for selected/filtered trades
    const giveValue = giveTradesToCopy.reduce((sum, trade) => sum + (trade.estimatedValue || 0), 0);
    const receiveValue = receiveTradesToCopy.reduce((sum, trade) => sum + (trade.estimatedValue || 0), 0);
    
    // Create card lists for selected/filtered trades
    const giveCardsList = giveTradesToCopy.map(trade => 
      `${trade.card.name} (#${trade.card.card_number}) [${getFoilTypeWithIcon(trade.card)}] - $${(trade.estimatedValue || 0).toFixed(2)}`
    );
    const receiveCardsList = receiveTradesToCopy.map(trade => 
      `${trade.card.name} (#${trade.card.card_number}) [${getFoilTypeWithIcon(trade.card)}] - $${(trade.estimatedValue || 0).toFixed(2)}`
    );
    
    const summary = `
TRADE SUMMARY ${showDuplicatesOnly ? '(Duplicates Only)' : ''}${enableCardSelection ? ' (Selected Cards Only)' : ''}
Set: ${selectedSet === 'all' ? 'All Sets' : sortedAvailableSets.find(s => s.id === selectedSet)?.name || selectedSet}
${selectedRarity !== 'all' ? `Rarity: ${selectedRarity}` : ''}

${tradeResults.userA.username} CAN GIVE (${giveTradesToCopy.length} cards - $${giveValue.toFixed(2)}):
${giveCardsList.join('\n')}

${tradeResults.userA.username} CAN RECEIVE (${receiveTradesToCopy.length} cards - $${receiveValue.toFixed(2)}):
${receiveCardsList.join('\n')}

TRADE BALANCE: ${receiveValue > giveValue ? '+' : ''}$${(receiveValue - giveValue).toFixed(2)} (${tradeResults.userA.username} perspective)
    `.trim();

    navigator.clipboard.writeText(summary).then(() => {
      // Could add toast notification here
      console.log('Trade summary copied to clipboard');
      alert('Trade summary copied to clipboard!');
    });
  }

  function getSetName(id: string): string {
    // Special-case mapping consistent with extract page
    if (id === 'sv3pt5') return 'Scarlet & Violet 151';
    return setNameById[id] || id || 'Unknown Set';
  }

  // Helper function to get foil type with icon for trade summary
  function getFoilTypeWithIcon(card: any): string {
    if (card?.is_reverse) {
      return '🔄 Reverse Holo';
    } else if (card?.is_holo) {
      return '✨ Holo';
    } else {
      return '⚪ Normal';
    }
  }

  // getSetTotal removed - now using shared utility from setCompletion.ts

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
      
      // Fetch any missing set totals
      const missingSetIds = ids.filter(id => !setTotals[id]);
      if (missingSetIds.length > 0) {
        const newTotals = await batchFetchSetTotals(missingSetIds);
        Object.entries(newTotals).forEach(([setId, total]) => {
          setTotals[setId] = total;
        });
      }

      // Build from owned counts but enforce Owned = Total - Missing (unique)
      userSummaryA = buildUserSetSummaryFromCounts(ownedA, {
        getSetName,
        getSetTotal: (id: string) => setTotals[id] || 0,
      }).map((row: any) => {
        const total = setTotals[row.setId] ?? row.total ?? 0;
        const missing = Number(missingA[row.setId] || 0);
        const owned = Math.max(0, total - missing);
        const percent = calculateCompletionPercentage(owned, total);
        return { ...row, owned, total, percent };
      }).sort((a: any, b: any) => (b.percent - a.percent) || a.setName.localeCompare(b.setName));

      userSummaryB = buildUserSetSummaryFromCounts(ownedB, {
        getSetName,
        getSetTotal: (id: string) => setTotals[id] || 0,
      }).map((row: any) => {
        const total = setTotals[row.setId] ?? row.total ?? 0;
        const missing = Number(missingB[row.setId] || 0);
        const owned = Math.max(0, total - missing);
        const percent = calculateCompletionPercentage(owned, total);
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
        console.log('Trade results received:', {
          userA_allCards: data.userA?.allCards?.length || 0,
          userB_allCards: data.userB?.allCards?.length || 0,
          userA_sample: data.userA?.allCards?.[0],
          userB_sample: data.userB?.allCards?.[0]
        });
        availableSets = data.availableSets || [];
        
        // Show cache status if data was cached
        if (data.cached) {
          console.log('📦 Trade data loaded from cache');
        } else {
          console.log('🌐 Trade data fetched fresh from rip.fun');
        }
        
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
        
        // Fetch set totals for all available sets
        const setIds = availableSets.map(set => set.id);
        const fetchedTotals = await batchFetchSetTotals(setIds);
        
        // Populate setTotals with fetched data
        Object.entries(fetchedTotals).forEach(([setId, total]) => {
          setTotals[setId] = total;
        });
        
        console.log('Set totals loaded:', setTotals);
        
        // Set default selection: prefer "151" (sv3pt5) if available, otherwise first set
        const preferredSet = availableSets.find(set => set.id === 'sv3pt5' || set.name?.includes('151'));
        if (preferredSet) {
          selectedSet = preferredSet.id;
        } else if (availableSets.length > 0) {
          // Will use sortedAvailableSets[0] after reactive statement updates
          selectedSet = availableSets[0].id;
        }
        
        console.log('Trade comparison results:', data);
        console.log('Available rarities:', availableRarities);
        console.log('Default selected set:', selectedSet);
        
        // Wait for reactive statement to update sortedAvailableSets, then set proper default
        await new Promise(resolve => setTimeout(resolve, 0));
        if (!preferredSet && availableSets.length > 0) {
          selectedSet = sortedAvailableSets[0]?.id || availableSets[0].id;
        }
        
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
        // totalPages removed - not used after componentization
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
        <ExtractUserInput
          bind:selectedUserId={userA}
          label="First User (Name or ID)"
          placeholder="Enter user..."
          showSyncFeatures={false}
          on:change={() => {}}
        />

        <!-- User B Input -->
        <ExtractUserInput
          bind:selectedUserId={userB}
          label="Second User (Name or ID)"
          placeholder="Enter user..."
          showSyncFeatures={false}
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
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">👥 User Comparison</h2>
            {#if tradeResults.cached}
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                📦 Cached data
              </span>
            {:else}
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                🌐 Fresh data
              </span>
            {/if}
          </div>
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
        <TradeSummaryCards tradeSummary={tradeResults.tradeAnalysis.summary} />

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
          <TradeFilters
            bind:selectedSet
            bind:selectedRarity
            bind:selectedTradeType
            bind:showDuplicatesOnly
            {sortedAvailableSets}
            {availableRarities}
            {getSetCompletion}
            on:setChange={handleSetChange}
            on:rarityChange={handleRarityChange}
            on:tradeTypeChange={handleTradeTypeChange}
            on:duplicatesToggle={handleSetChange}
            on:clearFilters={handleSetChange}
          />

          <!-- Card Selection Toggle -->
          <div class="bg-white rounded-lg shadow-md p-6 mb-8">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">🎯 Customize Trade Analysis</h3>
                <p class="text-sm text-gray-600 mt-1">Select specific cards to include in trade calculations</p>
              </div>
              <button
                type="button"
                on:click={toggleCardSelection}
                class="px-4 py-2 rounded-lg font-medium transition-colors {enableCardSelection 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
              >
                {enableCardSelection ? '✓ Selection Enabled' : '📝 Enable Selection'}
              </button>
            </div>
            
            {#if enableCardSelection}
              <div class="mt-4 p-3 bg-indigo-50 rounded-lg">
                <p class="text-sm text-indigo-800">
                  <span class="font-medium">Selection Mode Active:</span> 
                  Use checkboxes to select which cards to include in trades. 
                  Deselected cards (grayed out) won't be included in trade calculations.
                </p>
              </div>
            {/if}
          </div>

          <!-- Filtered Trade Summary -->
          <FilteredTradeSummary
            {filteredTradeSummary}
            {showDuplicatesOnly}
            enableSelection={enableCardSelection}
            selectedGiveCards={selectedGiveCards}
            selectedReceiveCards={selectedReceiveCards}
            on:copySummary={copyTradeSummary}
          />

          <!-- Two Tables Side by Side -->
          <div class="grid grid-cols-1 xl:grid-cols-2 gap-12">
            {#if filteredTrades.length > 0}
              <!-- Note: tradeType 'give' means userA can give to userB, 'receive' means userA can receive from userB -->
              <!-- This is consistent regardless of which user is entered first in the form -->
              {@const giveTrades = filteredTrades.filter(trade => {
                const isGiveOrPerfect = trade.tradeType === 'give' || trade.tradeType === 'perfect';
                if (!isGiveOrPerfect) return false;
                
                // Apply duplicates filter to give trades
                if (showDuplicatesOnly) {
                  // Show only cards where User A has duplicates to give (userACount > 1)
                  // This means User A can give without lowering their completion rate
                  return trade.userACount > 1;
                }
                
                return true;
              }).sort((a, b) => {
                // Sort by card number numerically
                const numA = parseInt(a.card.card_number || '0', 10);
                const numB = parseInt(b.card.card_number || '0', 10);
                return numA - numB;
              })}
              {#if giveTrades.length > 0}
                <TradeTable
                  title="➡️ {tradeResults.userA.username} Can Give {showDuplicatesOnly ? '(Duplicates Only)' : ''}"
                  trades={giveTrades}
                  userCountField="userACount"
                  titleColor="text-orange-600"
                  enableSelection={enableCardSelection}
                  selectedCards={selectedGiveCards}
                  on:cardClick={(e) => handleCardClick(e.detail)}
                  on:selectionChange={handleGiveCardSelection}
                  on:selectAll={handleGiveSelectAll}
                />
              {/if}

              {@const receiveTrades = filteredTrades.filter(trade => {
                const isReceiveOrPerfect = trade.tradeType === 'receive' || trade.tradeType === 'perfect';
                if (!isReceiveOrPerfect) return false;
                
                // Apply duplicates filter only to receive trades
                if (showDuplicatesOnly) {
                  // Show only cards where User B has duplicates to give (userBCount > 1)
                  // This means User B can give without lowering their completion rate
                  return trade.userBCount > 1;
                }
                
                return true;
              }).sort((a, b) => {
                // Sort by card number numerically
                const numA = parseInt(a.card.card_number || '0', 10);
                const numB = parseInt(b.card.card_number || '0', 10);
                return numA - numB;
              })}
              {#if receiveTrades.length > 0}
                <TradeTable
                  title="⬅️ {tradeResults.userA.username} Can Receive {showDuplicatesOnly ? '(Duplicates Only)' : ''}"
                  trades={receiveTrades}
                  userCountField="userBCount"
                  titleColor="text-blue-600"
                  enableSelection={enableCardSelection}
                  selectedCards={selectedReceiveCards}
                  on:cardClick={(e) => handleCardClick(e.detail)}
                  on:selectionChange={handleReceiveCardSelection}
                  on:selectAll={handleReceiveSelectAll}
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
        <TradeValueAnalysis
          tradeAnalysis={tradeResults.tradeAnalysis}
          userA={tradeResults.userA}
          userB={tradeResults.userB}
          {formatCurrency}
        />

        <!-- Quick Action Buttons -->
        <TradeQuickActions
          userA={tradeResults.userA}
          userB={tradeResults.userB}
          tradeAnalysis={tradeResults.tradeAnalysis}
        />

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