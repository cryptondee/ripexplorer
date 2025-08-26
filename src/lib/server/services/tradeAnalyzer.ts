export interface TradeCard {
  id: string;
  name: string;
  set_id: string;
  card_number: string;
  rarity: string;
  market_value?: number;
  image_url?: string;
  small_image_url?: string;
  type?: string;
  hp?: number;
  set_name?: string;
  // Foil type information
  is_reverse?: boolean;
  is_holo?: boolean;
  is_first_edition?: boolean;
  is_shadowless?: boolean;
  is_unlimited?: boolean;
  is_promo?: boolean;
}

export interface UserCardCollection {
  username: string;
  id: number | null;
  ownedCards: Map<string, TradeCard>;
  missingCards: Map<string, TradeCard>;
  cardCounts: Map<string, number>;
  profile: any;
}

export interface TradeMatch {
  card: TradeCard;
  tradeType: 'perfect' | 'give' | 'receive' | 'impossible';
  userAHas: boolean;
  userBHas: boolean;
  userANeeds: boolean;
  userBNeeds: boolean;
  estimatedValue?: number;
  userACount?: number;
  userBCount?: number;
}

export interface TradeAnalysis {
  perfectTrades: TradeMatch[];        // Both users can trade with each other
  userACanReceive: TradeMatch[];      // A needs, B has (B -> A)  
  userACanGive: TradeMatch[];         // A has, B needs (A -> B)
  mutualMissing: TradeMatch[];        // Both users missing (impossible trades)
  summary: {
    totalPerfectTrades: number;
    totalOneWayToA: number;
    totalOneWayToB: number;
    totalImpossible: number;
    estimatedPerfectTradeValue: number;
    estimatedOneWayToAValue: number;
    estimatedOneWayToBValue: number;
    tradeBalance: 'even' | 'favors_a' | 'favors_b';
  };
}

export class TradeAnalyzer {
  /**
   * Create standardized card key for comparison - matches extract page deduplication logic
   */
  private createCardKey(card: any): string {
    // Use the same deduplication logic as /extract page: card.card?.id
    const cardId = card.card?.id || card.id;
    return `card_${cardId}`;
  }

  /**
   * Convert card array to standardized Map structure with extract page deduplication and count tracking
   */
  private createCardMap(cards: any[]): { cardMap: Map<string, TradeCard>, cardCounts: Map<string, number> } {
    const cardCounts = new Map<string, number>();
    
    // First count all cards before deduplication
    for (const card of cards) {
      const cardId = card.card?.id || card.id;
      const key = `card_${cardId}`;
      cardCounts.set(key, (cardCounts.get(key) || 0) + 1);
    }

    // Then deduplicate using same logic as /extract page
    const deduplicatedCards = Object.values(cards.reduce((unique: any, card: any) => {
      const cardId = card.card?.id;
      if (!unique[cardId] || unique[cardId].listing) {
        unique[cardId] = card;
      }
      return unique;
    }, {})) as any[];

    const cardMap = new Map<string, TradeCard>();
    
    for (const card of deduplicatedCards) {
      const key = this.createCardKey(card);
      
      // Handle nested card structure from rip.fun API (matches /extract structure)
      const cardInfo = card.card || card;
      const setInfo = cardInfo.set || card.set || {};
      
      const standardCard: TradeCard = {
        id: cardInfo.id || card.id,
        name: cardInfo.name || card.name,
        set_id: setInfo.id || cardInfo.set_id || card.set_id,
        card_number: cardInfo.card_number || card.card_number,
        rarity: cardInfo.rarity || card.rarity,
        // Use same value logic as /extract page
        market_value: parseFloat(card.listing?.usd_price || cardInfo.raw_price || cardInfo.market_value || '0'),
        image_url: cardInfo.small_image_url || cardInfo.image_url || card.front_image_url || card.image_url,
        small_image_url: cardInfo.small_image_url || cardInfo.image_url || card.front_image_url || card.image_url,
        type: cardInfo.type || card.type,
        hp: cardInfo.hp || card.hp,
        set_name: setInfo.name || cardInfo.set_name || card.set_name,
        // Foil type information - handle nested structure
        is_reverse: cardInfo.is_reverse || card.is_reverse,
        is_holo: cardInfo.is_holo || card.is_holo,
        is_first_edition: cardInfo.is_first_edition || card.is_first_edition,
        is_shadowless: cardInfo.is_shadowless || card.is_shadowless,
        is_unlimited: cardInfo.is_unlimited || card.is_unlimited,
        is_promo: cardInfo.is_promo || card.is_promo
      };
      
      cardMap.set(key, standardCard);
    }
    
    console.log(`Created card map: ${cards.length} input -> ${deduplicatedCards.length} deduplicated -> ${cardMap.size} final`);
    return { cardMap, cardCounts };
  }

  /**
   * Calculate missing cards based on available sets
   * For now, this is simplified - in production you'd load from set APIs
   */
  private calculateMissingCards(ownedCards: Map<string, TradeCard>, allAvailableCards: Map<string, TradeCard>): Map<string, TradeCard> {
    const missingCards = new Map<string, TradeCard>();
    
    for (const [key, card] of allAvailableCards) {
      if (!ownedCards.has(key)) {
        missingCards.set(key, card);
      }
    }
    
    return missingCards;
  }

  /**
   * Create user collection with owned and missing card analysis
   */
  createUserCollection(username: string, id: number | null, profile: any, cards: any[], allAvailableCards?: Map<string, TradeCard>): UserCardCollection {
    const { cardMap: ownedCards, cardCounts } = this.createCardMap(cards);
    
    // For missing cards calculation, we need all possible cards
    const missingCards = allAvailableCards 
      ? this.calculateMissingCards(ownedCards, allAvailableCards)
      : new Map(); // Will be calculated later in analyzeTrades
    
    return {
      username,
      id,
      ownedCards,
      missingCards,
      cardCounts,
      profile
    };
  }

  /**
   * Create combined universe of all cards from both users
   */
  private createCardUniverse(userA: UserCardCollection, userB: UserCardCollection): Map<string, TradeCard> {
    const universe = new Map<string, TradeCard>();
    
    // Add all cards from both users to create the universe
    for (const [key, card] of userA.ownedCards) {
      universe.set(key, card);
    }
    
    for (const [key, card] of userB.ownedCards) {
      if (!universe.has(key)) {
        universe.set(key, card);
      }
    }
    
    return universe;
  }

  /**
   * Update user collections with proper missing cards calculation
   */
  private updateMissingCards(userA: UserCardCollection, userB: UserCardCollection, cardUniverse: Map<string, TradeCard>): void {
    // Calculate missing cards for user A
    userA.missingCards = this.calculateMissingCards(userA.ownedCards, cardUniverse);
    
    // Calculate missing cards for user B  
    userB.missingCards = this.calculateMissingCards(userB.ownedCards, cardUniverse);
  }

  /**
   * Analyze trade opportunities between two users
   */
  analyzeTrades(userA: UserCardCollection, userB: UserCardCollection): TradeAnalysis {
    // First, create the universe of all cards from both users
    const cardUniverse = this.createCardUniverse(userA, userB);
    
    // Update missing cards for both users based on the universe
    this.updateMissingCards(userA, userB, cardUniverse);
    
    console.log(`Trade analysis setup:`);
    console.log(`- Card universe: ${cardUniverse.size} total unique cards`);
    console.log(`- ${userA.username}: ${userA.ownedCards.size} owned, ${userA.missingCards.size} missing`);
    console.log(`- ${userB.username}: ${userB.ownedCards.size} owned, ${userB.missingCards.size} missing`);
    const perfectTrades: TradeMatch[] = [];
    const userACanReceive: TradeMatch[] = [];
    const userACanGive: TradeMatch[] = [];
    const mutualMissing: TradeMatch[] = [];

    // Get all unique card keys from both users
    const allCardKeys = new Set([
      ...userA.ownedCards.keys(),
      ...userA.missingCards.keys(), 
      ...userB.ownedCards.keys(),
      ...userB.missingCards.keys()
    ]);

    for (const cardKey of allCardKeys) {
      const userAHas = userA.ownedCards.has(cardKey);
      const userBHas = userB.ownedCards.has(cardKey);
      const userANeeds = userA.missingCards.has(cardKey);
      const userBNeeds = userB.missingCards.has(cardKey);

      // Get card details (prefer owned version for accurate market data)
      const card = userA.ownedCards.get(cardKey) || 
                   userB.ownedCards.get(cardKey) || 
                   userA.missingCards.get(cardKey) || 
                   userB.missingCards.get(cardKey);

      if (!card) continue;

      const baseTradeMatch = {
        card,
        userAHas,
        userBHas, 
        userANeeds,
        userBNeeds,
        estimatedValue: card.market_value || 0,
        userACount: userA.cardCounts.get(cardKey) || 0,
        userBCount: userB.cardCounts.get(cardKey) || 0
      };

      // Debug logging for first few cards
      if (perfectTrades.length + userACanReceive.length + userACanGive.length < 5) {
        console.log(`Card ${card.name} (${cardKey}): A_has=${userAHas}, A_needs=${userANeeds}, B_has=${userBHas}, B_needs=${userBNeeds}`);
      }

      // Perfect trade: Both users have what the other needs
      if (userAHas && userBNeeds && userBHas && userANeeds) {
        perfectTrades.push({
          ...baseTradeMatch,
          tradeType: 'perfect'
        });
        console.log(`✅ Perfect trade found: ${card.name}`);
      }
      // A can receive from B (A needs it, B has it)
      else if (userANeeds && userBHas) {
        userACanReceive.push({
          ...baseTradeMatch,
          tradeType: 'receive'
        });
        if (userACanReceive.length <= 3) {
          console.log(`⬅️ A can receive: ${card.name} (B has, A needs)`);
        }
      }
      // A can give to B (A has it, B needs it)  
      else if (userAHas && userBNeeds) {
        userACanGive.push({
          ...baseTradeMatch,
          tradeType: 'give'
        });
        if (userACanGive.length <= 3) {
          console.log(`➡️ A can give: ${card.name} (A has, B needs)`);
        }
      }
      // Both missing (impossible trade)
      else if (userANeeds && userBNeeds) {
        mutualMissing.push({
          ...baseTradeMatch,
          tradeType: 'impossible'
        });
      }
    }

    // Calculate summary statistics
    const estimatedPerfectTradeValue = perfectTrades.reduce((sum, trade) => sum + trade.estimatedValue!, 0);
    const estimatedOneWayToAValue = userACanReceive.reduce((sum, trade) => sum + trade.estimatedValue!, 0);
    const estimatedOneWayToBValue = userACanGive.reduce((sum, trade) => sum + trade.estimatedValue!, 0);

    // Determine trade balance
    let tradeBalance: 'even' | 'favors_a' | 'favors_b' = 'even';
    const balanceDifference = estimatedOneWayToAValue - estimatedOneWayToBValue;
    if (Math.abs(balanceDifference) > 50) { // $50 threshold
      tradeBalance = balanceDifference > 0 ? 'favors_a' : 'favors_b';
    }

    return {
      perfectTrades: perfectTrades.sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0)),
      userACanReceive: userACanReceive.sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0)),
      userACanGive: userACanGive.sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0)),
      mutualMissing: mutualMissing.sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0)),
      summary: {
        totalPerfectTrades: perfectTrades.length,
        totalOneWayToA: userACanReceive.length,
        totalOneWayToB: userACanGive.length,
        totalImpossible: mutualMissing.length,
        estimatedPerfectTradeValue,
        estimatedOneWayToAValue,
        estimatedOneWayToBValue,
        tradeBalance
      }
    };
  }

  /**
   * Get available sets from both users' collections
   */
  getAvailableSets(userA: UserCardCollection, userB: UserCardCollection): { id: string; name: string; count: number }[] {
    const setData = new Map<string, { id: string; name: string; count: number }>();
    
    // Process both users' cards
    for (const [key, card] of [...userA.ownedCards.entries(), ...userB.ownedCards.entries()]) {
      if (card.set_id) {
        const existing = setData.get(card.set_id);
        if (existing) {
          existing.count++;
        } else {
          setData.set(card.set_id, {
            id: card.set_id,
            name: card.set_name || card.set_id,
            count: 1
          });
        }
      }
    }
    
    // Convert to array and sort by name
    return Array.from(setData.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Filter trade analysis by set
   */
  filterBySet(analysis: TradeAnalysis, setId?: string): TradeAnalysis {
    if (!setId || setId === 'all') {
      return analysis;
    }
    
    const filterBySetId = (trades: TradeMatch[]) => 
      trades.filter(trade => trade.card.set_id === setId);
    
    return {
      ...analysis,
      perfectTrades: filterBySetId(analysis.perfectTrades),
      userACanReceive: filterBySetId(analysis.userACanReceive),
      userACanGive: filterBySetId(analysis.userACanGive),
      mutualMissing: filterBySetId(analysis.mutualMissing),
      summary: {
        totalPerfectTrades: filterBySetId(analysis.perfectTrades).length,
        totalOneWayToA: filterBySetId(analysis.userACanReceive).length,
        totalOneWayToB: filterBySetId(analysis.userACanGive).length,
        totalImpossible: filterBySetId(analysis.mutualMissing).length,
        estimatedPerfectTradeValue: filterBySetId(analysis.perfectTrades).reduce((sum, trade) => sum + (trade.estimatedValue || 0), 0),
        estimatedOneWayToAValue: filterBySetId(analysis.userACanReceive).reduce((sum, trade) => sum + (trade.estimatedValue || 0), 0),
        estimatedOneWayToBValue: filterBySetId(analysis.userACanGive).reduce((sum, trade) => sum + (trade.estimatedValue || 0), 0),
        tradeBalance: 'even' as 'even' | 'favors_a' | 'favors_b'
      }
    };
  }

  /**
   * Generate trade recommendations based on analysis
   */
  generateTradeRecommendations(analysis: TradeAnalysis, userA: UserCardCollection, userB: UserCardCollection): string[] {
    const recommendations: string[] = [];

    if (analysis.summary.totalPerfectTrades > 0) {
      recommendations.push(`🎯 ${analysis.summary.totalPerfectTrades} perfect trades available! Both users can benefit mutually.`);
      
      if (analysis.summary.estimatedPerfectTradeValue > 100) {
        recommendations.push(`💰 Perfect trades worth approximately $${analysis.summary.estimatedPerfectTradeValue.toFixed(2)} combined.`);
      }
    }

    if (analysis.summary.totalOneWayToA > 0) {
      recommendations.push(`⬅️ ${userA.username} can receive ${analysis.summary.totalOneWayToA} cards from ${userB.username}.`);
    }

    if (analysis.summary.totalOneWayToB > 0) {
      recommendations.push(`➡️ ${userA.username} can give ${analysis.summary.totalOneWayToB} cards to ${userB.username}.`);
    }

    if (analysis.summary.tradeBalance === 'favors_a') {
      recommendations.push(`⚖️ Trade balance favors ${userA.username} - consider offering additional compensation.`);
    } else if (analysis.summary.tradeBalance === 'favors_b') {
      recommendations.push(`⚖️ Trade balance favors ${userB.username} - ${userA.username} might request additional compensation.`);
    } else {
      recommendations.push(`✅ Trade values are well balanced between both users.`);
    }

    if (analysis.summary.totalImpossible > 50) {
      recommendations.push(`🔍 ${analysis.summary.totalImpossible} cards both users are missing - consider finding a third trading partner.`);
    }

    return recommendations;
  }
}

// Export singleton instance
export const tradeAnalyzer = new TradeAnalyzer();