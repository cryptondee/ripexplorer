<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  // Props - Enhanced interface for reusability
  let {
    selectedUserId = $bindable(''),
    disabled = false,
    label = 'Enter rip.fun Username or User ID',
    placeholder = 'Enter username or ID...',
    showSyncFeatures = true
  }: {
    selectedUserId?: string;
    disabled?: boolean;
    label?: string;
    placeholder?: string;
    showSyncFeatures?: boolean;
  } = $props();
  
  // Internal state - Component owns this data
  let searchResults: any[] = $state([]);
  let showSearchResults: boolean = $state(false);
  let searchLoading: boolean = $state(false);
  let syncStatus: any = $state(null);
  let syncLoading: boolean = $state(false);
  let searchTimeout: ReturnType<typeof setTimeout>;
  let countdownInterval: ReturnType<typeof setInterval>;
  
  // Event dispatcher - Simplified events
  const dispatch = createEventDispatcher<{
    userSelected: { username: string; userId: string };
    syncComplete: any;
    change: string;
  }>();
  
  // Internal search logic (moved from page)
  function handleUserInput() {
    clearTimeout(searchTimeout);
    
    // Dispatch change event for compatibility
    dispatch('change', selectedUserId);
    
    if (selectedUserId.trim().length < 2) {
      searchResults = [];
      showSearchResults = false;
      return;
    }
    
    searchTimeout = setTimeout(async () => {
      await searchUsers(selectedUserId.trim());
    }, 300);
  }
  
  // Internal user search (moved from page)
  async function searchUsers(query: string) {
    try {
      searchLoading = true;
      const response = await fetch(`/api/search-users?q=${encodeURIComponent(query)}&limit=5`);
      
      if (response.ok) {
        const data = await response.json();
        searchResults = data.results;
        showSearchResults = true;
      } else {
        searchResults = [];
        showSearchResults = false;
      }
    } catch (err) {
      console.warn('User search failed:', err);
      searchResults = [];
      showSearchResults = false;
    } finally {
      searchLoading = false;
    }
  }
  
  // Internal user selection (moved from page)
  function selectUser(user: any) {
    selectedUserId = user.username;
    showSearchResults = false;
    searchResults = [];
    
    // Dispatch simplified event
    dispatch('userSelected', {
      username: user.username,
      userId: user.id
    });
  }
  
  // Internal hide results (moved from page)
  function hideSearchResults() {
    setTimeout(() => {
      showSearchResults = false;
    }, 200);
  }
  
  // Internal sync functionality (moved from page)
  async function triggerSync() {
    try {
      console.log('Starting sync, syncLoading set to true');
      syncLoading = true;
      
      const response = await fetch('/api/sync-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Sync started:', data);
        await checkSyncStatus();
        dispatch('syncComplete', data);
      } else if (response.status === 429) {
        const errorData = await response.json();
        console.log('Sync rate limited:', errorData);
        await checkSyncStatus(); // Refresh status to get rate limit info
      } else {
        const errorData = await response.json();
        console.error('Sync failed:', errorData);
        await checkSyncStatus(); // Refresh status even on error
      }
    } catch (err) {
      console.error('Sync request failed:', err);
      await checkSyncStatus(); // Refresh status on error
    } finally {
      console.log('Sync complete, syncLoading set to false');
      syncLoading = false;
    }
  }
  
  // Internal sync status check (moved from page)
  async function checkSyncStatus() {
    try {
      const response = await fetch('/api/sync-users');
      if (response.ok) {
        const data = await response.json();
        syncStatus = data;
        
        // Start countdown if rate limited
        if (data.rateLimited && data.remainingMs > 0) {
          startCountdown();
        } else {
          stopCountdown();
        }
      }
    } catch (err) {
      console.warn('Failed to check sync status:', err);
    }
  }
  
  // Countdown timer functions
  function startCountdown() {
    stopCountdown(); // Clear any existing interval
    
    countdownInterval = setInterval(async () => {
      if (syncStatus?.rateLimited && syncStatus?.remainingMs > 0) {
        syncStatus.remainingMs = Math.max(0, syncStatus.remainingMs - 1000);
        
        // If countdown finished, refresh status
        if (syncStatus.remainingMs <= 0) {
          await checkSyncStatus();
        }
      } else {
        stopCountdown();
      }
    }, 1000);
  }
  
  function stopCountdown() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }
  
  // Check sync status on component mount and cleanup on unmount
  $effect(() => {
    checkSyncStatus();
    
    // Cleanup countdown on component destroy
    return () => {
      stopCountdown();
    };
  });
</script>

<div class="relative">
  <label for="ripUserId" class="block text-sm font-medium text-gray-700">
    {label}
  </label>
  <div class="mt-1 flex rounded-md shadow-sm">
    <span class="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
      👤
    </span>
    <input
      type="search"
      id="ripUserId"
      bind:value={selectedUserId}
      oninput={handleUserInput}
      onblur={hideSearchResults}
      {disabled}
      class="block w-full rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      placeholder={placeholder}
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
    
    <!-- Sync Button (conditional) -->
    {#if showSyncFeatures}
      <div class="flex items-center space-x-2">
        {#if syncStatus}
          <span class="text-xs text-gray-500">
            Last sync: {syncStatus.status === 'never_run' ? 'Never' : new Date(syncStatus.lastSyncAt).toLocaleDateString()}
            {#if syncStatus.rateLimited && syncStatus.remainingMs > 0}
              <br>Next sync in: {Math.ceil(syncStatus.remainingMs / (60 * 1000))} min
            {/if}
          </span>
        {/if}
        <button
          onclick={triggerSync}
          disabled={syncLoading || disabled || (syncStatus?.rateLimited && syncStatus?.remainingMs > 0)}
          class="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title={syncStatus?.rateLimited && syncStatus?.remainingMs > 0 
            ? `Rate limited. Next sync available in ${Math.ceil(syncStatus.remainingMs / (60 * 1000))} minutes`
            : "Sync blockchain data to update user database"}
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
          {syncStatus?.rateLimited && syncStatus?.remainingMs > 0 ? 'Rate Limited' : 'Sync'}
        </button>
      </div>
    {/if}
  </div>
</div>