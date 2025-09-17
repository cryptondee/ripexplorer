/**
 * Optimized Sales Enrichment Service
 * Implements the improved flow: onchain metadata → collection check → direct DB lookup
 */

import { prisma } from '$lib/server/db/client.js';
import { logger } from '$lib/utils/logger.js';

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
  enrichmentSource: 'database' | 'onchain' | 'fallback';
}

export class OptimizedSalesEnrichment {
  private static instance: OptimizedSalesEnrichment;
  
  // Cache collection availability to avoid repeated DB queries
  private collectionCache = new Map<string, boolean>();

  static getInstance(): OptimizedSalesEnrichment {
    if (!OptimizedSalesEnrichment.instance) {
      OptimizedSalesEnrichment.instance = new OptimizedSalesEnrichment();
    }
    return OptimizedSalesEnrichment.instance;
  }

  /**
   * Main enrichment method - implements the optimized flow
   */
  async enrichSaleFromOnchain(onchainMetadata: OnchainMetadata): Promise<EnrichedSaleData> {
    try {
      logger.log(`🎯 Starting optimized enrichment for: ${onchainMetadata.name}`);
      
      // Step 1: Extract key identifiers from onchain metadata
      const identifiers = this.extractIdentifiers(onchainMetadata);
      logger.log(`📋 Extracted identifiers:`, identifiers);
      
      // Step 2: Check if we have this collection in our database
      const hasCollection = await this.checkCollectionAvailability(identifiers.collectionName);
      
      if (hasCollection && identifiers.cardId) {
        // Step 3: Direct database lookup using card_id
        logger.log(`🗄️ Collection available, looking up card_id: ${identifiers.cardId}`);
        const dbCard = await this.lookupCardById(identifiers.cardId);
        
        if (dbCard) {
          logger.log(`✅ Found in database: ${dbCard.name}`);
          return this.createEnrichedDataFromDB(dbCard, identifiers, onchainMetadata);
        }
      }
      
      // Step 4: Fallback to onchain data only
      logger.log(`📦 Using onchain data only`);
      return this.createEnrichedDataFromOnchain(identifiers, onchainMetadata);
      
    } catch (error) {
      logger.error('❌ Enrichment failed:', error);
      return this.createFallbackData(onchainMetadata);
    }
  }

  /**
   * Extract identifiers from onchain metadata attributes
   */
  private extractIdentifiers(metadata: OnchainMetadata): {
    cardId: string | null;
    serialNumber: string | null;
    collectionName: string;
    setName: string | null;
    rarity: string | null;
  } {
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

  /**
   * Check if we have cards from this collection in our database
   */
  private async checkCollectionAvailability(collectionName: string): Promise<boolean> {
    // Check cache first
    if (this.collectionCache.has(collectionName)) {
      return this.collectionCache.get(collectionName)!;
    }

    try {
      // Map collection names to set names in our database
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
      
      // Check if we have any cards from these sets
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
      
      logger.log(`📊 Collection "${collectionName}": ${hasCollection ? 'AVAILABLE' : 'NOT AVAILABLE'} (${cardCount} cards)`);
      return hasCollection;
      
    } catch (error) {
      logger.error(`Error checking collection availability for ${collectionName}:`, error);
      this.collectionCache.set(collectionName, false);
      return false;
    }
  }

  /**
   * Direct database lookup by card ID
   */
  private async lookupCardById(cardId: string): Promise<any | null> {
    try {
      return await prisma.card.findUnique({
        where: { id: cardId }
      });
    } catch (error) {
      logger.error(`Error looking up card ${cardId}:`, error);
      return null;
    }
  }

  /**
   * Create enriched data from database card
   */
  private createEnrichedDataFromDB(dbCard: any, identifiers: any, metadata: OnchainMetadata): EnrichedSaleData {
    const onchainImageUrl = metadata.image 
      ? `https://d2hl7maqck52px.cloudfront.net/${metadata.image}`
      : null;

    return {
      // Basic info
      cardName: dbCard.name,
      cardImage: dbCard.largeImageUrl || onchainImageUrl,
      cardUniqueId: identifiers.serialNumber,
      cardId: identifiers.cardId,
      cardRarity: dbCard.rarity,
      cardSet: dbCard.setName,
      
      // Rich database info
      cardNumber: dbCard.cardNumber,
      setId: dbCard.setId,
      largeImageUrl: dbCard.largeImageUrl,
      smallImageUrl: dbCard.smallImageUrl,
      hp: dbCard.hp,
      types: dbCard.types,
      supertype: dbCard.supertype,
      subtype: dbCard.subtype,
      marketPrice: dbCard.marketPrice,
      
      enrichmentSource: 'database'
    };
  }

  /**
   * Create enriched data from onchain metadata only
   */
  private createEnrichedDataFromOnchain(identifiers: any, metadata: OnchainMetadata): EnrichedSaleData {
    const imageUrl = metadata.image 
      ? `https://d2hl7maqck52px.cloudfront.net/${metadata.image}`
      : null;

    return {
      // Basic info from onchain
      cardName: metadata.name,
      cardImage: imageUrl,
      cardUniqueId: identifiers.serialNumber,
      cardId: identifiers.cardId,
      cardRarity: identifiers.rarity,
      cardSet: identifiers.setName,
      
      // No rich data available
      cardNumber: null,
      setId: null,
      largeImageUrl: imageUrl,
      smallImageUrl: imageUrl,
      hp: null,
      types: null,
      supertype: null,
      subtype: null,
      marketPrice: null,
      
      enrichmentSource: 'onchain'
    };
  }

  /**
   * Create fallback data when everything fails
   */
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

  /**
   * Clear collection cache (useful for testing)
   */
  clearCache(): void {
    this.collectionCache.clear();
  }
}

// Export singleton
export const optimizedSalesEnrichment = OptimizedSalesEnrichment.getInstance();
