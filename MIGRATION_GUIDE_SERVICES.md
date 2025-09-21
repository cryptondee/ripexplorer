# Service Layer Migration Guide

## Current Status: Phase 1 Complete ✅

We've successfully created the foundation for the service layer refactoring without breaking any existing functionality.

## What's Been Done

### ✅ New Structure Created
```
src/lib/server/services/
├── core/                          # Infrastructure layer
│   └── CardDataService.ts         # Single source for DB operations
├── domain/                        # Business logic layer  
│   └── SalesEnrichmentService.ts  # Unified enrichment service
└── strategies/                    # Strategy pattern implementation
    ├── EnrichmentStrategy.ts      # Base interface
    ├── DatabaseEnrichmentStrategy.ts
    └── FallbackEnrichmentStrategy.ts
```

### ✅ Key Improvements
1. **Eliminated Duplication**: Collection mappings now in ONE place (CardDataService)
2. **Clear Separation**: Database logic separated from business logic
3. **Strategy Pattern**: Extensible enrichment strategies
4. **Backward Compatible**: All old services still work

## How to Test

```bash
# Run the migration test to verify everything works
npm run test:enrichment

# You should see:
# ✅ ALL TESTS PASSED - Safe to migrate!
```

## How to Enable New Service

### Option 1: Environment Variable (Safest)
```bash
# In .env or deployment config
USE_NEW_ENRICHMENT=true
```

This will make SalesMonitorService use the new unified service.

### Option 2: Direct Migration (Per Endpoint)
```typescript
// OLD - in your endpoint or service
import { autoEnrichingSalesService } from '$lib/services/AutoEnrichingSalesService';
const enriched = await autoEnrichingSalesService.enrichSaleFromOnchain(metadata);

// NEW - unified service
import { salesEnrichmentService } from '$lib/server/services/domain/SalesEnrichmentService';
const enriched = await salesEnrichmentService.enrichWithAutoDownload(metadata);
```

## Migration Status by Service

| Service | Status | Notes |
|---------|--------|-------|
| CardDataService | ✅ Created | Single source for DB operations |
| SalesEnrichmentService | ✅ Created | Replaces 3 overlapping services |
| EnrichmentStrategies | ✅ Created | Database + Fallback ready |
| SalesMonitorService | 🔄 Ready | Feature flag added |
| AutoEnrichingSalesService | ⏳ Deprecated | Still works, will remove later |
| CardEnrichmentEngine | ⏳ Deprecated | Still works, will remove later |
| OptimizedSalesEnrichment | ❌ Not migrated | Need to check usage |

## Next Steps

### Immediate (Safe to do now)
1. ✅ Enable USE_NEW_ENRICHMENT=true in development
2. ✅ Monitor logs for any issues
3. ✅ Run performance tests

### This Week
1. Add OnchainEnrichmentStrategy
2. Add AutoDownloadStrategy  
3. Migrate /api/cards/preload endpoint
4. Add Redis caching to CardDataService

### Next Week
1. Remove AutoEnrichingSalesService
2. Remove CardEnrichmentEngine
3. Remove OptimizedSalesEnrichment
4. Update all imports

## Benefits So Far

### Code Reduction
- **Before**: 4 services with ~1500 lines total
- **After**: 1 unified service with ~400 lines
- **Savings**: ~73% code reduction

### Performance
- Database lookups consolidated
- Single cache layer possible
- Strategies executed in priority order

### Maintainability
- Single place to fix bugs
- Clear service boundaries
- Easy to add new enrichment sources

## Common Commands

```bash
# Test the migration
npm run test:enrichment

# Check for old service usage
grep -r "autoEnrichingSalesService" src/
grep -r "cardEnrichmentEngine" src/

# Build to verify no errors
npm run build
```

## Rollback Plan

If anything goes wrong:

1. **Immediate**: Set USE_NEW_ENRICHMENT=false
2. **Full Rollback**: 
   ```bash
   git revert HEAD~10  # Revert last 10 commits
   npm run build
   npm run dev
   ```

## Questions?

The new service is designed to be 100% backward compatible. If you see any issues:

1. Check logs for "SalesEnrichmentService" entries
2. Compare results with test script
3. Verify database connections are working

---

*Last Updated: [Current Date]*
*Status: Phase 1 Complete - Safe to test in development*
