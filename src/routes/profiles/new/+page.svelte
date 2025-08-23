<script lang="ts">
  import { goto } from '$app/navigation';
  import ProfileForm from '$lib/components/ProfileForm.svelte';
  
  let loading = $state(false);
  let error = $state('');

  async function handleSubmit(profileData: any) {
    loading = true;
    error = '';
    
    try {
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create profile');
      }

      const profile = await response.json();
      goto(`/profiles/${profile.id}`);
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      loading = false;
    }
  }
</script>

<div class="px-4 py-8">
  <div class="max-w-3xl mx-auto">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Create Profile</h1>
      <p class="mt-2 text-gray-600">
        Add your personal information to create a new profile for synchronization.
      </p>
    </div>

    {#if error}
      <div class="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    {/if}

    <div class="bg-white shadow rounded-lg p-6">
      <ProfileForm {loading} onSubmit={handleSubmit} />
    </div>
  </div>
</div>