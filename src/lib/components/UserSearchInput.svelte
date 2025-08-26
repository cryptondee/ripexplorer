<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Props
  export let value: string = '';
  export let label: string = '';
  export let placeholder: string = 'Enter user...';
  export let disabled: boolean = false;

  // Internal state
  let searchResults: any[] = [];
  let showSearch = false;
  let loading = false;

  // Event dispatcher for parent communication
  const dispatch = createEventDispatcher<{
    change: string;
    select: any;
  }>();

  async function searchUsers(query: string): Promise<void> {
    if (query.length < 2) {
      searchResults = [];
      showSearch = false;
      return;
    }

    loading = true;

    try {
      const response = await fetch(`/api/search-users?q=${encodeURIComponent(query)}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        searchResults = data.results;
        showSearch = true;
      }
    } catch (err) {
      console.warn('User search failed:', err);
    } finally {
      loading = false;
    }
  }

  function selectUser(user: any): void {
    value = user.username;
    showSearch = false;
    searchResults = [];
    dispatch('select', user);
    dispatch('change', value);
  }

  function handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    value = target.value;
    dispatch('change', value);
    searchUsers(value);
  }

  // Close search dropdown when clicking outside
  function handleClickOutside(event: MouseEvent): void {
    const target = event.target as Element;
    if (!target.closest('.user-search-container')) {
      showSearch = false;
    }
  }

  // Bind event listener for outside clicks
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleClickOutside);
  }
</script>

<div class="user-search-container search-container relative">
  <!-- Hidden dummy input to prevent password manager activation -->
  <input type="text" style="position: absolute; left: -9999px;" tabindex="-1" aria-hidden="true" />
  
  <label for={label.replace(/\s+/g, '').toLowerCase()} class="block text-sm font-medium text-gray-700 mb-2">
    {label}
  </label>
  <input
    type="search"
    id={label.replace(/\s+/g, '').toLowerCase()}
    bind:value
    on:input={handleInput}
    {placeholder}
    {disabled}
    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent {disabled ? 'bg-gray-100 cursor-not-allowed' : ''}"
    autocomplete="off"
    aria-label="Search for rip.fun user"
    data-lpignore="true"
    data-1p-ignore="true"
    data-form-type="other"
  />
  
  {#if loading}
    <div class="absolute right-3 top-9">
      <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
    </div>
  {/if}
  
  {#if showSearch && searchResults.length > 0}
    <div class="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
      {#each searchResults as user}
        <button
          type="button"
          class="w-full px-4 py-2 text-left hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
          on:click={() => selectUser(user)}
        >
          <div class="flex items-center space-x-3">
            {#if user.avatar}
              <img src={user.avatar} alt="" class="w-6 h-6 rounded-full" />
            {/if}
            <span class="font-medium">{user.username}</span>
            <span class="text-sm text-gray-500">ID: {user.id}</span>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>