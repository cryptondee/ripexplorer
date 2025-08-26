<script lang="ts">
  import { onMount } from 'svelte';
  import { getSetNameFromCard } from '$lib/utils/card';
  import { batchFetchSetTotals, calculateCompletionPercentage, getCompletionBadgeColor } from '$lib/utils/setCompletion';
  
  // Props
  export let extractedData: any;
  export let setCardsData: any;
  
  // State for set completion data
  let setCompletions: Record<string, { total: number; percentage: number }> = {};
  let loadingCompletions = true;
  
  // Load set completion data
  onMount(async () => {
    if (extractedData.profile.digital_cards?.length > 0) {
      // Get unique set IDs from cards
      const setIds = [...new Set(
        extractedData.profile.digital_cards
          .map((card: any) => card.card?.set_id)
          .filter((id: any): id is string => !!id)
      )];
      
      try {
        const setTotals = await batchFetchSetTotals(setIds);
        
        // Calculate completion for each set
        const completions: Record<string, { total: number; percentage: number }> = {};
        Object.entries(setTotals).forEach(([setId, total]) => {
          const ownedInSet = [...new Set(
            extractedData.profile.digital_cards
              .filter((card: any) => card.card?.set_id === setId)
              .map((card: any) => `${card.card?.id || card.card?.name}_${card.card?.card_number}`)
          )].length;
          
          completions[setId] = {
            total,
            percentage: calculateCompletionPercentage(ownedInSet, total)
          };
        });
        
        setCompletions = completions;
      } catch (error) {
        console.warn('Failed to load set completion data:', error);
      } finally {
        loadingCompletions = false;
      }
    } else {
      loadingCompletions = false;
    }
  });
</script>

{#if extractedData.profile.digital_cards && extractedData.profile.digital_cards.length > 0}
  {@const uniqueCards = extractedData.profile.digital_cards.reduce((unique: any[], card: any) => {
    const cardKey = `${card.card?.id || card.card?.name}_${card.card?.card_number}_${card.card?.set_id}`;
    const existingCard = unique.find(c => `${c.card?.id || c.card?.name}_${c.card?.card_number}_${c.card?.set_id}` === cardKey);
    if (!existingCard) {
      unique.push(card);
    }
    return unique;
  }, [])}
  {@const setStats = uniqueCards.reduce((stats: any, card: any) => {
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
            
            <!-- Set Completion -->
            {#if setCompletions[setData.setId] && !loadingCompletions}
              {@const completion = setCompletions[setData.setId]}
              <div class="flex justify-between items-center">
                <span>Completion:</span>
                <div class="flex items-center space-x-2">
                  <span class="text-xs">{setData.count}/{completion.total}</span>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {getCompletionBadgeColor(completion.percentage)}">
                    {completion.percentage}%
                  </span>
                </div>
              </div>
            {:else if loadingCompletions}
              <div class="flex justify-between items-center">
                <span>Completion:</span>
                <div class="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
              </div>
            {/if}
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