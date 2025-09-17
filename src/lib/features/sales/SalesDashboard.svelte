<script lang="ts">
  import { onMount } from 'svelte';
  import SalesActivity from '$lib/components/SalesActivity.svelte';
  import SalesFilters from '$lib/components/SalesFilters.svelte';
  import SalesStats from '$lib/components/SalesStats.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import ErrorMessage from '$lib/components/ui/ErrorMessage.svelte';
  import { salesService } from '$lib/services/SalesService';
  import { formatAddress, formatTimestamp, getRarityColor } from '$lib/utils/format';
  import { EXTERNAL_URLS } from '$lib/constants/urls';
  import { logger } from '$lib/utils/logger';
  import { DEFAULT_FILTERS, SALES_LIMITS } from '$lib/constants/sales';
  import type { SalesFilters as ISalesFilters, SalesEvent, SalesMonitorStatus } from '$lib/types/sales';
  import { openCardModal } from '$lib/stores/modalStore';
  
  // State
  let filters: ISalesFilters = { ...DEFAULT_FILTERS };
  
  let historicalSales: SalesEvent[] = [];
  let loading = false;
  let error: string | Error | null = null;
  let totalSales = 0;
  let currentPage = 1;
  let totalPages = 0;
  let monitorStatus: SalesMonitorStatus = { connected: false, subscribers: 0 };
  let activeTab: 'live' | 'historical' | 'stats' = 'live';
  
  onMount(() => {
    loadHistoricalSales();
    checkMonitorStatus();
  });
  
  async function checkMonitorStatus() {
    try {
      monitorStatus = await salesService.checkMonitorStatus();
    } catch (err) {
      logger.error('Failed to check monitor status:', err);
    }
  }
  
  async function loadHistoricalSales() {
    loading = true;
    error = null;
    
    try {
      const data = await salesService.loadHistoricalSales({
        filters,
        page: currentPage,
        limit: SALES_LIMITS.DEFAULT_PAGE_SIZE
      });
      
      historicalSales = data.sales;
      totalSales = data.totalSales;
      currentPage = data.currentPage;
      totalPages = data.totalPages;
    } catch (err) {
      error = err instanceof Error ? err : new Error('Failed to load sales');
      logger.error('Failed to load sales:', err);
    } finally {
      loading = false;
    }
  }
  
  function handleFilterChange(event: CustomEvent<ISalesFilters>) {
    filters = event.detail;
    currentPage = 1;
    if (activeTab === 'historical') {
      loadHistoricalSales();
    }
  }
  
  function handlePageChange(page: number) {
    currentPage = page;
    loadHistoricalSales();
  }
  
  
  function handleNewSale(event: CustomEvent<SalesEvent>) {
    if (activeTab === 'historical' && filters.timeframe !== 'all') {
      loadHistoricalSales();
    }
  }
  
  function handleConnected() {
    checkMonitorStatus();
  }
  
  function setActiveTab(tab: 'live' | 'historical' | 'stats') {
    activeTab = tab;
    if (tab === 'historical') {
      loadHistoricalSales();
    }
  }
  
  /**
   * Handle card click to show modal
   */
  function handleCardClick(sale: SalesEvent) {
    if (sale && sale.card) {
      // For sales, we don't have access to full user collections
      // so we'll just show the single card
      openCardModal(sale.card, []);
    }
  }
</script>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold mb-6">📊 Sales Dashboard</h1>
  
  <!-- Tab Navigation -->
  <div class="border-b border-gray-200 mb-6">
    <nav class="-mb-px flex space-x-8" aria-label="Tabs">
      <button
        on:click={() => setActiveTab('live')}
        class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'live' 
          ? 'border-indigo-500 text-indigo-600' 
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
      >
        🔴 Live Activity
      </button>
      <button
        on:click={() => setActiveTab('historical')}
        class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'historical' 
          ? 'border-indigo-500 text-indigo-600' 
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
      >
        📜 Historical Sales
      </button>
      <button
        on:click={() => setActiveTab('stats')}
        class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'stats' 
          ? 'border-indigo-500 text-indigo-600' 
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
      >
        📈 Statistics
      </button>
    </nav>
  </div>
  
  <!-- Connection Status -->
  {#if !monitorStatus.connected}
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div class="flex items-center">
        <svg class="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-11a1 1 0 112 0v4a1 1 0 01-2 0V7zm0 8a1 1 0 112 0 1 1 0 01-2 0z" clip-rule="evenodd" />
        </svg>
        <p class="text-sm text-yellow-800">
          Sales monitor is not connected. Real-time updates may be unavailable.
        </p>
      </div>
    </div>
  {/if}
  
  <!-- Filters -->
  <div class="mb-6">
    <SalesFilters 
      {filters}
      on:filterChange={handleFilterChange}
    />
  </div>
  
  <!-- Content based on active tab -->
  {#if activeTab === 'live'}
    <SalesActivity 
      on:newSale={handleNewSale}
      on:connected={handleConnected}
    />
  {:else if activeTab === 'historical'}
    {#if loading}
      <LoadingSpinner size="lg" message="Loading historical sales..." />
    {:else if error}
      <ErrorMessage {error} />
    {:else if historicalSales.length === 0}
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No sales found</h3>
        <p class="mt-1 text-sm text-gray-500">Try adjusting your filters</p>
      </div>
    {:else}
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Card</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TX</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each historicalSales as sale}
              <tr 
                class="hover:bg-gray-50 cursor-pointer transition-colors"
                on:click={() => handleCardClick(sale)}
                role="button"
                tabindex="0"
                on:keydown={(e) => e.key === 'Enter' && handleCardClick(sale)}
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    {#if sale.card?.image}
                      <img 
                        src={sale.card.image} 
                        alt={sale.card.name} 
                        class="h-10 w-10 rounded-lg mr-3 hover:shadow-md transition-shadow" 
                      />
                    {/if}
                    <div>
                      <div class="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                        {sale.card?.name || 'Unknown Card'}
                      </div>
                      <div class="text-sm {getRarityColor(sale.card?.rarity)}">
                        {sale.card?.rarity || ''}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {sale.card?.set?.name || 'Unknown Set'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {sale.buyer.username || formatAddress(sale.buyer.address)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {sale.seller.username || formatAddress(sale.seller.address)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {sale.price.formatted || sale.price.wei + ' wei'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatTimestamp(sale.timestamp)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" on:click|stopPropagation>
                  <a 
                    href={EXTERNAL_URLS.BASESCAN.TX(sale.transactionHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-indigo-600 hover:text-indigo-900"
                  >
                    View
                  </a>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        
        <!-- Pagination -->
        {#if totalPages > 1}
          <div class="bg-gray-50 px-6 py-3 flex items-center justify-between">
            <div class="text-sm text-gray-700">
              Showing <span class="font-medium">{(currentPage - 1) * SALES_LIMITS.DEFAULT_PAGE_SIZE + 1}</span> to 
              <span class="font-medium">{Math.min(currentPage * SALES_LIMITS.DEFAULT_PAGE_SIZE, totalSales)}</span> of 
              <span class="font-medium">{totalSales}</span> sales
            </div>
            <div class="flex space-x-2">
              <button
                on:click={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                on:click={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  {:else if activeTab === 'stats'}
    <SalesStats timeframe={filters.timeframe} />
  {/if}
</div>
