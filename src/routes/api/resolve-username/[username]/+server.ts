import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { userSyncService } from '$lib/server/services/userSync.js';

export const GET: RequestHandler = async ({ params }) => {
  const { username } = params;
  
  if (!username) {
    return json({ error: 'Username is required' }, { status: 400 });
  }

  try {
    // Try to find user by username
    const user = await userSyncService.getUserByUsername(username);
    
    if (!user) {
      return json(
        { 
          error: 'User not found',
          message: `No user found with username: ${username}. Try running a sync to update the database.`
        }, 
        { status: 404 }
      );
    }

    return json({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      banner: user.banner,
      type: user.type,
      smartWalletAddress: user.smartWalletAddress,
      ownerWalletAddress: user.ownerWalletAddress,
      addresses: user.addresses?.length || 0,
      lastUpdated: user.updatedAt
    });

  } catch (error) {
    console.error(`Error resolving username ${username}:`, error);
    
    return json(
      { 
        error: 'Failed to resolve username',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
};