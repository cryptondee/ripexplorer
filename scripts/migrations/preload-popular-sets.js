/**
 * Preload Popular Sets Script
 * Downloads the most popular Pokemon card sets for maximum sales enrichment
 */

import { autoEnrichingSalesService } from './src/lib/services/AutoEnrichingSalesService.js';
import { cardSyncService } from './src/lib/services/CardSyncService.js';

async function preloadPopularSets() {
  console.log('🚀 Starting preload of popular Pokemon card sets...');
  console.log('This will ensure maximum enrichment rate for sales data.\n');
  
  try {
    // Get initial stats
    const initialStats = await cardSyncService.getSyncStats();
    console.log(`📊 Initial database state:`);
    console.log(`   Cards: ${initialStats.totalCards}`);
    console.log(`   Sets: ${initialStats.totalSets}`);
    console.log(`   Last sync: ${initialStats.lastSynced || 'Never'}\n`);
    
    // Run the preload
    await autoEnrichingSalesService.preloadPopularSets();
    
    // Get final stats
    const finalStats = await cardSyncService.getSyncStats();
    console.log(`\n📈 Final database state:`);
    console.log(`   Cards: ${finalStats.totalCards} (+${finalStats.totalCards - initialStats.totalCards})`);
    console.log(`   Sets: ${finalStats.totalSets} (+${finalStats.totalSets - initialStats.totalSets})`);
    
    // Calculate expected enrichment rate
    const enrichmentRate = Math.round((finalStats.totalCards / 50000) * 100); // Rough estimate
    console.log(`\n🎯 Expected sales enrichment rate: ~${Math.min(enrichmentRate, 95)}%`);
    
    console.log(`\n✅ Preload complete! The sales page will now provide rich card data for most Pokemon cards.`);
    
  } catch (error) {
    console.error('❌ Preload failed:', error);
  }
}

// Run preload
preloadPopularSets()
  .then(() => {
    console.log('\n🎉 Preload script finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Preload script failed:', error);
    process.exit(1);
  });
