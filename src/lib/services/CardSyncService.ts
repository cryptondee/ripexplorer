/**
 * Card Sync Service
 * Downloads and maintains a complete database of all Pokemon cards from rip.fun
 */

import { prisma } from '$lib/server/db/client.js';
import { EXTERNAL_URLS } from '$lib/constants/urls.js';
import { createRipFunFetchOptions } from '$lib/constants/http.js';
import { logger } from '$lib/utils/logger.js';

export interface CardData {
  id: string;
  name: string;
  card_number?: string;
  rarity?: string;
  set_id: string;
  set?: {
    id: string;
    name: string;
    series?: string;
  };
  large_image_url?: string;
  small_image_url?: string;
  hp?: number;
  types?: string[];
  supertype?: string;
  subtype?: string;
  illustrator?: string;
  tcgplayer_id?: string;
  is_chase?: boolean;
  is_reverse?: boolean;
  is_holo?: boolean;
  raw_price?: number;
}

export class CardSyncService {
  private static instance: CardSyncService;

  static getInstance(): CardSyncService {
    if (!CardSyncService.instance) {
      CardSyncService.instance = new CardSyncService();
    }
    return CardSyncService.instance;
  }

  /**
   * Sync all cards from all known sets
   */
  async syncAllCards(): Promise<void> {
    logger.log('🚀 Starting complete card database sync...');
    
    try {
      // First, get all known sets from existing data
      const knownSets = await this.getKnownSets();
      logger.log(`📊 Found ${knownSets.length} known sets to sync`);
      
      let totalCards = 0;
      let totalSets = 0;
      
      for (const setId of knownSets) {
        try {
          const cardCount = await this.syncSet(setId);
          totalCards += cardCount;
          totalSets++;
          logger.log(`✅ Synced set ${setId}: ${cardCount} cards`);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          logger.error(`❌ Failed to sync set ${setId}:`, error);
        }
      }
      
      logger.log(`🎉 Card sync complete! ${totalSets} sets, ${totalCards} total cards`);
    } catch (error) {
      logger.error('❌ Card sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync cards from a specific set
   */
  async syncSet(setId: string): Promise<number> {
    logger.log(`📥 Syncing set: ${setId}`);
    
    try {
      // Fetch set data from rip.fun API
      const apiUrl = EXTERNAL_URLS.RIP_FUN.API_SET_CARDS(setId, {
        page: '1',
        limit: '1000',
        sort: 'number-asc',
        all: 'true'
      });
      
      const response = await fetch(apiUrl, createRipFunFetchOptions());
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.cards || !Array.isArray(data.cards)) {
        throw new Error('Invalid response format');
      }
      
      // Update set information
      await this.upsertSet({
        id: setId,
        name: data.set?.name || `Set ${setId}`,
        series: data.set?.series,
        totalCards: data.total_cards || data.cards.length,
        releaseDate: data.set?.release_date
      });
      
      // Sync all cards in the set
      let syncedCount = 0;
      for (const cardData of data.cards) {
        try {
          await this.upsertCard(cardData);
          syncedCount++;
        } catch (error) {
          logger.warn(`Failed to sync card ${cardData.id}:`, error);
        }
      }
      
      // Update set card count
      await prisma.cardSet.update({
        where: { id: setId },
        data: { 
          cardCount: syncedCount,
          lastSynced: new Date()
        }
      });
      
      return syncedCount;
    } catch (error) {
      logger.error(`Failed to sync set ${setId}:`, error);
      throw error;
    }
  }

  /**
   * Get all known sets from various sources
   */
  private async getKnownSets(): Promise<string[]> {
    const setIds = new Set<string>();
    
    // Get sets from existing sales data
    const salesSets = await prisma.salesEvent.findMany({
      select: { cardSet: true },
      where: { cardSet: { not: null } },
      distinct: ['cardSet']
    });
    
    // Map set names to set IDs (this is a simplified mapping)
    const setNameToId: Record<string, string> = {
      'Base Set': 'base1',
      'Jungle': 'jungle',
      'Fossil': 'fossil',
      'Team Rocket': 'teamrocket',
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
      'Journey Together': 'sv10',
      'Chilling Reign': 'swsh6',
      'Battle Styles': 'swsh5',
      'Vivid Voltage': 'swsh4',
      'Darkness Ablaze': 'swsh3',
      'Rebel Clash': 'swsh2',
      'Sword & Shield': 'swsh1'
    };
    
    salesSets.forEach(sale => {
      if (sale.cardSet) {
        const setId = setNameToId[sale.cardSet];
        if (setId) {
          setIds.add(setId);
        }
      }
    });
    
    // Add some popular sets if not found
    const popularSets = ['sv3pt5', 'sv4pt5', 'sv3', 'sv4', 'sv5', 'sv6', 'sv7', 'sv8', 'sv9', 'base1'];
    popularSets.forEach(setId => setIds.add(setId));
    
    return Array.from(setIds);
  }

  /**
   * Insert or update a card in the database
   */
  private async upsertCard(cardData: CardData): Promise<void> {
    await prisma.card.upsert({
      where: { id: cardData.id },
      update: {
        name: cardData.name,
        cardNumber: cardData.card_number || null,
        rarity: cardData.rarity || null,
        setId: cardData.set_id,
        setName: cardData.set?.name || null,
        largeImageUrl: cardData.large_image_url || null,
        smallImageUrl: cardData.small_image_url || null,
        hp: cardData.hp || null,
        types: cardData.types ? JSON.stringify(cardData.types) : null,
        supertype: cardData.supertype || null,
        subtype: Array.isArray(cardData.subtype) ? cardData.subtype.join(', ') : (cardData.subtype || null),
        illustrator: cardData.illustrator || null,
        tcgplayerId: cardData.tcgplayer_id || null,
        isChase: cardData.is_chase || false,
        isReverse: cardData.is_reverse || false,
        isHolo: cardData.is_holo || false,
        marketPrice: cardData.raw_price ? parseFloat(cardData.raw_price.toString()) : null,
        updatedAt: new Date()
      },
      create: {
        id: cardData.id,
        name: cardData.name,
        cardNumber: cardData.card_number || null,
        rarity: cardData.rarity || null,
        setId: cardData.set_id,
        setName: cardData.set?.name || null,
        largeImageUrl: cardData.large_image_url || null,
        smallImageUrl: cardData.small_image_url || null,
        hp: cardData.hp || null,
        types: cardData.types ? JSON.stringify(cardData.types) : null,
        supertype: cardData.supertype || null,
        subtype: Array.isArray(cardData.subtype) ? cardData.subtype.join(', ') : (cardData.subtype || null),
        illustrator: cardData.illustrator || null,
        tcgplayerId: cardData.tcgplayer_id || null,
        isChase: cardData.is_chase || false,
        isReverse: cardData.is_reverse || false,
        isHolo: cardData.is_holo || false,
        marketPrice: cardData.raw_price ? parseFloat(cardData.raw_price.toString()) : null
      }
    });
  }

  /**
   * Insert or update a set in the database
   */
  private async upsertSet(setData: {
    id: string;
    name: string;
    series?: string;
    totalCards?: number;
    releaseDate?: string;
  }): Promise<void> {
    await prisma.cardSet.upsert({
      where: { id: setData.id },
      update: {
        name: setData.name,
        series: setData.series || null,
        totalCards: setData.totalCards || null,
        releaseDate: setData.releaseDate || null
      },
      create: {
        id: setData.id,
        name: setData.name,
        series: setData.series || null,
        totalCards: setData.totalCards || null,
        releaseDate: setData.releaseDate || null
      }
    });
  }

  /**
   * Find card by various identifiers
   */
  async findCard(identifier: {
    id?: string;
    name?: string;
    setId?: string;
    cardNumber?: string;
  }): Promise<any | null> {
    if (identifier.id) {
      return await prisma.card.findUnique({
        where: { id: identifier.id }
      });
    }
    
    if (identifier.name && identifier.setId) {
      return await prisma.card.findFirst({
        where: {
          name: { contains: identifier.name, mode: 'insensitive' },
          setId: identifier.setId
        }
      });
    }
    
    if (identifier.name) {
      return await prisma.card.findFirst({
        where: {
          name: { contains: identifier.name, mode: 'insensitive' }
        }
      });
    }
    
    return null;
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    totalCards: number;
    totalSets: number;
    lastSynced: Date | null;
  }> {
    const [cardCount, setCount, lastSet] = await Promise.all([
      prisma.card.count(),
      prisma.cardSet.count(),
      prisma.cardSet.findFirst({
        orderBy: { lastSynced: 'desc' },
        select: { lastSynced: true }
      })
    ]);
    
    return {
      totalCards: cardCount,
      totalSets: setCount,
      lastSynced: lastSet?.lastSynced || null
    };
  }
}

// Export singleton instance
export const cardSyncService = CardSyncService.getInstance();
