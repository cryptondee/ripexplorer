<script lang="ts">
  // Props
  export let profile: any;
</script>

<div class="bg-white shadow rounded-lg p-6">
  <h2 class="text-lg font-medium text-gray-900 mb-4">Profile Summary</h2>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>
      <h3 class="font-medium text-gray-900 mb-2">Basic Information</h3>
      <dl class="space-y-1">
        {#if profile.username}
          <div class="flex">
            <dt class="text-sm text-gray-500 w-24">User:</dt>
            <dd class="text-sm text-gray-900">{profile.username}</dd>
          </div>
        {/if}
        {#if profile.email}
          <div class="flex">
            <dt class="text-sm text-gray-500 w-24">Email:</dt>
            <dd class="text-sm text-gray-900">{profile.email}</dd>
          </div>
        {/if}
        {#if profile.bio}
          <div class="flex">
            <dt class="text-sm text-gray-500 w-24">Bio:</dt>
            <dd class="text-sm text-gray-900">{profile.bio}</dd>
          </div>
        {/if}
        {#if profile.login_provider}
          <div class="flex">
            <dt class="text-sm text-gray-500 w-24">Provider:</dt>
            <dd class="text-sm text-gray-900 capitalize">{profile.login_provider}</dd>
          </div>
        {/if}
        {#if profile.verified !== undefined}
          <div class="flex">
            <dt class="text-sm text-gray-500 w-24">Verified:</dt>
            <dd class="text-sm text-gray-900">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {profile.verified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                {profile.verified ? '✅ Verified' : '❌ Not Verified'}
              </span>
            </dd>
          </div>
        {/if}
      </dl>
      
      {#if profile.smart_wallet_address || profile.owner_wallet_address}
        <h3 class="font-medium text-gray-900 mb-2 mt-4">Wallet Addresses</h3>
        <dl class="space-y-1">
          {#if profile.smart_wallet_address}
            <div class="flex">
              <dt class="text-sm text-gray-500 w-24">Smart:</dt>
              <dd class="text-xs text-gray-900 font-mono break-all">{profile.smart_wallet_address}</dd>
            </div>
          {/if}
          {#if profile.owner_wallet_address && profile.owner_wallet_address !== profile.smart_wallet_address}
            <div class="flex">
              <dt class="text-sm text-gray-500 w-24">Owner:</dt>
              <dd class="text-xs text-gray-900 font-mono break-all">{profile.owner_wallet_address}</dd>
            </div>
          {/if}
        </dl>
      {/if}
    </div>
    
    <div>
      <h3 class="font-medium text-gray-900 mb-2">Collection Stats</h3>
      <dl class="space-y-1">
        {#if profile.digital_cards?.length}
          <div class="flex">
            <dt class="text-sm text-gray-500 w-32">Digital Cards:</dt>
            <dd class="text-sm text-gray-900">{profile.digital_cards.length}</dd>
          </div>
        {/if}
        {#if profile.digital_products?.length}
          <div class="flex">
            <dt class="text-sm text-gray-500 w-32">Digital Products:</dt>
            <dd class="text-sm text-gray-900">{profile.digital_products.length}</dd>
          </div>
        {/if}
      </dl>
    </div>
  </div>
</div>