import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSalesData() {
  console.log('🔍 Checking existing sales data...');
  
  // Get a sample of sales events
  const sales = await prisma.salesEvent.findMany({
    take: 5,
    select: {
      id: true,
      tokenId: true,
      cardName: true,
      cardUniqueId: true,
      cardId: true,
      cardSet: true,
      cardRarity: true
    },
    orderBy: {
      timestamp: 'desc'
    }
  });
  
  console.log('\n📊 Sample sales data:');
  sales.forEach((sale, index) => {
    console.log(`\n${index + 1}. Sale ID: ${sale.id}`);
    console.log(`   Token ID: ${sale.tokenId}`);
    console.log(`   Card Name: ${sale.cardName || 'NULL'}`);
    console.log(`   Card Unique ID: ${sale.cardUniqueId || 'NULL'}`);
    console.log(`   Card ID: ${sale.cardId || 'NULL'} ← This is the missing piece!`);
    console.log(`   Card Set: ${sale.cardSet || 'NULL'}`);
    console.log(`   Card Rarity: ${sale.cardRarity || 'NULL'}`);
  });
  
  // Count how many have cardId vs don't
  const totalSales = await prisma.salesEvent.count();
  const salesWithCardId = await prisma.salesEvent.count({
    where: { cardId: { not: null } }
  });
  const salesWithoutCardId = totalSales - salesWithCardId;
  
  console.log(`\n📈 Summary:`);
  console.log(`   Total sales: ${totalSales}`);
  console.log(`   With cardId: ${salesWithCardId}`);
  console.log(`   Without cardId: ${salesWithoutCardId} ← These need migration`);
  
  await prisma.$disconnect();
}

checkSalesData().catch(console.error);
