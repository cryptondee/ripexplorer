<script lang="ts">
  import { goto } from '$app/navigation';
  import ProfileForm from '$lib/components/ProfileForm.svelte';
  
  let { data } = $props();
  
  let loading = $state(false);
  let error = $state('');

  async function handleSubmit(profileData: any) {
    loading = true;
    error = '';
    
    try {
      const response = await fetch(`/api/profiles/${data.profile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      goto(`/profiles/${data.profile.id}`);
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
      <h1 class="text-3xl font-bold text-gray-900">Edit Profile</h1>
      <p class="mt-2 text-gray-600">
        Update your profile information.
      </p>
    </div>

    {#if error}
      <div class="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    {/if}

    <div class="bg-white shadow rounded-lg p-6">
      <ProfileForm profile={{
        name: data.profile.name,
        bio: data.profile.bio || undefined,
        website: data.profile.website || undefined,
        twitter: data.profile.twitter || undefined,
        github: data.profile.github || undefined,
        linkedin: data.profile.linkedin || undefined,
        wallet: data.profile.wallet || undefined,
        email: data.profile.email || undefined,
        location: data.profile.location || undefined,
        avatar: data.profile.avatar || undefined,
      }} {loading} onSubmit={handleSubmit} />
    </div>
  </div>
</div>