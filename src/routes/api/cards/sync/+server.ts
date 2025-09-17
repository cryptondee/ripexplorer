import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cardSyncService } from '$lib/services/CardSyncService.js';

export const POST: RequestHandler = async ({ url }) => {
  try {
    const setId = url.searchParams.get('setId');
    
    if (setId) {
      // Sync specific set
      const cardCount = await cardSyncService.syncSet(setId);
      return json({
        success: true,
        message: `Synced ${cardCount} cards from set ${setId}`,
        cardCount
      });
    } else {
      // Sync all cards (this could take a while)
      await cardSyncService.syncAllCards();
      const stats = await cardSyncService.getSyncStats();
      return json({
        success: true,
        message: 'All cards synced successfully',
        stats
      });
    }
  } catch (error) {
    console.error('Card sync error:', error);
    return json(
      {
        success: false,
        error: 'Failed to sync cards',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};

export const GET: RequestHandler = async () => {
  try {
    const stats = await cardSyncService.getSyncStats();
    return json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting sync stats:', error);
    return json(
      {
        success: false,
        error: 'Failed to get sync stats'
      },
      { status: 500 }
    );
  }
};
