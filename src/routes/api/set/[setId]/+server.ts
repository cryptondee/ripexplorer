import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
  const { setId } = params;
  
  if (!setId) {
    return json({ error: 'Set ID is required' }, { status: 400 });
  }

  try {
    // Get query parameters from the request
    const page = url.searchParams.get('page') || '1';
    const limit = url.searchParams.get('limit') || '1000';
    const sort = url.searchParams.get('sort') || 'number-asc';
    const all = url.searchParams.get('all') || 'true';

    // Fetch data from rip.fun API
    const response = await fetch(
      `https://www.rip.fun/api/set/${setId}/cards?page=${page}&limit=${limit}&sort=${sort}&all=${all}`,
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
    
    // Remove clip_embedding data to reduce payload size
    if (data.cards && Array.isArray(data.cards)) {
      data.cards = data.cards.map((card: any) => {
        const cleanCard = { ...card };
        delete cleanCard.clip_embedding;
        if (cleanCard.card) {
          delete cleanCard.card.clip_embedding;
        }
        return cleanCard;
      });
    }

    return json(data);
  } catch (error) {
    console.error(`Error fetching set ${setId} data:`, error);
    
    return json(
      { 
        error: 'Failed to fetch set data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
};