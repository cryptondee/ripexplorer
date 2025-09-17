// Test enrichment for a specific card
import fetch from 'node-fetch';

async function testSpecificEnrichment() {
  console.log('🧪 Testing enrichment for Nemona\'s Backpack...');
  
  // Test the onchain metadata directly
  const uniqueId = 'CARD-RIPD8DD1E2BCB1B';
  
  try {
    console.log('\n🔍 Fetching onchain metadata...');
    const response = await fetch(`https://rip.fun/api/onchain/card/${uniqueId}/metadata`);
    
    if (response.ok) {
      const onchainData = await response.json();
      console.log('\n📋 Onchain metadata:');
      console.log(JSON.stringify(onchainData, null, 2));
      
      // Check if it has attributes (newer format)
      if (onchainData.attributes && Array.isArray(onchainData.attributes)) {
        console.log('\n🆕 This uses NEWER format (attributes array)');
        onchainData.attributes.forEach((attr, index) => {
          console.log(`   ${index + 1}. ${attr.trait_type}: ${attr.value}`);
        });
      } else {
        console.log('\n🕰️ This uses OLDER format (direct properties)');
        console.log(`   Name: ${onchainData.name}`);
        console.log(`   Image: ${onchainData.image}`);
        console.log(`   Collection: ${onchainData.collection_name}`);
        
        if (onchainData.image) {
          const fullImageUrl = `https://d2hl7maqck52px.cloudfront.net/${onchainData.image}`;
          console.log(`   Full Image URL: ${fullImageUrl}`);
        }
      }
    } else {
      console.log(`❌ API failed: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSpecificEnrichment();
