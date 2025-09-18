import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugSpecificSale() {
  console.log('🔍 Checking specific sale data...');
  
  // Get the sale that was shown in the API response
  const sale = await prisma.salesEvent.findUnique({
    where: {
      id: 'cmfogbu1a000cyluokblfdsxi'
    }
  });
  
  if (sale) {
    console.log('\n📊 Database record:');
    console.log(`ID: ${sale.id}`);
    console.log(`Token ID: ${sale.tokenId}`);
    console.log(`Card Name: ${sale.cardName || 'NULL'}`);
    console.log(`Card Unique ID: ${sale.cardUniqueId || 'NULL'}`);
    console.log(`Card ID: ${sale.cardId || 'NULL'}`);
    console.log(`Card Rarity: ${sale.cardRarity || 'NULL'}`);
    console.log(`Card Set: ${sale.cardSet || 'NULL'}`);
    console.log(`Card Image: ${sale.cardImage || 'NULL'}`);
    
    console.log('\n🔍 Enrichment input would be:');
    console.log({
      name: sale.cardName || undefined,
      uniqueId: sale.cardUniqueId || undefined,
      tokenId: sale.tokenId,
      rarity: sale.cardRarity || undefined,
      set: sale.cardSet || undefined,
      image: sale.cardImage || undefined,
      card_id: sale.cardId || undefined
    });
  } else {
    console.log('❌ Sale not found');
  }
  
  await prisma.$disconnect();
}

debugSpecificSale().catch(console.error);
