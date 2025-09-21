/**
 * SalesEnrichmentService
 * Unified service for enriching sales events with card metadata
 * Replaces: AutoEnrichingSalesService, OptimizedSalesEnrichment, CardEnrichmentEngine
 */

import { logger } from '$lib/utils/logger.js';
import { cardDataService } from '../core/CardDataService.js';
import { cardSyncService } from '$lib/services/CardSyncService.js';
import type { EnrichmentStrategy, CardMetadata, EnrichedCardData } from '../strategies/EnrichmentStrategy.js';
import { getDefaultStrategies } from '../strategies/index.js';

export class SalesEnrichmentService {
  private static instance: SalesEnrichmentService;
  private strategies: EnrichmentStrategy[];
  
  // Track ongoing downloads to prevent duplicates (from AutoEnrichingSalesService)
  private downloadingCollections = new Set<string>();
  
  private constructor() {
    this.strategies = getDefaultStrategies();
    logger.log('SalesEnrichmentService: Initialized with strategies:', 
      this.strategies.map(s => s.name));
  }

  static getInstance(): SalesEnrichmentService {
    if (!SalesEnrichmentService.instance) {
      SalesEnrichmentService.instance = new SalesEnrichmentService();
    }
    return SalesEnrichmentService.instance;
  }

  /**
   * Main enrichment method - tries strategies in priority order
   * Backward compatible with existing services
   */
  async enrichSalesEvent(metadata: CardMetadata): Promise<EnrichedCardData> {
    logger.debug('SalesEnrichmentService: Starting enrichment', { 
      name: metadata.name 
    });

    // Sort strategies by priority (highest first)
    const sortedStrategies = [...this.strategies].sort(
      (a, b) => b.priority - a.priority
    );

    // Try each strategy in order
    for (const strategy of sortedStrategies) {
      if (!strategy.canEnrich(metadata)) {
        continue;
      }

      try {
        const enriched = await strategy.enrich(metadata);
        if (enriched) {
          logger.log(`SalesEnrichmentService: Successfully enriched using ${strategy.name}`);
          return enriched;
        }
      } catch (error) {
        logger.error(`SalesEnrichmentService: Strategy ${strategy.name} failed:`, error);
      }
    }

    // This should never happen (fallback always works)
    // But just in case...
    logger.warn('SalesEnrichmentService: All strategies failed, using emergency fallback');
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

  /**
   * Auto-download missing sets if needed
   * Preserves functionality from AutoEnrichingSalesService
   */
  async enrichWithAutoDownload(metadata: CardMetadata): Promise<EnrichedCardData> {
    // First try without downloading
    let result = await this.enrichSalesEvent(metadata);
    
    // If we only got fallback, try downloading the set
    if (result.enrichmentSource === 'fallback' && metadata.collection_name) {
      const setId = cardDataService.getSetIdForCollection(metadata.collection_name);
      
      if (setId && !this.downloadingCollections.has(setId)) {
        logger.log(`SalesEnrichmentService: Attempting to download missing set: ${setId}`);
        
        try {
          this.downloadingCollections.add(setId);
          const cardCount = await cardSyncService.syncSet(setId);
          
          if (cardCount > 0) {
            logger.log(`SalesEnrichmentService: Downloaded ${cardCount} cards from ${setId}`);
            // Retry enrichment with newly downloaded data
            result = await this.enrichSalesEvent(metadata);
            if (result.enrichmentSource === 'database') {
              result.setDownloaded = true;
              result.enrichmentSource = 'database_after_download' as any;
            }
          }
        } catch (error) {
          logger.error(`SalesEnrichmentService: Failed to download set ${setId}:`, error);
        } finally {
          this.downloadingCollections.delete(setId);
        }
      }
    }
    
    return result;
  }

  /**
   * Backward compatibility method signatures
   * These allow existing code to work without changes
   */
  
  // Matches AutoEnrichingSalesService.enrichSaleFromOnchain
  async enrichSaleFromOnchain(onchainMetadata: any): Promise<EnrichedCardData> {
    logger.debug('SalesEnrichmentService: enrichSaleFromOnchain called (backward compat)');
    return this.enrichWithAutoDownload(onchainMetadata);
  }

  // Matches CardEnrichmentEngine.enrichCard  
  async enrichCard(metadata: any, _isRichMetadata?: boolean): Promise<EnrichedCardData> {
    logger.debug('SalesEnrichmentService: enrichCard called (backward compat)');
    return this.enrichWithAutoDownload(metadata);
  }

  /**
   * Add a custom strategy at runtime
   */
  addStrategy(strategy: EnrichmentStrategy): void {
    this.strategies.push(strategy);
    logger.log(`SalesEnrichmentService: Added strategy ${strategy.name}`);
  }

  /**
   * Preload popular sets for better enrichment performance
   * Migrated from AutoEnrichingSalesService.preloadPopularSets
   */
  async preloadPopularSets(): Promise<void> {
    const PRIORITY_SETS = [
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

    logger.log('SalesEnrichmentService: Starting preload of popular sets...');
    
    try {
      const stats = await cardDataService.getDatabaseStats();
      logger.log(`📊 Current database: ${stats.totalCards} cards, ${stats.totalSets} sets`);
      
      let downloadedSets = 0;
      
      for (const setId of PRIORITY_SETS) {
        try {
          // Check if we already have this set
          const hasSet = await cardDataService.checkSetAvailability(setId);
          
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
      
      const finalStats = await cardDataService.getDatabaseStats();
      logger.log(`🎉 Preload complete! Downloaded ${downloadedSets} sets. Total: ${finalStats.totalCards} cards`);
      
    } catch (error) {
      logger.error('❌ Preload failed:', error);
    }
  }

  /**
   * Get current enrichment statistics
   */
  async getEnrichmentStats() {
    const dbStats = await cardDataService.getDatabaseStats();
    return {
      totalCards: dbStats.totalCards,
      totalSets: dbStats.totalSets,
      strategies: this.strategies.map(s => ({
        name: s.name,
        priority: s.priority
      })),
      downloadingNow: Array.from(this.downloadingCollections)
    };
  }
}

// Export singleton instance
export const salesEnrichmentService = SalesEnrichmentService.getInstance();
