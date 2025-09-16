/**
 * Trade Service
 * Handles all trade-related API calls and business logic
 */

import { CACHE_DURATIONS } from '$lib/constants/cache';
import { logger } from '$lib/utils/logger';

export interface TradeComparisonParams {
  userA: string;
  userB: string;
  forceRefresh?: boolean;
}

export interface FilteredTradesParams {
  userA: string;
  userB: string;
  page?: number;
  limit?: number;
  set?: string;
  setA?: string;
  setB?: string;
  crossSet?: boolean;
}

export interface TradeComparisonResult {
  success: boolean;
  userA: any;
  userB: any;
  tradeAnalysis: any;
  ownedBySetA: Record<string, number>;
  ownedBySetB: Record<string, number>;
  missingBySetA: Record<string, number>;
  missingBySetB: Record<string, number>;
  availableSets: any[];
  recommendations: any;
  timestamp: string;
}

export class TradeService {
  /**
   * Compare two users and analyze trade opportunities
   */
  async compareUsers(params: TradeComparisonParams): Promise<TradeComparisonResult> {
    const { userA, userB, forceRefresh = false } = params;
    
    logger.log(`Comparing users: ${userA} vs ${userB}`);
    
    const response = await fetch('/api/trade-compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userA, userB, forceRefresh })
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to compare users');
    }
    
    return data;
  }
  
  /**
   * Load filtered trades with pagination
   */
  async loadFilteredTrades(params: FilteredTradesParams): Promise<any> {
    const queryParams = new URLSearchParams();
    
    // Add required parameters
    queryParams.append('userA', params.userA);
    queryParams.append('userB', params.userB);
    
    // Add optional parameters
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    
    // Handle set filtering based on mode
    if (params.crossSet) {
      if (params.setA) queryParams.append('setA', params.setA);
      if (params.setB) queryParams.append('setB', params.setB);
      queryParams.append('crossSet', 'true');
    } else if (params.set) {
      queryParams.append('set', params.set);
    }
    
    const response = await fetch(`/api/trade-compare?${queryParams}`);
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to load filtered trades');
    }
    
    return data;
  }
  
  /**
   * Fetch set totals for completion calculations
   */
  async fetchSetTotals(setIds: string[]): Promise<Record<string, number>> {
    const totals: Record<string, number> = {};
    
    // Batch fetch set data for efficiency
    const promises = setIds.map(async (setId) => {
      try {
        const response = await fetch(`/api/set/${setId}`);
        const data = await response.json();
        totals[setId] = data.cards?.length || 0;
      } catch (error) {
        logger.error(`Failed to fetch set ${setId}:`, error);
        totals[setId] = 0;
      }
    });
    
    await Promise.all(promises);
    return totals;
  }
  
  /**
   * Generate trade summary text
   */
  generateTradeSummary(tradeData: any): string {
    const { userA, userB, giveTrades = [], receiveTrades = [], filters = {} } = tradeData;
    
    const giveValue = giveTrades.reduce((sum: number, trade: any) => 
      sum + (trade.estimatedValue || 0), 0);
    const receiveValue = receiveTrades.reduce((sum: number, trade: any) => 
      sum + (trade.estimatedValue || 0), 0);
    
    const giveCardsList = giveTrades.map((trade: any) => 
      `${trade.card.name} (#${trade.card.card_number}) [${this.getFoilType(trade.card)}] - $${(trade.estimatedValue || 0).toFixed(2)}`
    );
    
    const receiveCardsList = receiveTrades.map((trade: any) => 
      `${trade.card.name} (#${trade.card.card_number}) [${this.getFoilType(trade.card)}] - $${(trade.estimatedValue || 0).toFixed(2)}`
    );
    
    return `
TRADE SUMMARY ${filters.duplicatesOnly ? '(Duplicates Only)' : ''}${filters.selectedCards ? ' (Selected Cards Only)' : ''}
Set: ${filters.setName || 'All Sets'}
${filters.rarity ? `Rarity: ${filters.rarity}` : ''}

${userA.username} CAN GIVE (${giveTrades.length} cards - $${giveValue.toFixed(2)}):
${giveCardsList.join('\n')}

${userA.username} CAN RECEIVE (${receiveTrades.length} cards - $${receiveValue.toFixed(2)}):
${receiveCardsList.join('\n')}

TRADE BALANCE: ${receiveValue > giveValue ? '+' : ''}$${(receiveValue - giveValue).toFixed(2)} (${userA.username} perspective)
Generated on: ${new Date().toLocaleDateString()}
    `.trim();
  }
  
  private getFoilType(card: any): string {
    if (card?.is_reverse) return '🔄 Reverse Holo';
    if (card?.is_holo) return '✨ Holo';
    return '⚪ Normal';
  }
}

// Export singleton instance
export const tradeService = new TradeService();
