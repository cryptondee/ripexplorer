// Card Collection Store - Centralized state management for extract page
import { writable, derived } from 'svelte/store';
import { getSetNameFromCard } from '$lib/utils/card';
import { getMarketValue, getListedPrice } from '$lib/utils/pricing';

// ==========================================
// 1. RAW DATA STORES
// ==========================================

export const extractedData = writable<any>(null);
export const loading = writable(false);
export const error = writable('');
export const extractionInfo = writable<any>(null);
export const ripUserId = writable('');

// Loading states
export const loadingMessage = writable('Starting extraction...');
export const retryAttempt = writable(0);
export const forceRefresh = writable(false);

// Search and sync states
export const searchResults = writable<any[]>([]);
export const showSearchResults = writable(false);
export const searchLoading = writable(false);
export const syncStatus = writable<any>(null);
export const syncLoading = writable(false);

// ==========================================
// 2. FILTER AND VIEW STORES
// ==========================================

export const selectedSet = writable('all');
export const searchQuery = writable('');
export const selectedRarity = writable('all');
export const viewMode = writable<'grid' | 'table'>('table');
export const sortColumn = writable('card_number');
export const sortDirection = writable<'asc' | 'desc'>('asc');

// Missing cards state
export const showMissingCards = writable(false);
export const onlyMissingCards = writable(false);
export const availableOnly = writable(false);

// Set data cache
export const setCardsData = writable<any>({});
export const loadingSetData = writable<any>({});
export const setDataErrors = writable<any>({});
export const fetchingAllSets = writable(false);
export const bulkFetchErrors = writable<string[]>([]);

// ==========================================
// 3. PAGINATION STORES
// ==========================================

export const currentPage = writable(1);
export const pageSize = writable(50);

// ==========================================
// 4. UI STATE STORES
// ==========================================

export const showJsonData = writable(false);

// ==========================================
// 5. ACTIONS - Functions to modify state
// ==========================================

export async function performExtraction(username?: string, forceRefreshFlag = false) {
  loading.set(true);
  error.set('');
  extractedData.set(null);
  extractionInfo.set(null);
  retryAttempt.set(0);
  
  const currentUsername = username || '';
  loadingMessage.set(forceRefreshFlag ? 'Refreshing profile data from rip.fun...' : 'Fetching profile data from rip.fun...');

  // Set up periodic message updates to show progress
  const messageInterval = setInterval(() => {
    retryAttempt.update(attempt => {
      const newAttempt = attempt + 1;
      if (newAttempt <= 15) {
        loadingMessage.set('Fetching profile data from rip.fun...');
      } else if (newAttempt <= 30) {
        loadingMessage.set('Page is taking longer than expected, please wait...');
      } else if (newAttempt <= 45) {
        loadingMessage.set('Still loading... rip.fun may be experiencing high traffic...');
      } else {
        loadingMessage.set('This is taking unusually long. The request may timeout soon...');
      }
      return newAttempt;
    });
  }, 1000);

  try {
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: currentUsername.trim(),
        method: 'api'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Extraction failed');
    }

    const result = await response.json();
    extractedData.set(result.extractedData);
    extractionInfo.set({
      username: result.username,
      targetUrl: result.targetUrl,
      timestamp: result.timestamp,
      cached: false,
      source: 'live'
    });
    
    loadingMessage.set('Extraction completed successfully!');
    
    // Automatically fetch complete set data for all sets the user owns
    loadingMessage.set('Loading complete set information...');
    try {
      await fetchAllUserSets(result.extractedData);
      loadingMessage.set('All data loaded successfully!');
    } catch (err) {
      console.warn('Some set data failed to load:', err);
      loadingMessage.set('Extraction completed (some set data may be incomplete)');
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'An error occurred';
    
    // Provide more helpful error messages based on the error type
    if (errorMsg.includes('timed out')) {
      error.set(`Request timed out: The rip.fun profile page took too long to load. This might be due to:\n• High server load on rip.fun\n• Network connectivity issues\n• The profile contains a large amount of data\n\nPlease try again in a moment.`);
    } else if (errorMsg.includes('HTTP error! status: 404')) {
      error.set(`Profile not found: The user ID "${currentUsername.trim()}" doesn't exist on rip.fun. Please check the user ID and try again.`);
    } else if (errorMsg.includes('HTTP error! status: 500')) {
      error.set(`Server error: rip.fun is experiencing technical difficulties. Please try again later.`);
    } else if (errorMsg.includes('Failed to fetch')) {
      error.set(`Network error: Unable to connect to rip.fun. Please check your internet connection and try again.`);
    } else {
      error.set(errorMsg);
    }
  } finally {
    clearInterval(messageInterval);
    loading.set(false);
    retryAttempt.set(0);
    forceRefresh.set(false); // Reset force refresh flag
  }
}

// Function to fetch complete set data from rip.fun API
async function fetchCompleteSetData(setId: string) {
  setCardsData.update(cache => {
    if (cache[setId]) {
      return cache; // Return cached data if available
    }
    return cache;
  });

  let cachedData: any = null;
  setCardsData.subscribe(cache => {
    if (cache[setId]) cachedData = cache[setId];
  })();

  if (cachedData) {
    return cachedData;
  }

  loadingSetData.update(loading => ({ ...loading, [setId]: true }));
  setDataErrors.update(errors => ({ ...errors, [setId]: null }));

  try {
    const response = await fetch(`/api/set/${setId}?page=1&limit=1000&sort=number-asc&all=true`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to fetch set data: ${response.status} ${response.statusText}. ${errorData.details || ''}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.details || data.error);
    }

    // Cache the data in memory only (Redis handles persistent caching)
    setCardsData.update(cache => ({ ...cache, [setId]: data }));
    console.log(`Set data fetched: ${setId} (cached: ${data.cached ? 'yes' : 'no'})`);
    
    return data;
  } catch (err) {
    console.error(`Error fetching set ${setId} data:`, err);
    setDataErrors.update(errors => ({
      ...errors,
      [setId]: err instanceof Error ? err.message : 'Failed to fetch set data'
    }));
    throw err;
  } finally {
    loadingSetData.update(loading => ({ ...loading, [setId]: false }));
  }
}

// Function to fetch complete set data for all sets the user owns
async function fetchAllUserSets(data: any) {
  if (!data?.profile?.digital_cards) {
    return;
  }

  fetchingAllSets.set(true);
  bulkFetchErrors.set([]);

  // Get all unique set IDs from user's cards
  const userSetIds = new Set<string>();
  data.profile.digital_cards.forEach((card: any) => {
    const setId = card.card?.set_id;
    if (setId) {
      userSetIds.add(setId);
    }
  });

  console.log('Fetching complete set data for sets:', Array.from(userSetIds));

  // Fetch complete set data for each unique set
  const fetchPromises = Array.from(userSetIds).map(async (setId) => {
    try {
      await fetchCompleteSetData(setId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Failed to fetch complete set data for ${setId}:`, err);
      bulkFetchErrors.update(errors => [...errors, `Set ${setId}: ${errorMsg}`]);
    }
  });

  await Promise.all(fetchPromises);
  console.log('All set data fetching completed');
  fetchingAllSets.set(false);
}

// Function to get missing cards for a specific set
async function getMissingCards(setId: string, userCards: any[]) {
  try {
    const completeSetData = await fetchCompleteSetData(setId);
    
    if (!completeSetData?.cards) {
      return [];
    }

    // Get all card IDs that the user owns from this set
    const userCardIds = new Set(userCards.map(card => card.card?.id).filter(Boolean));
    
    // Find cards from the complete set that the user doesn't have
    // Note: Complete set cards have ID at root level, user cards have nested structure
    const missingCards = completeSetData.cards.filter((setCard: any) => {
      return setCard.id && !userCardIds.has(setCard.id);
    });

    // Transform missing cards and fetch listing data for each
    const missingCardsWithListings = await Promise.all(
      missingCards.map(async (card: any) => {
        let listingData = null;
        let isListed = false;
        let lowestPrice = null;
        
        try {
          // Fetch listing data for this missing card
          const listingResponse = await fetch(`/api/card/${card.id}/listings`);
          if (listingResponse.ok) {
            listingData = await listingResponse.json();
            
            // Check if there are any active listings
            if (listingData.listings && listingData.listings.length > 0) {
              isListed = true;
              // Find the lowest price from active listings using usd_price
              const prices = listingData.listings
                .filter((listing: any) => listing.usd_price)
                .map((listing: any) => parseFloat(listing.usd_price));
                
              if (prices.length > 0) {
                lowestPrice = Math.min(...prices);
              }
            }
          }
        } catch (err) {
          console.error(`Error fetching listings for card ${card.id}:`, err);
        }
        
        return {
          card: card, // Wrap the card data in a 'card' property to match user card structure
          isMissing: true, // Mark as missing for UI purposes
          is_listed: isListed, // Whether the card has active listings
          listing: listingData, // Full listing data
          lowestPrice: lowestPrice, // Lowest available price
          marketValue: card.market_price || card.raw_price // Market value for missing cards
        };
      })
    );
    
    return missingCardsWithListings;
  } catch (err) {
    console.error(`Error getting missing cards for set ${setId}:`, err);
    return [];
  }
}

// Search functionality
export async function searchUsers(query: string) {
  try {
    searchLoading.set(true);
    const response = await fetch(`/api/search-users?q=${encodeURIComponent(query)}&limit=5`);
    
    if (response.ok) {
      const data = await response.json();
      searchResults.set(data.results);
      showSearchResults.set(true);
    } else {
      searchResults.set([]);
      showSearchResults.set(false);
    }
  } catch (err) {
    console.warn('User search failed:', err);
    searchResults.set([]);
    showSearchResults.set(false);
  } finally {
    searchLoading.set(false);
  }
}

// Sync functionality
export async function triggerSync() {
  try {
    syncLoading.set(true);
    const response = await fetch('/api/sync-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Sync started:', data);
      await checkSyncStatus();
    } else {
      const errorData = await response.json();
      console.error('Sync failed:', errorData);
    }
  } catch (err) {
    console.error('Sync request failed:', err);
  } finally {
    syncLoading.set(false);
  }
}

export async function checkSyncStatus() {
  try {
    const response = await fetch('/api/sync-users');
    if (response.ok) {
      const data = await response.json();
      syncStatus.set(data);
    }
  } catch (err) {
    console.warn('Failed to check sync status:', err);
  }
}

// Cache operations
export function clearAllSetCaches(): void {
  // Clear in-memory set cache (Redis handles persistent caching)
  setCardsData.set({});
  console.log('Cleared in-memory set cache');
}

// Export functionality
export function downloadJSON(data: any, info: any) {
  if (!data) return;
  
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rip-fun-${info?.username || 'profile'}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(data: any) {
  if (!data) return;
  
  navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
    // Could add a toast notification here
    console.log('Copied to clipboard');
  });
}

// ==========================================
// 6. DERIVED STORES - Reactive computations
// ==========================================

// Cards by set calculation
export const cardsBySet = derived([extractedData, setCardsData], ([$extractedData, $setCardsData]) => {
  if (!$extractedData?.profile?.digital_cards) {
    return {};
  }

  return $extractedData.profile.digital_cards.reduce((sets: any, card: any) => {
    const setName = getSetNameFromCard(card, $setCardsData);
    const setId = card.set?.id || card.card?.set_id || 'unknown';
    if (!sets[setName]) {
      sets[setName] = {
        name: setName,
        id: setId,
        cards: [],
        totalValue: 0,
        listedCount: 0,
        ownedCount: 0,
        releaseDate: card.card?.set?.release_date
      };
    }
    
    sets[setName].cards.push(card);
    sets[setName].totalValue += parseFloat(card.listing?.usd_price || card.card?.raw_price || '0');
    
    if (card.is_listed) {
      sets[setName].listedCount++;
    } else {
      sets[setName].ownedCount++;
    }
    
    return sets;
  }, {});
});

// Set name by ID mapping
export const setNameById = derived(setCardsData, ($setCardsData) => {
  const numericOnly = (s: any) => typeof s === 'string' && /^\d+$/.test(s.trim());
  const map: Record<string, string> = {};
  for (const [id, data] of Object.entries($setCardsData || {})) {
    const metaName = (data as any)?.set?.name as string | undefined;
    const cardName = (data as any)?.cards?.[0]?.set?.name as string | undefined;
    const chosen = metaName && !numericOnly(metaName) ? metaName : (cardName && !numericOnly(cardName) ? cardName : undefined);
    if (id && chosen) map[id] = chosen;
  }
  // Ensure known mappings exist even if cache lacks proper names
  map['sv3pt5'] = map['sv3pt5'] || 'Scarlet & Violet 151';
  return map;
});

// All rarities from extracted data
export const allRarities = derived(extractedData, ($extractedData) => {
  if (!$extractedData?.profile?.digital_cards) return [];
  return [...new Set($extractedData.profile.digital_cards.map((card: any) => card.card?.rarity).filter(Boolean))].sort();
});

// Combined cards (owned + missing when enabled)
export const combinedCards = derived(
  [extractedData, showMissingCards, onlyMissingCards, selectedSet, cardsBySet, setCardsData],
  async ([$extractedData, $showMissingCards, $onlyMissingCards, $selectedSet, $cardsBySet, $setCardsData]) => {
    if (!$extractedData?.profile?.digital_cards) {
      return [];
    }

    // Get base owned cards (deduplicated for cleaner display)
    const ownedCards = $selectedSet === 'all'
      ? Object.values($extractedData.profile.digital_cards.reduce((unique: any, card: any) => {
          const cardId = card.card?.id;
          if (!unique[cardId] || unique[cardId].listing) {
            unique[cardId] = card;
          }
          return unique;
        }, {})) as any[]
      : Object.values(($cardsBySet[$selectedSet]?.cards || []).reduce((unique: any, card: any) => {
          const cardId = card.card?.id;
          if (!unique[cardId] || unique[cardId].listing) {
            unique[cardId] = card;
          }
          return unique;
        }, {})) as any[];

    // Handle missing cards based on toggles
    if ($selectedSet !== 'all' && ($showMissingCards || $onlyMissingCards)) {
      console.log('Missing cards logic triggered:', { showMissingCards: $showMissingCards, onlyMissingCards: $onlyMissingCards, selectedSet: $selectedSet });
      try {
        // Find the set ID for the selected set
        const userCardsForSet = $cardsBySet[$selectedSet]?.cards || [];
        
        // Get the set ID from the first card in the set
        const setId = userCardsForSet[0]?.card?.set_id;
        
        if (setId) {
          const missingCards = await getMissingCards(setId, userCardsForSet);
          console.log('Got missing cards:', missingCards.length);
          
          if ($onlyMissingCards) {
            // Show only missing cards
            console.log('Showing only missing cards');
            return missingCards;
          } else if ($showMissingCards && !$onlyMissingCards) {
            // Show both owned and missing cards
            console.log('Showing owned + missing cards');
            return [...ownedCards, ...missingCards];
          }
        }
      } catch (err) {
        console.error('Error loading missing cards:', err);
        return ownedCards;
      }
    }
    
    console.log('Not showing missing cards:', { selectedSet: $selectedSet, showMissingCards: $showMissingCards, onlyMissingCards: $onlyMissingCards });
    return ownedCards;
  }
);

// Filtered cards
export const filteredCards = derived(
  [combinedCards, searchQuery, selectedSet, selectedRarity, availableOnly, setCardsData],
  async ([$combinedCards, $searchQuery, $selectedSet, $selectedRarity, $availableOnly, $setCardsData]) => {
    const cards = await $combinedCards;
    
    return cards.filter(card => {
      const matchesSearch = !$searchQuery || 
        (card.card?.name || '').toLowerCase().includes($searchQuery.toLowerCase()) ||
        (card.card?.card_number || '').includes($searchQuery) ||
        getSetNameFromCard(card, $setCardsData).toLowerCase().includes($searchQuery.toLowerCase());
      
      const matchesRarity = $selectedRarity === 'all' || card.card?.rarity === $selectedRarity;
      
      // Available only filter - only applies to missing cards
      const matchesAvailable = !$availableOnly || !card.isMissing || card.is_listed;
      
      return matchesSearch && matchesRarity && matchesAvailable;
    });
  }
);

// Sorted cards
export const sortedCards = derived(
  [filteredCards, sortColumn, sortDirection, setCardsData],
  async ([$filteredCards, $sortColumn, $sortDirection, $setCardsData]) => {
    const cards = await $filteredCards;
    
    return [...cards].sort((a, b) => {
      let aValue, bValue;
      
      switch ($sortColumn) {
        case 'card_number':
          aValue = parseInt(a.card?.card_number || '0');
          bValue = parseInt(b.card?.card_number || '0');
          break;
        case 'name':
          aValue = a.card?.name || '';
          bValue = b.card?.name || '';
          break;
        case 'set':
          aValue = getSetNameFromCard(a, $setCardsData);
          bValue = getSetNameFromCard(b, $setCardsData);
          break;
        case 'rarity':
          aValue = a.card?.rarity || '';
          bValue = b.card?.rarity || '';
          break;
        case 'type':
          aValue = a.card?.types?.join(', ') || '';
          bValue = b.card?.types?.join(', ') || '';
          break;
        case 'value':
          aValue = getMarketValue(a);
          bValue = getMarketValue(b);
          break;
        case 'listedPrice':
          aValue = getListedPrice(a);
          bValue = getListedPrice(b);
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const result = aValue.localeCompare(bValue);
        return $sortDirection === 'asc' ? result : -result;
      } else {
        const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return $sortDirection === 'asc' ? result : -result;
      }
    });
  }
);

// Paginated cards
export const paginatedCards = derived(
  [sortedCards, currentPage, pageSize],
  async ([$sortedCards, $currentPage, $pageSize]) => {
    const cards = await $sortedCards;
    const startIndex = ($currentPage - 1) * $pageSize;
    const endIndex = startIndex + $pageSize;
    return cards.slice(startIndex, endIndex);
  }
);

// Total pages calculation
export const totalPages = derived(
  [filteredCards, pageSize],
  async ([$filteredCards, $pageSize]) => {
    const cards = await $filteredCards;
    return Math.ceil(cards.length / $pageSize);
  }
);