<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let label = 'PIN';
  export let value = '';
  export let placeholder = 'Enter PIN...';
  export let disabled = false;
  export let error = '';
  export let maxlength = 6;
  export let required = false;
  export let autocomplete: 'off' | 'current-password' | 'new-password' = 'off';
  
  const dispatch = createEventDispatcher<{
    input: { value: string };
    enter: void;
  }>();
  
  let inputElement: HTMLInputElement;
  
  // Focus management
  export function focus() {
    if (inputElement) {
      inputElement.focus();
    }
  }
  
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    let newValue = target.value;
    
    // Only allow digits
    newValue = newValue.replace(/\D/g, '');
    
    // Enforce maxlength
    if (newValue.length > maxlength) {
      newValue = newValue.slice(0, maxlength);
    }
    
    // Update value
    value = newValue;
    target.value = newValue;
    
    dispatch('input', { value: newValue });
  }
  
  function handleKeydown(event: KeyboardEvent) {
    // Allow: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(event.keyCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (event.keyCode === 65 && event.ctrlKey === true) ||
        (event.keyCode === 67 && event.ctrlKey === true) ||
        (event.keyCode === 86 && event.ctrlKey === true) ||
        (event.keyCode === 88 && event.ctrlKey === true)) {
      
      // Handle Enter key
      if (event.keyCode === 13) {
        dispatch('enter');
      }
      return;
    }
    
    // Ensure that it is a number and stop the keypress
    if ((event.shiftKey || (event.keyCode < 48 || event.keyCode > 57)) && (event.keyCode < 96 || event.keyCode > 105)) {
      event.preventDefault();
    }
  }
  
  function handlePaste(event: ClipboardEvent) {
    // Allow paste but filter to digits only
    setTimeout(() => {
      if (inputElement) {
        const pastedValue = inputElement.value.replace(/\D/g, '').slice(0, maxlength);
        value = pastedValue;
        inputElement.value = pastedValue;
        dispatch('input', { value: pastedValue });
      }
    }, 0);
  }
  
  // Generate unique ID for accessibility
  let componentId = `pin-entry-${Math.random().toString(36).substr(2, 9)}`;
  
  // Input styling based on state
  $: inputClasses = [
    'w-full px-4 py-3 text-center text-lg font-mono tracking-widest rounded-lg border-2 transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
    error 
      ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500' 
      : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500',
    disabled 
      ? 'opacity-50 cursor-not-allowed bg-gray-50' 
      : 'hover:border-gray-400',
  ].join(' ');
</script>

<div class="space-y-2">
  <!-- Label -->
  <label 
    for={componentId}
    class="block text-sm font-medium text-gray-700"
  >
    {label}
    {#if required}
      <span class="text-red-500 ml-1">*</span>
    {/if}
  </label>
  
  <!-- PIN Input -->
  <div class="relative">
    <input
      bind:this={inputElement}
      id={componentId}
      type="password"
      inputmode="numeric"
      pattern="[0-9]*"
      {placeholder}
      {disabled}
      {required}
      {maxlength}
      autocomplete={autocomplete}
      class={inputClasses}
      {value}
      on:input={handleInput}
      on:keydown={handleKeydown}
      on:paste={handlePaste}
      aria-describedby={error ? `${componentId}-error` : undefined}
      aria-invalid={!!error}
    />
    
    <!-- Show/Hide PIN toggle -->
    <button
      type="button"
      class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
      on:click={() => {
        if (inputElement) {
          inputElement.type = inputElement.type === 'password' ? 'text' : 'password';
        }
      }}
      tabindex="-1"
      aria-label={inputElement?.type === 'password' ? 'Show PIN' : 'Hide PIN'}
    >
      {#if inputElement?.type === 'password'}
        <!-- Eye icon (show) -->
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
        </svg>
      {:else}
        <!-- Eye-off icon (hide) -->
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M9.878 9.878c-.088.089-.177.18-.263.271M14.12 14.12c.088-.089.177-.18.263-.271M14.12 14.12L15.536 15.536M14.12 14.12c.088-.088.177-.177.263-.266m0 0a3 3 0 00-4.243-4.243M2 2l20 20"></path>
        </svg>
      {/if}
    </button>
  </div>
  
  <!-- Character count indicator -->
  {#if maxlength > 0}
    <div class="text-xs text-gray-500 text-right">
      {value.length}/{maxlength}
    </div>
  {/if}
  
  <!-- Error message -->
  {#if error}
    <div 
      id="{componentId}-error" 
      class="text-sm text-red-600 flex items-center space-x-1"
      role="alert"
    >
      <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span>{error}</span>
    </div>
  {/if}
  
  <!-- Security hint -->
  {#if !error && value.length === 0}
    <div class="text-xs text-gray-500 flex items-center space-x-1">
      <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span>Use 4-6 digits you'll remember</span>
    </div>
  {/if}
</div>