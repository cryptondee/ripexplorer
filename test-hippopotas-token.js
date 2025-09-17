// Test the specific Hippopotas token that's showing blank information
import { PrismaClient } from '@prisma/client';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const prisma = new PrismaClient();
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const NFT_CONTRACT_ADDRESS = '0xF4710eE68f151B6CB0c377400738c0De9B39284f';

async function testHippopotasToken() {
  const tokenId = '91546'; // The Hippopotas token from the screenshot
  
  console.log(`🧪 Testing Hippopotas token ${tokenId}...`);
  
  try {
    // Step 1: Check current database entry
    console.log('\n📊 Current database entry:');
    const currentSale = await prisma.salesEvent.findFirst({
      where: { tokenId: tokenId },
      select: {
        id: true,
        cardName: true,
        cardSet: true,
        cardRarity: true,
        cardUniqueId: true,
        cardImage: true
      }
    });
    
    if (currentSale) {
      console.log('Current data:', currentSale);
    } else {
      console.log('No sale found in database');
    }
    
    // Step 2: Get raw onchain metadata
    console.log('\n🔗 Getting onchain metadata...');
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
    
    console.log('Raw tokenURI:', tokenURI);
    
    if (tokenURI) {
      try {
        const metadata = JSON.parse(tokenURI);
        console.log('\n📋 Parsed metadata:');
        console.log('Name:', metadata.name);
        console.log('Collection:', metadata.collection_name);
        console.log('Image:', metadata.image);
        console.log('Attributes:', metadata.attributes);
        
        // Step 3: Extract identifiers (handle both new and legacy formats)
        let identifiers;
        
        // Handle new format (with attributes array)
        if (metadata.attributes && Array.isArray(metadata.attributes)) {
          const attributesMap = new Map();
          metadata.attributes.forEach((attr) => {
            if (attr.trait_type && attr.value !== undefined) {
              attributesMap.set(attr.trait_type, attr.value);
            }
          });

          identifiers = {
            cardId: attributesMap.get('Card Id') || null,
            serialNumber: attributesMap.get('Serial Number') || null,
            collectionName: metadata.collection_name,
            setName: attributesMap.get('Set') || null,
            rarity: attributesMap.get('Rarity') || null,
            isLegacyFormat: false
          };
        }
        // Handle legacy format (direct fields)
        else {
          console.log('📄 Detected legacy metadata format');
          identifiers = {
            cardId: null, // Legacy format doesn't have card_id
            serialNumber: metadata.unique_id || null,
            collectionName: metadata.set || null, // Use set as collection for legacy
            setName: metadata.set || null,
            rarity: metadata.rarity || null,
            isLegacyFormat: true
          };
        }
        
        console.log('\n🎯 Extracted identifiers:');
        console.log(identifiers);
        
        // Step 4: Check if we have this collection
        if (identifiers.collectionName) {
          const collectionToSetMap = {
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
            // Legacy format compatibility
            'sv9': ['Prismatic Evolutions', 'sv9'],
            'Base Set': ['Base Set', 'base1'],
            'Jungle': ['Jungle', 'jungle'],
            'Fossil': ['Fossil', 'fossil']
          };
          
          const possibleSetNames = collectionToSetMap[identifiers.collectionName] || [identifiers.collectionName];
          
          console.log(`\n🔍 Checking collection "${identifiers.collectionName}"...`);
          console.log('Possible set names:', possibleSetNames);
          
          const cardCount = await prisma.card.count({
            where: {
              OR: [
                { setName: { in: possibleSetNames } },
                { setId: { in: possibleSetNames } }
              ]
            }
          });
          
          console.log(`Collection availability: ${cardCount > 0 ? 'AVAILABLE' : 'NOT AVAILABLE'} (${cardCount} cards)`);
          
          // Step 5: Try to find the specific card
          let dbCard = null;
          
          if (identifiers.cardId) {
            console.log(`\n🗄️ Looking up card_id: ${identifiers.cardId}`);
            dbCard = await prisma.card.findUnique({
              where: { id: identifiers.cardId }
            });
          }
          
          // For legacy format or if card_id lookup failed, try name + set lookup
          if (!dbCard && metadata.name && identifiers.setName) {
            console.log(`\n🔍 Searching by name: ${metadata.name}, set: ${identifiers.setName}`);
            dbCard = await prisma.card.findFirst({
              where: {
                name: { contains: metadata.name },
                OR: [
                  { setName: { contains: identifiers.setName } },
                  { setId: { contains: identifiers.setName } }
                ]
              }
            });
          }
          
          if (dbCard) {
            console.log('✅ Found in database:', {
              name: dbCard.name,
              set: dbCard.setName,
              rarity: dbCard.rarity,
              image: dbCard.largeImageUrl
            });
          } else {
            console.log('❌ Card not found in database');
          }
        }
        
      } catch (parseError) {
        console.error('❌ Error parsing metadata:', parseError);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testHippopotasToken();
