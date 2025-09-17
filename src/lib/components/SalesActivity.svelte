<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { formatAddress, formatTimestamp, getRarityColor } from '$lib/utils/format.js';
  import { EXTERNAL_URLS } from '$lib/constants/urls.js';
  import { SALES_LIMITS, CONNECTION_SETTINGS } from '$lib/constants/sales';
  import type { SalesEvent, ConnectionStatus } from '$lib/types/sales';
  import { openCardModal } from '$lib/stores/modalStore';
  import { createEventDispatcher } from 'svelte';

  export let showLiveEvents = true;
  export let maxEvents = SALES_LIMITS.MAX_LIVE_EVENTS;

  const dispatch = createEventDispatcher<{
    newSale: SalesEvent;
    connected: void;
  }>();
  
  let events: SalesEvent[] = [];
  let connectionStatus: ConnectionStatus = { connected: false, subscribers: 0 };
  let eventSource: EventSource | null = null;
  let isConnecting = false;
  let error: string | null = null;

  onMount(() => {
    if (showLiveEvents) {
      connectToLiveEvents();
    }
    loadInitialEvents();
  });

  onDestroy(() => {
    disconnectFromLiveEvents();
  });

  async function loadInitialEvents() {
    try {
      const response = await fetch(`/api/sales?limit=${SALES_LIMITS.INITIAL_EVENTS_LOAD}`);
      const data = await response.json();
      
      if (data.success) {
        events = data.sales;
      }
    } catch (err) {
      // Silently fail for initial load
    }
  }

  function connectToLiveEvents() {
    if (eventSource || isConnecting) return;
    
    isConnecting = true;
    error = null;
    
    eventSource = new EventSource('/api/sales/live');
    
    eventSource.onopen = () => {
      isConnecting = false;
      error = null;
      dispatch('connected');
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          // Connection established
        } else if (data.type === 'sale') {
          addNewEvent(data.data);
          dispatch('newSale', data.data);
        } else if (data.type === 'keepalive') {
          connectionStatus = data.status;
        }
      } catch (err) {
        error = 'Error processing live data';
      }
    };
    
    eventSource.onerror = (err) => {
      isConnecting = false;
      error = 'Connection lost. Retrying...';
      
      // Reconnect after delay
      setTimeout(() => {
        if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
          connectToLiveEvents();
        }
      }, CONNECTION_SETTINGS.RECONNECT_DELAY);
    };
  }

  function disconnectFromLiveEvents() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  }

  function addNewEvent(newEvent: SalesEvent) {
    // Add to beginning of array and limit to maxEvents
    events = [newEvent, ...events.slice(0, maxEvents - 1)];
  }
  
  /**
   * Handle card click to show modal
   */
  function handleCardClick(event: SalesEvent) {
    if (event && event.card) {
      // For live sales, we don't have access to full user collections
      // so we'll just show the single card
      openCardModal(event.card, []);
    }
  }

</script>

<div class="bg-white shadow rounded-lg">
  <!-- Header -->
  <div class="px-6 py-4 border-b border-gray-200">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium text-gray-900">
        Live Sales Activity
      </h3>
      
      <div class="flex items-center space-x-2">
        <!-- Connection Status -->
        <div class="flex items-center space-x-1">
          <div class="w-2 h-2 rounded-full {connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'}"></div>
          <span class="text-sm text-gray-500">
            {connectionStatus.connected ? 'Live' : 'Disconnected'}
          </span>
        </div>
        
        <!-- Subscriber Count -->
        {#if connectionStatus.subscribers > 0}
          <div class="text-sm text-gray-500">
            👥 {connectionStatus.subscribers} watching
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Error Message -->
    {#if error}
      <div class="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
        {error}
      </div>
    {/if}
  </div>

  <!-- Events List -->
  <div class="divide-y divide-gray-200 max-h-96 overflow-y-auto">
    {#if events.length === 0}
      <div class="px-6 py-8 text-center text-gray-500">
        <div class="text-sm">
          {isConnecting ? 'Connecting to live feed...' : 'No recent sales activity'}
        </div>
        {#if !isConnecting && showLiveEvents}
          <div class="text-xs mt-1">
            Waiting for new purchases...
          </div>
        {/if}
      </div>
    {:else}
      {#each events as event}
        <div 
          class="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
          on:click={() => handleCardClick(event)}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && handleCardClick(event)}
        >
          <div class="flex items-start justify-between">
            <!-- Left Side: Card Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2">
                <!-- Card Name -->
                <h4 class="text-sm font-medium text-gray-900 truncate hover:text-indigo-600 transition-colors">
                  {event.card.name || `Token #${event.card.tokenId}`}
                </h4>
                
                <!-- Card Rarity -->
                {#if event.card.rarity}
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {getRarityColor(event.card.rarity)} bg-gray-100">
                    {event.card.rarity}
                  </span>
                {/if}
              </div>
              
              <!-- Card Set -->
              {#if event.card.set}
                <div class="text-xs text-gray-500 mt-1">
                  {event.card.set}
                </div>
              {/if}
              
              <!-- Transaction -->
              <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span>
                  {event.buyer.username || formatAddress(event.buyer.address)}
                  ←
                  {event.seller.username || formatAddress(event.seller.address)}
                </span>
                <a 
                  href={EXTERNAL_URLS.BASESCAN.TX(event.transactionHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-indigo-600 hover:text-indigo-900"
                  on:click|stopPropagation
                >
                  View TX
                </a>
              </div>
            </div>
            
            <!-- Right Side: Price & Time -->
            <div class="flex flex-col items-end space-y-1">
              <div class="text-sm font-medium text-gray-900">
                {event.price.formatted || event.price.wei + ' wei'}
              </div>
              <div class="text-xs text-gray-500">
                {formatTimestamp(event.timestamp, { timeOnly: true })}
              </div>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
  
  <!-- Footer -->
  {#if events.length > 0}
    <div class="px-6 py-3 border-t border-gray-200 bg-gray-50">
      <div class="text-xs text-gray-500 text-center">
        Showing latest {events.length} sales
        {#if events.length >= maxEvents}
          (limited to {maxEvents} events)
        {/if}
      </div>
    </div>
  {/if}
</div>