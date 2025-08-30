<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  
  // Props
  export let showClaimModal = false;
  export let claimingUsername = '';
  export let userAvatar = '';
  
  // State
  let mounted = false;
  let ProfileClaimModal: any = null;
  let authStore: any = null;
  let isAuthenticated: any = null;
  
  // Event handlers
  export let handleProfileClaimed: (event: CustomEvent) => void = () => {};
  export let handleContinueAsGuest: () => void = () => {};
  export let handleClaimModalClose: () => void = () => {};
  
  onMount(async () => {
    if (browser) {
      try {
        // Dynamically import auth components only on client side
        const [
          { default: ProfileClaimModalComponent },
          { authStore: authStoreImport, isAuthenticated: isAuthenticatedImport }
        ] = await Promise.all([
          import('./ProfileClaimModal.svelte'),
          import('$lib/stores/authStore')
        ]);
        
        ProfileClaimModal = ProfileClaimModalComponent;
        authStore = authStoreImport;
        isAuthenticated = isAuthenticatedImport;
        
        mounted = true;
      } catch (error) {
        console.error('Failed to load authentication components:', error);
      }
    }
  });
  
  // Default handlers if not provided
  function defaultHandleProfileClaimed(event: CustomEvent) {
    const { username, sessionToken } = event.detail;
    showClaimModal = false;
    console.log(`Profile claimed successfully for ${username}`);
    if (handleProfileClaimed) handleProfileClaimed(event);
  }
  
  function defaultHandleContinueAsGuest() {
    showClaimModal = false;
    if (authStore) {
      authStore.continueAsGuest();
    }
    console.log('User chose to continue as guest');
    if (handleContinueAsGuest) handleContinueAsGuest();
  }
  
  function defaultHandleClaimModalClose() {
    showClaimModal = false;
    if (handleClaimModalClose) handleClaimModalClose();
  }
</script>

{#if mounted && browser && ProfileClaimModal}
  <!-- Profile Claiming Modal -->
  <svelte:component 
    this={ProfileClaimModal}
    bind:isOpen={showClaimModal}
    {claimingUsername}
    {userAvatar}
    on:close={defaultHandleClaimModalClose}
    on:profileClaimed={defaultHandleProfileClaimed}
    on:continueAsGuest={defaultHandleContinueAsGuest}
  />
{/if}