import type { ExtractedData } from '../types.js';

export function normalizeData(data: ExtractedData): ExtractedData {
  // First, clean up rip.fun specific data by removing clip_embedding
  const cleanedData = cleanRipFunData(data);
  const normalized: ExtractedData = {};
  
  function flattenObject(obj: any, prefix: string = ''): Record<string, any> {
    const flattened: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (value === null || value === undefined || value === '') {
        continue;
      }
      
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        Object.assign(flattened, flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        const cleanArray = value.filter(item => 
          item !== null && item !== undefined && item !== ''
        );
        if (cleanArray.length > 0) {
          flattened[newKey] = [...new Set(cleanArray)];
        }
      } else {
        flattened[newKey] = value;
      }
    }
    
    return flattened;
  }
  
  const flattened = flattenObject(cleanedData);
  
  for (const [key, value] of Object.entries(flattened)) {
    let normalizedKey = key.toLowerCase()
      .replace(/[_\-\s]+/g, '_')
      .replace(/[^a-z0-9_.]/g, '');
    
    if (typeof value === 'string') {
      let normalizedValue = value.trim();
      
      if (isDateString(normalizedValue)) {
        normalizedValue = new Date(normalizedValue).toISOString();
      }
      
      if (isUrl(normalizedValue)) {
        normalizedValue = normalizeUrl(normalizedValue);
      }
      
      if (isEmail(normalizedValue)) {
        normalizedValue = normalizedValue.toLowerCase();
      }
      
      if (isSocialHandle(normalizedValue)) {
        normalizedValue = normalizeSocialHandle(normalizedValue);
      }
      
      normalized[normalizedKey] = normalizedValue;
    } else {
      normalized[normalizedKey] = value;
    }
  }
  
  return removeUnusedKeys(normalized);
}

function isDateString(str: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(str) || 
         /^\d{1,2}\/\d{1,2}\/\d{4}/.test(str) ||
         !isNaN(Date.parse(str));
}

function isUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

function isEmail(str: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

function isSocialHandle(str: string): boolean {
  return /^@\w+$/.test(str) || /^https?:\/\/(twitter|github|linkedin)/.test(str);
}

function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

function normalizeSocialHandle(handle: string): string {
  if (handle.startsWith('@')) {
    return handle.substring(1);
  }
  
  const match = handle.match(/https?:\/\/(?:www\.)?(twitter|github|linkedin)\.com\/([^\/\?]+)/);
  if (match) {
    return match[2];
  }
  
  return handle;
}

export function cleanRipFunData(data: any): ExtractedData {
  // Deep clone the data to avoid mutating the original
  const cleanedData = JSON.parse(JSON.stringify(data));
  
  // Handle array of objects (like the rip.fun data structure)
  if (Array.isArray(cleanedData)) {
    cleanedData.forEach((topLevelObject: any) => {
      // Clean digital_cards array inside profile
      topLevelObject.data?.profile?.digital_cards?.forEach((digitalCard: any) => {
        if (digitalCard.card?.clip_embedding) {
          delete digitalCard.card.clip_embedding;
        }
      });

      // Clean top-level cards array
      topLevelObject.data?.cards?.forEach((cardObject: any) => {
        if (cardObject.card?.clip_embedding) {
          delete cardObject.card.clip_embedding;
        }
      });
    });
  } else if (typeof cleanedData === 'object' && cleanedData !== null) {
    // Handle single object structure
    cleanedData.data?.profile?.digital_cards?.forEach((digitalCard: any) => {
      if (digitalCard.card?.clip_embedding) {
        delete digitalCard.card.clip_embedding;
      }
    });

    cleanedData.data?.cards?.forEach((cardObject: any) => {
      if (cardObject.card?.clip_embedding) {
        delete cardObject.card.clip_embedding;
      }
    });
  }
  
  return cleanedData;
}

/**
 * Filter heavy gameplay fields from card data to reduce payload size
 * Removes: subtype, hp, types, abilities, attacks, weaknesses, resistances
 * Keeps: essential display and identification fields
 */
export function filterCardFields(card: any): any {
  if (!card || typeof card !== 'object') {
    return card;
  }

  const {
    // Remove heavy gameplay fields
    subtype,
    hp,
    types,
    abilities,
    attacks,
    weaknesses,
    resistances,
    
    // Keep all essential display fields
    ...essentialFields
  } = card;
  
  return essentialFields;
}

/**
 * Replace full set object with set_id reference to reduce duplication
 * Keeps the set object but removes heavy metadata
 */
export function optimizeSetReference(card: any): any {
  if (!card?.set) {
    return card;
  }

  // Keep only essential set fields, remove heavy metadata
  const {
    logo,
    background_image_url,
    value_score,
    tcgplayer_id,
    card_count,
    series_id,
    created_at,
    updated_at,
    ...essentialSetFields
  } = card.set;

  return {
    ...card,
    set: essentialSetFields
  };
}

/**
 * Apply all optimizations to extracted data
 */
export function optimizeExtractedData(data: any): any {
  if (!data) return data;

  // Handle array structure (multiple data objects)
  if (Array.isArray(data)) {
    return data.map(item => optimizeExtractedData(item));
  }

  // Handle single data object
  if (typeof data === 'object' && data !== null) {
    const optimized = { ...data };

    // Process digital_cards in profile
    if (optimized.profile?.digital_cards) {
      optimized.profile.digital_cards = optimized.profile.digital_cards.map((digitalCard: any) => {
        if (digitalCard.card) {
          const optimizedCard = filterCardFields(digitalCard.card);
          const withOptimizedSet = optimizeSetReference({ card: optimizedCard });
          return {
            ...digitalCard,
            card: withOptimizedSet.card
          };
        }
        return digitalCard;
      });
    }

    // Process top-level cards array  
    if (optimized.cards) {
      optimized.cards = optimized.cards.map((cardObject: any) => {
        if (cardObject.card) {
          const optimizedCard = filterCardFields(cardObject.card);
          const withOptimizedSet = optimizeSetReference({ card: optimizedCard });
          return {
            ...cardObject,
            card: withOptimizedSet.card
          };
        }
        return cardObject;
      });
    }

    return optimized;
  }

  return data;
}

function removeUnusedKeys(data: ExtractedData): ExtractedData {
  const uselessKeys = [
    'id', 'uuid', 'timestamp', 'created_at', 'updated_at', 'version',
    'csrf_token', 'session_id', 'cache', 'debug', 'dev', 'test',
    'analytics', 'tracking', 'gtm', 'ga', 'pixel', 'ads', 'clip_embedding'
  ];
  
  const filtered: ExtractedData = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (!uselessKeys.some(useless => key.includes(useless))) {
      filtered[key] = value;
    }
  }
  
  return filtered;
}