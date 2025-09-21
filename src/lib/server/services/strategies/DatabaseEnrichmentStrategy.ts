/**
 * DatabaseEnrichmentStrategy
 * Primary strategy that looks up cards in our local database
 */

import { BaseEnrichmentStrategy, type CardMetadata, type EnrichedCardData } from './EnrichmentStrategy.js';
import { cardDataService } from '../core/CardDataService.js';
import { logger } from '$lib/utils/logger.js';

export class DatabaseEnrichmentStrategy extends BaseEnrichmentStrategy {
  name = 'DatabaseEnrichment';
  priority = 100; // Highest priority - try database first

  /**
   * Can enrich if we have a card ID or name
   */
  canEnrich(metadata: CardMetadata): boolean {
    const identifiers = this.extractIdentifiers(metadata);
    return !!(identifiers.cardId || metadata.name);
  }

  /**
   * Enrich from database
   */
  async enrich(metadata: CardMetadata): Promise<EnrichedCardData | null> {
    try {
      const identifiers = this.extractIdentifiers(metadata);
      logger.debug(`${this.name}: Attempting database enrichment`, { 
        cardId: identifiers.cardId,
        name: metadata.name 
      });

      let dbCard = null;

      // Try by card ID first (most accurate)
      if (identifiers.cardId) {
        dbCard = await cardDataService.findCardById(identifiers.cardId);
      }

      // Fallback to name + set
      if (!dbCard && metadata.name && identifiers.setName) {
        dbCard = await cardDataService.findCardByName(metadata.name, identifiers.setName);
      }

      // Last resort: name only
      if (!dbCard && metadata.name) {
        dbCard = await cardDataService.findCardByName(metadata.name);
      }

      if (!dbCard) {
        logger.debug(`${this.name}: No database match found`);
        return null;
      }

      logger.log(`${this.name}: Found card in database: ${dbCard.name}`);

      // Build enriched response
      const onchainImage = this.buildImageUrl(metadata.image);
      
      return {
        cardName: dbCard.name,
        cardImage: dbCard.largeImageUrl || onchainImage,
        cardUniqueId: identifiers.serialNumber,
        cardId: identifiers.cardId || dbCard.id,
        cardRarity: dbCard.rarity || identifiers.rarity,
        cardSet: dbCard.setName || identifiers.collectionName,
        cardNumber: dbCard.cardNumber,
        setId: dbCard.setId,
        largeImageUrl: dbCard.largeImageUrl,
        smallImageUrl: dbCard.smallImageUrl,
        hp: dbCard.hp,
        types: dbCard.types,
        supertype: dbCard.supertype,
        subtype: dbCard.subtype,
        marketPrice: dbCard.marketPrice,
        enrichmentSource: 'database',
        setDownloaded: false
      };
    } catch (error) {
      logger.error(`${this.name}: Enrichment failed`, error);
      return null;
    }
  }
}
