<script lang="ts">
  import { onMount } from 'svelte';

  // Props
  export let setId: string;
  export let ownedCards: number = 0;
  export let showDetails: boolean = true;
  
  // State (also exposed to parent components via binding)
  let totalCards: number = 0;
  let loading: boolean = true;
  let error: string | null = null;
  let completion: number = 0;

  // Cache for set totals to avoid repeated API calls
  const setTotalCache = new Map<string, number>();

  async function fetchSetTotal(id: string): Promise<number> {
    if (!id || id === 'all') return 0;
    
    // Check cache first
    if (setTotalCache.has(id)) {
      return setTotalCache.get(id)!;
    }

    try {
      const response = await fetch(`/api/set/${id}`);
      const data = await response.json();
      
      if (response.ok && data.cards) {
        const total = Array.isArray(data.cards) ? data.cards.length : 0;
        setTotalCache.set(id, total);
        return total;
      } else {
        console.warn(`Failed to fetch set ${id} data:`, data.error);
        setTotalCache.set(id, 0);
        return 0;
      }
    } catch (err) {
      console.warn(`Error fetching set ${id} total:`, err);
      setTotalCache.set(id, 0);
      return 0;
    }
  }

  async function updateCompletion() {
    if (!setId || setId === 'all') {
      totalCards = 0;
      completion = 0;
      loading = false;
      return;
    }

    loading = true;
    error = null;

    try {
      totalCards = await fetchSetTotal(setId);
      
      if (totalCards > 0) {
        completion = Math.round((ownedCards / totalCards) * 100);
      } else {
        completion = 0;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to calculate completion';
      completion = 0;
    } finally {
      loading = false;
    }
  }

  // Reactive updates when props change
  $: if (setId || ownedCards !== undefined) {
    updateCompletion();
  }

  onMount(() => {
    updateCompletion();
  });

  // Helper to get completion color
  function getCompletionColor(percent: number): string {
    if (percent >= 90) return 'text-green-600';
    if (percent >= 70) return 'text-yellow-600';
    if (percent >= 50) return 'text-orange-600';
    return 'text-red-600';
  }

  // Helper to get completion badge color
  function getCompletionBadgeColor(percent: number): string {
    if (percent >= 90) return 'bg-green-100 text-green-800';
    if (percent >= 70) return 'bg-yellow-100 text-yellow-800';
    if (percent >= 50) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  }
</script>

<div class="inline-flex items-center space-x-2">
  {#if loading}
    <div class="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
    <span class="text-sm text-gray-500">Loading...</span>
  {:else if error}
    <span class="text-sm text-red-600">Error loading completion</span>
  {:else if showDetails}
    <!-- Detailed completion display -->
    <span class="text-sm {getCompletionColor(completion)} font-medium">
      {ownedCards}/{totalCards}
    </span>
    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {getCompletionBadgeColor(completion)}">
      {completion}%
    </span>
  {:else}
    <!-- Simple percentage display -->
    <span class="text-sm {getCompletionColor(completion)} font-medium">
      {completion}%
    </span>
  {/if}
</div>

