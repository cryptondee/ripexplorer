/**
 * Card Enrichment Engine
 * Handles the complex logic of enriching card data from various sources
 * Extracted from salesMonitor.ts for better separation of concerns
 */

import { prisma } from '$lib/server/db/client.js';
import { cardSyncService } from '$lib/services/CardSyncService.js';
import { logger } from '$lib/utils/logger.js';
import type { TokenMetadata } from '../metadata/TokenMetadataService.js';

export interface CardIdentifiers {
  cardId: string | null;
  serialNumber: string | null;
  collectionName: string | null;
  setName: string | null;
  rarity: string | null;
  isLegacyFormat: boolean;
}

export interface EnrichedCardData {
  cardName: string;
  cardImage: string | null;
  cardUniqueId: string | null;
  cardId: string | null;
  cardRarity: string | null;
  cardSet: string | null;
  enrichmentSource: 'database' | 'database_after_download' | 'database_reconciliation' | 'onchain' | 'fallback';
  setDownloaded?: boolean;
}

export class CardEnrichmentEngine {
  private static instance: CardEnrichmentEngine;
  
  // Collection to set mapping
  private readonly COLLECTION_TO_SET_MAP: Record<string, string[]> = {
    '151': ['151', 'sv3pt5'],
    'Paldean Fates': ['Paldean Fates', 'sv4pt5'],
    'Obsidian Flames': ['Obsidian Flames', 'sv3'],
    'Paradox Rift': ['Paradox Rift', 'sv4'],
    'Temporal Forces': ['Temporal Forces', 'sv5'],
    'Twilight Masquerade': ['Twilight Masquerade', 'sv6'],
    'Shrouded Fable': ['Shrouded Fable', 'sv7'],
    'Stellar Crown': ['Stellar Crown', 'sv8'],
    'Surging Sparks': ['Surging Sparks', 'sv8pt5'],
    'Prismatic Evolutions': ['Prismatic Evolutions', 'sv9'],
    'sv9': ['Prismatic Evolutions', 'sv9'], // Legacy format compatibility
    'Base Set': ['Base Set', 'base1'],
    'Jungle': ['Jungle', 'jungle'],
    'Fossil': ['Fossil', 'fossil']
  };

  private readonly SET_ID_MAP: Record<string, string> = {
    '151': 'sv3pt5',
    'Paldean Fates': 'sv4pt5',
    'Obsidian Flames': 'sv3',
    'Paradox Rift': 'sv4',
    'Temporal Forces': 'sv5',
    'Twilight Masquerade': 'sv6',
    'Shrouded Fable': 'sv7',
    'Stellar Crown': 'sv8',
    'Surging Sparks': 'sv8pt5',
    'Prismatic Evolutions': 'sv9',
    'Base Set': 'base1',
    'Jungle': 'jungle',
    'Fossil': 'fossil'
  };

  static getInstance(): CardEnrichmentEngine {
    if (!CardEnrichmentEngine.instance) {
      CardEnrichmentEngine.instance = new CardEnrichmentEngine();
    }
    return CardEnrichmentEngine.instance;
  }

  /**
   * Main enrichment method - handles both rich and limited metadata
   */
  async enrichCard(metadata: TokenMetadata, isRichMetadata: boolean): Promise<EnrichedCardData> {
    try {
      // Extract identifiers from metadata
      const identifiers = this.extractIdentifiers(metadata);
      logger.log(`📋 Extracted identifiers:`, identifiers);
      
      // For limited metadata, prioritize database reconciliation
      if (!isRichMetadata) {
        logger.log(`🔍 Limited metadata - prioritizing database reconciliation`);
        const reconciledData = await this.attemptDatabaseReconciliation(metadata, identifiers);
        if (reconciledData) {
          return reconciledData;
        }
      }
      
      // Standard enrichment flow
      return await this.standardEnrichmentFlow(metadata, identifiers);
      
    } catch (error) {
      logger.error('❌ Card enrichment failed:', error);
      return this.createFallbackData(metadata);
    }
  }

  /**
   * Extract identifiers from metadata (handles both formats)
   */
  private extractIdentifiers(metadata: TokenMetadata): CardIdentifiers {
    // Handle new format (with attributes array)
    if (metadata.attributes && Array.isArray(metadata.attributes)) {
      const attributesMap = new Map();
      metadata.attributes.forEach((attr) => {
        if (attr.trait_type && attr.value !== undefined) {
          attributesMap.set(attr.trait_type, attr.value);
        }
      });

      return {
        cardId: attributesMap.get('Card Id') || null,
        serialNumber: attributesMap.get('Serial Number') || null,
        collectionName: metadata.collection_name || null,
        setName: attributesMap.get('Set') || null,
        rarity: attributesMap.get('Rarity') || null,
        isLegacyFormat: false
      };
    }
    
    // Handle legacy format (direct fields)
    logger.log('📄 Detected legacy metadata format');
    return {
      cardId: null,
      serialNumber: metadata.unique_id || null,
      collectionName: metadata.set || null,
      setName: metadata.set || null,
      rarity: metadata.rarity || null,
      isLegacyFormat: true
    };
  }

  /**
   * Database reconciliation for limited metadata
   */
  private async attemptDatabaseReconciliation(metadata: TokenMetadata, identifiers: CardIdentifiers): Promise<EnrichedCardData | null> {
    try {
      logger.log(`🔍 Attempting database reconciliation`);
      
      let dbCard = null;
      
      // Strategy 1: Name + Set lookup
      if (metadata.name && identifiers.setName) {
        logger.log(`🎯 Strategy 1: Name + Set lookup`);
        dbCard = await this.lookupCardByNameAndSet(metadata.name, identifiers.setName);
      }
      
      // Strategy 2: Name-only lookup
      if (!dbCard && metadata.name) {
        logger.log(`🎯 Strategy 2: Name-only lookup`);
        dbCard = await this.lookupCardByNameOnly(metadata.name);
      }
      
      if (dbCard) {
        logger.log(`✅ Database reconciliation successful: ${dbCard.name}`);
        return this.createEnrichedDataFromDB(dbCard, identifiers, metadata, false, 'database_reconciliation');
      }
      
      return null;
      
    } catch (error) {
      logger.error('❌ Database reconciliation error:', error);
      return null;
    }
  }

  /**
   * Standard enrichment flow with auto-downloading
   */
  private async standardEnrichmentFlow(metadata: TokenMetadata, identifiers: CardIdentifiers): Promise<EnrichedCardData> {
    // Check collection availability
    let hasCollection = await this.checkCollectionAvailability(identifiers.collectionName);
    let setDownloaded = false;
    
    // Auto-download missing collections
    if (!hasCollection && identifiers.collectionName) {
      const setId = this.SET_ID_MAP[identifiers.collectionName];
      if (setId) {
        logger.log(`📥 Auto-downloading missing set: ${setId}`);
        setDownloaded = await this.downloadSetIfNeeded(setId);
        if (setDownloaded) {
          hasCollection = await this.checkCollectionAvailability(identifiers.collectionName);
        }
      }
    }
    
    // Database lookup
    if (hasCollection) {
      let dbCard = null;
      
      if (identifiers.cardId) {
        dbCard = await this.lookupCardById(identifiers.cardId);
      }
      
      if (!dbCard && metadata.name && identifiers.setName) {
        dbCard = await this.lookupCardByNameAndSet(metadata.name, identifiers.setName);
      }
      
      if (dbCard) {
        return this.createEnrichedDataFromDB(dbCard, identifiers, metadata, setDownloaded);
      }
    }
    
    // Fallback to onchain data
    return this.createEnrichedDataFromOnchain(identifiers, metadata);
  }

  // Database lookup methods
  private async checkCollectionAvailability(collectionName: string | null): Promise<boolean> {
    if (!collectionName) return false;
    
    try {
      const possibleSetNames = this.COLLECTION_TO_SET_MAP[collectionName] || [collectionName];
      const cardCount = await prisma.card.count({
        where: {
          OR: [
            { setName: { in: possibleSetNames } },
            { setId: { in: possibleSetNames } }
          ]
        }
      });
      return cardCount > 0;
    } catch (error) {
      logger.error(`Error checking collection availability:`, error);
      return false;
    }
  }

  private async downloadSetIfNeeded(setId: string): Promise<boolean> {
    try {
      const cardCount = await cardSyncService.syncSet(setId);
      return cardCount > 0;
    } catch (error) {
      logger.error(`Failed to download set ${setId}:`, error);
      return false;
    }
  }

  private async lookupCardById(cardId: string) {
    try {
      return await prisma.card.findUnique({ where: { id: cardId } });
    } catch (error) {
      logger.error(`Error looking up card ${cardId}:`, error);
      return null;
    }
  }

  private async lookupCardByNameAndSet(cardName: string, setName: string) {
    try {
      return await prisma.card.findFirst({
        where: {
          name: { contains: cardName },
          OR: [
            { setName: { contains: setName } },
            { setId: { contains: setName } }
          ]
        }
      });
    } catch (error) {
      logger.error(`Error looking up card by name and set:`, error);
      return null;
    }
  }

  private async lookupCardByNameOnly(cardName: string) {
    try {
      return await prisma.card.findFirst({
        where: { name: { contains: cardName } },
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      logger.error(`Error looking up card by name:`, error);
      return null;
    }
  }

  // Data transformation methods
  private createEnrichedDataFromDB(dbCard: any, identifiers: CardIdentifiers, metadata: TokenMetadata, setDownloaded: boolean, source = 'database'): EnrichedCardData {
    const onchainImageUrl = metadata.image 
      ? `https://d2hl7maqck52px.cloudfront.net/${metadata.image}`
      : null;

    return {
      cardName: dbCard.name,
      cardImage: dbCard.largeImageUrl || onchainImageUrl,
      cardUniqueId: identifiers.serialNumber,
      cardId: identifiers.cardId,
      cardRarity: dbCard.rarity,
      cardSet: dbCard.setName,
      enrichmentSource: setDownloaded ? 'database_after_download' : source as any,
      setDownloaded
    };
  }

  private createEnrichedDataFromOnchain(identifiers: CardIdentifiers, metadata: TokenMetadata): EnrichedCardData {
    const imageUrl = metadata.image 
      ? `https://d2hl7maqck52px.cloudfront.net/${metadata.image}`
      : null;

    return {
      cardName: metadata.name || 'Unknown Card',
      cardImage: imageUrl,
      cardUniqueId: identifiers.serialNumber,
      cardId: identifiers.cardId,
      cardRarity: identifiers.rarity,
      cardSet: identifiers.setName,
      enrichmentSource: 'onchain'
    };
  }

  private createFallbackData(metadata: TokenMetadata): EnrichedCardData {
    return {
      cardName: metadata.name || 'Unknown Card',
      cardImage: null,
      cardUniqueId: null,
      cardId: null,
      cardRarity: null,
      cardSet: null,
      enrichmentSource: 'fallback'
    };
  }
}

// Export singleton instance
export const cardEnrichmentEngine = CardEnrichmentEngine.getInstance();
