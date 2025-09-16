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
        set: filters.selectedSet
      });
      
      let trades = data.trades || [];
      
      // Apply client-side filtering
      if (filters.selectedRarity !== 'all') {
        trades = trades.filter((trade: any) => trade.card.rarity === filters.selectedRarity);
      }
      
      if (filters.selectedTradeType !== 'all') {
        trades = trades.filter((trade: any) => trade.tradeType === filters.selectedTradeType);
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
      <TradeSummaryCards {tradeResults} />
      
      <!-- Value Analysis -->
      <TradeValueAnalysis {tradeResults} {filteredTrades} />
      
      <!-- Filters -->
      <TradeFilters
        {availableSets}
        {availableRarities}
        bind:selectedSet={filters.selectedSet}
        bind:selectedRarity={filters.selectedRarity}
        bind:selectedTradeType={filters.selectedTradeType}
        bind:showDuplicatesOnly={filters.showDuplicatesOnly}
        on:setChange={handleSetChange}
        on:rarityChange={handleRarityChange}
        on:tradeTypeChange={handleTradeTypeChange}
      />
      
      <!-- Trade Table -->
      <TradeTable
        trades={filteredTrades}
        {enableCardSelection}
        {selectedGiveCards}
        {selectedReceiveCards}
        on:cardClick={handleCardClick}
      />
      
      <!-- Set Summary -->
      {#if tradeResults.ownedBySetA && tradeResults.ownedBySetB}
        <SetSummaryTable
          userA={tradeResults.userA}
          userB={tradeResults.userB}
          ownedBySetA={tradeResults.ownedBySetA}
          ownedBySetB={tradeResults.ownedBySetB}
          missingBySetA={tradeResults.missingBySetA}
          missingBySetB={tradeResults.missingBySetB}
          {setTotals}
        />
      {/if}
    </div>
  {/if}
</div>
