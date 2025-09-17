// Test the sales API with a sale that has card data
import fetch from 'node-fetch';

async function testSalesWithData() {
  console.log('🧪 Testing sales API to find cards with data...');
  
  try {
    // Get more sales to find one with data
    const response = await fetch('http://localhost:5173/api/sales?timeframe=24h&page=1&limit=20');
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    console.log(`\n📊 Got ${data.sales?.length || 0} sales`);
    
    // Find sales with actual card data
    const salesWithData = data.sales.filter(sale => 
      sale.card && 
      sale.card.name && 
      sale.card.name !== `Token #${sale.card.tokenId}` &&
      sale.card.uniqueId
    );
    
    console.log(`\n🎯 Found ${salesWithData.length} sales with real card data:`);
    
    salesWithData.slice(0, 3).forEach((sale, index) => {
      console.log(`\n${index + 1}. Sale: ${sale.id}`);
      console.log(`   Card Name: ${sale.card.name}`);
      console.log(`   Card Rarity: ${sale.card.rarity}`);
      console.log(`   Card Set: ${sale.card.set}`);
      console.log(`   Unique ID: ${sale.card.uniqueId}`);
      console.log(`   Image: ${sale.card.image || 'NONE'}`);
      console.log(`   Token ID: ${sale.card.tokenId}`);
    });
    
    if (salesWithData.length === 0) {
      console.log('\n⚠️ No sales with enriched card data found!');
      console.log('This suggests the card enrichment is not working properly.');
      
      // Show what we do have
      console.log('\n📋 Sample of what we have:');
      data.sales.slice(0, 3).forEach((sale, index) => {
        console.log(`\n${index + 1}. ${sale.card.name} (${sale.card.tokenId})`);
        console.log(`   Rarity: ${sale.card.rarity}`);
        console.log(`   Set: ${sale.card.set}`);
        console.log(`   Unique ID: ${sale.card.uniqueId || 'NONE'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testSalesWithData();
