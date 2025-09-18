/**
 * Universal Card Data Adapter
 * Normalizes card data from different sources (extract, trade, sales) into a consistent format
 */

export interface UniformCardData {
  // Core identifiers
  id: string;
  name: string;
  tokenId: string;
  uniqueId?: string;
  
  // Card details
  card_number?: string;
  rarity: string;
  set_id?: string;
  set_name: string;
  
  // Images
  large_image_url?: string;
  small_image_url?: string;
  image?: string; // Fallback/primary image
  
  // Source metadata
  source: 'extract' | 'trade' | 'sales';
  
  // Additional context (varies by source)
  context?: {
    // Extract context
    listing?: any;
    
    // Trade context
    tradeType?: 'give' | 'receive';
    userAHas?: boolean;
    userBHas?: boolean;
    estimatedValue?: number;
    
    // Sales context
    price?: {
      wei: string;
      currency: string;
      formatted?: string;
    };
    timestamp?: string;
  };
}

/**
 * Adapt extract page card data (nested structure)
 */
export function adaptExtractCard(card: any): UniformCardData {
  return {
    id: card.card?.id || `token-${card.token_id}`,
    name: card.card?.name || `Token #${card.token_id}`,
    tokenId: card.token_id || card.tokenId || '',
    uniqueId: card.unique_id || card.uniqueId,
    card_number: card.card?.card_number || card.card?.number || '',
    rarity: card.card?.rarity || 'Unknown',
    set_id: card.card?.set_id || '',
    set_name: card.card?.set?.name || card.set?.name || 'Unknown Set',
    large_image_url: card.card?.large_image_url,
    small_image_url: card.card?.small_image_url,
    image: card.card?.large_image_url || card.card?.small_image_url,
    source: 'extract',
    context: {
      listing: card.listing
    }
  };
}

/**
 * Adapt trade finder card data (flattened structure)
 */
export function adaptTradeCard(trade: any): UniformCardData {
  const card = trade.card || trade;
  return {
    id: card?.id || card?.card_id || `card-${card?.name?.replace(/\s+/g, '-').toLowerCase()}`,
    name: card?.name || 'Unknown Card',
    tokenId: card?.tokenId || card?.token_id || '',
    uniqueId: card?.uniqueId || card?.unique_id,
    card_number: card?.card_number || card?.number || '',
    rarity: card?.rarity || 'Unknown',
    set_id: card?.set_id || '',
    set_name: card?.set || card?.set_name || 'Unknown Set',
    large_image_url: card?.large_image_url || card?.image_url,
    small_image_url: card?.small_image_url || card?.image_url,
    image: card?.large_image_url || card?.small_image_url || card?.image_url,
    source: 'trade',
    context: {
      tradeType: trade.tradeType,
      userAHas: trade.userAHas,
      userBHas: trade.userBHas,
      estimatedValue: card?.estimatedValue || card?.market_value
    }
  };
}

/**
 * Adapt sales page card data (enriched structure)
 */
export function adaptSalesCard(sale: any): UniformCardData {
  return {
    id: sale.card?.id || `token-${sale.card?.tokenId}`,
    name: sale.card?.name || `Token #${sale.card?.tokenId}`,
    tokenId: sale.card?.tokenId || '',
    uniqueId: sale.card?.uniqueId,
    card_number: sale.card?.card_number || '',
    rarity: sale.card?.rarity || 'Unknown',
    set_id: sale.card?.set_id || '',
    set_name: sale.card?.set || sale.card?.set_name || 'Unknown Set',
    large_image_url: sale.card?.large_image_url,
    small_image_url: sale.card?.small_image_url,
    image: sale.card?.image || sale.card?.large_image_url,
    source: 'sales',
    context: {
      price: sale.price,
      timestamp: sale.timestamp
    }
  };
}

/**
 * Universal card adapter - automatically detects source and adapts
 */
export function adaptCard(cardData: any, source?: 'extract' | 'trade' | 'sales'): UniformCardData {
  // Auto-detect source if not provided
  if (!source) {
    if (cardData.card?.card && cardData.unique_id) {
      source = 'extract';
    } else if (cardData.tradeType || (cardData.card && (cardData.userAHas !== undefined || cardData.userBHas !== undefined))) {
      source = 'trade';
    } else if (cardData.price || cardData.timestamp) {
      source = 'sales';
    } else {
      // Default fallback - try trade first since it's more flexible
      source = 'trade';
    }
  }

  switch (source) {
    case 'extract':
      return adaptExtractCard(cardData);
    case 'trade':
      return adaptTradeCard(cardData);
    case 'sales':
      return adaptSalesCard(cardData);
    default:
      throw new Error(`Unknown card source: ${source}`);
  }
}

/**
 * Convert uniform card data back to modal-compatible format
 */
export function toModalFormat(uniformCard: UniformCardData): any {
  return {
    // Use extract format as the standard for modal
    card: {
      id: uniformCard.id,
      name: uniformCard.name,
      card_number: uniformCard.card_number,
      rarity: uniformCard.rarity,
      set_id: uniformCard.set_id,
      large_image_url: uniformCard.large_image_url,
      small_image_url: uniformCard.small_image_url,
      set: {
        name: uniformCard.set_name
      }
    },
    unique_id: uniformCard.uniqueId,
    token_id: uniformCard.tokenId,
    // Preserve context for debugging
    _source: uniformCard.source,
    _context: uniformCard.context
  };
}

/**
 * Batch adapt multiple cards
 */
export function adaptCards(cards: any[], source?: 'extract' | 'trade' | 'sales'): UniformCardData[] {
  return cards.map(card => adaptCard(card, source));
}

/**
 * Get best available image URL
 */
export function getBestImageUrl(uniformCard: UniformCardData): string {
  return uniformCard.large_image_url || 
         uniformCard.image || 
         uniformCard.small_image_url || 
         '';
}

/**
 * Check if two cards are the same (for duplicate detection)
 */
export function isSameCard(card1: UniformCardData, card2: UniformCardData): boolean {
  // Primary match: same ID and card number
  if (card1.id && card2.id && card1.id === card2.id) {
    if (card1.card_number && card2.card_number) {
      return card1.card_number === card2.card_number;
    }
    return true;
  }
  
  // Secondary match: same uniqueId
  if (card1.uniqueId && card2.uniqueId) {
    return card1.uniqueId === card2.uniqueId;
  }
  
  // Tertiary match: same tokenId (less reliable)
  if (card1.tokenId && card2.tokenId) {
    return card1.tokenId === card2.tokenId;
  }
  
  return false;
}
