/**
 * FallbackEnrichmentStrategy
 * Last resort strategy that always returns something
 * Uses only the metadata provided without any lookups
 */

import { BaseEnrichmentStrategy, type CardMetadata, type EnrichedCardData } from './EnrichmentStrategy.js';
import { logger } from '$lib/utils/logger.js';

export class FallbackEnrichmentStrategy extends BaseEnrichmentStrategy {
  name = 'FallbackEnrichment';
  priority = 0; // Lowest priority - last resort

  /**
   * Always can enrich (last resort)
   */
  canEnrich(_metadata: CardMetadata): boolean {
    return true;
  }

  /**
   * Create basic enriched data from whatever metadata we have
   */
  async enrich(metadata: CardMetadata): Promise<EnrichedCardData | null> {
    logger.debug(`${this.name}: Using fallback enrichment`);
    
    const identifiers = this.extractIdentifiers(metadata);
    const imageUrl = this.buildImageUrl(metadata.image);

    return {
      cardName: metadata.name || 'Unknown Card',
      cardImage: imageUrl,
      cardUniqueId: identifiers.serialNumber,
      cardId: identifiers.cardId,
      cardRarity: identifiers.rarity,
      cardSet: identifiers.collectionName || identifiers.setName,
      enrichmentSource: 'fallback',
      setDownloaded: false
    };
  }
}
