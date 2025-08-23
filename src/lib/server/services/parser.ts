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
    // Look for the kit.start() function call and extract the complete data array
    const kitStartMatch = scriptContent.match(/kit\.start\([^,]+,\s*[^,]+,\s*\{[^}]*data:\s*(\[.*?\])/s);
    
    if (kitStartMatch) {
      try {
        // Extract the data array string - this is still JavaScript, not JSON
        // We need to find a way to safely convert it to JSON
        
        // Try to find the closing bracket for the data array by counting brackets
        let bracketCount = 0;
        let endIndex = 0;
        
        for (let i = 0; i < scriptContent.length; i++) {
          const char = scriptContent[i];
          if (char === '[') bracketCount++;
          if (char === ']') bracketCount--;
          if (bracketCount === 0 && char === ']') {
            endIndex = i;
            break;
          }
        }
        
        // Find the start of the data array
        const dataStartIndex = scriptContent.indexOf(kitStartMatch[1]);
        if (dataStartIndex !== -1 && endIndex > dataStartIndex) {
          // Extract the complete data array
          const fullDataStr = scriptContent.substring(dataStartIndex, endIndex + 1);
          
          // This is the most robust approach - try to convert JavaScript object notation to JSON
          // by replacing JavaScript-specific syntax with JSON equivalents
          let jsonStr = fullDataStr
            .replace(/new Date\((\d+)\)/g, '"$1"') // Replace new Date() with timestamp strings
            .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*):/g, '$1"$2":') // Quote object keys
            .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
            .replace(/\bclip_embedding:\[[\d\s,.\-]*\]/g, '"clip_embedding":"REMOVED"'); // Replace clip_embedding arrays
          
          try {
            const parsedData = JSON.parse(jsonStr);
            
            // Extract the complete data structure
            if (Array.isArray(parsedData)) {
              const extractedData: ExtractedData = {};
              
              parsedData.forEach((item: any) => {
                if (item && item.data) {
                  // Merge all data from each item
                  Object.assign(extractedData, item.data);
                }
              });
              
              return extractedData;
            }
          } catch (jsonError) {
            console.warn('Failed to parse as JSON, falling back to regex extraction:', jsonError);
          }
        }
      } catch (extractError) {
        console.warn('Failed to extract data array:', extractError);
      }
    }
    
    // Fallback to regex extraction for key fields if JSON parsing fails
    return extractRipFunDataFallback(scriptContent);
    
  } catch (error) {
    console.warn('Failed to extract rip.fun data:', error);
    return {};
  }
}

function extractRipFunDataFallback(scriptContent: string): ExtractedData {
  const extractedData: ExtractedData = {};
  
  try {
    // First try to extract the complete profile object with more complex regex
    const fullProfileMatch = scriptContent.match(/profile:\s*\{[\s\S]*?digital_cards:\s*\[[\s\S]*?\][\s\S]*?\}/);
    
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
      
      // Try to extract digital_cards array
      const cardsMatch = profileText.match(/digital_cards:\s*\[([\s\S]*?)\]/);
      if (cardsMatch) {
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