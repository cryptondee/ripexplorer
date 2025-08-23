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
        console.warn('Failed to parse data array with improved method:', parseError);
      }
    } else {
      console.warn('Could not find the data array using improved regex - data structure may have changed');
    }

    // Fallback to previous extraction methods
    console.log('Using fallback extraction methods');
    return extractFromDataArray(scriptContent);
    
  } catch (error) {
    console.warn('Failed to extract rip.fun data with improved method:', error);
    return extractRipFunDataFallback(scriptContent);
  }
}

function extractFromDataArray(scriptContent: string): ExtractedData {
  try {
    // Look for dataArray[1].data.profile pattern
    const dataArrayStart = scriptContent.indexOf('data: [');
    if (dataArrayStart === -1) return {};
    
    // Find the second object in the data array (dataArray[1])
    let bracketCount = 0;
    let objectCount = 0;
    let start = -1;
    let end = -1;
    
    for (let i = dataArrayStart + 7; i < scriptContent.length; i++) {
      const char = scriptContent[i];
      
      if (char === '{') {
        if (bracketCount === 0) {
          objectCount++;
          if (objectCount === 2) { // Second object (index 1)
            start = i;
          }
        }
        bracketCount++;
      } else if (char === '}') {
        bracketCount--;
        if (bracketCount === 0 && objectCount === 2) {
          end = i;
          break;
        }
      }
    }
    
    if (start !== -1 && end !== -1) {
      let objectStr = scriptContent.substring(start, end + 1);
      
      // Clean JavaScript notation
      objectStr = objectStr
        .replace(/new Date\(([^)]+)\)/g, '$1')
        .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/\bundefined\b/g, 'null');
      
      try {
        const parsedObject = JSON.parse(objectStr);
        
        if (parsedObject.data?.profile) {
          const extractedData: ExtractedData = {
            profile: parsedObject.data.profile
          };
          
          // Clean clip_embedding data
          if (extractedData.profile.digital_cards && Array.isArray(extractedData.profile.digital_cards)) {
            extractedData.profile.digital_cards.forEach((item: any) => {
              if (item.card?.clip_embedding) {
                delete item.card.clip_embedding;
              }
            });
          }
          
          console.log(`Extracted ${extractedData.profile.digital_cards?.length || 0} cards from data array`);
          return extractedData;
        }
      } catch (parseError) {
        console.warn('Failed to parse data array object:', parseError);
      }
    }
    
  } catch (error) {
    console.warn('Failed to extract from data array:', error);
  }
  
  return {};
}

function extractRipFunDataFallback(scriptContent: string): ExtractedData {
  const extractedData: ExtractedData = {};
  
  try {
    // Find the profile start and extract by counting braces
    const profileStartMatch = scriptContent.match(/profile:\s*\{/);
    
    let fullProfileMatch = null;
    if (profileStartMatch) {
      const startIndex = scriptContent.indexOf(profileStartMatch[0]);
      const openBraceIndex = startIndex + profileStartMatch[0].length - 1;
      
      let braceCount = 1;
      let endIndex = openBraceIndex;
      
      for (let i = openBraceIndex + 1; i < scriptContent.length; i++) {
        const char = scriptContent[i];
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        
        if (braceCount === 0) {
          endIndex = i;
          break;
        }
      }
      
      if (endIndex > openBraceIndex) {
        const profileText = scriptContent.substring(startIndex, endIndex + 1);
        fullProfileMatch = [profileText];
      }
    }
    
    if (fullProfileMatch) {
      const profileText = fullProfileMatch[0];
      const profileData: any = {};
      
      // Extract basic profile fields
      const basicFields = {
        id: /id:\s*(\d+)/,
        username: /username:\s*"([^"]+)"/,
        bio: /bio:\s*"([^"]*)"/,
        email: /email:\s*"([^"]+)"/,
        avatar: /avatar:\s*"([^"]+)"/,
        banner: /banner:\s*"([^"]*)"/,
        smart_wallet_address: /smart_wallet_address:\s*"([^"]+)"/,
        owner_wallet_address: /owner_wallet_address:\s*"([^"]+)"/,
        verified: /verified:\s*(true|false)/,
        type: /type:\s*"([^"]+)"/,
        login_provider: /login_provider:\s*"([^"]+)"/,
        created_at: /created_at:\s*new Date\((\d+)\)/,
        updated_at: /updated_at:\s*new Date\((\d+)\)/,
      };
      
      for (const [key, pattern] of Object.entries(basicFields)) {
        const match = profileText.match(pattern);
        if (match) {
          if (key === 'verified') {
            profileData[key] = match[1] === 'true';
          } else if (key === 'id') {
            profileData[key] = parseInt(match[1]);
          } else if (key.includes('_at')) {
            profileData[key] = new Date(parseInt(match[1])).toISOString();
          } else {
            profileData[key] = match[1];
          }
        }
      }
      
      // Try to extract digital_cards array using bracket counting for complete extraction
      const cardsStartMatch = profileText.match(/digital_cards:\s*\[/);
      if (cardsStartMatch) {
        const cardsStartIndex = profileText.indexOf(cardsStartMatch[0]) + cardsStartMatch[0].length - 1; // -1 to include opening bracket
        
        // Count brackets to find the complete digital_cards array
        let bracketCount = 1;
        let cardsEndIndex = cardsStartIndex;
        
        for (let i = cardsStartIndex + 1; i < profileText.length; i++) {
          const char = profileText[i];
          if (char === '[') bracketCount++;
          else if (char === ']') bracketCount--;
          
          if (bracketCount === 0) {
            cardsEndIndex = i;
            break;
          }
        }
        
        const cardsFullText = profileText.substring(cardsStartIndex + 1, cardsEndIndex); // +1 to skip opening bracket
        const cardsMatch = [null, cardsFullText]; // Mimic the regex match structure
        try {
          // Count card objects by counting balanced braces
          const cardsText = cardsMatch[1];
          const cardObjects = [];
          let depth = 0;
          let start = -1;
          let current = '';
          
          for (let i = 0; i < cardsText.length; i++) {
            const char = cardsText[i];
            
            if (char === '{') {
              if (depth === 0) start = i;
              depth++;
            } else if (char === '}') {
              depth--;
              if (depth === 0 && start !== -1) {
                current = cardsText.substring(start, i + 1);
                // Extract basic card info with regex
                const cardData: any = {};
                
                // Extract key card fields
                const cardFields = {
                  id: /id:\s*(\d+)/,
                  token_id: /token_id:\s*"([^"]+)"/,
                  is_listed: /is_listed:\s*(true|false)/,
                  front_image_url: /front_image_url:\s*"([^"]+)"/,
                };
                
                for (const [field, pattern] of Object.entries(cardFields)) {
                  const match = current.match(pattern);
                  if (match) {
                    if (field === 'is_listed') {
                      cardData[field] = match[1] === 'true';
                    } else if (field === 'id') {
                      cardData[field] = parseInt(match[1]);
                    } else {
                      cardData[field] = match[1];
                    }
                  }
                }
                
                // Extract card details
                const cardDetailsMatch = current.match(/card:\s*\{([\s\S]*?)\}/);
                if (cardDetailsMatch) {
                  const cardDetails: any = {};
                  const cardText = cardDetailsMatch[0];
                  
                  const detailFields = {
                    name: /name:\s*"([^"]+)"/,
                    card_number: /card_number:\s*"([^"]+)"/,
                    rarity: /rarity:\s*"([^"]+)"/,
                    hp: /hp:\s*(\d+)/,
                    types: /types:\s*\[(.*?)\]/,
                    raw_price: /raw_price:\s*"([^"]+)"/,
                    set_id: /set_id:\s*"([^"]+)"/,
                  };
                  
                  for (const [field, pattern] of Object.entries(detailFields)) {
                    const match = cardText.match(pattern);
                    if (match) {
                      if (field === 'hp') {
                        cardDetails[field] = parseInt(match[1]);
                      } else if (field === 'types') {
                        // Extract types array
                        const typesStr = match[1];
                        cardDetails[field] = typesStr.split(',').map((t: string) => t.replace(/"/g, '').trim()).filter(Boolean);
                      } else {
                        cardDetails[field] = match[1];
                      }
                    }
                  }
                  
                  // Extract set information
                  const setMatch = current.match(/set:\s*\{([\s\S]*?)\}/);
                  if (setMatch) {
                    const setDetails: any = {};
                    const setText = setMatch[0];
                    
                    const setFields = {
                      id: /id:\s*"([^"]+)"/,
                      name: /name:\s*"([^"]+)"/,
                      release_date: /release_date:\s*new Date\((\d+)\)/,
                    };
                    
                    for (const [field, pattern] of Object.entries(setFields)) {
                      const match = setText.match(pattern);
                      if (match) {
                        if (field === 'release_date') {
                          setDetails[field] = new Date(parseInt(match[1])).toISOString();
                        } else {
                          setDetails[field] = match[1];
                        }
                      }
                    }
                    
                    cardDetails.set = setDetails;
                  }
                  
                  cardData.card = cardDetails;
                }
                
                // Extract listing information
                const listingMatch = current.match(/listing:\s*\{([\s\S]*?)\}/);
                if (listingMatch) {
                  const listingDetails: any = {};
                  const listingText = listingMatch[0];
                  
                  const listingFields = {
                    price: /price:\s*"([^"]+)"/,
                    usd_price: /usd_price:\s*"([^"]+)"/,
                  };
                  
                  for (const [field, pattern] of Object.entries(listingFields)) {
                    const match = listingText.match(pattern);
                    if (match) {
                      listingDetails[field] = match[1];
                    }
                  }
                  
                  cardData.listing = listingDetails;
                }
                
                cardObjects.push(cardData);
              }
            }
          }
          
          profileData.digital_cards = cardObjects;
        } catch (cardError) {
          console.warn('Failed to parse digital cards:', cardError);
        }
      }
      
      // Try to extract digital_products array
      const productsMatch = profileText.match(/digital_products:\s*\[([\s\S]*?)\]/);
      if (productsMatch) {
        try {
          const productsText = productsMatch[1];
          const productObjects = [];
          let depth = 0;
          let start = -1;
          
          for (let i = 0; i < productsText.length; i++) {
            const char = productsText[i];
            
            if (char === '{') {
              if (depth === 0) start = i;
              depth++;
            } else if (char === '}') {
              depth--;
              if (depth === 0 && start !== -1) {
                const current = productsText.substring(start, i + 1);
                const productData: any = {};
                
                const productFields = {
                  id: /id:\s*(\d+)/,
                  name: /name:\s*"([^"]+)"/,
                  token_id: /token_id:\s*"([^"]+)"/,
                  is_listed: /is_listed:\s*(true|false)/,
                  front_image_url: /front_image_url:\s*"([^"]+)"/,
                  open_status: /open_status:\s*"([^"]+)"/,
                };
                
                for (const [field, pattern] of Object.entries(productFields)) {
                  const match = current.match(pattern);
                  if (match) {
                    if (field === 'is_listed') {
                      productData[field] = match[1] === 'true';
                    } else if (field === 'id') {
                      productData[field] = parseInt(match[1]);
                    } else {
                      productData[field] = match[1];
                    }
                  }
                }
                
                productObjects.push(productData);
              }
            }
          }
          
          profileData.digital_products = productObjects;
        } catch (productError) {
          console.warn('Failed to parse digital products:', productError);
        }
      }
      
      extractedData.profile = profileData;
    }
    
    // Extract stats
    const statsMatch = scriptContent.match(/stats:\s*\{([^}]+)\}/);
    if (statsMatch) {
      const statsData: any = {};
      const statsText = statsMatch[0];
      
      const statPatterns = {
        totalCards: /totalCards:\s*(\d+)/,
        totalPacks: /totalPacks:\s*(\d+)/,
        totalValue: /totalValue:\s*"([^"]+)"/,
      };
      
      for (const [key, pattern] of Object.entries(statPatterns)) {
        const match = statsText.match(pattern);
        if (match) {
          if (key.startsWith('total') && key !== 'totalValue') {
            statsData[key] = parseInt(match[1]);
          } else {
            statsData[key] = match[1];
          }
        }
      }
      
      extractedData.stats = statsData;
    }
    
  } catch (error) {
    console.warn('Failed to extract rip.fun data with fallback method:', error);
  }
  
  return extractedData;
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