<script lang="ts">
  // Props
  export let tradeSummary: {
    totalPerfectTrades: number;
    totalOneWayToA: number;
    totalOneWayToB: number;
    totalImpossible: number;
  };
</script>

<div class="bg-white rounded-lg shadow-md p-8">
  <h2 class="text-xl font-bold mb-4">📊 Trade Summary</h2>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
    <div class="text-center p-6 bg-green-50 rounded-lg border-2 border-green-200">
      <p class="text-2xl font-bold text-green-600">{tradeSummary.totalPerfectTrades}</p>
      <p class="text-sm text-green-700">Perfect Trades</p>
    </div>
    <div class="text-center p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
      <p class="text-2xl font-bold text-blue-600">{tradeSummary.totalOneWayToA}</p>
      <p class="text-sm text-blue-700">Can Receive</p>
    </div>
    <div class="text-center p-6 bg-orange-50 rounded-lg border-2 border-orange-200">
      <p class="text-2xl font-bold text-orange-600">{tradeSummary.totalOneWayToB}</p>
      <p class="text-sm text-orange-700">Can Give</p>
    </div>
    <div class="text-center p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
      <p class="text-2xl font-bold text-gray-600">{tradeSummary.totalImpossible}</p>
      <p class="text-sm text-gray-700">Both Missing</p>
    </div>
  </div>
</div>