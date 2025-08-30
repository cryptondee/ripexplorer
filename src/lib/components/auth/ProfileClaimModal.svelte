<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getBrowserFingerprint } from '$lib/utils/browserFingerprint.js';
  import PinEntry from './PinEntry.svelte';
  
  export let isOpen = false;
  export let claimingUsername = '';
  export let userAvatar = '';
  
  const dispatch = createEventDispatcher<{
    close: void;
    profileClaimed: { username: string; sessionToken: string };
    continueAsGuest: void;
  }>();
  
  let pin = '';
  let confirmPin = '';
  let loading = false;
  let error = '';
  let rateLimited = false;
  let lockoutEnd: Date | null = null;
  let lockoutTimeRemaining = '';
  
  // PIN validation states
  $: pinValid = pin.length >= 4 && pin.length <= 6 && /^\d+$/.test(pin);
  $: pinsMatch = pin === confirmPin && confirmPin.length > 0;
  $: canSubmit = pinValid && pinsMatch && !rateLimited && !loading;
  
  // Lockout countdown timer
  let lockoutInterval: NodeJS.Timeout;
  
  $: if (lockoutEnd) {
    updateLockoutTimer();
    lockoutInterval = setInterval(updateLockoutTimer, 1000);
  } else if (lockoutInterval) {
    clearInterval(lockoutInterval);
  }
  
  function updateLockoutTimer() {
    if (!lockoutEnd) return;
    
    const now = new Date();
    const timeLeft = lockoutEnd.getTime() - now.getTime();
    
    if (timeLeft <= 0) {
      rateLimited = false;
      lockoutEnd = null;
      lockoutTimeRemaining = '';
      if (lockoutInterval) clearInterval(lockoutInterval);
      return;
    }
    
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    lockoutTimeRemaining = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  function getPinStrength(pin: string): string {
    if (pin.length < 4) return 'Too short';
    if (pin.length === 4) return 'Weak';
    if (pin.length === 5) return 'Good';
    if (pin.length === 6) return 'Strong';
    return 'Invalid';
  }
  
  function getPinStrengthColor(strength: string): string {
    switch (strength) {
      case 'Too short': return 'text-red-600';
      case 'Weak': return 'text-orange-600';
      case 'Good': return 'text-yellow-600';
      case 'Strong': return 'text-green-600';
      default: return 'text-red-600';
    }
  }
  
  async function handleClaimProfile() {
    if (!canSubmit) return;
    
    loading = true;
    error = '';
    
    try {
      // Get browser fingerprint
      const browserFingerprint = await getBrowserFingerprint();
      
      // Call claim profile API
      const response = await fetch('/api/auth/claim-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: claimingUsername,
          pin: pin,
          confirmPin: confirmPin,
          browserFingerprint: browserFingerprint
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        if (data.rateLimited && data.lockoutEnd) {
          rateLimited = true;
          lockoutEnd = new Date(data.lockoutEnd);
          error = `Too many failed attempts. Please wait ${lockoutTimeRemaining}.`;
        } else {
          error = data.error || 'Failed to secure your profile';
        }
        return;
      }
      
      // Success - dispatch event with session token
      dispatch('profileClaimed', {
        username: data.username,
        sessionToken: data.sessionToken
      });
      
      // Reset form
      pin = '';
      confirmPin = '';
      error = '';
      
    } catch (err) {
      console.error('Profile claim error:', err);
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }
  
  function handleContinueAsGuest() {
    dispatch('continueAsGuest');
  }
  
  function handleClose() {
    if (!loading) {
      dispatch('close');
    }
  }
  
  // Reset form when modal opens
  $: if (isOpen) {
    pin = '';
    confirmPin = '';
    error = '';
    rateLimited = false;
    lockoutEnd = null;
  }
  
  // Cleanup interval on destroy
  import { onDestroy } from 'svelte';
  onDestroy(() => {
    if (lockoutInterval) clearInterval(lockoutInterval);
  });
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
            🔐 Secure Your Watchlist
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
        <!-- User profile preview -->
        <div class="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
          {#if userAvatar}
            <img 
              src={userAvatar} 
              alt="{claimingUsername} avatar"
              class="w-12 h-12 rounded-full border-2 border-blue-200"
            />
          {:else}
            <div class="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
              <span class="text-blue-800 font-bold text-lg">
                {claimingUsername.charAt(0).toUpperCase()}
              </span>
            </div>
          {/if}
          <div>
            <h3 class="font-medium text-blue-900">{claimingUsername}</h3>
            <p class="text-sm text-blue-700">rip.fun profile</p>
          </div>
        </div>
        
        <!-- Security explanation -->
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div class="flex items-start space-x-3">
            <svg class="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
            <div class="text-sm">
              <p class="font-medium text-amber-800 mb-1">Secure Your Watchlist</p>
              <p class="text-amber-700">
                Create a PIN to save your favorite cards across browser sessions. 
                We encrypt your data and never store your PIN in plain text.
              </p>
            </div>
          </div>
        </div>
        
        <!-- Rate limiting warning -->
        {#if rateLimited}
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p class="font-medium text-red-800">Account Temporarily Locked</p>
                <p class="text-sm text-red-700">
                  Too many failed attempts. Try again in {lockoutTimeRemaining}.
                </p>
              </div>
            </div>
          </div>
        {/if}
        
        <!-- PIN entry form -->
        <div class="space-y-4">
          <PinEntry
            label="Create PIN (4-6 digits)"
            bind:value={pin}
            disabled={rateLimited || loading}
            placeholder="Enter PIN..."
            maxlength={6}
            on:input={() => error = ''}
          />
          
          <div class="text-xs {getPinStrengthColor(getPinStrength(pin))}">
            PIN strength: {getPinStrength(pin)}
          </div>
          
          <PinEntry
            label="Confirm PIN"
            bind:value={confirmPin}
            disabled={rateLimited || loading}
            placeholder="Confirm PIN..."
            maxlength={6}
            error={confirmPin && !pinsMatch ? "PINs don't match" : ''}
            on:input={() => error = ''}
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
        <!-- Claim button -->
        <button
          type="button"
          on:click={handleClaimProfile}
          disabled={!canSubmit}
          class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {#if loading}
            <div class="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            Securing Your Account...
          {:else}
            🔒 Secure My Watchlist
          {/if}
        </button>
        
        <!-- Continue as guest -->
        <button
          type="button"
          on:click={handleContinueAsGuest}
          disabled={loading}
          class="w-full text-gray-600 py-2 px-4 rounded-lg font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          Continue as Guest
        </button>
        
        <!-- Privacy note -->
        <p class="text-xs text-gray-500 text-center">
          Your PIN is encrypted and never stored in plain text. 
          <br />We respect your privacy and security.
        </p>
      </div>
    </div>
  </div>
{/if}