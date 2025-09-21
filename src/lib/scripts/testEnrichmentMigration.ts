#!/usr/bin/env tsx
/**
 * Test script to verify new enrichment service works correctly
 * Run with: npm run test:enrichment
 */

import { salesEnrichmentService } from '../server/services/domain/SalesEnrichmentService.js';
// REMOVED: All old enrichment services - fully migrated to unified service

// Test data matching real sales events
const testCases = [
  {
    name: 'Card with full metadata',
    metadata: {
      name: 'Charizard',
      collection_name: '151',
      attributes: [
        { trait_type: 'Card Id', value: 'sv3pt5-185' },
        { trait_type: 'Serial Number', value: 'CARD-123456' },
        { trait_type: 'Rarity', value: 'Rare Holo' }
      ]
    }
  },
  {
    name: 'Legacy format card',
    metadata: {
      name: 'Pikachu',
      set: 'Base Set',
      rarity: 'Common',
      unique_id: 'CARD-789'
    }
  },
  {
    name: 'Minimal metadata',
    metadata: {
      name: 'Unknown Card'
    }
  }
];

async function testService(serviceName: string, enrichFunction: Function, testCase: any) {
  console.log(`\n  Testing: ${testCase.name}`);
  const startTime = Date.now();
  
  try {
    const result = await enrichFunction(testCase.metadata);
    const duration = Date.now() - startTime;
    
    console.log(`    ✓ ${serviceName} succeeded in ${duration}ms`);
    console.log(`      - Source: ${result.enrichmentSource}`);
    console.log(`      - Card: ${result.cardName}`);
    
    return { success: true, duration, result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`    ✗ ${serviceName} failed:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

async function main() {
  console.log('=' .repeat(60));
  console.log('ENRICHMENT SERVICE MIGRATION TEST');
  console.log('=' .repeat(60));
  
  let allPassed = true;
  
  for (const testCase of testCases) {
    console.log(`\n${testCase.name}:`);
    console.log('-'.repeat(40));
    
    // Test unified service (old services removed)
    const results = await Promise.all([
      testService('Unified Service', 
        (m: any) => salesEnrichmentService.enrichWithAutoDownload(m), 
        testCase
      )
    ]);
    
    // Compare results
    const newResult = results[0];
    const oldResults = results.slice(1);
    
    if (!newResult.success) {
      console.log('\n  ⚠️  NEW service failed!');
      allPassed = false;
    } else {
      // Check if results are consistent
      const oldSuccessful = oldResults.filter(r => r.success);
      if (oldSuccessful.length > 0) {
        const oldCardName = oldSuccessful[0].result?.cardName;
        const newCardName = newResult.result?.cardName;
        
        if (oldCardName !== newCardName) {
          console.log(`\n  ⚠️  Result mismatch: OLD="${oldCardName}" NEW="${newCardName}"`);
          allPassed = false;
        } else {
          console.log('\n  ✅ Results match across services');
        }
      }
    }
    
    // Performance comparison
    if (newResult.success && newResult.duration && oldResults.some(r => r.success)) {
      const successfulOld = oldResults.filter(r => r.success && r.duration);
      if (successfulOld.length > 0) {
        const oldAvgDuration = successfulOld
          .reduce((sum, r) => sum + (r.duration || 0), 0) / successfulOld.length;
        
        const improvement = Math.round((1 - (newResult.duration || 0) / oldAvgDuration) * 100);
        
        if (improvement > 0) {
          console.log(`  ⚡ NEW service is ${improvement}% faster`);
        } else if (improvement < 0) {
          console.log(`  🐢 NEW service is ${Math.abs(improvement)}% slower`);
        }
      }
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - Safe to migrate!');
    console.log('\nTo enable new service in production:');
    console.log('  1. Set environment variable: USE_NEW_ENRICHMENT=true');
    console.log('  2. Monitor logs for any issues');
    console.log('  3. After 24h of stability, remove old services');
  } else {
    console.log('❌ SOME TESTS FAILED - Do not migrate yet!');
    console.log('Fix issues before proceeding with migration.');
  }
  console.log('=' .repeat(60));
  
  process.exit(allPassed ? 0 : 1);
}

// Run the tests
main().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
