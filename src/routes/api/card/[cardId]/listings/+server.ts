import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const { cardId } = params;
  
  if (!cardId) {
    return json({ error: 'Card ID is required' }, { status: 400 });
  }

  try {
    // Fetch listing data from rip.fun API
    const response = await fetch(
      `https://www.rip.fun/api/card/${cardId}/listings`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://www.rip.fun/'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`rip.fun API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return json(data);
  } catch (error) {
    console.error(`Error fetching card ${cardId} listings:`, error);
    
    return json(
      { 
        error: 'Failed to fetch card listings',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
};