import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Simple cache warming endpoint for production
export const POST: RequestHandler = async () => {
  try {
    // Only warm a few essential sets to avoid long response times
    const essentialSets = ['sv3pt5', 'sv1', 'sv7', 'swsh7', 'cel25'];
    
    const results = await Promise.all(
      essentialSets.map(async (setId) => {
        try {
          const response = await fetch(`/api/set/${setId}`);
          return { setId, success: response.ok };
        } catch {
          return { setId, success: false };
        }
      })
    );
    
    return json({
      success: true,
      message: 'Essential sets warmed',
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};