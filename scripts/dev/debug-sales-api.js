// Debug script to test the sales API response
import fetch from 'node-fetch';

async function debugSalesAPI() {
  console.log('🔍 Testing sales API...');
  
  try {
    const response = await fetch('http://localhost:5173/api/sales?timeframe=24h&page=1&limit=5');
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    console.log('\n📊 API Response:');
    console.log(`Success: ${data.success}`);
    console.log(`Total sales: ${data.sales?.length || 0}`);
    
    if (data.sales && data.sales.length > 0) {
      console.log('\n🎯 First sale data:');
      const firstSale = data.sales[0];
      console.log(JSON.stringify(firstSale, null, 2));
      
      console.log('\n🃏 Card data structure:');
      console.log(`Card ID: ${firstSale.card?.id || 'MISSING'}`);
      console.log(`Card Name: ${firstSale.card?.name || 'MISSING'}`);
      console.log(`Card Rarity: ${firstSale.card?.rarity || 'MISSING'}`);
      console.log(`Card Set: ${firstSale.card?.set || 'MISSING'}`);
      console.log(`Card Image: ${firstSale.card?.image || 'MISSING'}`);
      console.log(`Token ID: ${firstSale.card?.tokenId || 'MISSING'}`);
      console.log(`Unique ID: ${firstSale.card?.uniqueId || 'MISSING'}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

debugSalesAPI();
