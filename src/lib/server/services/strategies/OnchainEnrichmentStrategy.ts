/**
 * OnchainEnrichmentStrategy
 * Uses only the metadata from the blockchain (no database lookup)
 * This is our fallback when database doesn't have the card
 */

import { BaseEnrichmentStrategy, type CardMetadata, type EnrichedCardData } from './EnrichmentStrategy.js';
import { logger } from '$lib/utils/logger.js';

export class OnchainEnrichmentStrategy extends BaseEnrichmentStrategy {
  name = 'OnchainEnrichment';
  priority = 50; // Medium priority - try after database

  /**
   * Can enrich if we have at least a name
   */
  canEnrich(metadata: CardMetadata): boolean {
    return !!(metadata.name || metadata.collection_name);
  }

  /**
   * Create enriched data from blockchain metadata only
   */
  async enrich(metadata: CardMetadata): Promise<EnrichedCardData | null> {
    try {
      const identifiers = this.extractIdentifiers(metadata);
      logger.debug(`${this.name}: Using onchain data only for ${metadata.name}`);

      const imageUrl = this.buildImageUrl(metadata.image);

      return {
        cardName: metadata.name || 'Unknown Card',
        cardImage: imageUrl,
        cardUniqueId: identifiers.serialNumber,
        cardId: identifiers.cardId,
        cardRarity: identifiers.rarity,
        cardSet: identifiers.setName || identifiers.collectionName,
        // These fields are not available from onchain
        cardNumber: null,
        setId: null,
        largeImageUrl: imageUrl,
        smallImageUrl: imageUrl,
        hp: null,
        types: null,
        supertype: null,
        subtype: null,
        marketPrice: null,
        enrichmentSource: 'onchain',
        setDownloaded: false
      };
    } catch (error) {
      logger.error(`${this.name}: Enrichment failed`, error);
      return null;
    }
  }
}
