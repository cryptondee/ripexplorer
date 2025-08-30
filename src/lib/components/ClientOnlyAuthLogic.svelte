<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  
  // Props - these come from parent component
  export let extractedData: any = null;
  export let loading: boolean = false;
  
  // State
  let mounted = false;
  let showClaimModal = false;
  let claimingUsername = '';
  let userAvatar = '';
  let hasShownClaimPrompt = false;
  
  // Auth stores - loaded dynamically
  let authStore: any = null;
  let isAuthenticated: any = null;
  let ProfileClaimModal: any = null;
  
  onMount(async () => {
    if (browser) {
      try {
        // Dynamically import auth components only on client side
        const [
          { default: ProfileClaimModalComponent },
          { authStore: authStoreImport, isAuthenticated: isAuthenticatedImport }
        ] = await Promise.all([
          import('./auth/ProfileClaimModal.svelte'),
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
  
  // Watch for changes to extractedData and loading
  $: if (mounted && extractedData && extractedData.profile && isAuthenticated && !hasShownClaimPrompt) {
    let isAuth = false;
    isAuthenticated.subscribe((auth: boolean) => {
      isAuth = auth;
    })();
    
    if (!isAuth) {
      const extractedUsername = extractedData.profile.username;
      if (extractedUsername) {
        claimingUsername = extractedUsername;
        userAvatar = extractedData.profile.avatar || '';
        showClaimModal = true;
        hasShownClaimPrompt = true;
      }
    }
  }
  
  $: if (mounted && loading) {
    hasShownClaimPrompt = false;
  }
  
  // Event handlers
  function handleProfileClaimed(event: CustomEvent) {
    const { username, sessionToken } = event.detail;
    showClaimModal = false;
    console.log(`Profile claimed successfully for ${username}`);
  }
  
  function handleContinueAsGuest() {
    showClaimModal = false;
    if (authStore) {
      authStore.continueAsGuest();
    }
    console.log('User chose to continue as guest');
  }
  
  function handleClaimModalClose() {
    showClaimModal = false;
  }
</script>

{#if mounted && browser && ProfileClaimModal}
  <!-- Profile Claiming Modal -->
  <svelte:component 
    this={ProfileClaimModal}
    bind:isOpen={showClaimModal}
    {claimingUsername}
    {userAvatar}
    on:close={handleClaimModalClose}
    on:profileClaimed={handleProfileClaimed}
    on:continueAsGuest={handleContinueAsGuest}
  />
{/if}