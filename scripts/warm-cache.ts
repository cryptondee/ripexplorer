#!/usr/bin/env tsx
/**
 * Cache Warming Script for Pre-Deployment
 * 
 * This script pre-populates Redis with commonly used Pokemon TCG set data
 * to ensure instant loading on first user visit.
 * 
 * Run during deployment or as a scheduled job to keep cache warm.
 */

import { redisCache } from '../src/lib/server/redis/client.js';
import { optimizeExtractedData } from '../src/lib/server/services/normalizer.js';

// Common Pokemon TCG sets that should always be cached
const POPULAR_SETS = [
  'sv3pt5',     // Pokemon 151
  'sv1-151',    // Scarlet & Violet 151
  'sv2-151',    // Paldea Evolved 151
  'sv4',        // Paradox Rift
  'sv5',        // Temporal Forces
  'sv6',        // Twilight Masquerade
  'sv7',        // Stellar Crown
  'sv8',        // Surging Sparks
  'sv09',       // Scarlet & Violet Prismatic Evolutions
  'swsh12pt5',  // Crown Zenith
  'swsh11',     // Lost Origin
  'swsh10',     // Astral Radiance
  'swsh9',      // Brilliant Stars
  'cel25',      // Celebrations
  'base1',      // Base Set
  'base2',      // Jungle
  'base3',      // Fossil
  'base4',      // Base Set 2
  'neo1',       // Neo Genesis
];

async function fetchSetData(setId: string) {
  try {
    console.log(`📦 Fetching set data for: ${setId}`);
    
    const response = await fetch(
      `https://www.rip.fun/api/set/${setId}/cards?page=1&limit=1000&sort=number-asc&all=true`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://www.rip.fun/'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Apply optimizations to reduce payload size
    const optimizedData = optimizeExtractedData(data);
    
    // Remove clip_embedding data
    if (optimizedData.cards && Array.isArray(optimizedData.cards)) {
      optimizedData.cards = optimizedData.cards.map((card: any) => {
        const cleanCard = { ...card };
        delete cleanCard.clip_embedding;
        if (cleanCard.card) {
          delete cleanCard.card.clip_embedding;
        }
        return cleanCard;
      });
    }
    
    return optimizedData;
  } catch (error) {
    console.error(`❌ Failed to fetch set ${setId}:`, error);
    throw error;
  }
}

async function warmCache() {
  console.log('🔥 Starting cache warming process...');
  console.log(`📊 Will cache ${POPULAR_SETS.length} popular sets`);
  
  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];
  
  // Check Redis connection
  const isHealthy = await redisCache.ping();
  if (!isHealthy) {
    console.error('❌ Redis is not available. Cache warming aborted.');
    process.exit(1);
  }
  
  console.log('✅ Redis connection verified');
  
  // Process sets in batches to avoid overwhelming the API
  const BATCH_SIZE = 3;
  for (let i = 0; i < POPULAR_SETS.length; i += BATCH_SIZE) {
    const batch = POPULAR_SETS.slice(i, i + BATCH_SIZE);
    
    console.log(`\n📋 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(POPULAR_SETS.length / BATCH_SIZE)}`);
    
    await Promise.all(
      batch.map(async (setId) => {
        try {
          // Check if already cached
          const cacheKey = `rip:set:${setId}`;
          const exists = await redisCache.exists(cacheKey);
          
          if (exists) {
            console.log(`⏭️  Skipping ${setId} (already cached)`);
            successCount++;
            return;
          }
          
          // Fetch and cache the data
          const data = await fetchSetData(setId);
          
          // Store permanently (no TTL)
          const stored = await redisCache.set(cacheKey, data);
          
          if (stored) {
            console.log(`✅ Cached set: ${setId} (${data.cards?.length || 0} cards)`);
            successCount++;
          } else {
            throw new Error('Failed to store in cache');
          }
        } catch (error) {
          console.error(`❌ Failed to cache ${setId}:`, error);
          errors.push(`${setId}: ${error}`);
          failCount++;
        }
      })
    );
    
    // Small delay between batches to be respectful to the API
    if (i + BATCH_SIZE < POPULAR_SETS.length) {
      console.log('⏳ Waiting before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Cache Warming Complete!');
  console.log('='.repeat(50));
  console.log(`✅ Success: ${successCount} sets cached`);
  console.log(`❌ Failed: ${failCount} sets`);
  
  if (errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    errors.forEach(err => console.log(`  - ${err}`));
  }
  
  // Get cache stats
  try {
    console.log('\n📈 Cache Statistics:');
    const testKey = 'test:redis:connection';
    await redisCache.set(testKey, { test: true }, 1);
    const testResult = await redisCache.get(testKey);
    console.log(`  - Redis operational: ${testResult ? 'Yes' : 'No'}`);
    console.log(`  - Sets cached: ${successCount}`);
    console.log(`  - Total sets available: ${POPULAR_SETS.length}`);
    console.log(`  - Cache coverage: ${Math.round((successCount / POPULAR_SETS.length) * 100)}%`);
  } catch (error) {
    console.error('Failed to get cache stats:', error);
  }
  
  process.exit(failCount > 0 ? 1 : 0);
}

// Run the script
warmCache().catch(error => {
  console.error('Fatal error during cache warming:', error);
  process.exit(1);
});