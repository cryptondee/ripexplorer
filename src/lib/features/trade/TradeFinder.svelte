<script lang="ts">
  import { onMount } from 'svelte';
  import { tradeService } from '$lib/services/TradeService';
  import { useFilters } from '$lib/composables/useFilters';
  import { useClipboard } from '$lib/composables/useClipboard';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import ErrorMessage from '$lib/components/ui/ErrorMessage.svelte';
  import ExtractUserInput from '$lib/components/ExtractUserInput.svelte';
  import TradeTable from '$lib/components/TradeTable.svelte';
  import TradeFilters from '$lib/components/TradeFilters.svelte';
  import TradeQuickActions from '$lib/components/TradeQuickActions.svelte';
  import TradeValueAnalysis from '$lib/components/TradeValueAnalysis.svelte';
  import TradeSummaryCards from '$lib/components/TradeSummaryCards.svelte';
  import SetSummaryTable from '$lib/components/trade/SetSummaryTable.svelte';
  import { openCardModal } from '$lib/stores/modalStore';
  
  // Props
  export let userA: string = '';
  export let userB: string = '';
  
  // State
  let tradeResults: any = null;
  let loading = false;
  let error: string | Error | null = null;
  let filteredTrades: any[] = [];
  let availableSets: any[] = [];
  let availableRarities: string[] = [];
  let setTotals: Record<string, number> = {};
  
  // Card selection state
  let enableCardSelection = false;
  let selectedGiveCards: Set<string> = new Set();
  let selectedReceiveCards: Set<string> = new Set();
  
  // Initialize composables
  const { copy } = useClipboard();
  const {
    filters,
    handleSetChange,
    handleRarityChange,
    handleTradeTypeChange,
    handlePageChange
  } = useFilters(
    { 
      currentPage: 1,
      itemsPerPage: 50 
    },
    { 
      onFilterChange: loadFilteredTrades 
    }
  );
  
  // Load initial data
  onMount(() => {
    if (userA && userB) {
      compareUsers();
    }
  });
  
  /**
   * Compare users using the TradeService
   */
  async function compareUsers() {
    if (!userA || !userB) {
      error = 'Please enter both usernames';
      return;
    }
    
    loading = true;
    error = null;
    
    try {
      const data = await tradeService.compareUsers({ userA, userB });
      
      tradeResults = data;
      availableSets = data.availableSets || [];
      
      // Extract available rarities
      const allCards = [...(data.userA?.allCards || []), ...(data.userB?.allCards || [])];
      const rarities = new Set(allCards.map(card => card.card?.rarity).filter(Boolean));
      availableRarities = Array.from(rarities).sort();
      
      // Load initial filtered trades
      await loadFilteredTrades();
      
      // Fetch set totals for completion calculations
      const setIds = availableSets.map(s => s.id);
      setTotals = await tradeService.fetchSetTotals(setIds);
      
    } catch (err) {
      error = err instanceof Error ? err : new Error('Failed to compare users');
    } finally {
      loading = false;
    }
  }
  
  /**
   * Load filtered trades based on current filter state
   */
  async function loadFilteredTrades() {
    if (!userA || !userB) return;
    
    try {
      const data = await tradeService.loadFilteredTrades({
        userA,
        userB,
        page: filters.currentPage,
        limit: filters.itemsPerPage,
        set: filters.selectedSet === 'all' ? undefined : filters.selectedSet
      });
      
      let trades = data.trades || [];
      
      // Apply client-side filtering
      if (filters.selectedRarity !== 'all') {
        trades = trades.filter((trade: any) => trade.card.rarity === filters.selectedRarity);
      }
      
      if (filters.selectedTradeType !== 'all') {
        trades = trades.filter((trade: any) => trade.tradeType === filters.selectedTradeType);
      }
      
      // Filter for duplicates only if enabled
      if (filters.showDuplicatesOnly) {
        trades = trades.filter((trade: any) => {
          const count = trade.tradeType === 'give' ? trade.userACount : trade.userBCount;
          return count > 1;
        });
      }
      
      filteredTrades = trades;
    } catch (err) {
      console.error('Failed to load filtered trades:', err);
    }
  }
  
  /**
   * Handle copying trade summary to clipboard
   */
  async function copyTradeSummary() {
    if (!tradeResults) return;
    
    const summary = tradeService.generateTradeSummary({
      userA: tradeResults.userA,
      userB: tradeResults.userB,
      giveTrades: filteredTrades.filter(t => t.tradeType === 'give'),
      receiveTrades: filteredTrades.filter(t => t.tradeType === 'receive'),
      filters: {
        setName: filters.selectedSet === 'all' ? 'All Sets' : 
                 availableSets.find(s => s.id === filters.selectedSet)?.name,
        rarity: filters.selectedRarity !== 'all' ? filters.selectedRarity : undefined,
        duplicatesOnly: filters.showDuplicatesOnly,
        selectedCards: enableCardSelection
      }
    });
    
    await copy(summary, { successMessage: 'Trade summary copied to clipboard!' });
  }
  
  /**
   * Handle card click to show modal
   */
  function handleCardClick(trade: any) {
    if (trade?.card && tradeResults) {
      const allCards = trade.userAHas 
        ? tradeResults.userA?.allCards || []
        : tradeResults.userB?.allCards || [];
      
      openCardModal(trade.card, allCards);
    }
  }
</script>

<div class="container mx-auto px-4 py-8">
  <!-- User Input Section -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold mb-6">Trade Finder</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <ExtractUserInput 
        label="User A"
        bind:selectedUserId={userA}
        placeholder="Enter username or ID"
        disabled={loading}
        showSyncFeatures={false}
        on:change={(e) => userA = e.detail}
      />
      <ExtractUserInput 
        label="User B"
        bind:selectedUserId={userB}
        placeholder="Enter username or ID"
        disabled={loading}
        showSyncFeatures={false}
        on:change={(e) => userB = e.detail}
      />
    </div>
    
    <button
      on:click={compareUsers}
      disabled={loading || !userA || !userB}
      class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
    >
      {loading ? 'Comparing...' : 'Compare Users'}
    </button>
  </div>
  
  <!-- Error Display -->
  {#if error}
    <ErrorMessage {error} />
  {/if}
  
  <!-- Loading State -->
  {#if loading}
    <LoadingSpinner size="lg" message="Analyzing trade opportunities..." />
  {/if}
  
  <!-- Results Section -->
  {#if tradeResults && !loading}
    <div class="space-y-6">
      <!-- Quick Actions -->
      <TradeQuickActions
        userA={tradeResults.userA}
        userB={tradeResults.userB}
        tradeAnalysis={tradeResults.tradeAnalysis}
        on:copyGeneralSummary={copyTradeSummary}
      />
      
      <!-- Summary Cards -->
      <TradeSummaryCards tradeSummary={tradeResults.tradeAnalysis?.summary} />
      
      <!-- Value Analysis -->
      <TradeValueAnalysis 
        tradeAnalysis={tradeResults.tradeAnalysis}
        userA={tradeResults.userA}
        userB={tradeResults.userB}
      />
      
      <!-- Filters -->
      <TradeFilters
        sortedAvailableSets={availableSets}
        {availableRarities}
        bind:selectedSet={filters.selectedSet}
        bind:selectedRarity={filters.selectedRarity}
        bind:selectedTradeType={filters.selectedTradeType}
        bind:showDuplicatesOnly={filters.showDuplicatesOnly}
        userA={tradeResults.userA}
        userB={tradeResults.userB}
        getSetCompletion={(setId, user) => {
          const owned = user === 'A' ? tradeResults.ownedBySetA : tradeResults.ownedBySetB;
          const total = setTotals[setId] || 0;
          return total > 0 ? Math.round((owned[setId] || 0) / total * 100) : 0;
        }}
        on:setChange={(e) => handleSetChange(e.detail)}
        on:rarityChange={(e) => handleRarityChange(e.detail)}
        on:tradeTypeChange={(e) => handleTradeTypeChange(e.detail)}
      />
      
      <!-- Trade Tables -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- Cards User A Can Receive from User B -->
        <TradeTable
          title="🔄 Cards {tradeResults.userA?.username || 'User A'} Can Receive from {tradeResults.userB?.username || 'User B'}"
          trades={filteredTrades.filter(trade => trade.tradeType === 'receive')}
          userCountField="userBCount"
          titleColor="text-blue-600"
          enableSelection={enableCardSelection}
          selectedCards={selectedReceiveCards}
          on:cardClick={handleCardClick}
        />
        
        <!-- Cards User A Can Give to User B -->
        <TradeTable
          title="🎁 Cards {tradeResults.userA?.username || 'User A'} Can Give to {tradeResults.userB?.username || 'User B'}"
          trades={filteredTrades.filter(trade => trade.tradeType === 'give')}
          userCountField="userACount"
          titleColor="text-green-600"
          enableSelection={enableCardSelection}
          selectedCards={selectedGiveCards}
          on:cardClick={handleCardClick}
        />
      </div>
      
      <!-- Set Summary -->
      {#if tradeResults.ownedBySetA && tradeResults.ownedBySetB}
        <SetSummaryTable
          title="📊 Collection Summary by Set"
          rows={availableSets.map(set => ({
            setName: set.name,
            userAOwned: tradeResults.ownedBySetA[set.id] || 0,
            userBOwned: tradeResults.ownedBySetB[set.id] || 0,
            userAMissing: tradeResults.missingBySetA[set.id] || 0,
            userBMissing: tradeResults.missingBySetB[set.id] || 0,
            total: setTotals[set.id] || 0,
            userACompletion: setTotals[set.id] ? Math.round(((tradeResults.ownedBySetA[set.id] || 0) / setTotals[set.id]) * 100) : 0,
            userBCompletion: setTotals[set.id] ? Math.round(((tradeResults.ownedBySetB[set.id] || 0) / setTotals[set.id]) * 100) : 0
          }))}
          columns={[
            { key: 'setName', header: 'Set', align: 'left' },
            { key: 'userAOwned', header: `${tradeResults.userA?.username || 'User A'} Owned`, align: 'center' },
            { key: 'userACompletion', header: 'Completion %', align: 'center', formatter: (row) => `${row.userACompletion}%` },
            { key: 'userBOwned', header: `${tradeResults.userB?.username || 'User B'} Owned`, align: 'center' },
            { key: 'userBCompletion', header: 'Completion %', align: 'center', formatter: (row) => `${row.userBCompletion}%` },
            { key: 'total', header: 'Total Cards', align: 'center' }
          ]}
        />
      {/if}
    </div>
  {/if}
</div>
