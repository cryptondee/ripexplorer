<script lang="ts">
  import { EXTERNAL_URLS } from '$lib/constants/urls.js';
  
  // Props
  export let userA: { username: string };
  export let userB: { username: string };

  function openProfileA() {
    window.open(EXTERNAL_URLS.RIP_FUN.PROFILE(userA.username), '_blank');
  }

  function openProfileB() {
    window.open(EXTERNAL_URLS.RIP_FUN.PROFILE(userB.username), '_blank');
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
  </div>
</div>