// Simple script to sync card database
import { cardSyncService } from './src/lib/services/CardSyncService.js';

console.log('🚀 Starting card database sync...');

async function syncCards() {
  try {
    // Get initial stats
    const initialStats = await cardSyncService.getSyncStats();
    console.log(`📊 Initial stats: ${initialStats.totalCards} cards, ${initialStats.totalSets} sets`);
    
    // Sync a few popular sets first
    const testSets = ['sv3pt5', 'sv4pt5', 'base1']; // 151, Paldean Fates, Base Set
    
    for (const setId of testSets) {
      console.log(`\n🔄 Syncing set: ${setId}`);
      try {
        const cardCount = await cardSyncService.syncSet(setId);
        console.log(`✅ Synced ${cardCount} cards from ${setId}`);
      } catch (error) {
        console.error(`❌ Failed to sync ${setId}:`, error.message);
      }
    }
    
    // Get final stats
    const finalStats = await cardSyncService.getSyncStats();
    console.log(`\n🎉 Final stats: ${finalStats.totalCards} cards, ${finalStats.totalSets} sets`);
    
    // Test card lookup
    console.log('\n🔍 Testing card lookup...');
    const testCard = await cardSyncService.findCard({ name: 'Charizard' });
    if (testCard) {
      console.log(`Found card: ${testCard.name} (${testCard.setName})`);
    } else {
      console.log('No Charizard found');
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

syncCards()
  .then(() => {
    console.log('✅ Sync complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Sync error:', error);
    process.exit(1);
  });
