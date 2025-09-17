// Test the card sync API
import fetch from 'node-fetch';

async function testCardSyncAPI() {
  console.log('🧪 Testing card sync API...');
  
  try {
    // Test GET endpoint (stats)
    console.log('\n📊 Getting sync stats...');
    const statsResponse = await fetch('http://localhost:5173/api/cards/sync');
    
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('Stats:', statsData);
    } else {
      console.log(`Stats API failed: ${statsResponse.status}`);
      const errorText = await statsResponse.text();
      console.log('Error:', errorText);
    }
    
    // Test POST endpoint (sync a small set)
    console.log('\n🔄 Testing sync for sv3pt5 (151 set)...');
    const syncResponse = await fetch('http://localhost:5173/api/cards/sync?setId=sv3pt5', {
      method: 'POST'
    });
    
    if (syncResponse.ok) {
      const syncData = await syncResponse.json();
      console.log('Sync result:', syncData);
    } else {
      console.log(`Sync API failed: ${syncResponse.status}`);
      const errorText = await syncResponse.text();
      console.log('Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCardSyncAPI();
