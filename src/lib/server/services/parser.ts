import * as cheerio from 'cheerio';
import type { ExtractedData, SvelteKitFetchedData } from '../types.js';

export function extractSvelteKitData(html: string): ExtractedData {
  const $ = cheerio.load(html);
  let extractedData: ExtractedData = {};
  
  // First, try to parse rip.fun specific SvelteKit structure from script tags
  $('script').each((index, element) => {
    try {
      const scriptContent = $(element).html();
      if (!scriptContent) return;
      
      // Look for kit.start() function call and extract the data
      if (scriptContent.includes('kit.start(')) {
        extractedData = extractRipFunData(scriptContent);
        if (Object.keys(extractedData).length > 0) {
          return false; // Break out of each loop when found
        }
      }
    } catch (error) {
      console.warn(`Failed to parse script content ${index}:`, error);
    }
  });
  
  // Fallback to original method if no rip.fun structure found
  if (Object.keys(extractedData).length === 0) {
    $('script[type="application/json"][data-sveltekit-fetched]').each((index, element) => {
      try {
        const jsonText = $(element).html();
        if (!jsonText) return;
        
        const data: SvelteKitFetchedData = JSON.parse(jsonText);
        
        if (data.response && data.response.data) {
          Object.assign(extractedData, data.response.data);
        }
      } catch (error) {
        console.warn(`Failed to parse SvelteKit JSON block ${index}:`, error);
      }
    });
    
    $('script[type="application/json"]').each((index, element) => {
      const dataAttr = $(element).attr('data-sveltekit-fetched');
      if (dataAttr) return;
      
      try {
        const jsonText = $(element).html();
        if (!jsonText) return;
        
        const data = JSON.parse(jsonText);
        Object.assign(extractedData, data);
      } catch (error) {
        console.warn(`Failed to parse generic JSON block ${index}:`, error);
      }
    });
  }
  
  return extractedData;
}

function extractRipFunData(scriptContent: string): ExtractedData {
  try {
    // Use the developer's improved regex that correctly identifies the data array boundary
    // The key fix: look for "data: [...], form:" instead of other patterns
    const dataRegex = /data:\s*(\[[\s\S]*?\]),\s*form:/;
    const match = scriptContent.match(dataRegex);

    if (match && match[1]) {
      let dataString = match[1];
      
      // Clean the string to make it parsable by replacing new Date() calls
      const cleanedString = dataString.replace(/new Date\(([^)]+)\)/g, '$1');
      
      try {
        // Use Function constructor (safer than eval) to parse the cleaned string
        const dataArray = new Function(`return ${cleanedString}`)();
        
        // The main profile data is in the second element of the array (index 1)
        const profileData = dataArray[1]?.data?.profile;
        
        if (profileData) {
          // Create deep copies to avoid modifying the original data
          const digital_products = JSON.parse(JSON.stringify(profileData.digital_products || []));
          const digital_cards = JSON.parse(JSON.stringify(profileData.digital_cards || []));
          
          // Remove clip_embedding fields from digital_cards
          digital_cards.forEach((item: any) => {
            if (item.card && 'clip_embedding' in item.card) {
              delete item.card.clip_embedding;
            }
          });
          
          // Also check products for the same field
          digital_products.forEach((item: any) => {
            if (item.product && 'clip_embedding' in item.product) {
              delete item.product.clip_embedding;
            }
          });
          
          // Structure the profile data
          const profile = {
            ...profileData,
            digital_products,
            digital_cards
          };
          
          const extractedData: ExtractedData = { profile };
          
          // Also add stats if available
          if (dataArray[1]?.data?.stats) {
            extractedData.stats = dataArray[1].data.stats;
          }
          
          console.log(`Extracted ${digital_cards.length} cards using improved regex method`);
          return extractedData;
        } else {
          console.warn('Profile data could not be located in the parsed object');
        }
        
      } catch (parseError) {
        console.error('Failed to parse data array with improved method:', parseError);
        throw new Error('Failed to parse rip.fun data structure');
      }
    } else {
      throw new Error('Could not find the data array - rip.fun data structure may have changed');
    }
    
  } catch (error) {
    console.error('Failed to extract rip.fun data:', error);
    throw error;
  }
}

export function sanitizeExtractedData(data: ExtractedData): ExtractedData {
  const sanitized: ExtractedData = {};
  
  function sanitizeValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }
    
    if (typeof value === 'string') {
      return value.trim().replace(/<script[^>]*>.*?<\/script>/gi, '').substring(0, 10000);
    }
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      const sanitizedObject: any = {};
      for (const [key, val] of Object.entries(value)) {
        const sanitizedKey = key.replace(/[<>]/g, '').substring(0, 100);
        sanitizedObject[sanitizedKey] = sanitizeValue(val);
      }
      return sanitizedObject;
    }
    
    if (Array.isArray(value)) {
      return value.slice(0, 1000).map(sanitizeValue);
    }
    
    return value;
  }
  
  for (const [key, value] of Object.entries(data)) {
    const sanitizedKey = key.replace(/[<>]/g, '').substring(0, 100);
    sanitized[sanitizedKey] = sanitizeValue(value);
  }
  
  return sanitized;
}

/**
 * Extract user data directly from rip.fun owned-cards API endpoint.
 * Input should be a user ID (e.g., "2010" for ndw).
 */
export async function extractFromRipFunAPI(userId: string): Promise<ExtractedData> {
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