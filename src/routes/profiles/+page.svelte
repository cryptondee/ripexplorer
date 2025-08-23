<script lang="ts">
  import { onMount } from 'svelte';
  
  let profiles: any[] = $state([]);
  let loading = $state(false);
  let error = $state('');

  onMount(async () => {
    await loadProfiles();
  });

  async function loadProfiles() {
    loading = true;
    error = '';
    
    try {
      const response = await fetch('/api/profiles');
      if (!response.ok) {
        throw new Error('Failed to load profiles');
      }
      profiles = await response.json();
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      loading = false;
    }
  }

  async function deleteProfile(id: string) {
    if (!confirm('Are you sure you want to delete this profile?')) return;
    
    try {
      const response = await fetch(`/api/profiles/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete profile');
      }
      
      await loadProfiles();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete profile';
    }
  }
</script>

<div class="px-4 py-8">
  <div class="flex justify-between items-center mb-8">
    <h1 class="text-3xl font-bold text-gray-900">Profiles</h1>
    <a 
      href="/profiles/new" 
      class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
    >
      Create Profile
    </a>
  </div>

  {#if error}
    <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
      {error}
    </div>
  {/if}

  {#if loading}
    <div class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <p class="mt-2 text-gray-600">Loading profiles...</p>
    </div>
  {:else if profiles.length === 0}
    <div class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No profiles yet</h3>
      <p class="text-gray-500 mb-6">Get started by creating your first profile.</p>
      <a 
        href="/profiles/new" 
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
      >
        Create Your First Profile
      </a>
    </div>
  {:else}
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {#each profiles as profile (profile.id)}
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900">{profile.name}</h3>
              <div class="flex space-x-2">
                <a 
                  href="/profiles/{profile.id}" 
                  class="text-indigo-600 hover:text-indigo-900 text-sm"
                >
                  View
                </a>
                <a 
                  href="/profiles/{profile.id}/edit" 
                  class="text-indigo-600 hover:text-indigo-900 text-sm"
                >
                  Edit
                </a>
                <button 
                  onclick={() => deleteProfile(profile.id)}
                  class="text-red-600 hover:text-red-900 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
            
            {#if profile.bio}
              <p class="text-gray-600 text-sm mb-3 line-clamp-2">{profile.bio}</p>
            {/if}
            
            <div class="space-y-1 text-sm text-gray-500">
              {#if profile.email}
                <p>✉️ {profile.email}</p>
              {/if}
              {#if profile.location}
                <p>📍 {profile.location}</p>
              {/if}
              {#if profile.website}
                <p>🌐 <a href={profile.website} class="text-indigo-600 hover:text-indigo-900" target="_blank">{profile.website}</a></p>
              {/if}
            </div>
            
            <div class="mt-4 flex space-x-2">
              {#if profile.twitter}
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Twitter
                </span>
              {/if}
              {#if profile.github}
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  GitHub
                </span>
              {/if}
              {#if profile.linkedin}
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  LinkedIn
                </span>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>