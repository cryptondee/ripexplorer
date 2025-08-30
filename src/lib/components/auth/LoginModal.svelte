<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getBrowserFingerprint } from '$lib/utils/browserFingerprint.js';
  import PinEntry from './PinEntry.svelte';
  
  export let isOpen = false;
  
  const dispatch = createEventDispatcher<{
    close: void;
    loginSuccess: { username: string; sessionToken: string };
  }>();
  
  let username = '';
  let pin = '';
  let loading = false;
  let error = '';
  
  // PIN validation states
  $: pinValid = pin.length >= 4 && pin.length <= 6 && /^\d+$/.test(pin);
  $: canSubmit = username.trim() && pinValid && !loading;
  
  async function handleLogin() {
    if (!canSubmit) return;
    
    loading = true;
    error = '';
    
    try {
      // Get browser fingerprint
      const browserFingerprint = await getBrowserFingerprint();
      
      // Call login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          pin: pin,
          browserFingerprint: browserFingerprint
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        error = data.error || 'Login failed';
        return;
      }
      
      // Success - dispatch event with session token
      dispatch('loginSuccess', {
        username: data.username,
        sessionToken: data.sessionToken
      });
      
      // Reset form
      username = '';
      pin = '';
      error = '';
      
    } catch (err) {
      console.error('Login error:', err);
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }
  
  function handleClose() {
    if (!loading) {
      dispatch('close');
    }
  }
  
  // Reset form when modal opens
  $: if (isOpen) {
    username = '';
    pin = '';
    error = '';
  }
</script>

{#if isOpen}
  <!-- Modal overlay -->
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    on:click={handleClose}
    on:keydown={(e) => e.key === 'Escape' && handleClose()}
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <!-- Modal content -->
    <div 
      class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="document"
    >
      <!-- Header -->
      <div class="p-6 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h2 id="modal-title" class="text-xl font-semibold text-gray-900">
            🔐 Login to Your Account
          </h2>
          <button
            type="button"
            on:click={handleClose}
            disabled={loading}
            class="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Body -->
      <div class="p-6 space-y-6">
        <!-- Login form -->
        <div class="space-y-4">
          <!-- Username field -->
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              bind:value={username}
              disabled={loading}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              placeholder="Enter your username"
              autocomplete="username"
            />
          </div>
          
          <!-- PIN field -->
          <PinEntry
            label="PIN (4-6 digits)"
            bind:value={pin}
            disabled={loading}
            placeholder="Enter PIN..."
            maxlength={6}
            on:input={() => error = ''}
            on:enter={handleLogin}
          />
        </div>
        
        <!-- Error display -->
        {#if error}
          <div class="bg-red-50 border border-red-300 rounded-lg p-3">
            <p class="text-red-800 text-sm font-medium">{error}</p>
          </div>
        {/if}
      </div>
      
      <!-- Footer -->
      <div class="p-6 border-t border-gray-200 space-y-3">
        <!-- Login button -->
        <button
          type="button"
          on:click={handleLogin}
          disabled={!canSubmit}
          class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {#if loading}
            <div class="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            Logging In...
          {:else}
            🔑 Login
          {/if}
        </button>
        
        <!-- Note -->
        <p class="text-xs text-gray-500 text-center">
          No account? The system will automatically create one when you first set a PIN after extraction.
        </p>
      </div>
    </div>
  </div>
{/if}