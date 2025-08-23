<script lang="ts">
  let { data } = $props();
  
  let ripUsername = $state('');
  let comparisonResult = $state<any>(null);
  let extractedData = $state(null);
  let loading = $state(false);
  let error = $state('');

  async function runComparison() {
    if (!ripUsername.trim()) {
      error = 'Please enter a rip.fun username';
      return;
    }

    const targetUrl = `https://www.rip.fun/profile/${ripUsername.trim()}`;

    loading = true;
    error = '';
    comparisonResult = null;
    extractedData = null;

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileId: data.profile.id,
          targetUrl: targetUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Comparison failed');
      }

      const result = await response.json();
      comparisonResult = result.comparison;
      extractedData = result.extractedData;
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      loading = false;
    }
  }

  function getStatusColor(type: string): string {
    switch (type) {
      case 'matched': return 'bg-green-100 text-green-800';
      case 'different': return 'bg-yellow-100 text-yellow-800';
      case 'missing': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
</script>

<div class="px-4 py-8">
  <div class="max-w-6xl mx-auto">
    <div class="flex justify-between items-start mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">{data.profile.name}</h1>
        {#if data.profile.bio}
          <p class="mt-2 text-gray-600">{data.profile.bio}</p>
        {/if}
      </div>
      <div class="flex space-x-3">
        <a
          href="/profiles/{data.profile.id}/edit"
          class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Edit Profile
        </a>
        <a
          href="/profiles"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          All Profiles
        </a>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-1">
        <div class="bg-white shadow rounded-lg p-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">Profile Information</h2>
          <dl class="space-y-3">
            {#if data.profile.email}
              <div>
                <dt class="text-sm font-medium text-gray-500">Email</dt>
                <dd class="text-sm text-gray-900">{data.profile.email}</dd>
              </div>
            {/if}
            {#if data.profile.location}
              <div>
                <dt class="text-sm font-medium text-gray-500">Location</dt>
                <dd class="text-sm text-gray-900">{data.profile.location}</dd>
              </div>
            {/if}
            {#if data.profile.website}
              <div>
                <dt class="text-sm font-medium text-gray-500">Website</dt>
                <dd class="text-sm text-gray-900">
                  <a href={data.profile.website} class="text-indigo-600 hover:text-indigo-900" target="_blank">
                    {data.profile.website}
                  </a>
                </dd>
              </div>
            {/if}
            {#if data.profile.twitter}
              <div>
                <dt class="text-sm font-medium text-gray-500">Twitter</dt>
                <dd class="text-sm text-gray-900">@{data.profile.twitter}</dd>
              </div>
            {/if}
            {#if data.profile.github}
              <div>
                <dt class="text-sm font-medium text-gray-500">GitHub</dt>
                <dd class="text-sm text-gray-900">{data.profile.github}</dd>
              </div>
            {/if}
            {#if data.profile.linkedin}
              <div>
                <dt class="text-sm font-medium text-gray-500">LinkedIn</dt>
                <dd class="text-sm text-gray-900">{data.profile.linkedin}</dd>
              </div>
            {/if}
            {#if data.profile.wallet}
              <div>
                <dt class="text-sm font-medium text-gray-500">Wallet</dt>
                <dd class="text-sm text-gray-900 font-mono break-all">{data.profile.wallet}</dd>
              </div>
            {/if}
          </dl>
        </div>
      </div>

      <div class="lg:col-span-2">
        <div class="bg-white shadow rounded-lg p-6 mb-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">Compare with rip.fun Profile</h2>
          
          <div class="space-y-4">
            <div>
              <label for="ripUsername" class="block text-sm font-medium text-gray-700">
                rip.fun Username
              </label>
              <div class="mt-1 flex rounded-md shadow-sm">
                <span class="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  https://www.rip.fun/profile/
                </span>
                <input
                  type="text"
                  id="ripUsername"
                  bind:value={ripUsername}
                  class="block w-full rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="username"
                />
              </div>
              <p class="mt-1 text-sm text-gray-500">
                Enter the username from a rip.fun profile to extract profile data including username, bio, email, avatar, wallet addresses, verification status, and collection statistics.
              </p>
            </div>

            {#if error}
              <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            {/if}

            <button
              onclick={runComparison}
              disabled={loading}
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {#if loading}
                <div class="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Running Comparison...
              {:else}
                Compare Profile
              {/if}
            </button>
          </div>
        </div>

        {#if comparisonResult}
          <div class="bg-white shadow rounded-lg p-6 mb-6">
            <h2 class="text-lg font-medium text-gray-900 mb-4">Extracted Data from rip.fun</h2>
            <div class="bg-gray-50 rounded p-4">
              <details class="cursor-pointer">
                <summary class="font-medium text-gray-700 hover:text-gray-900 select-none">
                  View Raw Extracted Data (Click to expand)
                </summary>
                <pre class="mt-3 text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(extractedData, null, 2)}</pre>
              </details>
            </div>
          </div>

          <div class="bg-white shadow rounded-lg p-6">
            <h2 class="text-lg font-medium text-gray-900 mb-4">Comparison Results</h2>
            
            <div class="space-y-6">
              {#if Object.keys(comparisonResult.matched).length > 0}
                <div>
                  <h3 class="text-md font-medium text-green-800 mb-2">✅ Matched Fields</h3>
                  <div class="space-y-2">
                    {#each Object.entries(comparisonResult.matched) as [key, value]}
                      <div class="flex items-center justify-between p-2 bg-green-50 rounded">
                        <span class="font-medium text-sm text-gray-700 capitalize">{key}:</span>
                        <span class="text-sm text-gray-900">{value}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              {#if Object.keys(comparisonResult.different).length > 0}
                <div>
                  <h3 class="text-md font-medium text-yellow-800 mb-2">⚠️ Different Values</h3>
                  <div class="space-y-3">
                    {#each Object.entries(comparisonResult.different) as [key, values]}
                      <div class="p-3 bg-yellow-50 rounded">
                        <h4 class="font-medium text-sm text-gray-700 mb-2 capitalize">{key}</h4>
                        <div class="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span class="font-medium text-gray-600">Your Profile:</span>
                            <p class="text-gray-900 mt-1">{(values as any).profile}</p>
                          </div>
                          <div>
                            <span class="font-medium text-gray-600">Extracted:</span>
                            <p class="text-gray-900 mt-1">{(values as any).extracted}</p>
                          </div>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              {#if Object.keys(comparisonResult.missing).length > 0}
                <div>
                  <h3 class="text-md font-medium text-red-800 mb-2">❌ Missing from Target</h3>
                  <div class="space-y-2">
                    {#each Object.entries(comparisonResult.missing) as [key, value]}
                      <div class="flex items-center justify-between p-2 bg-red-50 rounded">
                        <span class="font-medium text-sm text-gray-700 capitalize">{key}:</span>
                        <span class="text-sm text-gray-900">{value}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              {#if Object.keys(comparisonResult.matched).length === 0 && Object.keys(comparisonResult.different).length === 0 && Object.keys(comparisonResult.missing).length === 0}
                <div class="text-center py-8">
                  <p class="text-gray-500">No data could be compared. The target page may not contain SvelteKit data or the data structure doesn't match your profile fields.</p>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>

    {#if data.profile.comparisons && data.profile.comparisons.length > 0}
      <div class="mt-8 bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Recent Comparisons</h2>
        <div class="space-y-3">
          {#each data.profile.comparisons as comparison}
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p class="text-sm font-medium text-gray-900">{comparison.targetUrl}</p>
                <p class="text-xs text-gray-500">{new Date(comparison.createdAt).toLocaleString()}</p>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>