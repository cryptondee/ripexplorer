import { PrismaClient } from '@prisma/client';
import { cardEnrichmentService } from './src/lib/services/CardEnrichmentService.js';

const prisma = new PrismaClient();

async function testGoodSale() {
  console.log('🧪 Testing enrichment with a sale that has card data...');
  
  // Get a sale with card data
  const saleWithData = await prisma.salesEvent.findFirst({
    where: {
      AND: [
        { cardName: { not: null } },
        { cardUniqueId: { not: null } }
      ]
    },
    select: {
      id: true,
      tokenId: true,
      cardName: true,
      cardUniqueId: true,
      cardId: true,
      cardRarity: true,
      cardSet: true,
      cardImage: true
    }
  });
  
  if (!saleWithData) {
    console.log('❌ No sales with card data found');
    return;
  }
  
  console.log('\n📊 Testing with sale:');
  console.log(`   ID: ${saleWithData.id}`);
  console.log(`   Token ID: ${saleWithData.tokenId}`);
  console.log(`   Card Name: ${saleWithData.cardName}`);
  console.log(`   Card Unique ID: ${saleWithData.cardUniqueId}`);
  console.log(`   Card Rarity: ${saleWithData.cardRarity}`);
  console.log(`   Card Set: ${saleWithData.cardSet}`);
  
  // Test the enrichment
  console.log('\n🔄 Testing card enrichment...');
  const enrichedCard = await cardEnrichmentService.enrichCardData({
    name: saleWithData.cardName || undefined,
    uniqueId: saleWithData.cardUniqueId || undefined,
    tokenId: saleWithData.tokenId,
    rarity: saleWithData.cardRarity || undefined,
    set: saleWithData.cardSet || undefined,
    image: saleWithData.cardImage || undefined,
    card_id: saleWithData.cardId || undefined
  });
  
  console.log('\n✅ Enrichment result:');
  if (enrichedCard) {
    console.log(`   ID: ${enrichedCard.id}`);
    console.log(`   Name: ${enrichedCard.name}`);
    console.log(`   Rarity: ${enrichedCard.rarity}`);
    console.log(`   Set: ${enrichedCard.set_name}`);
    console.log(`   Image: ${enrichedCard.image || 'NONE'}`);
    console.log(`   Unique ID: ${enrichedCard.uniqueId}`);
  } else {
    console.log('   NULL - enrichment failed');
  }
  
  await prisma.$disconnect();
}

testGoodSale().catch(console.error);
