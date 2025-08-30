<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  interface SalesEvent {
    id: string;
    transactionHash: string;
    blockNumber: string;
    buyer: {
      address: string;
      username?: string;
    };
    seller: {
      address: string;
      username?: string;
    };
    card: {
      name?: string;
      image?: string;
      rarity?: string;
      set?: string;
      uniqueId?: string;
      tokenId: string;
    };
    price: {
      wei: string;
      currency: string;
      formatted?: string;
    };
    timestamp: string;
  }

  interface ConnectionStatus {
    connected: boolean;
    subscribers: number;
  }

  export let showLiveEvents = true;
  export let maxEvents = 50;

  const dispatch = createEventDispatcher();
  
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
      const response = await fetch('/api/sales?limit=10');
      const data = await response.json();
      
      if (data.success) {
        events = data.sales;
      }
    } catch (err) {
      console.error('Error loading initial events:', err);
    }
  }

  function connectToLiveEvents() {
    if (eventSource || isConnecting) return;
    
    isConnecting = true;
    error = null;
    
    console.log('🔗 Connecting to live events...');
    
    eventSource = new EventSource('/api/sales/live');
    
    eventSource.onopen = () => {
      console.log('✅ Connected to live events');
      isConnecting = false;
      error = null;
      dispatch('connected');
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          console.log('📡 Live feed connected:', data.message);
        } else if (data.type === 'sale') {
          console.log('🎉 New sale event received:', data.data);
          addNewEvent(data.data);
          dispatch('newSale', data.data);
        } else if (data.type === 'keepalive') {
          connectionStatus = data.status;
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };
    
    eventSource.onerror = (err) => {
      console.error('❌ SSE connection error:', err);
      isConnecting = false;
      error = 'Connection lost. Retrying...';
      
      // Reconnect after 5 seconds
      setTimeout(() => {
        if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
          connectToLiveEvents();
        }
      }, 5000);
    };
  }

  function disconnectFromLiveEvents() {
    if (eventSource) {
      console.log('🔌 Disconnecting from live events');
      eventSource.close();
      eventSource = null;
    }
  }

  function addNewEvent(newEvent: SalesEvent) {
    // Add to beginning of array and limit to maxEvents
    events = [newEvent, ...events.slice(0, maxEvents - 1)];
  }

  function formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  function formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  function getRarityColor(rarity?: string): string {
    if (!rarity) return 'text-gray-500';
    
    switch (rarity.toLowerCase()) {
      case 'common': return 'text-gray-600';
      case 'uncommon': return 'text-green-600';
      case 'rare': return 'text-blue-600';
      case 'epic': return 'text-purple-600';
      case 'legendary': return 'text-orange-600';
      default: return 'text-gray-500';
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
        <div class="px-6 py-4 hover:bg-gray-50 transition-colors">
          <div class="flex items-start justify-between">
            <!-- Left Side: Card Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2">
                <!-- Card Name -->
                <h4 class="text-sm font-medium text-gray-900 truncate">
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
                  href="https://basescan.org/tx/{event.transactionHash}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-indigo-600 hover:text-indigo-900"
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
                {formatTimestamp(event.timestamp)}
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