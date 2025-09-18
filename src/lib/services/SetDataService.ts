/**
 * SetDataService - Business logic for set data management
 * Extracted from SetDataManager.svelte for better separation of concerns
 */

import { deduplicatedFetch } from '$lib/utils/setDataDeduplication';
import { logger } from '$lib/utils/logger';
import { browser } from '$app/environment';

export interface SetData {
  set: {
    id: string;
    name: string;
    series?: string;
    total_cards: number;
  };
  cards: any[];
  cached?: boolean;
  timestamp?: string;
}

export interface MissingCard {
  card: any;
  isMissing: boolean;
  is_listed: boolean;
  listing: any;
  lowestPrice: number | null;
  marketValue: number;
}

export class SetDataService {
  private missingCardsCache: Record<string, MissingCard[]> = {};
  private componentId: string;

  constructor(componentId?: string) {
    this.componentId = componentId || Math.random().toString(36).substring(2, 8);
    logger.debug('SetDataService: Service created', { componentId: this.componentId });
  }

  /**
   * Fetch complete set data for a given set ID
   */
  async fetchCompleteSetData(setId: string): Promise<SetData | null> {
    if (!setId) {
      throw new Error('Set ID is required');
    }

    logger.debug('SetDataService: Fetching complete set data', { 
      componentId: this.componentId, 
      setId 
    });

    try {
      const response = await deduplicatedFetch(`/api/set/${setId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch set data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      logger.debug('SetDataService: Set data fetched successfully', { 
        componentId: this.componentId, 
        setId, 
        cardCount: data.cards?.length || 0,
        cached: data.cached 
      });

      return data;
    } catch (err) {
      logger.error('SetDataService: Error fetching set data', { 
        componentId: this.componentId, 
        setId, 
        error: err instanceof Error ? err.message : String(err) 
      });
      throw err;
    }
  }

  /**
   * Get missing cards for a specific set
   */
  async getMissingCards(setId: string, userCards: any[], skipListings: boolean = false): Promise<MissingCard[]> {
    try {
      // Create a cache key based on setId and user cards
      const userCardIds = new Set(userCards.map(card => card.card?.id).filter(Boolean));
      const cacheKey = `${setId}_${Array.from(userCardIds).sort().join(',')}`;
      
      // Check cache first
      if (this.missingCardsCache[cacheKey] && !skipListings) {
        logger.debug('SetDataService: Using cached missing cards', { setId });
        return this.missingCardsCache[cacheKey];
      }
      
      const completeSetData = await this.fetchCompleteSetData(setId);
      
      if (!completeSetData?.cards) {
        return [];
      }
      
      // Find cards from the complete set that the user doesn't have
      const missingCards = completeSetData.cards.filter((setCard: any) => {
        return setCard.id && !userCardIds.has(setCard.id);
      });

      // If we're skipping listings (for quick toggle), return cards without listing data
      if (skipListings) {
        return missingCards.map((card: any) => ({
          card: card,
          isMissing: true,
          is_listed: false,
          listing: null,
          lowestPrice: null,
          marketValue: card.market_price || card.raw_price
        }));
      }

      // Fetch listing data for missing cards
      const missingCardsWithListings = await Promise.all(
        missingCards.map(async (card: any) => {
          try {
            const listingResponse = await fetch(`/api/cards/${card.id}/listings`);
            let listing = null;
            let lowestPrice = null;

            if (listingResponse.ok) {
              const listingData = await listingResponse.json();
              if (listingData.listings && listingData.listings.length > 0) {
                // Find the lowest priced listing
                const sortedListings = listingData.listings.sort((a: any, b: any) => 
                  parseFloat(a.usd_price || '0') - parseFloat(b.usd_price || '0')
                );
                listing = sortedListings[0];
                lowestPrice = parseFloat(listing.usd_price || '0');
              }
            }

            return {
              card: card,
              isMissing: true,
              is_listed: listing !== null,
              listing: listing,
              lowestPrice: lowestPrice,
              marketValue: card.market_price || card.raw_price
            };
          } catch (listingErr) {
            logger.warn('SetDataService: Failed to fetch listing for card', { 
              cardId: card.id, 
              error: listingErr instanceof Error ? listingErr.message : String(listingErr) 
            });
            
            return {
              card: card,
              isMissing: true,
              is_listed: false,
              listing: null,
              lowestPrice: null,
              marketValue: card.market_price || card.raw_price
            };
          }
        })
      );

      // Cache the results
      this.missingCardsCache[cacheKey] = missingCardsWithListings;
      
      return missingCardsWithListings;
    } catch (err) {
      logger.error('SetDataService: Error getting missing cards', { 
        setId, 
        error: err instanceof Error ? err.message : String(err) 
      });
      return [];
    }
  }

  /**
   * Get all missing cards for a specific set selection
   */
  async getAllMissingCards(selectedSet: string, cardsBySet: any, extractedData: any): Promise<MissingCard[]> {
    if (!extractedData?.profile?.digital_cards || selectedSet === 'all') {
      return [];
    }

    // Find the set ID for the selected set
    const userCardsForSet = cardsBySet[selectedSet]?.cards || [];
    
    // Get the set ID from the first card in the set
    const setId = userCardsForSet[0]?.card?.set_id;
    
    if (!setId) {
      return [];
    }

    return await this.getMissingCards(setId, userCardsForSet);
  }

  /**
   * Get all unique set IDs from user's cards
   */
  getUserSetIds(extractedData: any): Set<string> {
    const userSetIds = new Set<string>();
    
    if (!extractedData?.profile?.digital_cards) {
      return userSetIds;
    }

    extractedData.profile.digital_cards.forEach((userCard: any) => {
      const setId = userCard.card?.set_id;
      if (setId) {
        userSetIds.add(setId);
      }
    });

    return userSetIds;
  }

  /**
   * Clear the missing cards cache
   */
  clearCache(): void {
    this.missingCardsCache = {};
    logger.debug('SetDataService: Cache cleared', { componentId: this.componentId });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    const keys = Object.keys(this.missingCardsCache);
    return {
      size: keys.length,
      keys
    };
  }
}
