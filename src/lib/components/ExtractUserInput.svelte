<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  // Props
  export let ripUserId: string = '';
  export let searchResults: any[] = [];
  export let showSearchResults: boolean = false;
  export let searchLoading: boolean = false;
  export let syncStatus: any = null;
  export let syncLoading: boolean = false;
  export let loading: boolean = false;
  
  // Event dispatcher
  const dispatch = createEventDispatcher<{
    userInput: void;
    selectUser: any;
    hideSearchResults: void;
    triggerSync: void;
  }>();
  
  function handleUserInput() {
    dispatch('userInput');
  }
  
  function selectUser(user: any) {
    dispatch('selectUser', user);
  }
  
  function hideSearchResults() {
    dispatch('hideSearchResults');
  }
  
  function triggerSync() {
    dispatch('triggerSync');
  }
</script>

<div class="relative">
  <label for="ripUserId" class="block text-sm font-medium text-gray-700">
    rip.fun User or ID
  </label>
  <div class="mt-1 flex rounded-md shadow-sm">
    <span class="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
      👤
    </span>
    <input
      type="search"
      id="ripUserId"
      bind:value={ripUserId}
      oninput={handleUserInput}
      onblur={hideSearchResults}
      class="block w-full rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      placeholder="Enter user (e.g., Poketard) or ID (e.g., 2010)"
      autocomplete="off"
      aria-label="Search for rip.fun user"
      aria-describedby="user-search-description"
      data-lpignore="true"
      data-1p-ignore="true"
      data-form-type="other"
    />
  </div>
  
  <!-- Search Results Dropdown -->
  {#if showSearchResults && (searchResults.length > 0 || searchLoading)}
    <div class="absolute z-10 mt-1 w-full bg-white shadow-lg border border-gray-300 rounded-md max-h-60 overflow-auto">
      {#if searchLoading}
        <div class="px-4 py-3 text-sm text-gray-500">
          <div class="flex items-center">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Searching...
          </div>
        </div>
      {:else if searchResults.length > 0}
        {#each searchResults as user}
          <button
            onmousedown={() => selectUser(user)}
            class="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 border-b border-gray-100 last:border-b-0"
          >
            <div class="flex items-center space-x-3">
              {#if user.avatar}
                <img src={user.avatar} alt={user.username} class="w-8 h-8 rounded-full">
              {:else}
                <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span class="text-xs text-gray-500">👤</span>
                </div>
              {/if}
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">{user.username}</p>
                <p class="text-xs text-gray-500">ID: {user.id}</p>
              </div>
            </div>
          </button>
        {/each}
      {:else}
        <div class="px-4 py-3 text-sm text-gray-500">
          No users found. Try running a sync to update the database.
        </div>
      {/if}
    </div>
  {/if}
  
  <!-- Hidden dummy input to prevent password manager activation -->
  <input type="text" style="position: absolute; left: -9999px;" tabindex="-1" aria-hidden="true" />
  
  <div class="mt-2 flex justify-between items-start">
    <p id="user-search-description" class="text-sm text-gray-500">
      Enter a user (e.g., "Poketard") or ID (e.g., "2010") to extract their complete card collection.
    </p>
    
    <!-- Sync Button -->
    <div class="flex items-center space-x-2">
      {#if syncStatus}
        <span class="text-xs text-gray-500">
          Last sync: {syncStatus.status === 'never_run' ? 'Never' : new Date(syncStatus.lastSyncAt).toLocaleDateString()}
        </span>
      {/if}
      <button
        onclick={triggerSync}
        disabled={syncLoading || loading}
        class="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        title="Sync blockchain data to update user database"
      >
        {#if syncLoading}
          <svg class="animate-spin -ml-1 mr-1 h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        {:else}
          <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        {/if}
        Sync
      </button>
    </div>
  </div>
</div>