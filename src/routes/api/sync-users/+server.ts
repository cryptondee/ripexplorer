import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { userSyncService } from '$lib/server/services/userSync.js';

export const POST: RequestHandler = async ({ url, request }) => {
  try {
    // Check if sync is already running
    const currentStatus = await userSyncService.getSyncStatus();
    if (currentStatus?.status === 'running') {
      return json(
        { 
          error: 'Sync already in progress',
          status: currentStatus 
        }, 
        { status: 409 }
      );
    }

    // Get optional fromBlock parameter
    const body = await request.json().catch(() => ({}));
    const fromBlock = body.fromBlock ? parseInt(body.fromBlock) : undefined;

    // Start sync in background (don't await to avoid timeout)
    const syncPromise = userSyncService.syncUsersFromBlockchain(fromBlock);
    
    // Return immediately with accepted status
    return json({
      message: 'User sync started',
      status: 'running',
      fromBlock: fromBlock || 'genesis'
    }, { status: 202 });

  } catch (error) {
    console.error('Error starting user sync:', error);
    return json(
      { 
        error: 'Failed to start user sync',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
};

export const GET: RequestHandler = async () => {
  try {
    // Get current sync status
    const status = await userSyncService.getSyncStatus();
    
    if (!status) {
      return json({
        syncType: 'blockchain_users',
        status: 'never_run',
        lastSyncAt: null,
        lastBlockNumber: null
      });
    }

    return json({
      syncType: status.syncType,
      status: status.status,
      lastSyncAt: status.lastSyncAt,
      lastBlockNumber: status.lastBlockNumber?.toString(),
      errorMessage: status.errorMessage
    });

  } catch (error) {
    console.error('Error getting sync status:', error);
    return json(
      { 
        error: 'Failed to get sync status',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
};