import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugCardImages() {
  console.log('🖼️ Debugging card images...');
  
  // Get a sale with card data to see what image info we have
  const sale = await prisma.salesEvent.findFirst({
    where: {
      cardName: 'Nemona\'s Backpack'
    },
    select: {
      id: true,
      tokenId: true,
      cardName: true,
      cardUniqueId: true,
      cardImage: true
    }
  });
  
  if (sale) {
    console.log('\n📊 Database image data:');
    console.log(`   Card Name: ${sale.cardName}`);
    console.log(`   Unique ID: ${sale.cardUniqueId}`);
    console.log(`   Card Image: ${sale.cardImage || 'NULL'}`);
    
    // Test what the onchain metadata endpoint returns
    if (sale.cardUniqueId) {
      console.log('\n🔍 Testing onchain metadata endpoint...');
      try {
        const response = await fetch(`https://rip.fun/api/onchain/card/${sale.cardUniqueId}/metadata`);
        if (response.ok) {
          const metadata = await response.json();
          console.log('\n📋 Onchain metadata:');
          console.log(`   Name: ${metadata.name}`);
          console.log(`   Image: ${metadata.image || 'NONE'}`);
          console.log(`   Collection: ${metadata.collection_name || 'NONE'}`);
          
          if (metadata.image) {
            const fullImageUrl = `https://d2hl7maqck52px.cloudfront.net/${metadata.image}`;
            console.log(`   Full Image URL: ${fullImageUrl}`);
          }
        } else {
          console.log(`❌ Onchain API failed: ${response.status}`);
        }
      } catch (error) {
        console.error('❌ Error fetching onchain metadata:', error.message);
      }
    }
  } else {
    console.log('❌ No Nemona\'s Backpack sale found');
  }
  
  await prisma.$disconnect();
}

debugCardImages().catch(console.error);
