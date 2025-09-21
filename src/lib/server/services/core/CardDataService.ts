/**
 * CardDataService - Single source of truth for all card database operations
 * This service consolidates all card-related database queries that were previously
 * scattered across multiple services.
 */

import { prisma } from '$lib/server/db/client.js';
import { logger } from '$lib/utils/logger.js';
import type { Card, CardSet } from '@prisma/client';

export interface CardLookupOptions {
  includeSet?: boolean;
  useCache?: boolean;
}

export class CardDataService {
  private static instance: CardDataService;
  
  // Single source of truth for collection mappings
  // Previously duplicated in 3 different services
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
    'sv9': ['Prismatic Evolutions', 'sv9'], // Legacy format
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

  static getInstance(): CardDataService {
    if (!CardDataService.instance) {
      CardDataService.instance = new CardDataService();
    }
    return CardDataService.instance;
  }

  /**
   * Find a card by its unique ID
   */
  async findCardById(id: string, options: CardLookupOptions = {}): Promise<Card | null> {
    try {
      const card = await prisma.card.findUnique({
        where: { id }
      });
      
      if (card) {
        logger.debug(`CardDataService: Found card ${id}`);
      } else {
        logger.debug(`CardDataService: Card ${id} not found`);
      }
      
      return card;
    } catch (error) {
      logger.error(`CardDataService: Error finding card by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Find a card by name, optionally within a specific set
   */
  async findCardByName(name: string, setId?: string): Promise<Card | null> {
    try {
      const whereClause: any = {
        name: { contains: name }
      };
      
      if (setId) {
        const possibleSetNames = this.COLLECTION_TO_SET_MAP[setId] || [setId];
        whereClause.OR = [
          { setName: { in: possibleSetNames } },
          { setId: { in: possibleSetNames } }
        ];
      }
      
      const card = await prisma.card.findFirst({
        where: whereClause,
        orderBy: { name: 'asc' }
      });
      
      if (card) {
        logger.debug(`CardDataService: Found card by name "${name}"${setId ? ` in set ${setId}` : ''}`);
      }
      
      return card;
    } catch (error) {
      logger.error(`CardDataService: Error finding card by name "${name}":`, error);
      return null;
    }
  }

  /**
   * Find all cards in a set
   */
  async findCardsBySet(setId: string): Promise<Card[]> {
    try {
      const possibleSetNames = this.COLLECTION_TO_SET_MAP[setId] || [setId];
      
      const cards = await prisma.card.findMany({
        where: {
          OR: [
            { setName: { in: possibleSetNames } },
            { setId: { in: possibleSetNames } }
          ]
        },
        orderBy: [
          { cardNumber: 'asc' },
          { name: 'asc' }
        ]
      });
      
      logger.debug(`CardDataService: Found ${cards.length} cards in set ${setId}`);
      return cards;
    } catch (error) {
      logger.error(`CardDataService: Error finding cards in set ${setId}:`, error);
      return [];
    }
  }

  /**
   * Check if we have any cards from a specific set/collection
   */
  async checkSetAvailability(setId: string): Promise<boolean> {
    try {
      const possibleSetNames = this.COLLECTION_TO_SET_MAP[setId] || [setId];
      
      const count = await prisma.card.count({
        where: {
          OR: [
            { setName: { in: possibleSetNames } },
            { setId: { in: possibleSetNames } }
          ]
        }
      });
      
      const hasSet = count > 0;
      logger.debug(`CardDataService: Set ${setId} availability: ${hasSet} (${count} cards)`);
      return hasSet;
    } catch (error) {
      logger.error(`CardDataService: Error checking set availability for ${setId}:`, error);
      return false;
    }
  }

  /**
   * Save multiple cards to the database (upsert)
   */
  async saveCards(cards: Partial<Card>[]): Promise<number> {
    let savedCount = 0;
    
    try {
      // Use transaction for bulk operations
      await prisma.$transaction(async (tx) => {
        for (const card of cards) {
          if (!card.id) continue;
          
          await tx.card.upsert({
            where: { id: card.id },
            update: {
              name: card.name,
              cardNumber: card.cardNumber,
              rarity: card.rarity,
              setId: card.setId,
              setName: card.setName,
              largeImageUrl: card.largeImageUrl,
              smallImageUrl: card.smallImageUrl,
              hp: card.hp,
              types: card.types,
              supertype: card.supertype,
              subtype: card.subtype,
              illustrator: card.illustrator,
              marketPrice: card.marketPrice,
              updatedAt: new Date()
            },
            create: {
              id: card.id,
              name: card.name || 'Unknown',
              cardNumber: card.cardNumber,
              rarity: card.rarity,
              setId: card.setId || 'unknown',
              setName: card.setName,
              largeImageUrl: card.largeImageUrl,
              smallImageUrl: card.smallImageUrl,
              hp: card.hp,
              types: card.types,
              supertype: card.supertype,
              subtype: card.subtype,
              illustrator: card.illustrator,
              marketPrice: card.marketPrice
            }
          });
          savedCount++;
        }
      });
      
      logger.log(`CardDataService: Saved ${savedCount} cards to database`);
    } catch (error) {
      logger.error(`CardDataService: Error saving cards:`, error);
    }
    
    return savedCount;
  }

  /**
   * Get statistics about the card database
   */
  async getDatabaseStats(): Promise<{
    totalCards: number;
    totalSets: number;
    sets: Array<{ setId: string; cardCount: number }>;
  }> {
    try {
      const totalCards = await prisma.card.count();
      
      // Get unique sets with counts
      const sets = await prisma.card.groupBy({
        by: ['setId'],
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        }
      });
      
      return {
        totalCards,
        totalSets: sets.length,
        sets: sets.map(s => ({
          setId: s.setId,
          cardCount: s._count.id
        }))
      };
    } catch (error) {
      logger.error('CardDataService: Error getting database stats:', error);
      return {
        totalCards: 0,
        totalSets: 0,
        sets: []
      };
    }
  }

  /**
   * Map a collection name to its set ID
   */
  getSetIdForCollection(collectionName: string): string | null {
    return this.SET_ID_MAP[collectionName] || null;
  }

  /**
   * Get all possible names for a collection/set
   */
  getPossibleSetNames(identifier: string): string[] {
    return this.COLLECTION_TO_SET_MAP[identifier] || [identifier];
  }

  /**
   * Clear all cards from a specific set (use with caution!)
   */
  async clearSet(setId: string): Promise<number> {
    try {
      const possibleSetNames = this.COLLECTION_TO_SET_MAP[setId] || [setId];
      
      const result = await prisma.card.deleteMany({
        where: {
          OR: [
            { setName: { in: possibleSetNames } },
            { setId: { in: possibleSetNames } }
          ]
        }
      });
      
      logger.warn(`CardDataService: Cleared ${result.count} cards from set ${setId}`);
      return result.count;
    } catch (error) {
      logger.error(`CardDataService: Error clearing set ${setId}:`, error);
      return 0;
    }
  }
}

// Export singleton instance
export const cardDataService = CardDataService.getInstance();
