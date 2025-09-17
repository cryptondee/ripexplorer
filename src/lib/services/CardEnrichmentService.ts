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
  }): Promise<EnrichedCardData | null> {
    try {
      // Try to fetch from rip.fun API using uniqueId
      if (partialCard.uniqueId) {
        const response = await fetch(`https://api.rip.fun/cards/${partialCard.uniqueId}`);
        if (response.ok) {
          const cardData = await response.json();
          return this.transformApiResponse(cardData, partialCard);
        }
      }

      // Fallback: search by name and set
      if (partialCard.name && partialCard.set) {
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
   */
  private createFallbackEnrichedData(partialCard: any): EnrichedCardData {
    const cardId = partialCard.uniqueId || `token-${partialCard.tokenId}`;
    const cardName = partialCard.name || `Token #${partialCard.tokenId}`;
    
    return {
      id: cardId,
      name: cardName,
      card_number: '',
      rarity: partialCard.rarity || 'Unknown',
      set_id: '',
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
   */
  private buildImageUrl(relativePath?: string, size: 'large' | 'small' = 'large'): string {
    if (!relativePath) return '';
    
    // If already a full URL, return as-is
    if (relativePath.startsWith('http')) {
      return relativePath;
    }
    
    // Build full URL for rip.fun images
    const baseUrl = 'https://d2hl7maqck52px.cloudfront.net';
    return `${baseUrl}/${relativePath}`;
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
