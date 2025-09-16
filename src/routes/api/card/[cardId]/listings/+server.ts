import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { EXTERNAL_URLS } from '$lib/constants/urls.js';
import { createRipFunFetchOptions } from '$lib/constants/http.js';

export const GET: RequestHandler = async ({ params }) => {
  const { cardId } = params;
  
  if (!cardId) {
    return json({ error: 'Card ID is required' }, { status: 400 });
  }

  try {
    // Fetch listing data from rip.fun API
    const apiUrl = EXTERNAL_URLS.RIP_FUN.API_CARD_LISTINGS(cardId);
    const response = await fetch(apiUrl, createRipFunFetchOptions());

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