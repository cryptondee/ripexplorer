import { PrismaClient } from '@prisma/client';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const prisma = new PrismaClient();
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const NFT_CONTRACT_ADDRESS = '0xF4710eE68f151B6CB0c377400738c0De9B39284f';

async function debugMetadata(tokenId) {
  try {
    console.log(`🔍 Debugging metadata for token ${tokenId}...`);
    
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
      console.log('\n📋 Raw metadata structure:');
      console.log(JSON.stringify(metadata, null, 2));
      
      if (metadata.attributes) {
        console.log('\n🏷️ Attributes:');
        metadata.attributes.forEach((attr, index) => {
          console.log(`   ${index + 1}. ${attr.trait_type}: ${attr.value}`);
        });
      } else {
        console.log('\n❌ No attributes found in metadata');
      }
    } else {
      console.log('❌ No tokenURI returned');
    }
    
  } catch (error) {
    console.error(`❌ Error:`, error);
  }
}

async function debugSalesMetadata() {
  console.log('🔍 Debugging onchain metadata structure...');
  
  // Get one recent sale to debug
  const sale = await prisma.salesEvent.findFirst({
    where: {
      cardUniqueId: { not: null }
    },
    select: {
      tokenId: true,
      cardName: true,
      cardUniqueId: true
    },
    orderBy: {
      timestamp: 'desc'
    }
  });
  
  if (sale) {
    console.log(`\n🎯 Debugging sale:`);
    console.log(`   Token ID: ${sale.tokenId}`);
    console.log(`   Card Name: ${sale.cardName}`);
    console.log(`   Unique ID: ${sale.cardUniqueId}`);
    
    await debugMetadata(sale.tokenId);
  } else {
    console.log('❌ No sales with cardUniqueId found');
  }
  
  await prisma.$disconnect();
}

debugSalesMetadata().catch(console.error);
