import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// MIGRATED: Using new unified service instead of AutoEnrichingSalesService
import { salesEnrichmentService } from '$lib/server/services/domain/SalesEnrichmentService.js';
import { cardSyncService } from '$lib/services/CardSyncService.js';
import { logger } from '$lib/utils/logger.js';

export const POST: RequestHandler = async () => {
  try {
    logger.log('🚀 Starting preload of popular sets via API...');
    
    // Get initial stats
    const initialStats = await cardSyncService.getSyncStats();
    
    // Run the preload using NEW unified service
    await salesEnrichmentService.preloadPopularSets();
    
    // Get final stats
    const finalStats = await cardSyncService.getSyncStats();
    
    return json({
      success: true,
      message: 'Popular sets preloaded successfully',
      stats: {
        initial: initialStats,
        final: finalStats,
        cardsAdded: finalStats.totalCards - initialStats.totalCards,
        setsAdded: finalStats.totalSets - initialStats.totalSets
      }
    });
  } catch (error) {
    logger.error('Preload error:', error);
    return json(
      {
        success: false,
        error: 'Failed to preload popular sets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};

export const GET: RequestHandler = async () => {
  try {
    const stats = await cardSyncService.getSyncStats();
    
    // Estimate enrichment coverage
    const estimatedCoverage = Math.min(Math.round((stats.totalCards / 10000) * 100), 95);
    
    return json({
      success: true,
      stats,
      estimatedEnrichmentRate: `${estimatedCoverage}%`,
      recommendation: stats.totalCards < 1000 
        ? 'Consider running preload to improve sales enrichment'
        : 'Good coverage for sales enrichment'
    });
  } catch (error) {
    logger.error('Error getting preload stats:', error);
    return json(
      {
        success: false,
        error: 'Failed to get preload stats'
      },
      { status: 500 }
    );
  }
};
