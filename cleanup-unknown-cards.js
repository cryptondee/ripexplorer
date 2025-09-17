/**
 * Cleanup Script for Unknown Cards
 * Re-processes sales events that have incomplete card data using the optimized flow
 */

import { PrismaClient } from '@prisma/client';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const prisma = new PrismaClient();
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const NFT_CONTRACT_ADDRESS = '0xF4710eE68f151B6CB0c377400738c0De9B39284f';

// Collection to set mapping
const COLLECTION_TO_SET_MAP = {
  '151': ['151', 'sv3pt5'],
  'Paldean Fates': ['Paldean Fates', 'sv4pt5'],
  'Obsidian Flames': ['Obsidian Flames', 'sv3'],
  'Paradox Rift': ['Paradox Rift', 'sv4'],
  'Temporal Forces': ['Temporal Forces', 'sv5'],
  'Twilight Masquerade': ['Twilight Masquerade', 'sv6'],
  'Shrouded Fable': ['Shrouded Fable', 'sv7'],
  'Stellar Crown': ['Stellar Crown', 'sv8'],
  'Surging Sparks': ['Surging Sparks', 'sv8pt5'],
  'Prismatic Evolutions': ['Prismatic Evolutions', 'sv9'],
  'Base Set': ['Base Set', 'base1'],
  'Jungle': ['Jungle', 'jungle'],
  'Fossil': ['Fossil', 'fossil']
};

async function getOnchainMetadata(tokenId) {
  try {
    const client = createPublicClient({
      chain: base,
      transport: http(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`)
    });
    
    const tokenURI = await client.readContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: [
        {
          inputs: [{ name: 'tokenId', type: 'uint256' }],
          name: 'tokenURI',
          outputs: [{ name: '', type: 'string' }],
          stateMutability: 'view',
          type: 'function'
        }
      ],
      functionName: 'tokenURI',
      args: [BigInt(tokenId)]
    });
    
    if (tokenURI) {
      // Handle cases where tokenURI is a URL instead of JSON
      if (typeof tokenURI === 'string' && tokenURI.startsWith('http')) {
        console.log(`Token ${tokenId} returns URL, fetching: ${tokenURI}`);
        try {
          const response = await fetch(tokenURI);
          if (response.ok) {
            const metadata = await response.json();
            console.log(`✅ Fetched metadata from URL for token ${tokenId}`);
            return metadata;
          } else {
            console.log(`❌ Failed to fetch URL: ${response.status}`);
            return null;
          }
        } catch (fetchError) {
          console.error(`❌ Error fetching URL:`, fetchError.message);
          return null;
        }
      }
      return JSON.parse(tokenURI);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching metadata for token ${tokenId}:`, error.message);
    return null;
  }
}

function extractIdentifiers(metadata) {
  const attributesMap = new Map();
  
  if (metadata.attributes && Array.isArray(metadata.attributes)) {
    metadata.attributes.forEach((attr) => {
      if (attr.trait_type && attr.value !== undefined) {
        attributesMap.set(attr.trait_type, attr.value);
      }
    });
  }

  return {
    cardId: attributesMap.get('Card Id') || null,
    serialNumber: attributesMap.get('Serial Number') || null,
    collectionName: metadata.collection_name,
    setName: attributesMap.get('Set') || null,
    rarity: attributesMap.get('Rarity') || null
  };
}

async function checkCollectionAvailability(collectionName) {
  try {
    if (!collectionName) {
      return false;
    }
    
    const possibleSetNames = COLLECTION_TO_SET_MAP[collectionName] || [collectionName];
    
    // Filter out undefined values
    const validSetNames = possibleSetNames.filter(name => name != null);
    
    if (validSetNames.length === 0) {
      return false;
    }
    
    const cardCount = await prisma.card.count({
      where: {
        OR: [
          { setName: { in: validSetNames } },
          { setId: { in: validSetNames } }
        ]
      }
    });

    return cardCount > 0;
  } catch (error) {
    console.error(`Error checking collection availability:`, error);
    return false;
  }
}

async function lookupCardById(cardId) {
  try {
    return await prisma.card.findUnique({
      where: { id: cardId }
    });
  } catch (error) {
    console.error(`Error looking up card ${cardId}:`, error);
    return null;
  }
}

async function cleanupUnknownCards() {
  console.log('🧹 Starting cleanup of unknown cards...');
  
  try {
    // Find sales with incomplete card data
    const unknownSales = await prisma.salesEvent.findMany({
      where: {
        OR: [
          { cardName: null },
          { cardName: { startsWith: 'Token #' } },
          { cardRarity: null },
          { cardSet: null }
        ]
      },
      select: {
        id: true,
        tokenId: true,
        cardName: true,
        cardSet: true,
        cardRarity: true
      },
      take: 50 // Process in batches
    });
    
    console.log(`📊 Found ${unknownSales.length} sales with incomplete data`);
    
    let processed = 0;
    let enriched = 0;
    let failed = 0;
    
    for (const sale of unknownSales) {
      try {
        console.log(`\n🔄 Processing sale ${sale.id} (Token #${sale.tokenId})`);
        
        // Step 1: Get onchain metadata
        const metadata = await getOnchainMetadata(sale.tokenId);
        if (!metadata) {
          console.log(`❌ No onchain metadata found`);
          failed++;
          continue;
        }
        
        // Step 2: Extract identifiers
        const identifiers = extractIdentifiers(metadata);
        console.log(`📋 Collection: ${identifiers.collectionName}, Card ID: ${identifiers.cardId}`);
        
        // Step 3: Check if we have this collection
        const hasCollection = await checkCollectionAvailability(identifiers.collectionName);
        
        let updateData = {};
        
        if (hasCollection && identifiers.cardId) {
          // Step 4: Look up in database
          const dbCard = await lookupCardById(identifiers.cardId);
          
          if (dbCard) {
            console.log(`✅ Found in database: ${dbCard.name}`);
            
            // Rich database data
            updateData = {
              cardName: dbCard.name,
              cardImage: dbCard.largeImageUrl || (metadata.image ? `https://d2hl7maqck52px.cloudfront.net/${metadata.image}` : null),
              cardUniqueId: identifiers.serialNumber,
              cardId: identifiers.cardId,
              cardRarity: dbCard.rarity,
              cardSet: dbCard.setName
            };
            enriched++;
          } else {
            console.log(`⚠️ Card ID not found in database`);
          }
        }
        
        // Fallback to onchain data if no database match
        if (Object.keys(updateData).length === 0) {
          console.log(`📦 Using onchain data`);
          const imageUrl = metadata.image 
            ? `https://d2hl7maqck52px.cloudfront.net/${metadata.image}`
            : null;
            
          updateData = {
            cardName: metadata.name,
            cardImage: imageUrl,
            cardUniqueId: identifiers.serialNumber,
            cardId: identifiers.cardId,
            cardRarity: identifiers.rarity,
            cardSet: identifiers.setName
          };
        }
        
        // Update the sales event
        await prisma.salesEvent.update({
          where: { id: sale.id },
          data: updateData
        });
        
        console.log(`✅ Updated: ${updateData.cardName} (${updateData.cardSet})`);
        processed++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ Failed to process sale ${sale.id}:`, error.message);
        failed++;
      }
    }
    
    console.log(`\n🎉 Cleanup complete!`);
    console.log(`📊 Stats:`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Enriched from DB: ${enriched}`);
    console.log(`   Failed: ${failed}`);
    
    // Show final stats
    const totalSales = await prisma.salesEvent.count();
    const withCardName = await prisma.salesEvent.count({ 
      where: { 
        AND: [
          { cardName: { not: null } },
          { cardName: { not: { startsWith: 'Token #' } } }
        ]
      }
    });
    const withRichData = await prisma.salesEvent.count({ 
      where: { 
        AND: [
          { cardName: { not: null } },
          { cardRarity: { not: null } },
          { cardSet: { not: null } }
        ]
      }
    });
    
    console.log(`\n📈 Final database stats:`);
    console.log(`   Total sales: ${totalSales}`);
    console.log(`   With card names: ${withCardName} (${Math.round(withCardName/totalSales*100)}%)`);
    console.log(`   With rich data: ${withRichData} (${Math.round(withRichData/totalSales*100)}%)`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run cleanup
cleanupUnknownCards()
  .then(() => {
    console.log('✅ Cleanup script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup script failed:', error);
    process.exit(1);
  });
