/**
 * Extract user data directly from rip.fun owned-cards API endpoint.
 * Input should be a user ID (e.g., "2010" for ndw).
 */
export async function extractFromRipFunAPI(userId: string): Promise<any> {
  try {
    console.log(`Starting API extraction for user ID: ${userId}`);
    
    // Get complete card collection using user ID
    const cardsUrl = `https://www.rip.fun/api/user/${userId}/owned-cards`;
    console.log(`Fetching owned cards from: ${cardsUrl}`);
    
    const cardsResponse = await fetch(cardsUrl);
    if (!cardsResponse.ok) {
      if (cardsResponse.status === 404) {
        throw new Error(`User ID '${userId}' not found`);
      }
      throw new Error(`Failed to get owned cards: ${cardsResponse.status} ${cardsResponse.statusText}`);
    }
    
    const cardsData = await cardsResponse.json();
    
    if (!cardsData.cards || !Array.isArray(cardsData.cards)) {
      throw new Error('Invalid cards data structure received from API');
    }
    
    const allCards = cardsData.cards;
    console.log(`Successfully fetched ${allCards.length} total cards from API`);
    
    // Clean and transform API data, removing clip_embedding
    const transformedCards = allCards.map((cardData: any) => {
      // Remove clip_embedding from card data to prevent huge payloads
      const cleanCard = { ...cardData.card };
      if (cleanCard.clip_embedding) {
        delete cleanCard.clip_embedding;
      }
      
      return {
        id: cardData.token_id, // Use token_id as the main ID
        token_id: cardData.token_id,
        unique_id: cardData.unique_id,
        is_listed: cardData.is_listed || false,
        front_image_url: cardData.front_image_url,
        owner: cardData.owner,
        card: {
          id: cleanCard.id,
          name: cleanCard.name || 'Unknown Card',
          card_number: cleanCard.card_number || cleanCard.formatted_card_number?.toString() || '',
          rarity: cleanCard.rarity || '',
          hp: cleanCard.hp,
          types: cleanCard.types || [],
          abilities: cleanCard.abilities || [],
          attacks: cleanCard.attacks || [],
          weaknesses: cleanCard.weaknesses || [],
          resistances: cleanCard.resistances || [],
          raw_price: cleanCard.raw_price || 0,
          set_id: cleanCard.set_id || '',
          large_image_url: cleanCard.large_image_url,
          small_image_url: cleanCard.small_image_url,
          supertype: cleanCard.supertype,
          subtype: cleanCard.subtype,
          illustrator: cleanCard.illustrator,
          tcgplayer_id: cleanCard.tcgplayer_id,
          is_chase: cleanCard.is_chase,
          is_reverse: cleanCard.is_reverse,
          is_holo: cleanCard.is_holo,
          sku: cleanCard.sku,
          created_at: cleanCard.created_at,
          updated_at: cleanCard.updated_at
        },
        set: cleanCard.set || {
          id: cleanCard.set_id,
          name: 'Unknown Set'
        },
        listing: cardData.listing
      };
    });
    
    // Create comprehensive profile structure
    const profile = {
      id: userId,
      username: `User ${userId}`, // We don't get username from this endpoint
      digital_cards: transformedCards,
      digital_products: [], // This endpoint doesn't provide pack info
      total_cards: transformedCards.length,
      total_packs: 0,
      total_value: transformedCards.reduce((sum: number, card: any) => sum + parseFloat(card.card?.raw_price || 0), 0).toFixed(2)
    };
    
    const stats = {
      totalCards: transformedCards.length,
      totalPacks: 0,
      totalValue: `$${profile.total_value}`
    };
    
    console.log(`API extraction complete: ${transformedCards.length} cards, total value $${profile.total_value}`);
    
    return {
      profile,
      stats,
      extraction_method: 'api_direct',
      api_calls_made: 1
    };
    
  } catch (error) {
    console.error('Failed to extract data from rip.fun API:', error);
    throw new Error(`API extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}