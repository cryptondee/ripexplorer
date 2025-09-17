<script lang="ts">
  import { onMount } from 'svelte';
  import { SALES_LIMITS, CURRENCY_DECIMALS } from '$lib/constants/sales';
  import type { SalesStats, SalesFilters } from '$lib/types/sales';

  export let timeframe: SalesFilters['timeframe'] = '24h';
  
  let stats: SalesStats | null = null;
  let loading = true;
  let error: string | null = null;

  onMount(() => {
    loadStats();
  });

  $: {
    if (timeframe) {
      loadStats();
    }
  }

  async function loadStats() {
    loading = true;
    error = null;
    
    try {
      // For now, calculate stats from the sales data
      // In a real implementation, you might have a dedicated stats endpoint
      const response = await fetch(`/api/sales?timeframe=${timeframe}&limit=${SALES_LIMITS.STATS_QUERY_LIMIT}`);
      const data = await response.json();
      
      if (data.success) {
        const sales = data.sales;
        
        if (sales.length === 0) {
          stats = {
            totalSales: 0,
            totalVolume: '0',
            averagePrice: '0',
            uniqueBuyers: 0,
            uniqueSellers: 0
          };
        } else {
          // Calculate statistics
          const totalSales = sales.length;
          const uniqueBuyers = new Set(sales.map((s: any) => s.buyer.address)).size;
          const uniqueSellers = new Set(sales.map((s: any) => s.seller.address)).size;
          
          // Calculate volume (assuming USDC for simplicity)
          let totalVolumeWei = 0n;
          const prices: number[] = [];
          
          for (const sale of sales) {
            try {
              const priceWei = BigInt(sale.price.wei);
              totalVolumeWei += priceWei;
              
              // Convert to USDC for average calculation
              const priceUSDC = Number(priceWei) / Math.pow(10, CURRENCY_DECIMALS.USDC);
              prices.push(priceUSDC);
            } catch (err) {
              // Skip invalid price entries
            }
          }
          
          const totalVolume = (Number(totalVolumeWei) / Math.pow(10, CURRENCY_DECIMALS.USDC)).toFixed(2);
          const averagePrice = prices.length > 0 
            ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)
            : '0';
          
          // Find most popular set and rarity
          const sets = sales.map((s: any) => s.card.set).filter(Boolean);
          const rarities = sales.map((s: any) => s.card.rarity).filter(Boolean);
          
          const topSet = getMostFrequent(sets);
          const topRarity = getMostFrequent(rarities);
          
          stats = {
            totalSales,
            totalVolume,
            averagePrice,
            uniqueBuyers,
            uniqueSellers,
            topSet,
            topRarity
          };
        }
      } else {
        throw new Error(data.error || 'Failed to load stats');
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  }

  function getMostFrequent(arr: string[]): string | undefined {
    if (arr.length === 0) return undefined;
    
    const frequency: Record<string, number> = {};
    let maxCount = 0;
    let mostFrequent = arr[0];
    
    for (const item of arr) {
      frequency[item] = (frequency[item] || 0) + 1;
      if (frequency[item] > maxCount) {
        maxCount = frequency[item];
        mostFrequent = item;
      }
    }
    
    return mostFrequent;
  }

  function getTimeframeLabel(tf: string): string {
    switch (tf) {
      case '1h': return 'Last Hour';
      case '24h': return 'Last 24 Hours';
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case 'all': return 'All Time';
      default: return 'Unknown';
    }
  }
</script>

<div class="bg-white shadow rounded-lg">
  <div class="px-6 py-4 border-b border-gray-200">
    <h3 class="text-lg font-medium text-gray-900">
      Sales Statistics
    </h3>
    <p class="text-sm text-gray-500 mt-1">
      {getTimeframeLabel(timeframe)}
    </p>
  </div>
  
  <div class="p-6">
    {#if loading}
      <div class="animate-pulse space-y-4">
        <div class="h-4 bg-gray-200 rounded"></div>
        <div class="h-4 bg-gray-200 rounded w-3/4"></div>
        <div class="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    {:else if error}
      <div class="text-red-600 text-sm">
        Error loading statistics: {error}
      </div>
    {:else if stats}
      <div class="grid grid-cols-2 gap-6">
        <!-- Total Sales -->
        <div>
          <dt class="text-sm font-medium text-gray-500">Total Sales</dt>
          <dd class="mt-1 text-2xl font-semibold text-gray-900">
            {stats.totalSales.toLocaleString()}
          </dd>
        </div>
        
        <!-- Total Volume -->
        <div>
          <dt class="text-sm font-medium text-gray-500">Total Volume</dt>
          <dd class="mt-1 text-2xl font-semibold text-gray-900">
            ${stats.totalVolume}
          </dd>
        </div>
        
        <!-- Average Price -->
        <div>
          <dt class="text-sm font-medium text-gray-500">Avg. Price</dt>
          <dd class="mt-1 text-2xl font-semibold text-gray-900">
            ${stats.averagePrice}
          </dd>
        </div>
        
        <!-- Unique Buyers -->
        <div>
          <dt class="text-sm font-medium text-gray-500">Unique Buyers</dt>
          <dd class="mt-1 text-2xl font-semibold text-gray-900">
            {stats.uniqueBuyers}
          </dd>
        </div>
        
        <!-- Unique Sellers -->
        <div>
          <dt class="text-sm font-medium text-gray-500">Unique Sellers</dt>
          <dd class="mt-1 text-2xl font-semibold text-gray-900">
            {stats.uniqueSellers}
          </dd>
        </div>
        
        <!-- Top Set -->
        {#if stats.topSet}
          <div>
            <dt class="text-sm font-medium text-gray-500">Top Set</dt>
            <dd class="mt-1 text-lg font-semibold text-gray-900">
              {stats.topSet}
            </dd>
          </div>
        {/if}
        
        <!-- Top Rarity -->
        {#if stats.topRarity}
          <div>
            <dt class="text-sm font-medium text-gray-500">Top Rarity</dt>
            <dd class="mt-1 text-lg font-semibold text-gray-900">
              {stats.topRarity}
            </dd>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>