/**
 * Card Enrichment Service
 * Fetches complete card metadata to create uniform card data across all pages
 */

import { logger } from '$lib/utils/logger.js';

export interface EnrichedCardData {
  id: string;
  name: string;
  card_number: string;
  rarity: string;
  set_id: string;
  set_name: string;
  large_image_url: string;
  small_image_url: string;
  uniqueId: string;
  tokenId: string;
  // Additional metadata for consistency
  image?: string; // For backward compatibility
  set?: string;   // For backward compatibility
}

export class CardEnrichmentService {
  private static instance: CardEnrichmentService;
  private cardCache = new Map<string, EnrichedCardData>();
  private pendingRequests = new Map<string, Promise<EnrichedCardData | null>>();

  static getInstance(): CardEnrichmentService {
    if (!CardEnrichmentService.instance) {
      CardEnrichmentService.instance = new CardEnrichmentService();
    }
    return CardEnrichmentService.instance;
  }

  /**
   * Enrich card data using uniqueId or tokenId
   */
  async enrichCardData(partialCard: {
    name?: string;
    uniqueId?: string;
    tokenId: string;
    rarity?: string;
    set?: string;
    image?: string;
    card_id?: string; // Added for onchain metadata support
  }): Promise<EnrichedCardData | null> {
    const cacheKey = partialCard.uniqueId || partialCard.tokenId;
    
    // Check cache first
    if (this.cardCache.has(cacheKey)) {
      return this.cardCache.get(cacheKey)!;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // Create new request
    const request = this.fetchCardMetadata(partialCard);
    this.pendingRequests.set(cacheKey, request);

    try {
      const result = await request;
      if (result) {
        this.cardCache.set(cacheKey, result);
      }
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Fetch complete card metadata from rip.fun API
   */
  private async fetchCardMetadata(partialCard: {
    name?: string;
    uniqueId?: string;
    tokenId: string;
    rarity?: string;
    set?: string;
    image?: string;
    card_id?: string; // Added for onchain metadata support
  }): Promise<EnrichedCardData | null> {
    try {
      // PRIORITY 1: Use card_id from onchain metadata (most reliable)
      if (partialCard.card_id) {
        logger.log(`Fetching card data using card_id: ${partialCard.card_id}`);
        const response = await fetch(`https://api.rip.fun/cards/${partialCard.card_id}`);
        if (response.ok) {
          const cardData = await response.json();
          logger.log(`Successfully fetched card data for ${partialCard.card_id}:`, cardData);
          return this.transformApiResponse(cardData, partialCard);
        } else {
          logger.warn(`Failed to fetch card data for ${partialCard.card_id}, status: ${response.status}`);
        }
      }

      // PRIORITY 2: Try to fetch from rip.fun API using uniqueId
      if (partialCard.uniqueId) {
        logger.log(`Fetching card data using uniqueId: ${partialCard.uniqueId}`);
        
        // Try the onchain metadata endpoint first (more reliable)
        const onchainResponse = await fetch(`https://rip.fun/api/onchain/card/${partialCard.uniqueId}/metadata`);
        if (onchainResponse.ok) {
          const onchainData = await onchainResponse.json();
          logger.log(`Successfully fetched onchain data for ${partialCard.uniqueId}`);
          
          // Extract card_id from onchain metadata
          const attributesMap = new Map();
          if (onchainData.attributes && Array.isArray(onchainData.attributes)) {
            onchainData.attributes.forEach((attr: any) => {
              if (attr.trait_type && attr.value !== undefined) {
                attributesMap.set(attr.trait_type, attr.value);
              }
            });
          }
          
          const cardId = attributesMap.get('Card Id');
          if (cardId) {
            logger.log(`Extracted card_id from onchain data: ${cardId}`);
            // Now fetch the full card data using the card_id
            const cardResponse = await fetch(`https://api.rip.fun/cards/${cardId}`);
            if (cardResponse.ok) {
              const cardData = await cardResponse.json();
              logger.log(`Successfully fetched full card data for ${cardId}`);
              return this.transformApiResponse(cardData, partialCard);
            }
          }
        }
        
        // Fallback: try direct API call with uniqueId
        const response = await fetch(`https://api.rip.fun/cards/${partialCard.uniqueId}`);
        if (response.ok) {
          const cardData = await response.json();
          return this.transformApiResponse(cardData, partialCard);
        }
      }

      // PRIORITY 3: Fallback search by name and set
      if (partialCard.name && partialCard.set) {
        logger.log(`Searching card by name: ${partialCard.name}, set: ${partialCard.set}`);
        const searchResponse = await fetch(
          `https://api.rip.fun/cards/search?name=${encodeURIComponent(partialCard.name)}&set=${encodeURIComponent(partialCard.set)}`
        );
        if (searchResponse.ok) {
          const searchResults = await searchResponse.json();
          if (searchResults.length > 0) {
            return this.transformApiResponse(searchResults[0], partialCard);
          }
        }
      }

      // Final fallback: create enriched data from available info
      logger.warn(`No card data found for token ${partialCard.tokenId}, using fallback`);
      return this.createFallbackEnrichedData(partialCard);

    } catch (error) {
      logger.error('Error fetching card metadata:', error);
      return this.createFallbackEnrichedData(partialCard);
    }
  }

  /**
   * Transform API response to enriched card data
   */
  private transformApiResponse(apiData: any, partialCard: any): EnrichedCardData {
    return {
      id: apiData.id || `${partialCard.name?.toLowerCase().replace(/\s+/g, '-')}-${partialCard.tokenId}`,
      name: apiData.name || partialCard.name || `Token #${partialCard.tokenId}`,
      card_number: apiData.card_number || apiData.number || '',
      rarity: apiData.rarity || partialCard.rarity || 'Unknown',
      set_id: apiData.set_id || apiData.set?.id || '',
      set_name: apiData.set?.name || partialCard.set || 'Unknown Set',
      large_image_url: apiData.large_image_url || this.buildImageUrl(partialCard.image, 'large'),
      small_image_url: apiData.small_image_url || this.buildImageUrl(partialCard.image, 'small'),
      uniqueId: partialCard.uniqueId || apiData.unique_id || '',
      tokenId: partialCard.tokenId,
      // Backward compatibility
      image: apiData.large_image_url || this.buildImageUrl(partialCard.image, 'large'),
      set: apiData.set?.name || partialCard.set || 'Unknown Set'
    };
  }

  /**
   * Create fallback enriched data when API is unavailable
   * Enhanced to provide better data from existing sales info
   */
  private createFallbackEnrichedData(partialCard: any): EnrichedCardData {
    // Use available data to create a reasonable card ID
    let cardId = partialCard.uniqueId || `token-${partialCard.tokenId}`;
    
    // If we have name and set, create a more meaningful ID
    if (partialCard.name && partialCard.set) {
      const cleanName = partialCard.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const cleanSet = partialCard.set.toLowerCase().replace(/[^a-z0-9]/g, '-');
      cardId = `${cleanSet}-${cleanName}`;
    }
    
    const cardName = partialCard.name || `Token #${partialCard.tokenId}`;
    
    return {
      id: cardId,
      name: cardName,
      card_number: '', // Not available in older metadata
      rarity: partialCard.rarity || 'Unknown',
      set_id: '', // Not available in older metadata
      set_name: partialCard.set || 'Unknown Set',
      large_image_url: this.buildImageUrl(partialCard.image, 'large'),
      small_image_url: this.buildImageUrl(partialCard.image, 'small'),
      uniqueId: partialCard.uniqueId || '',
      tokenId: partialCard.tokenId,
      // Backward compatibility
      image: this.buildImageUrl(partialCard.image, 'large'),
      set: partialCard.set || 'Unknown Set'
    };
  }

  /**
   * Build full image URL from relative path
   * Enhanced to handle different image path formats
   */
  private buildImageUrl(relativePath?: string, size: 'large' | 'small' = 'large'): string {
    if (!relativePath) return '';
    
    // If already a full URL, return as-is
    if (relativePath.startsWith('http')) {
      return relativePath;
    }
    
    // Build full URL for rip.fun images
    const baseUrl = 'https://d2hl7maqck52px.cloudfront.net';
    
    // Handle different path formats
    let imagePath = relativePath;
    if (!imagePath.startsWith('/')) {
      imagePath = `/${imagePath}`;
    }
    
    return `${baseUrl}${imagePath}`;
  }

  /**
   * Batch enrich multiple cards
   */
  async enrichMultipleCards(cards: any[]): Promise<(EnrichedCardData | null)[]> {
    const promises = cards.map(card => this.enrichCardData(card));
    return Promise.all(promises);
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.cardCache.clear();
    this.pendingRequests.clear();
  }
}

// Export singleton instance
export const cardEnrichmentService = CardEnrichmentService.getInstance();
