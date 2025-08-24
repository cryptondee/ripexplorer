import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { userSyncService } from '$lib/server/services/userSync.js';

export const GET: RequestHandler = async ({ url }) => {
  const query = url.searchParams.get('q');
  const limitParam = url.searchParams.get('limit');
  
  if (!query || query.trim().length < 2) {
    return json({ error: 'Query must be at least 2 characters' }, { status: 400 });
  }

  const limit = limitParam ? Math.min(parseInt(limitParam), 50) : 10;

  try {
    const users = await userSyncService.searchUsers(query.trim(), limit);
    
    return json({
      query: query.trim(),
      results: users,
      count: users.length
    });

  } catch (error) {
    console.error(`Error searching users with query ${query}:`, error);
    
    return json(
      { 
        error: 'Failed to search users',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
};