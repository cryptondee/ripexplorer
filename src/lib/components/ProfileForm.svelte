<script lang="ts">
  interface ProfileData {
    name: string;
    bio?: string;
    website?: string;
    twitter?: string;
    github?: string;
    linkedin?: string;
    wallet?: string;
    email?: string;
    location?: string;
    avatar?: string;
  }

  let { profile = {}, onSubmit, loading = false }: {
    profile?: Partial<ProfileData>;
    onSubmit: (data: ProfileData) => Promise<void>;
    loading?: boolean;
  } = $props();

  let formData = $state({
    name: profile.name || '',
    bio: profile.bio || '',
    website: profile.website || '',
    twitter: profile.twitter || '',
    github: profile.github || '',
    linkedin: profile.linkedin || '',
    wallet: profile.wallet || '',
    email: profile.email || '',
    location: profile.location || '',
    avatar: profile.avatar || ''
  });

  let errors = $state<Record<string, string>>({});

  function validateForm(): boolean {
    errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (formData.email && !isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (formData.website && !isValidUrl(formData.website)) {
      errors.website = 'Please enter a valid URL';
    }

    return Object.keys(errors).length === 0;
  }

  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (!validateForm()) return;
    
    const cleanData: ProfileData = {
      name: formData.name.trim()
    };

    Object.entries(formData).forEach(([key, value]) => {
      if (key !== 'name' && value?.trim()) {
        (cleanData as any)[key] = value.trim();
      }
    });

    await onSubmit(cleanData);
  }
</script>

<form onsubmit={handleSubmit} class="space-y-6">
  <div>
    <label for="name" class="block text-sm font-medium text-gray-700">Name *</label>
    <input
      type="text"
      id="name"
      bind:value={formData.name}
      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      class:border-red-300={errors.name}
      placeholder="Enter your full name"
      required
    />
    {#if errors.name}
      <p class="mt-1 text-sm text-red-600">{errors.name}</p>
    {/if}
  </div>

  <div>
    <label for="bio" class="block text-sm font-medium text-gray-700">Bio</label>
    <textarea
      id="bio"
      bind:value={formData.bio}
      rows="3"
      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      placeholder="Tell us about yourself..."
    ></textarea>
  </div>

  <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
    <div>
      <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
      <input
        type="email"
        id="email"
        bind:value={formData.email}
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        class:border-red-300={errors.email}
        placeholder="your@email.com"
      />
      {#if errors.email}
        <p class="mt-1 text-sm text-red-600">{errors.email}</p>
      {/if}
    </div>

    <div>
      <label for="location" class="block text-sm font-medium text-gray-700">Location</label>
      <input
        type="text"
        id="location"
        bind:value={formData.location}
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        placeholder="City, Country"
      />
    </div>
  </div>

  <div>
    <label for="website" class="block text-sm font-medium text-gray-700">Website</label>
    <input
      type="url"
      id="website"
      bind:value={formData.website}
      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      class:border-red-300={errors.website}
      placeholder="https://example.com"
    />
    {#if errors.website}
      <p class="mt-1 text-sm text-red-600">{errors.website}</p>
    {/if}
  </div>

  <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
    <div>
      <label for="twitter" class="block text-sm font-medium text-gray-700">Twitter</label>
      <input
        type="text"
        id="twitter"
        bind:value={formData.twitter}
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        placeholder="username"
      />
    </div>

    <div>
      <label for="github" class="block text-sm font-medium text-gray-700">GitHub</label>
      <input
        type="text"
        id="github"
        bind:value={formData.github}
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        placeholder="username"
      />
    </div>

    <div>
      <label for="linkedin" class="block text-sm font-medium text-gray-700">LinkedIn</label>
      <input
        type="text"
        id="linkedin"
        bind:value={formData.linkedin}
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        placeholder="username"
      />
    </div>
  </div>

  <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
    <div>
      <label for="wallet" class="block text-sm font-medium text-gray-700">Wallet Address</label>
      <input
        type="text"
        id="wallet"
        bind:value={formData.wallet}
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        placeholder="0x..."
      />
    </div>

    <div>
      <label for="avatar" class="block text-sm font-medium text-gray-700">Avatar URL</label>
      <input
        type="url"
        id="avatar"
        bind:value={formData.avatar}
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        placeholder="https://example.com/avatar.jpg"
      />
    </div>
  </div>

  <div class="flex justify-end space-x-3">
    <a
      href="/profiles"
      class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
    >
      Cancel
    </a>
    <button
      type="submit"
      disabled={loading}
      class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
    >
      {#if loading}
        <div class="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
      {/if}
      Save Profile
    </button>
  </div>
</form>