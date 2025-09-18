import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findGoodSales() {
  console.log('🔍 Looking for sales with card data...');
  
  // Find sales that have some card metadata
  const salesWithData = await prisma.salesEvent.findMany({
    where: {
      OR: [
        { cardName: { not: null } },
        { cardUniqueId: { not: null } },
        { cardRarity: { not: null } }
      ]
    },
    take: 5,
    select: {
      id: true,
      tokenId: true,
      cardName: true,
      cardUniqueId: true,
      cardId: true,
      cardRarity: true,
      cardSet: true,
      cardImage: true
    },
    orderBy: {
      timestamp: 'desc'
    }
  });
  
  console.log(`\n📊 Found ${salesWithData.length} sales with card data:`);
  
  salesWithData.forEach((sale, index) => {
    console.log(`\n${index + 1}. Sale ID: ${sale.id}`);
    console.log(`   Token ID: ${sale.tokenId}`);
    console.log(`   Card Name: ${sale.cardName || 'NULL'}`);
    console.log(`   Card Unique ID: ${sale.cardUniqueId || 'NULL'}`);
    console.log(`   Card ID: ${sale.cardId || 'NULL'}`);
    console.log(`   Card Rarity: ${sale.cardRarity || 'NULL'}`);
    console.log(`   Card Set: ${sale.cardSet || 'NULL'}`);
    console.log(`   Card Image: ${sale.cardImage || 'NULL'}`);
  });
  
  // Count different data availability
  const totalSales = await prisma.salesEvent.count();
  const withName = await prisma.salesEvent.count({ where: { cardName: { not: null } } });
  const withUniqueId = await prisma.salesEvent.count({ where: { cardUniqueId: { not: null } } });
  const withCardId = await prisma.salesEvent.count({ where: { cardId: { not: null } } });
  const withNothing = await prisma.salesEvent.count({ 
    where: { 
      AND: [
        { cardName: null },
        { cardUniqueId: null },
        { cardId: null }
      ]
    }
  });
  
  console.log(`\n📈 Data availability summary:`);
  console.log(`   Total sales: ${totalSales}`);
  console.log(`   With card name: ${withName}`);
  console.log(`   With unique ID: ${withUniqueId}`);
  console.log(`   With card ID: ${withCardId}`);
  console.log(`   With no card data: ${withNothing}`);
  
  await prisma.$disconnect();
}

findGoodSales().catch(console.error);
