import { json } from '@sveltejs/kit';
import { tradeAnalyzer } from '$lib/server/services/tradeAnalyzer.js';
import type { RequestHandler } from './$types.js';

async function extractUserProfile(input: string, request: Request) {
  console.log(`Extracting profile for: ${input}`);
  
  // Get the origin from the request to handle both dev and production
  const origin = new URL(request.url).origin;
  const extractUrl = `${origin}/api/extract`;
  
  // Use the existing extract API endpoint internally
  const extractResponse = await fetch(extractUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      username: input,
      method: 'auto' 
    })
  });
  
  if (!extractResponse.ok) {
    throw new Error(`Failed to extract profile for ${input}: ${extractResponse.status}`);
  }
  
  const extractData = await extractResponse.json();
  
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
  
  // Extract both user profiles in parallel
  const [profileA, profileB] = await Promise.all([
    extractUserProfile(userA_input, request),
    extractUserProfile(userB_input, request)
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
  
  return {
    tradeAnalysis,
    collectionA,
    collectionB,
    profiles: { profileA, profileB }
  };
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { userA, userB } = await request.json();
    
    // Use the shared analysis function
    const { tradeAnalysis, collectionA, collectionB } = await getTradeAnalysisForUsers(userA, userB, request);
    
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
    let { tradeAnalysis } = await getTradeAnalysisForUsers(userA!, userB!, request);
    
    // Filter by set if specified
    if (setId && setId !== 'all') {
      tradeAnalysis = tradeAnalyzer.filterBySet(tradeAnalysis, setId);
    }
    
    // Paginate results
    const allTrades = [
      ...tradeAnalysis.perfectTrades,
      ...tradeAnalysis.userACanReceive,
      ...tradeAnalysis.userACanGive
    ];
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTrades = allTrades.slice(startIndex, endIndex);
    
    const totalPages = Math.ceil(allTrades.length / limit);
    
    return json({
      success: true,
      trades: paginatedTrades,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: allTrades.length,
        itemsPerPage: limit,
        hasMore: endIndex < allTrades.length
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