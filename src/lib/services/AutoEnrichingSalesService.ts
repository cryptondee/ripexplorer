/**
 * Auto-Enriching Sales Service
 * Enhanced version that automatically downloads missing sets for maximum enrichment
 */

import { prisma } from '$lib/server/db/client.js';
import { logger } from '$lib/utils/logger.js';
import { cardSyncService } from './CardSyncService.js';

export interface OnchainMetadata {
  collection_name: string;
  name: string;
  image?: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

export interface EnrichedSaleData {
  // Basic sale info
  cardName: string;
  cardImage: string | null;
  cardUniqueId: string | null;
  cardId: string | null;
  cardRarity: string | null;
  cardSet: string | null;
  
  // Rich data from local DB
  cardNumber: string | null;
  setId: string | null;
  largeImageUrl: string | null;
  smallImageUrl: string | null;
  hp: number | null;
  types: string | null;
  supertype: string | null;
  subtype: string | null;
  marketPrice: number | null;
  
  // Status
  enrichmentSource: 'database' | 'database_after_download' | 'onchain' | 'fallback';
  setDownloaded?: boolean;
}

export class AutoEnrichingSalesService {
  private static instance: AutoEnrichingSalesService;
  
  // Cache collection availability to avoid repeated DB queries
  private collectionCache = new Map<string, boolean>();
  
  // Track ongoing downloads to avoid duplicates
  private downloadingCollections = new Set<string>();
  
  // Popular sets to preload (ordered by priority)
  private readonly PRIORITY_SETS = [
    'sv3pt5',    // 151 (most popular)
    'sv4pt5',    // Paldean Fates
    'sv3',       // Obsidian Flames
    'sv4',       // Paradox Rift
    'sv5',       // Temporal Forces
    'sv6',       // Twilight Masquerade
    'sv7',       // Shrouded Fable
    'sv8',       // Stellar Crown
    'sv9',       // Prismatic Evolutions
    'base1',     // Base Set (classic)
    'jungle',    // Jungle
    'fossil'     // Fossil
  ];

  static getInstance(): AutoEnrichingSalesService {
    if (!AutoEnrichingSalesService.instance) {
      AutoEnrichingSalesService.instance = new AutoEnrichingSalesService();
    }
    return AutoEnrichingSalesService.instance;
  }

  /**
   * Main enrichment method with auto-downloading
   */
  async enrichSaleFromOnchain(onchainMetadata: OnchainMetadata): Promise<EnrichedSaleData> {
    try {
      logger.log(`🎯 Starting auto-enriching for: ${onchainMetadata.name}`);
      
      // Step 1: Extract key identifiers
      const identifiers = this.extractIdentifiers(onchainMetadata);
      logger.log(`📋 Extracted identifiers:`, identifiers);
      
      // Step 2: Check if we have this collection
      let hasCollection = await this.checkCollectionAvailability(identifiers.collectionName);
      let setDownloaded = false;
      
      // Step 3: If collection missing, try to download it
      if (!hasCollection && identifiers.collectionName) {
        const setId = this.mapCollectionToSetId(identifiers.collectionName);
        if (setId) {
          logger.log(`📥 Collection missing, attempting to download set: ${setId}`);
          setDownloaded = await this.downloadSetIfNeeded(setId);
          
          if (setDownloaded) {
            // Recheck availability after download
            this.collectionCache.delete(identifiers.collectionName); // Clear cache
            hasCollection = await this.checkCollectionAvailability(identifiers.collectionName);
            logger.log(`🔄 Post-download availability: ${hasCollection}`);
          }
        }
      }
      
      // Step 4: Try database lookup
      if (hasCollection && identifiers.cardId) {
        logger.log(`🗄️ Looking up card_id: ${identifiers.cardId}`);
        const dbCard = await this.lookupCardById(identifiers.cardId);
        
        if (dbCard) {
          logger.log(`✅ Found in database: ${dbCard.name}`);
          return this.createEnrichedDataFromDB(
            dbCard, 
            identifiers, 
            onchainMetadata, 
            setDownloaded ? 'database_after_download' : 'database',
            setDownloaded
          );
        }
      }
      
      // Step 5: Fallback to onchain data
      logger.log(`📦 Using onchain data only`);
      return this.createEnrichedDataFromOnchain(identifiers, onchainMetadata, setDownloaded);
      
    } catch (error) {
      logger.error('❌ Auto-enrichment failed:', error);
      return this.createFallbackData(onchainMetadata);
    }
  }

  /**
   * Preload popular sets for better performance
   */
  async preloadPopularSets(): Promise<void> {
    logger.log('🚀 Starting preload of popular sets...');
    
    try {
      const stats = await cardSyncService.getSyncStats();
      logger.log(`📊 Current database: ${stats.totalCards} cards, ${stats.totalSets} sets`);
      
      let downloadedSets = 0;
      
      for (const setId of this.PRIORITY_SETS) {
        try {
          // Check if we already have this set
          const hasSet = await this.checkSetAvailability(setId);
          
          if (!hasSet) {
            logger.log(`📥 Preloading set: ${setId}`);
            const cardCount = await cardSyncService.syncSet(setId);
            
            if (cardCount > 0) {
              downloadedSets++;
              logger.log(`✅ Preloaded ${cardCount} cards from ${setId}`);
            }
            
            // Small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            logger.log(`⏭️ Set ${setId} already available`);
          }
        } catch (error) {
          logger.error(`❌ Failed to preload set ${setId}:`, error);
        }
      }
      
      const finalStats = await cardSyncService.getSyncStats();
      logger.log(`🎉 Preload complete! Downloaded ${downloadedSets} sets. Total: ${finalStats.totalCards} cards`);
      
    } catch (error) {
      logger.error('❌ Preload failed:', error);
    }
  }

  /**
   * Download a set if not already downloading
   */
  private async downloadSetIfNeeded(setId: string): Promise<boolean> {
    // Prevent duplicate downloads
    if (this.downloadingCollections.has(setId)) {
      logger.log(`⏳ Set ${setId} already downloading, skipping`);
      return false;
    }
    
    try {
      this.downloadingCollections.add(setId);
      
      const cardCount = await cardSyncService.syncSet(setId);
      
      if (cardCount > 0) {
        logger.log(`✅ Successfully downloaded ${cardCount} cards from ${setId}`);
        return true;
      } else {
        logger.warn(`⚠️ No cards downloaded from ${setId}`);
        return false;
      }
      
    } catch (error) {
      logger.error(`❌ Failed to download set ${setId}:`, error);
      return false;
    } finally {
      this.downloadingCollections.delete(setId);
    }
  }

  /**
   * Check if we have a specific set by setId
   */
  private async checkSetAvailability(setId: string): Promise<boolean> {
    try {
      const cardCount = await prisma.card.count({
        where: {
          OR: [
            { setId: setId },
            { setName: setId }
          ]
        }
      });
      return cardCount > 0;
    } catch (error) {
      logger.error(`Error checking set availability for ${setId}:`, error);
      return false;
    }
  }

  /**
   * Map collection name to set ID for downloading
   */
  private mapCollectionToSetId(collectionName: string): string | null {
    const collectionToSetMap: Record<string, string> = {
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
    
    return collectionToSetMap[collectionName] || null;
  }

  // ... (Include all other methods from OptimizedSalesEnrichment)
  
  private extractIdentifiers(metadata: OnchainMetadata) {
    const attributesMap = new Map();
    
    if (metadata.attributes && Array.isArray(metadata.attributes)) {
      metadata.attributes.forEach((attr) => {
        if (attr.trait_type && attr.value !== undefined) {
          attributesMap.set(attr.trait_type, attr.value);
        }
      });
    }

    return {
      cardId: attributesMap.get('Card Id') || null,
      serialNumber: attributesMap.get('Serial Number') || null,
      collectionName: metadata.collection_name,
      setName: attributesMap.get('Set') || null,
      rarity: attributesMap.get('Rarity') || null
    };
  }

  private async checkCollectionAvailability(collectionName: string): Promise<boolean> {
    if (this.collectionCache.has(collectionName)) {
      return this.collectionCache.get(collectionName)!;
    }

    try {
      const collectionToSetMap: Record<string, string[]> = {
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
        'Base Set': ['Base Set', 'base1'],
        'Jungle': ['Jungle', 'jungle'],
        'Fossil': ['Fossil', 'fossil']
      };

      const possibleSetNames = collectionToSetMap[collectionName] || [collectionName];
      
      const cardCount = await prisma.card.count({
        where: {
          OR: [
            { setName: { in: possibleSetNames } },
            { setId: { in: possibleSetNames } }
          ]
        }
      });

      const hasCollection = cardCount > 0;
      this.collectionCache.set(collectionName, hasCollection);
      return hasCollection;
      
    } catch (error) {
      logger.error(`Error checking collection availability:`, error);
      this.collectionCache.set(collectionName, false);
      return false;
    }
  }

  private async lookupCardById(cardId: string) {
    try {
      return await prisma.card.findUnique({
        where: { id: cardId }
      });
    } catch (error) {
      logger.error(`Error looking up card ${cardId}:`, error);
      return null;
    }
  }

  private createEnrichedDataFromDB(dbCard: any, identifiers: any, metadata: OnchainMetadata, source: string, setDownloaded?: boolean): EnrichedSaleData {
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
      cardNumber: dbCard.cardNumber,
      setId: dbCard.setId,
      largeImageUrl: dbCard.largeImageUrl,
      smallImageUrl: dbCard.smallImageUrl,
      hp: dbCard.hp,
      types: dbCard.types,
      supertype: dbCard.supertype,
      subtype: dbCard.subtype,
      marketPrice: dbCard.marketPrice,
      enrichmentSource: source as any,
      setDownloaded
    };
  }

  private createEnrichedDataFromOnchain(identifiers: any, metadata: OnchainMetadata, setDownloaded?: boolean): EnrichedSaleData {
    const imageUrl = metadata.image 
      ? `https://d2hl7maqck52px.cloudfront.net/${metadata.image}`
      : null;

    return {
      cardName: metadata.name,
      cardImage: imageUrl,
      cardUniqueId: identifiers.serialNumber,
      cardId: identifiers.cardId,
      cardRarity: identifiers.rarity,
      cardSet: identifiers.setName,
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
      setDownloaded
    };
  }

  private createFallbackData(metadata: OnchainMetadata): EnrichedSaleData {
    return {
      cardName: metadata.name || 'Unknown Card',
      cardImage: null,
      cardUniqueId: null,
      cardId: null,
      cardRarity: null,
      cardSet: metadata.collection_name || null,
      cardNumber: null,
      setId: null,
      largeImageUrl: null,
      smallImageUrl: null,
      hp: null,
      types: null,
      supertype: null,
      subtype: null,
      marketPrice: null,
      enrichmentSource: 'fallback'
    };
  }
}

// Export singleton
export const autoEnrichingSalesService = AutoEnrichingSalesService.getInstance();
