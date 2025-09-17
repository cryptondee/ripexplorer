/**
 * Migration script to populate missing cardId values in existing sales data
 * This fetches the onchain metadata for existing sales and extracts the card_id
 */

import { prisma } from '$lib/server/db/client.js';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const NFT_CONTRACT_ADDRESS = '0xF4710eE68f151B6CB0c377400738c0De9B39284f';

async function getCardMetadataFromChain(tokenId: string): Promise<any> {
  try {
    console.log(`🎨 Fetching onchain metadata for token ${tokenId}...`);
    
    const client = createPublicClient({
      chain: base,
      transport: http(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`)
    });
    
    // Call tokenURI function on NFT contract
    const tokenURI = await client.readContract({
      address: NFT_CONTRACT_ADDRESS as `0x${string}`,
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
      const metadata = JSON.parse(tokenURI as string);
      
      // Extract card_id from attributes
      const attributesMap = new Map();
      if (metadata.attributes && Array.isArray(metadata.attributes)) {
        metadata.attributes.forEach((attr: any) => {
          if (attr.trait_type && attr.value !== undefined) {
            attributesMap.set(attr.trait_type, attr.value);
          }
        });
      }
      
      const cardId = attributesMap.get('Card Id');
      console.log(`✅ Found card_id for token ${tokenId}: ${cardId}`);
      return cardId;
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error fetching metadata for token ${tokenId}:`, error);
    return null;
  }
}

async function migrateSalesCardIds() {
  console.log('🚀 Starting migration of sales card IDs...');
  
  // Get all sales events that don't have cardId populated
  const salesWithoutCardId = await prisma.salesEvent.findMany({
    where: {
      cardId: null
    },
    select: {
      id: true,
      tokenId: true
    }
  });
  
  console.log(`📊 Found ${salesWithoutCardId.length} sales events without cardId`);
  
  let updated = 0;
  let failed = 0;
  
  for (const sale of salesWithoutCardId) {
    try {
      const cardId = await getCardMetadataFromChain(sale.tokenId);
      
      if (cardId) {
        await prisma.salesEvent.update({
          where: { id: sale.id },
          data: { cardId }
        });
        updated++;
        console.log(`✅ Updated sale ${sale.id} with cardId: ${cardId}`);
      } else {
        failed++;
        console.log(`⚠️ No cardId found for sale ${sale.id} (token ${sale.tokenId})`);
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      failed++;
      console.error(`❌ Failed to update sale ${sale.id}:`, error);
    }
  }
  
  console.log(`🎉 Migration complete! Updated: ${updated}, Failed: ${failed}`);
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateSalesCardIds()
    .then(() => {
      console.log('✅ Migration finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { migrateSalesCardIds };
