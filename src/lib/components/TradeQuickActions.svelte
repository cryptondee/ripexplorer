<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Props
  export let userA: { username: string };
  export let userB: { username: string };
  export let tradeAnalysis: {
    summary: {
      totalPerfectTrades: number;
      totalOneWayToA: number;
      totalOneWayToB: number;
    };
  };

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    copyGeneralSummary: void;
  }>();

  function openProfileA() {
    window.open(`https://www.rip.fun/profile/${userA.username}`, '_blank');
  }

  function openProfileB() {
    window.open(`https://www.rip.fun/profile/${userB.username}`, '_blank');
  }

  function copyGeneralSummary() {
    const summary = `Trade Analysis: ${userA.username} vs ${userB.username}\n` +
                   `Perfect Trades: ${tradeAnalysis.summary.totalPerfectTrades}\n` +
                   `${userA.username} can receive: ${tradeAnalysis.summary.totalOneWayToA} cards\n` +
                   `${userA.username} can give: ${tradeAnalysis.summary.totalOneWayToB} cards\n` +
                   `Generated on: ${new Date().toLocaleDateString()}`;
    
    navigator.clipboard.writeText(summary).then(() => {
      alert('Trade summary copied to clipboard!');
      dispatch('copyGeneralSummary');
    });
  }
</script>

<div class="bg-white rounded-lg shadow-md p-6">
  <h2 class="text-xl font-bold mb-4">🚀 Quick Actions</h2>
  <div class="flex flex-wrap gap-4">
    <button 
      type="button"
      on:click={openProfileA}
      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      🔗 View {userA.username} on rip.fun
    </button>
    <button 
      type="button"
      on:click={openProfileB}
      class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
    >
      🔗 View {userB.username} on rip.fun
    </button>
    <button 
      type="button"
      on:click={copyGeneralSummary}
      class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
    >
      📋 Copy Trade Summary
    </button>
  </div>
</div>