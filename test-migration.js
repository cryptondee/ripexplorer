import { PrismaClient } from '@prisma/client';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const prisma = new PrismaClient();
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const NFT_CONTRACT_ADDRESS = '0xF4710eE68f151B6CB0c377400738c0De9B39284f';

async function getCardIdFromChain(tokenId) {
  try {
    console.log(`🎨 Fetching onchain metadata for token ${tokenId}...`);
    
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
      const metadata = JSON.parse(tokenURI);
      
      // Extract card_id from attributes
      const attributesMap = new Map();
      if (metadata.attributes && Array.isArray(metadata.attributes)) {
        metadata.attributes.forEach((attr) => {
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

async function testMigration() {
  console.log('🧪 Testing migration on a few sales...');
  
  // Get 3 sales that have uniqueId but no cardId
  const testSales = await prisma.salesEvent.findMany({
    where: {
      cardId: null,
      cardUniqueId: { not: null }
    },
    take: 3,
    select: {
      id: true,
      tokenId: true,
      cardName: true,
      cardUniqueId: true
    }
  });
  
  console.log(`📊 Testing ${testSales.length} sales...`);
  
  for (const sale of testSales) {
    console.log(`\n🔄 Processing sale ${sale.id}:`);
    console.log(`   Token ID: ${sale.tokenId}`);
    console.log(`   Card Name: ${sale.cardName}`);
    console.log(`   Unique ID: ${sale.cardUniqueId}`);
    
    const cardId = await getCardIdFromChain(sale.tokenId);
    
    if (cardId) {
      await prisma.salesEvent.update({
        where: { id: sale.id },
        data: { cardId }
      });
      console.log(`✅ Updated with cardId: ${cardId}`);
    } else {
      console.log(`⚠️ No cardId found`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n🎉 Test migration complete!');
  await prisma.$disconnect();
}

testMigration().catch(console.error);
