<script lang="ts">
  import { getSetNameFromCard } from '$lib/utils/card';
  
  // Props
  export let extractedData: any;
  export let setCardsData: any;
</script>

{#if extractedData.profile.digital_cards && extractedData.profile.digital_cards.length > 0}
  {@const setStats = extractedData.profile.digital_cards.reduce((stats: any, card: any) => {
    const setName = getSetNameFromCard(card, setCardsData);
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
{/if}