<script lang="ts">
  import { onMount } from 'svelte';
  import SalesActivity from '$lib/components/SalesActivity.svelte';
  import SalesFilters from '$lib/components/SalesFilters.svelte';
  import SalesStats from '$lib/components/SalesStats.svelte';
  import { formatAddress } from '$lib/utils/format.js';
  import { EXTERNAL_URLS } from '$lib/constants/urls.js';

  // Filter state
  let filters = {
    timeframe: '24h',
    cardSet: null,
    rarity: null,
    minPrice: null,
    maxPrice: null
  };

  // Historical sales data
  let historicalSales: any[] = [];
  let loading = false;
  let error: string | null = null;
  let totalSales = 0;
  let currentPage = 1;
  let totalPages = 0;

  // Connection status
  let monitorStatus = { connected: false, subscribers: 0 };

  // Active tab
  let activeTab: 'live' | 'historical' | 'stats' = 'live';

  onMount(() => {
    loadHistoricalSales();
    checkMonitorStatus();
  });

  async function checkMonitorStatus() {
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' })
      });
      
      const data = await response.json();
      if (data.success) {
        monitorStatus = data.status;
      }
    } catch (err) {
      console.error('Error checking monitor status:', err);
    }
  }

  async function loadHistoricalSales() {
    loading = true;
    error = null;
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        timeframe: filters.timeframe
      });
      
      if (filters.cardSet) params.set('set', filters.cardSet);
      if (filters.rarity) params.set('rarity', filters.rarity);
      if (filters.minPrice) params.set('minPrice', filters.minPrice);
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
      
      const response = await fetch(`/api/sales?${params}`);
      const data = await response.json();
      
      if (data.success) {
        historicalSales = data.sales;
        totalSales = data.pagination.total;
        totalPages = data.pagination.totalPages;
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  }

  function handleFilterChange(event: CustomEvent) {
    filters = event.detail;
    currentPage = 1; // Reset to first page when filters change
    if (activeTab === 'historical') {
      loadHistoricalSales();
    }
  }

  function handlePageChange(page: number) {
    currentPage = page;
    loadHistoricalSales();
  }


  function formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  function getRarityColor(rarity?: string): string {
    if (!rarity) return 'text-gray-500';
    
    switch (rarity.toLowerCase()) {
      case 'common': return 'text-gray-600';
      case 'uncommon': return 'text-green-600';
      case 'rare': return 'text-blue-600';
      case 'epic': return 'text-purple-600';
      case 'legendary': return 'text-orange-600';
      default: return 'text-gray-500';
    }
  }

  // Handle new live sales
  function handleNewSale(event: CustomEvent) {
    console.log('🎉 New sale detected on page:', event.detail);
    // If we're viewing recent data, refresh historical data to include the new sale
    if (activeTab === 'historical' && filters.timeframe !== 'all') {
      loadHistoricalSales();
    }
  }

  // Handle connection status changes
  function handleConnected() {
    checkMonitorStatus();
  }

  // Tab switching
  function setActiveTab(tab: 'live' | 'historical' | 'stats') {
    activeTab = tab;
    if (tab === 'historical') {
      loadHistoricalSales();
    }
  }
</script>

<svelte:head>
  <title>Sales Activity - rip.fun Data Extractor</title>
  <meta name="description" content="Real-time marketplace sales activity and analytics" />
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900">Sales Activity</h1>
    <p class="text-gray-600 mt-2">
      Real-time marketplace activity from the rip.fun marketplace
    </p>
    
    <!-- Monitor Status -->
    <div class="flex items-center space-x-2 mt-4">
      <div class="flex items-center space-x-1">
        <div class="w-2 h-2 rounded-full {monitorStatus.connected ? 'bg-green-500' : 'bg-red-500'}"></div>
        <span class="text-sm {monitorStatus.connected ? 'text-green-600' : 'text-red-600'}">
          {monitorStatus.connected ? 'Monitoring Active' : 'Monitoring Offline'}
        </span>
      </div>
      {#if monitorStatus.subscribers > 0}
        <span class="text-sm text-gray-500">
          • {monitorStatus.subscribers} connected
        </span>
      {/if}
    </div>
  </div>

  <!-- Tabs -->
  <div class="border-b border-gray-200 mb-6">
    <nav class="-mb-px flex space-x-8">
      <button
        on:click={() => setActiveTab('live')}
        class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'live' 
          ? 'border-indigo-500 text-indigo-600' 
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
      >
        Live Feed
      </button>
      <button
        on:click={() => setActiveTab('historical')}
        class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'historical' 
          ? 'border-indigo-500 text-indigo-600' 
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
      >
        Historical Data
      </button>
      <button
        on:click={() => setActiveTab('stats')}
        class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'stats' 
          ? 'border-indigo-500 text-indigo-600' 
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
      >
        Statistics
      </button>
    </nav>
  </div>

  <!-- Tab Content -->
  {#if activeTab === 'live'}
    <!-- Live Feed Tab -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Filters Sidebar -->
      <div class="lg:col-span-1">
        <SalesFilters 
          bind:timeframe={filters.timeframe}
          bind:cardSet={filters.cardSet}
          bind:rarity={filters.rarity}
          bind:minPrice={filters.minPrice}
          bind:maxPrice={filters.maxPrice}
          on:filterChange={handleFilterChange}
        />
      </div>
      
      <!-- Live Activity Feed -->
      <div class="lg:col-span-3">
        <SalesActivity 
          showLiveEvents={true}
          maxEvents={50}
          on:newSale={handleNewSale}
          on:connected={handleConnected}
        />
      </div>
    </div>
    
  {:else if activeTab === 'historical'}
    <!-- Historical Data Tab -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Filters Sidebar -->
      <div class="lg:col-span-1">
        <SalesFilters 
          bind:timeframe={filters.timeframe}
          bind:cardSet={filters.cardSet}
          bind:rarity={filters.rarity}
          bind:minPrice={filters.minPrice}
          bind:maxPrice={filters.maxPrice}
          loading={loading}
          on:filterChange={handleFilterChange}
        />
      </div>
      
      <!-- Historical Data Table -->
      <div class="lg:col-span-3">
        <div class="bg-white shadow rounded-lg">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">
              Historical Sales ({totalSales.toLocaleString()})
            </h3>
          </div>
          
          {#if loading}
            <div class="px-6 py-8">
              <div class="animate-pulse space-y-4">
                <div class="h-4 bg-gray-200 rounded"></div>
                <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                <div class="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          {:else if error}
            <div class="px-6 py-8 text-center text-red-600">
              Error loading sales: {error}
            </div>
          {:else if historicalSales.length === 0}
            <div class="px-6 py-8 text-center text-gray-500">
              No sales found for the selected filters
            </div>
          {:else}
            <!-- Sales Table -->
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Card
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Buyer
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seller
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  {#each historicalSales as sale}
                    <tr class="hover:bg-gray-50">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <div>
                            <div class="text-sm font-medium text-gray-900">
                              {sale.card.name || `Token #${sale.card.tokenId}`}
                            </div>
                            {#if sale.card.set}
                              <div class="text-sm text-gray-500">{sale.card.set}</div>
                            {/if}
                            {#if sale.card.rarity}
                              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {getRarityColor(sale.card.rarity)} bg-gray-100">
                                {sale.card.rarity}
                              </span>
                            {/if}
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.buyer.username || formatAddress(sale.buyer.address)}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.seller.username || formatAddress(sale.seller.address)}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {sale.price.formatted || sale.price.wei + ' wei'}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTimestamp(sale.timestamp)}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
            </div>
            
            <!-- Pagination -->
            {#if totalPages > 1}
              <div class="px-6 py-4 border-t border-gray-200">
                <div class="flex items-center justify-between">
                  <div class="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div class="flex space-x-2">
                    <button
                      on:click={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      on:click={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            {/if}
          {/if}
        </div>
      </div>
    </div>
    
  {:else if activeTab === 'stats'}
    <!-- Statistics Tab -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Filters Sidebar -->
      <div class="lg:col-span-1">
        <SalesFilters 
          bind:timeframe={filters.timeframe}
          bind:cardSet={filters.cardSet}
          bind:rarity={filters.rarity}
          bind:minPrice={filters.minPrice}
          bind:maxPrice={filters.maxPrice}
          on:filterChange={handleFilterChange}
        />
      </div>
      
      <!-- Statistics -->
      <div class="lg:col-span-3">
        <SalesStats 
          timeframe={filters.timeframe}
        />
      </div>
    </div>
  {/if}
</div>