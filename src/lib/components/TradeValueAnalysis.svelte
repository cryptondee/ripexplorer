<script lang="ts">
  // Props
  export let tradeAnalysis: {
    summary: {
      estimatedPerfectTradeValue: number;
      estimatedOneWayToAValue: number;
      estimatedOneWayToBValue: number;
      tradeBalance: 'even' | 'favors_a' | 'favors_b';
    };
  };
  export let userA: { username: string };
  export let userB: { username: string };
  export let formatCurrency: (amount: number) => string;

  // Check if we should show the component
  $: hasValue = tradeAnalysis.summary.estimatedPerfectTradeValue > 0 || 
                tradeAnalysis.summary.estimatedOneWayToAValue > 0 || 
                tradeAnalysis.summary.estimatedOneWayToBValue > 0;

  // Trade balance helper functions
  function getBalanceIcon(balance: string): string {
    switch (balance) {
      case 'even': return '⚖️';
      case 'favors_a': return '⬅️';
      case 'favors_b': return '➡️';
      default: return '⚖️';
    }
  }

  function getBalanceMessage(balance: string): string {
    switch (balance) {
      case 'even': return 'Trade values are well balanced';
      case 'favors_a': return `Trade favors ${userA.username}`;
      case 'favors_b': return `Trade favors ${userB.username}`;
      default: return 'Trade values are well balanced';
    }
  }

  function getBalanceStyles(balance: string): { container: string; text: string } {
    switch (balance) {
      case 'even': 
        return { container: 'bg-gray-50 border border-gray-200', text: 'text-gray-700' };
      case 'favors_a': 
        return { container: 'bg-blue-50 border border-blue-200', text: 'text-blue-700' };
      case 'favors_b': 
        return { container: 'bg-orange-50 border border-orange-200', text: 'text-orange-700' };
      default: 
        return { container: 'bg-gray-50 border border-gray-200', text: 'text-gray-700' };
    }
  }

  $: balanceStyles = getBalanceStyles(tradeAnalysis.summary.tradeBalance);
</script>

{#if hasValue}
  <div class="bg-white rounded-lg shadow-md p-6">
    <h2 class="text-xl font-bold mb-4">⚖️ Trade Value Analysis</h2>
    <div class="grid md:grid-cols-3 gap-4">
      <div class="text-center p-4 bg-green-50 rounded-lg border border-green-200">
        <p class="text-lg font-bold text-green-600">
          {formatCurrency(tradeAnalysis.summary.estimatedPerfectTradeValue)}
        </p>
        <p class="text-sm text-green-700">Perfect Trades Value</p>
      </div>
      <div class="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p class="text-lg font-bold text-blue-600">
          {formatCurrency(tradeAnalysis.summary.estimatedOneWayToAValue)}
        </p>
        <p class="text-sm text-blue-700">{userA.username} Can Receive</p>
      </div>
      <div class="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
        <p class="text-lg font-bold text-orange-600">
          {formatCurrency(tradeAnalysis.summary.estimatedOneWayToBValue)}
        </p>
        <p class="text-sm text-orange-700">{userA.username} Can Give</p>
      </div>
    </div>
    
    <!-- Trade Balance Indicator -->
    <div class="mt-4 p-4 rounded-lg {balanceStyles.container}">
      <div class="flex items-center justify-center space-x-2">
        <span class="text-lg">
          {getBalanceIcon(tradeAnalysis.summary.tradeBalance)}
        </span>
        <span class="font-medium {balanceStyles.text}">
          {getBalanceMessage(tradeAnalysis.summary.tradeBalance)}
        </span>
      </div>
    </div>
  </div>
{/if}