/**
 * Test script to demonstrate the two tokenURI scenarios
 * Scenario 1: URL-based (rich metadata)
 * Scenario 2: Direct JSON (limited metadata - needs database reconciliation)
 */

import { PrismaClient } from '@prisma/client';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const prisma = new PrismaClient();
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const NFT_CONTRACT_ADDRESS = '0xF4710eE68f151B6CB0c377400738c0De9B39284f';

async function testTwoScenarios() {
  console.log('🧪 Testing Two TokenURI Scenarios...\n');
  
  const client = createPublicClient({
    chain: base,
    transport: http(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`)
  });
  
  // Test tokens representing each scenario
  const testTokens = [
    { id: '140800', expectedScenario: 'URL-based (Scenario 1)' },
    { id: '91546', expectedScenario: 'Direct JSON (Scenario 2)' }
  ];
  
  for (const token of testTokens) {
    console.log(`\n🔍 Testing Token ${token.id} - Expected: ${token.expectedScenario}`);
    console.log('='.repeat(60));
    
    try {
      // Get tokenURI
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
        args: [BigInt(token.id)]
      });
      
      console.log(`📋 Raw tokenURI: ${tokenURI}`);
      
      // Determine scenario
      let metadata;
      let scenario;
      
      if (typeof tokenURI === 'string' && tokenURI.startsWith('http')) {
        scenario = 'SCENARIO 1: URL-based (Rich Metadata)';
        console.log(`🔗 ${scenario}`);
        console.log(`📥 Fetching from URL: ${tokenURI}`);
        
        try {
          const response = await fetch(tokenURI);
          if (response.ok) {
            metadata = await response.json();
            console.log(`✅ Successfully fetched rich metadata`);
          } else {
            console.log(`❌ Failed to fetch: ${response.status}`);
            continue;
          }
        } catch (fetchError) {
          console.log(`❌ Fetch error: ${fetchError.message}`);
          continue;
        }
      } else {
        scenario = 'SCENARIO 2: Direct JSON (Limited Metadata)';
        console.log(`📦 ${scenario}`);
        console.log(`⚠️ Limited data - needs database reconciliation`);
        
        try {
          metadata = JSON.parse(tokenURI);
        } catch (parseError) {
          console.log(`❌ Parse error: ${parseError.message}`);
          continue;
        }
      }
      
      // Analyze metadata quality
      console.log(`\n📊 Metadata Analysis:`);
      console.log(`   Name: ${metadata.name || 'Missing'}`);
      console.log(`   Collection: ${metadata.collection_name || 'Missing'}`);
      console.log(`   Image: ${metadata.image ? 'Present' : 'Missing'}`);
      console.log(`   Attributes: ${metadata.attributes ? `${metadata.attributes.length} items` : 'Missing'}`);
      console.log(`   Rarity: ${metadata.rarity || 'Missing'}`);
      console.log(`   Set: ${metadata.set || 'Missing'}`);
      console.log(`   Unique ID: ${metadata.unique_id || 'Missing'}`);
      
      // Database reconciliation test (for Scenario 2)
      if (scenario.includes('SCENARIO 2') && metadata.name) {
        console.log(`\n🔍 Testing Database Reconciliation:`);
        
        // Strategy 1: Name + Set lookup
        if (metadata.set) {
          console.log(`🎯 Strategy 1: Name + Set lookup`);
          const dbCard1 = await prisma.card.findFirst({
            where: {
              name: { contains: metadata.name },
              OR: [
                { setName: { contains: metadata.set } },
                { setId: { contains: metadata.set } }
              ]
            }
          });
          
          if (dbCard1) {
            console.log(`✅ Found: ${dbCard1.name} (${dbCard1.setName || dbCard1.setId})`);
            console.log(`   Database has: HP=${dbCard1.hp}, Rarity=${dbCard1.rarity}, Image=${!!dbCard1.largeImageUrl}`);
          } else {
            console.log(`❌ No match found`);
          }
        }
        
        // Strategy 2: Name-only lookup
        console.log(`🎯 Strategy 2: Name-only lookup`);
        const dbCard2 = await prisma.card.findFirst({
          where: {
            name: { contains: metadata.name }
          }
        });
        
        if (dbCard2) {
          console.log(`✅ Found: ${dbCard2.name} (${dbCard2.setName || dbCard2.setId})`);
          console.log(`   Database has: HP=${dbCard2.hp}, Rarity=${dbCard2.rarity}, Image=${!!dbCard2.largeImageUrl}`);
        } else {
          console.log(`❌ No match found`);
        }
      }
      
      // Enrichment recommendation
      console.log(`\n💡 Enrichment Strategy:`);
      if (scenario.includes('SCENARIO 1')) {
        console.log(`   ✅ Rich metadata available - use as-is with minimal database lookup`);
      } else {
        console.log(`   🔄 Limited metadata - PRIORITIZE database reconciliation`);
        console.log(`   📈 Database can provide: HP, types, better images, market price`);
      }
      
    } catch (error) {
      console.error(`❌ Error testing token ${token.id}:`, error.message);
    }
  }
  
  await prisma.$disconnect();
}

testTwoScenarios();
