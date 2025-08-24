import { json } from '@sveltejs/kit';
import { extractFromRipFunAPI } from '$lib/server/services/parser.js';
import { userSyncService } from '$lib/server/services/userSync.js';
import type { RequestHandler } from './$types.js';

async function getCardSample(username: string) {
  // Try to resolve username
  let resolvedUserId: number | null = null;
  const isNumericId = /^\d+$/.test(username);
  
  if (!isNumericId) {
    try {
      const userData = await userSyncService.getUserByUsername(username);
      if (userData) {
        resolvedUserId = userData.id;
      }
    } catch (error) {
      console.warn(`Username resolution failed for ${username}`);
    }
  } else {
    resolvedUserId = parseInt(username);
  }
  
  const extractionTarget = resolvedUserId ? resolvedUserId.toString() : username;
  const extractedData = await extractFromRipFunAPI(extractionTarget);
  
  const cards = extractedData.profile?.digital_cards || [];
  
  return {
    username,
    totalCards: cards.length,
    cardSample: cards.slice(0, 3).map(card => {
      // Debug the nested structure
      const cardInfo = card.card || card;
      const setInfo = card.set || cardInfo.set || {};
      
      console.log('Card ID:', card.id);
      console.log('Card nested keys:', Object.keys(cardInfo));
      console.log('Set nested keys:', Object.keys(setInfo));
      console.log('Card info sample:', {
        card_name: cardInfo.name,
        card_number: cardInfo.card_number,
        set_id: setInfo.id,
        set_name: setInfo.name
      });
      
      const setId = setInfo.id || cardInfo.set_id || card.set_id;
      const cardNumber = cardInfo.card_number || card.card_number;
      
      return {
        name: cardInfo.name || card.name,
        set_id: setId,
        card_number: cardNumber,
        rarity: cardInfo.rarity || card.rarity,
        id: card.id,
        key: setId && cardNumber ? `${setId}_${cardNumber}` : `card_${card.id}`,
        rawCard: {
          hasCard: !!card.card,
          hasSet: !!card.set,
          cardKeys: card.card ? Object.keys(card.card) : [],
          setKeys: card.set ? Object.keys(card.set) : []
        }
      };
    })
  };
}

export const GET: RequestHandler = async ({ url }) => {
  try {
    const userA = url.searchParams.get('userA') || 'tk_';
    const userB = url.searchParams.get('userB') || 'cryptondee';
    
    const [dataA, dataB] = await Promise.all([
      getCardSample(userA),
      getCardSample(userB)
    ]);
    
    // Find some basic overlaps
    const keysA = new Set(dataA.cardSample.map(c => c.key));
    const keysB = new Set(dataB.cardSample.map(c => c.key));
    
    const overlap = dataA.cardSample.filter(card => keysB.has(card.key));
    const onlyA = dataA.cardSample.filter(card => !keysB.has(card.key));
    const onlyB = dataB.cardSample.filter(card => !keysA.has(card.key));
    
    return json({
      userA: dataA,
      userB: dataB,
      analysis: {
        overlap: overlap.length,
        onlyA: onlyA.length,
        onlyB: onlyB.length,
        overlapCards: overlap,
        onlyACards: onlyA.slice(0, 3),
        onlyBCards: onlyB.slice(0, 3)
      }
    });
    
  } catch (error) {
    return json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
};