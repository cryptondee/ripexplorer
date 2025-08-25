import type { ExtractedData } from '../types.js';

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
 * Basic data optimization - mostly passes data through since 
 * clip_embedding removal is handled by cleanRipFunData
 */
export function optimizeExtractedData(data: any): any {
  // Simply return the data as-is since the main optimization
  // (clip_embedding removal) is handled by cleanRipFunData
  return data;
}