// Fix the Hippopotas sale record with the onchain data we have
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixHippopotasSale() {
  const tokenId = '91546';
  
  console.log(`🔧 Fixing Hippopotas sale record for token ${tokenId}...`);
  
  try {
    // First find the sale record
    const existingSale = await prisma.salesEvent.findFirst({
      where: { tokenId: tokenId }
    });
    
    if (!existingSale) {
      console.log('❌ Sale record not found');
      return;
    }
    
    // Update the sales record with the onchain metadata we extracted
    const updatedSale = await prisma.salesEvent.update({
      where: {
        id: existingSale.id
      },
      data: {
        cardName: 'Hippopotas',
        cardSet: 'Prismatic Evolutions',
        cardRarity: 'Common',
        cardUniqueId: 'CARD-RIP0ABC014A068A',
        cardImage: null // No image available in legacy format
      }
    });
    
    console.log('✅ Updated sale record:', {
      id: updatedSale.id,
      cardName: updatedSale.cardName,
      cardSet: updatedSale.cardSet,
      cardRarity: updatedSale.cardRarity,
      cardUniqueId: updatedSale.cardUniqueId
    });
    
    console.log('🎉 Hippopotas sale record has been fixed!');
    
  } catch (error) {
    console.error('❌ Failed to fix sale record:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixHippopotasSale();
