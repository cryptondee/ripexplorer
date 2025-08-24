<script lang="ts">
  import { onMount } from 'svelte';

  // Props
  export let digitalProducts: any[] = [];

  // Reactive computed groups
  $: groupedPacks = digitalProducts.reduce((groups: any, product: any) => {
    const packName = product.name || 'Unknown Pack';
    if (!groups[packName]) {
      groups[packName] = {
        name: packName,
        items: [],
        totalValue: 0,
        listedCount: 0,
        ownedCount: 0,
        openedCount: 0,
        sealedCount: 0,
        pendingOpenCount: 0,
        sampleImage: null
      };
    }
    
    groups[packName].items.push(product);
    groups[packName].totalValue += parseFloat(product.product?.current_value || '0');
    
    if (product.is_listed) {
      groups[packName].listedCount++;
    } else {
      groups[packName].ownedCount++;
    }
    
    // Count pack statuses based on open_status
    const status = product.open_status?.toLowerCase() || 'unknown';
    if (status.includes('opened') || status === 'opened') {
      groups[packName].openedCount++;
    } else if (status.includes('sealed') || status === 'sealed' || status === 'unopened') {
      groups[packName].sealedCount++;
    } else if (status.includes('pending') || status.includes('opening')) {
      groups[packName].pendingOpenCount++;
    } else if (!product.is_listed) {
      // If no specific status but owned, assume sealed
      groups[packName].sealedCount++;
    }
    
    if (!groups[packName].sampleImage && product.front_image_url) {
      groups[packName].sampleImage = product.front_image_url;
    }
    
    return groups;
  }, {});

  function togglePackGroup(groupId: string) {
    const details = document.getElementById(`details-${groupId}`);
    const icon = document.getElementById(`icon-${groupId}`);
    if (details && icon) {
      details.classList.toggle('hidden');
      icon.classList.toggle('rotate-180');
    }
  }

  function getStatusBadgeClass(product: any): string {
    return product.is_listed 
      ? 'bg-green-100 text-green-800' 
      : 'bg-gray-100 text-gray-800';
  }

  function getStatusText(product: any): string {
    return product.is_listed ? 'Listed' : (product.open_status || 'Owned');
  }
</script>

{#if digitalProducts.length > 0}
  <div class="bg-white shadow rounded-lg p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-lg font-medium text-gray-900">Digital Products ({digitalProducts.length})</h2>
      <div class="text-sm text-gray-500">
        {Object.keys(groupedPacks).length} unique pack types
      </div>
    </div>

    <!-- Grouped Pack Display -->
    <div class="space-y-6">
      {#each Object.values(groupedPacks) as packGroup, index}
        {@const group = packGroup as any}
        {@const groupId = `group-${index}`}
        
        <div class="border border-gray-200 rounded-lg overflow-hidden">
          <!-- Pack Group Header -->
          <button
            class="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 border-b border-gray-200 flex items-center justify-between transition-colors"
            on:click={() => togglePackGroup(groupId)}
            type="button"
          >
            <div class="flex items-center space-x-4">
              {#if group.sampleImage}
                <img 
                  src={group.sampleImage} 
                  alt={group.name} 
                  class="w-12 h-16 object-cover rounded border"
                  loading="lazy"
                />
              {/if}
              <div class="text-left">
                <h3 class="text-lg font-semibold text-gray-900">{group.name}</h3>
                <p class="text-sm text-gray-600">
                  {group.items.length} packs • 
                  <span class="text-green-600 font-medium">{group.openedCount} opened</span> • 
                  <span class="text-blue-600 font-medium">{group.sealedCount} sealed</span>
                  {#if group.pendingOpenCount > 0}
                    • <span class="text-orange-600 font-medium">{group.pendingOpenCount} pending</span>
                  {/if}
                  {#if group.totalValue > 0}
                    • ${group.totalValue.toFixed(2)} value
                  {/if}
                </p>
              </div>
            </div>
            
            <div class="flex items-center space-x-2">
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {group.items.length}
              </span>
              <svg 
                id="icon-{groupId}"
                class="h-5 w-5 text-gray-500 transition-transform transform rotate-0"
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          <!-- Expandable Pack Details -->
          <div id="details-{groupId}" class="hidden bg-white">
            <!-- Summary Section -->
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-200">
              <h4 class="text-sm font-semibold text-gray-900 mb-3">{group.name} Summary</h4>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="text-center">
                  <div class="text-2xl font-bold text-green-600">{group.openedCount}</div>
                  <div class="text-xs text-gray-600 uppercase tracking-wide">Opened</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-blue-600">{group.sealedCount}</div>
                  <div class="text-xs text-gray-600 uppercase tracking-wide">Sealed</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-orange-600">{group.pendingOpenCount}</div>
                  <div class="text-xs text-gray-600 uppercase tracking-wide">Pending Open</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-gray-800">{group.items.length}</div>
                  <div class="text-xs text-gray-600 uppercase tracking-wide">Total Packs</div>
                </div>
              </div>
              {#if group.totalValue > 0}
                <div class="mt-3 text-center">
                  <div class="text-lg font-semibold text-gray-900">
                    Total Value: ${group.totalValue.toFixed(2)}
                  </div>
                </div>
              {/if}
            </div>
            
            <!-- Pack Details Table -->
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  {#each group.items as product}
                    <tr class="hover:bg-gray-50">
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{product.id}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusBadgeClass(product)}">
                          {getStatusText(product)}
                        </span>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}