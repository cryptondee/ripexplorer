import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { userSyncService } from '$lib/server/services/userSync.js';
import { prisma } from '$lib/server/db/client.js';

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

    // Check rate limiting - 1 hour cooldown
    if (currentStatus?.lastManualSyncAt) {
      const lastSyncTime = new Date(currentStatus.lastManualSyncAt);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (lastSyncTime > oneHourAgo) {
        const nextAllowedSync = new Date(lastSyncTime.getTime() + 60 * 60 * 1000);
        const remainingMs = nextAllowedSync.getTime() - Date.now();
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
        
        return json(
          { 
            error: 'Rate limited',
            message: `Please wait ${remainingMinutes} minutes before syncing again`,
            nextAllowedSync: nextAllowedSync.toISOString(),
            remainingMs
          }, 
          { status: 429 }
        );
      }
    }

    // Get optional fromBlock parameter
    const body = await request.json().catch(() => ({}));
    const fromBlock = body.fromBlock ? parseInt(body.fromBlock) : undefined;

    // Update lastManualSyncAt before starting sync
    await prisma.syncStatus.upsert({
      where: { syncType: 'blockchain_users' },
      update: { lastManualSyncAt: new Date() },
      create: { 
        syncType: 'blockchain_users',
        lastManualSyncAt: new Date(),
        status: 'pending'
      }
    });

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

    // Check if rate limited
    let rateLimited = false;
    let nextAllowedSync = null;
    let remainingMs = 0;
    
    if (status.lastManualSyncAt) {
      const lastSyncTime = new Date(status.lastManualSyncAt);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (lastSyncTime > oneHourAgo) {
        rateLimited = true;
        nextAllowedSync = new Date(lastSyncTime.getTime() + 60 * 60 * 1000).toISOString();
        remainingMs = new Date(lastSyncTime.getTime() + 60 * 60 * 1000).getTime() - Date.now();
      }
    }

    return json({
      syncType: status.syncType,
      status: status.status,
      lastSyncAt: status.lastSyncAt,
      lastManualSyncAt: status.lastManualSyncAt,
      lastBlockNumber: status.lastBlockNumber?.toString(),
      errorMessage: status.errorMessage,
      rateLimited,
      nextAllowedSync,
      remainingMs: rateLimited ? Math.max(0, remainingMs) : 0
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