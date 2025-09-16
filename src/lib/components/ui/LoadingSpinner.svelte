<script lang="ts">
  export let size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  export let message: string = '';
  export let overlay: boolean = false;
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };
</script>

{#if overlay}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 shadow-xl">
      <div class="flex flex-col items-center">
        <div class="animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 {sizeClasses[size]}"></div>
        {#if message}
          <p class="mt-4 text-gray-700">{message}</p>
        {/if}
      </div>
    </div>
  </div>
{:else}
  <div class="flex flex-col items-center">
    <div class="animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 {sizeClasses[size]}"></div>
    {#if message}
      <p class="mt-2 text-gray-600 text-sm">{message}</p>
    {/if}
  </div>
{/if}
