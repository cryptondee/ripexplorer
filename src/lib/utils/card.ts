// Utilities related to card data structures used across components
export function getSetNameFromCard(input: any, setCardsData?: any): string {
  const card = input?.card ?? input;
  const numericOnly = (s: any) => typeof s === 'string' && /^\d+$/.test(s.trim());
  const setId = card?.set?.id || card?.card?.set_id || card?.set_id;
  
  // Extended known mappings for sets
  const knownSetNames: Record<string, string> = {
    'sv3pt5': '151',
    'sv8pt5': 'Surging Sparks', 
    'zsv10pt5': 'Stellar Crown',
    'rsv10pt5': 'Stellar Crown',
    'sv4': 'Paradox Rift',
    'sv5': 'Temporal Forces'
  };
  if (setId && knownSetNames[setId]) return knownSetNames[setId];

  // Try direct set name first
  const primary = card?.set?.name || card?.card?.set?.name;
  if (primary && !numericOnly(primary) && primary !== setId && primary !== 'Unknown Set') {
    return primary;
  }

  // Prefer cached set metadata name if available
  const cachedName = setId && setCardsData && (setCardsData[setId]?.set?.name || setCardsData[setId]?.cards?.[0]?.set?.name);
  if (cachedName && !numericOnly(cachedName)) return cachedName;

  // Fall back to top-level digital card set.name if non-numeric  
  const topLevelName = card?.set?.name;
  if (topLevelName && !numericOnly(topLevelName)) return topLevelName;

  // Last resort: primary or setId or Unknown
  return primary && !numericOnly(primary) ? primary : (setId || 'Unknown Set');
}
