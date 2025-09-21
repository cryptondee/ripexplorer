/**
 * AutoDownloadStrategy
 * Downloads missing sets when needed, then retries database lookup
 * This replaces the auto-download logic from AutoEnrichingSalesService
 */

import { BaseEnrichmentStrategy, type CardMetadata, type EnrichedCardData } from './EnrichmentStrategy.js';
import { cardDataService } from '../core/CardDataService.js';
import { cardSyncService } from '$lib/services/CardSyncService.js';
import { logger } from '$lib/utils/logger.js';

export class AutoDownloadStrategy extends BaseEnrichmentStrategy {
  name = 'AutoDownload';
  priority = 90; // High priority - try after initial database lookup

  // Track downloads in progress to avoid duplicates
  private static downloadingCollections = new Set<string>();

  /**
   * Can enrich if we have collection info and haven't downloaded it yet
   */
  canEnrich(metadata: CardMetadata): boolean {
    const identifiers = this.extractIdentifiers(metadata);
    const collectionName = identifiers.collectionName;
    
    if (!collectionName) return false;
    
    // Don't try if already downloading
    const setId = cardDataService.getSetIdForCollection(collectionName);
    if (setId && AutoDownloadStrategy.downloadingCollections.has(setId)) {
      return false;
    }
    
    return true;
  }

  /**
   * Download missing set and retry database lookup
   */
  async enrich(metadata: CardMetadata): Promise<EnrichedCardData | null> {
    const identifiers = this.extractIdentifiers(metadata);
    const collectionName = identifiers.collectionName;
    
    if (!collectionName) return null;

    // Check if collection exists
    const hasCollection = await cardDataService.checkSetAvailability(collectionName);
    if (hasCollection) {
      // Collection exists, no need to download
      return null;
    }

    // Get set ID for downloading
    const setId = cardDataService.getSetIdForCollection(collectionName);
    if (!setId) {
      logger.debug(`${this.name}: No set mapping for collection "${collectionName}"`);
      return null;
    }

    // Download the set
    logger.log(`${this.name}: Downloading missing set ${setId} for collection "${collectionName}"`);
    
    try {
      AutoDownloadStrategy.downloadingCollections.add(setId);
      
      const cardCount = await cardSyncService.syncSet(setId);
      
      if (cardCount === 0) {
        logger.warn(`${this.name}: No cards downloaded for set ${setId}`);
        return null;
      }
      
      logger.log(`${this.name}: Downloaded ${cardCount} cards for set ${setId}`);
      
      // Now try database lookup again
      let dbCard = null;
      
      if (identifiers.cardId) {
        dbCard = await cardDataService.findCardById(identifiers.cardId);
      }
      
      if (!dbCard && metadata.name && identifiers.setName) {
        dbCard = await cardDataService.findCardByName(metadata.name, identifiers.setName);
      }
      
      if (!dbCard && metadata.name) {
        dbCard = await cardDataService.findCardByName(metadata.name);
      }
      
      if (dbCard) {
        logger.log(`${this.name}: Found card after download: ${dbCard.name}`);
        
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
          enrichmentSource: 'database_after_download' as any,
          setDownloaded: true
        };
      }
      
      return null;
      
    } catch (error) {
      logger.error(`${this.name}: Failed to download set ${setId}:`, error);
      return null;
    } finally {
      AutoDownloadStrategy.downloadingCollections.delete(setId);
    }
  }

  /**
   * Get list of currently downloading collections
   */
  static getDownloadingCollections(): string[] {
    return Array.from(AutoDownloadStrategy.downloadingCollections);
  }
}
