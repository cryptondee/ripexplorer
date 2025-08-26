import { json } from '@sveltejs/kit';
import { tradeAnalyzer } from '$lib/server/services/tradeAnalyzer.js';
import { extractUserProfile } from '$lib/server/logic/extraction.js';
import type { RequestHandler } from './$types.js';

// Cache of setId -> Set of standardized card keys (matches TradeAnalyzer key format `card_<id>`)
const setCardKeyCache: Map<string, Set<string>> = new Map();

async function getUserProfileForTrade(input: string) {
  console.log(`Extracting profile for: ${input}`);
  
  // Use the shared extraction logic directly (no HTTP overhead)
  const extractData = await extractUserProfile(input, { method: 'auto' });
  
  console.log(`Profile extracted for ${extractData.username}: ${extractData.extractedData.profile?.digital_cards?.length || 0} cards`);
  
  return {
    username: extractData.username,
    id: extractData.resolvedUserId,
    profile: extractData.extractedData.profile,
    cards: extractData.extractedData.profile?.digital_cards || []
  };
}

// Shared function to perform complete trade analysis for two users
async function getTradeAnalysisForUsers(userA_input: string, userB_input: string, request: Request) {
  if (!userA_input || !userB_input) {
    throw new Error('Both userA and userB are required');
  }
  
  if (userA_input === userB_input) {
    throw new Error('Cannot compare user with themselves');
  }
  
  console.log(`Starting trade analysis between "${userA_input}" and "${userB_input}"`);
  
  // Extract both user profiles in parallel using direct function calls
  const [profileA, profileB] = await Promise.all([
    getUserProfileForTrade(userA_input),
    getUserProfileForTrade(userB_input)
  ]);
  
  console.log(`Profile extraction complete:`);
  console.log(`- ${profileA.username} (ID: ${profileA.id}): ${profileA.cards.length} cards`);
  console.log(`- ${profileB.username} (ID: ${profileB.id}): ${profileB.cards.length} cards`);
  
  // Create user collections for trade analysis
  const collectionA = tradeAnalyzer.createUserCollection(
    profileA.username, 
    profileA.id, 
    profileA.profile, 
    profileA.cards
  );
  
  const collectionB = tradeAnalyzer.createUserCollection(
    profileB.username,
    profileB.id, 
    profileB.profile,
    profileB.cards
  );
  
  // Analyze trade opportunities
  console.log('Analyzing trade opportunities...');
  const tradeAnalysis = tradeAnalyzer.analyzeTrades(collectionA, collectionB);
  
  console.log(`Trade analysis complete:`);
  console.log(`- Perfect trades: ${tradeAnalysis.summary.totalPerfectTrades}`);
  console.log(`- ${collectionA.username} can receive: ${tradeAnalysis.summary.totalOneWayToA}`);
  console.log(`- ${collectionA.username} can give: ${tradeAnalysis.summary.totalOneWayToB}`);
  console.log(`- Impossible trades: ${tradeAnalysis.summary.totalImpossible}`);
  
  // Build lightweight per-user owned counts by set (unique cards only)
  const ownedBySetA: Record<string, number> = {};
  for (const card of collectionA.ownedCards.values()) {
    const sid = card.set_id;
    if (!sid) continue;
    ownedBySetA[sid] = (ownedBySetA[sid] || 0) + 1;
  }
  const ownedBySetB: Record<string, number> = {};
  for (const card of collectionB.ownedCards.values()) {
    const sid = card.set_id;
    if (!sid) continue;
    ownedBySetB[sid] = (ownedBySetB[sid] || 0) + 1;
  }

  // Build accurate per-user missing counts by set using official set lists
  const origin = new URL(request.url).origin;

  async function getSetKeys(setId: string): Promise<Set<string>> {
    if (setCardKeyCache.has(setId)) return setCardKeyCache.get(setId)!;
    try {
      const res = await fetch(`${origin}/api/set/${setId}`);
      const data = await res.json();
      const keys = new Set<string>();
      const cards = Array.isArray(data?.cards) ? data.cards : [];
      for (const c of cards) {
        const id = c?.card?.id || c?.id;
        if (!id) continue;
        keys.add(`card_${id}`);
      }
      setCardKeyCache.set(setId, keys);
      return keys;
    } catch (e) {
      console.error(`Failed to load set ${setId} for missing calc:`, e);
      const empty = new Set<string>();
      setCardKeyCache.set(setId, empty);
      return empty;
    }
  }

  async function computeMissingBySet(collection: typeof collectionA, ownedBySet: Record<string, number>): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    const setIds = Object.keys(ownedBySet);
    // Preload all
    await Promise.all(setIds.map((sid) => getSetKeys(sid)));
    for (const sid of setIds) {
      const setKeys = await getSetKeys(sid);
      if (setKeys.size === 0) {
        result[sid] = 0;
        continue;
      }
      // Count how many of the set's keys the user already owns
      let ownedInSet = 0;
      for (const key of setKeys) {
        if (collection.ownedCards.has(key)) ownedInSet += 1;
      }
      result[sid] = Math.max(0, setKeys.size - ownedInSet);
    }
    return result;
  }

  const [missingBySetA, missingBySetB] = await Promise.all([
    computeMissingBySet(collectionA, ownedBySetA),
    computeMissingBySet(collectionB, ownedBySetB)
  ]);

  return {
    tradeAnalysis,
    collectionA,
    collectionB,
    profiles: { profileA, profileB },
    ownedBySetA,
    ownedBySetB,
    missingBySetA,
    missingBySetB
  };
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { userA, userB } = await request.json();
    
    // Use the shared analysis function
    const { tradeAnalysis, collectionA, collectionB, ownedBySetA, ownedBySetB, missingBySetA, missingBySetB } = await getTradeAnalysisForUsers(userA, userB, request);
    
    // Get available sets for filtering
    const availableSets = tradeAnalyzer.getAvailableSets(collectionA, collectionB);
    
    // Generate recommendations
    const recommendations = tradeAnalyzer.generateTradeRecommendations(tradeAnalysis, collectionA, collectionB);
    
    console.log(`- Available sets: ${availableSets.length}`);
    
    return json({
      success: true,
      userA: {
        username: collectionA.username,
        id: collectionA.id,
        totalCards: collectionA.ownedCards.size,
        profile: collectionA.profile
      },
      userB: {
        username: collectionB.username,
        id: collectionB.id,
        totalCards: collectionB.ownedCards.size,
        profile: collectionB.profile
      },
      tradeAnalysis,
      ownedBySetA,
      ownedBySetB,
      missingBySetA,
      missingBySetB,
      availableSets,
      recommendations,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Trade comparison failed:', error);
    return json({ 
      error: 'Trade comparison failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url, request }) => {
  try {
    const userA = url.searchParams.get('userA');
    const userB = url.searchParams.get('userB');
    const setId = url.searchParams.get('set');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    // Use the shared analysis function
    let { tradeAnalysis, collectionA, collectionB } = await getTradeAnalysisForUsers(userA!, userB!, request);
    
    // Get available sets (needed for frontend)
    const availableSets = tradeAnalyzer.getAvailableSets(collectionA, collectionB);
    
    // Filter by set if specified
    if (setId && setId !== 'all') {
      tradeAnalysis = tradeAnalyzer.filterBySet(tradeAnalysis, setId);
    }
    
    // Return all trades without pagination to avoid hiding trade types
    // Frontend handles filtering by trade type, so we need all types available
    const allTrades = [
      ...tradeAnalysis.perfectTrades,
      ...tradeAnalysis.userACanReceive,
      ...tradeAnalysis.userACanGive
    ];
    
    // Don't paginate here - let frontend handle the full dataset for proper filtering
    const paginatedTrades = allTrades;
    
    const totalPages = Math.ceil(allTrades.length / limit);
    
    return json({
      success: true,
      trades: paginatedTrades,
      availableSets,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: allTrades.length,
        itemsPerPage: limit,
        hasMore: false  // No pagination, return all
      },
      summary: tradeAnalysis.summary,
      setFilter: setId || 'all'
    });
    
  } catch (error) {
    console.error('Trade filtering failed:', error);
    return json({ 
      error: 'Trade filtering failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
};