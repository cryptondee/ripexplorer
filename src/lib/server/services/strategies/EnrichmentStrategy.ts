/**
 * EnrichmentStrategy Interface
 * Defines the contract for all card enrichment strategies
 * This allows us to swap strategies without changing consuming code
 */

export interface CardMetadata {
  // Common fields across all metadata types
  name?: string;
  collection_name?: string;
  image?: string;
  set?: string;
  rarity?: string;
  attributes?: Array<{
    trait_type: string;
    value: any;
  }>;
  // Legacy fields
  unique_id?: string;
  card_id?: string;
}

export interface EnrichedCardData {
  cardName: string;
  cardImage: string | null;
  cardUniqueId: string | null;
  cardId: string | null;
  cardRarity: string | null;
  cardSet: string | null;
  cardNumber?: string | null;
  setId?: string | null;
  largeImageUrl?: string | null;
  smallImageUrl?: string | null;
  hp?: number | null;
  types?: string | null;
  supertype?: string | null;
  subtype?: string | null;
  marketPrice?: number | null;
  enrichmentSource: 'database' | 'database_after_download' | 'onchain' | 'fallback';
  setDownloaded?: boolean;
}

/**
 * Base interface for all enrichment strategies
 */
export interface EnrichmentStrategy {
  /**
   * Name of the strategy for logging/debugging
   */
  name: string;

  /**
   * Priority (higher = tried first)
   * Database: 100, Onchain: 50, Fallback: 0
   */
  priority: number;

  /**
   * Check if this strategy can handle the given metadata
   */
  canEnrich(metadata: CardMetadata): boolean;

  /**
   * Attempt to enrich the card data
   * Returns null if enrichment fails
   */
  enrich(metadata: CardMetadata): Promise<EnrichedCardData | null>;
}

/**
 * Base abstract class with common functionality
 */
export abstract class BaseEnrichmentStrategy implements EnrichmentStrategy {
  abstract name: string;
  abstract priority: number;

  abstract canEnrich(metadata: CardMetadata): boolean;
  abstract enrich(metadata: CardMetadata): Promise<EnrichedCardData | null>;

  /**
   * Extract card identifiers from metadata
   * Common logic used by multiple strategies
   */
  protected extractIdentifiers(metadata: CardMetadata) {
    const identifiers = {
      cardId: null as string | null,
      serialNumber: null as string | null,
      collectionName: metadata.collection_name || metadata.set || null,
      setName: null as string | null,
      rarity: metadata.rarity || null
    };

    // Extract from attributes if available
    if (metadata.attributes && Array.isArray(metadata.attributes)) {
      const attributesMap = new Map();
      metadata.attributes.forEach((attr) => {
        if (attr.trait_type && attr.value !== undefined) {
          attributesMap.set(attr.trait_type, attr.value);
        }
      });

      identifiers.cardId = attributesMap.get('Card Id') || metadata.card_id || null;
      identifiers.serialNumber = attributesMap.get('Serial Number') || metadata.unique_id || null;
      identifiers.setName = attributesMap.get('Set') || metadata.set || null;
      identifiers.rarity = attributesMap.get('Rarity') || metadata.rarity || null;
    }

    return identifiers;
  }

  /**
   * Build cloudfront image URL
   */
  protected buildImageUrl(imagePath: string | undefined): string | null {
    if (!imagePath) return null;
    return `https://d2hl7maqck52px.cloudfront.net/${imagePath}`;
  }
}
