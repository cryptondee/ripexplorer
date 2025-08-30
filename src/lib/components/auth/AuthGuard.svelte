<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore, isAuthenticated } from '$lib/stores/authStore';
  import { requireAuthentication } from '$lib/utils/authGuards';
  import ProfileClaimModal from './ProfileClaimModal.svelte';
  
  // Props
  export let requireAuth: boolean = true;
  export let allowGuests: boolean = false;
  export let showPrompt: boolean = true;
  export let message: string = 'This feature requires authentication';
  export let feature: string = 'this feature';
  
  // State
  let loading = true;
  let authorized = false;
  let showAuthModal = false;
  let claimingUsername = '';
  let userAvatar = '';
  
  // Check authorization on mount
  onMount(async () => {
    try {
      authorized = await requireAuthentication({
        requireAuth,
        allowGuests,
        onUnauthorized: () => {
          if (showPrompt) {
            // Instead of redirecting, show auth modal
            showAuthModal = true;
          }
        }
      });
    } catch (error) {
      console.error('Auth guard error:', error);
      authorized = false;
    } finally {
      loading = false;
    }
  });
  
  // Handle profile claimed
  function handleProfileClaimed(event: any) {
    const { username, sessionToken } = event.detail;
    showAuthModal = false;
    authorized = true;
    console.log(`Profile claimed successfully for ${username}`);
  }
  
  // Handle continue as guest
  function handleContinueAsGuest() {
    showAuthModal = false;
    if (allowGuests) {
      authorized = true;
    }
    authStore.continueAsGuest();
    console.log('User chose to continue as guest');
  }
  
  // Handle modal close
  function handleAuthModalClose() {
    showAuthModal = false;
  }
</script>

{#if loading}
  <!-- Loading state -->
  <div class="flex items-center justify-center p-8">
    <div class="animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
    <span class="text-gray-600">Checking authentication...</span>
  </div>
{:else if authorized}
  <!-- Content is authorized, render slot -->
  <slot />
{:else if !showPrompt}
  <!-- Not authorized and not showing prompt, render nothing -->
  <div class="text-center p-8">
    <div class="text-gray-500">
      <svg class="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
      </svg>
      <p class="text-gray-600">{message}</p>
    </div>
  </div>
{:else}
  <!-- Show authentication prompt -->
  <div class="text-center p-8">
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
      <svg class="w-12 h-12 mx-auto mb-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
      </svg>
      
      <h3 class="text-lg font-medium text-blue-900 mb-2">Authentication Required</h3>
      <p class="text-blue-700 mb-4">{message}</p>
      
      <div class="space-y-3">
        <button
          type="button"
          on:click={() => showAuthModal = true}
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          🔐 Secure Access to {feature}
        </button>
        
        {#if allowGuests}
          <button
            type="button"
            on:click={handleContinueAsGuest}
            class="w-full text-gray-600 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors"
          >
            Continue as Guest
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- Authentication Modal -->
<ProfileClaimModal
  bind:isOpen={showAuthModal}
  {claimingUsername}
  {userAvatar}
  on:close={handleAuthModalClose}
  on:profileClaimed={handleProfileClaimed}
  on:continueAsGuest={handleContinueAsGuest}
/>