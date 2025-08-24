# Server Services Directory

This directory contains **backend service modules** that handle business logic, data processing, and external API integration. Each service is focused on a specific domain and follows service-oriented architecture principles.

## 🏗️ Service Architecture

Services are designed as **pure functions** and **stateless modules** that:
- Handle specific business logic domains
- Include comprehensive error handling
- Provide TypeScript interfaces for requests/responses
- Follow consistent patterns for maintainability
- Include retry logic and timeout handling where appropriate

## 🛠️ Services

### alchemy.ts
**Purpose**: Blockchain integration with Alchemy SDK for Base network interaction

**Key Functionality:**
- Alchemy SDK client configuration for Base network
- Smart contract interaction with rip.fun contracts
- Pack purchase event scanning and synchronization
- Block range processing for efficient data retrieval
- Address-to-transaction mapping for user discovery

**Main Functions:**
```typescript
- initializeAlchemy(): Promise<void>
- scanPackPurchases(fromBlock?: number, toBlock?: number): Promise<PackPurchaseEvent[]>
- getUserAddresses(): Promise<AddressMapping[]>
- getLatestBlockNumber(): Promise<number>
```

**Integration:**
- Used by `userSync.ts` for blockchain data synchronization
- Provides data for username bridging system
- Handles Web3 provider configuration and error handling

### fetcher.ts
**Purpose**: Enhanced HTTP client with retry logic, timeout handling, and robust error recovery

**Key Functionality:**
- Automatic retry with exponential backoff (up to 3 attempts)
- Progressive timeout handling (20s → 40s → 60s)
- Realistic browser headers to avoid blocking
- Smart error classification (temporary vs permanent failures)
- Detailed logging and progress tracking

**Main Functions:**
```typescript
- fetchWithRetries(url: string, options?: FetchOptions): Promise<Response>
- extractProfileData(userIdOrUsername: string): Promise<ExtractedData>
- validateUrl(url: string): boolean
- getTimeoutForAttempt(attempt: number): number
```

**Error Handling:**
- Network timeout recovery
- Server overload handling (503, 502 errors)
- Rate limiting respect (429 errors)
- Connection failure retry logic

### parser.ts
**Purpose**: SvelteKit data extraction and HTML parsing from rip.fun profiles

**Key Functionality:**
- SvelteKit `<script type="application/json" data-sveltekit-fetched>` parsing
- Multiple script block detection and combining
- JSON structure validation and error recovery
- Data structure preservation while removing bloat
- Automatic clip_embedding removal from card data

**Main Functions:**
```typescript
- parseProfileData(html: string): Promise<ParsedProfile>
- extractSvelteKitData(html: string): Promise<any>
- cleanCardData(cards: any[]): any[]
- validateProfileStructure(data: any): boolean
```

**Data Cleaning:**
- Removes clip_embedding arrays from digital_cards and cards
- Preserves all other card metadata and structure
- Handles malformed JSON gracefully
- Normalizes data types and formats

### normalizer.ts
**Purpose**: Data cleaning, normalization, and structure standardization

**Key Functionality:**
- Profile data structure normalization
- Date format standardization
- Field mapping between rip.fun data and internal schema
- Type conversion and validation
- Data sanitization for XSS prevention

**Main Functions:**
```typescript
- normalizeProfile(rawData: any): NormalizedProfile
- standardizeDateFields(data: any): any
- sanitizeUserInput(input: string): string
- validateDataStructure(data: any): boolean
```

**Normalization Rules:**
- Converts date strings to ISO format
- Standardizes boolean values
- Removes null/undefined fields
- Validates required fields

### userSync.ts  
**Purpose**: Background blockchain user synchronization coordinator

**Key Functionality:**
- Blockchain data synchronization with Base network
- User address discovery from pack purchase events
- Progress tracking and status monitoring
- Database update coordination
- Sync resume functionality for interrupted operations

**Main Functions:**
```typescript
- startUserSync(): Promise<SyncResult>
- getSyncStatus(): Promise<SyncStatus>
- resumeSync(lastProcessedBlock: number): Promise<SyncResult>
- updateSyncProgress(progress: SyncProgress): Promise<void>
```

**Sync Process:**
1. Scan blockchain for pack purchase events
2. Extract user addresses and transaction data
3. Map addresses to usernames via rip.fun API
4. Store mappings in database with block tracking
5. Provide progress updates to frontend

### comparator.ts
**Purpose**: Profile comparison and diff generation between user profiles

**Key Functionality:**
- Profile data comparison and analysis
- Card collection diff generation
- Pack inventory comparison
- Value difference calculations
- Trade opportunity identification

**Main Functions:**
```typescript
- compareProfiles(profileA: Profile, profileB: Profile): Promise<ComparisonResult>
- generateCardDiff(cardsA: Card[], cardsB: Card[]): CardDiff
- calculateValueDifferences(profileA: Profile, profileB: Profile): ValueComparison
- findTradeOpportunities(comparison: ComparisonResult): TradeOpportunity[]
```

### tradeAnalyzer.ts ⭐ **New - Post-Refactoring**
**Purpose**: Centralized trade analysis logic (extracted from duplicate code)

**Key Functionality:**
- Shared trade analysis algorithms
- Card matching and availability logic
- Trade opportunity scoring
- User preference analysis
- Reusable across multiple endpoints

**Main Functions:**
```typescript
- analyzeTradeOpportunities(userA: Profile, userB: Profile): Promise<TradeAnalysis>
- calculateTradeValue(trade: TradeOpportunity): number
- findCardMatches(wantList: Card[], haveList: Card[]): CardMatch[]
- scoreTradeQuality(trade: TradeOpportunity): TradeScore
```

**Refactoring Impact:**
- **Eliminated duplicate logic** from trade-compare API handlers
- **Centralized trade algorithms** for consistency
- **Reduced API handler complexity** by 50+ lines
- **Improved maintainability** of trade logic

## 🔗 Service Integration Patterns

### Error Handling
All services follow consistent error handling:
```typescript
try {
  const result = await serviceFunction();
  return { success: true, data: result };
} catch (error) {
  console.error('Service error:', error);
  return { success: false, error: error.message };
}
```

### TypeScript Interfaces
Services define clear interfaces:
```typescript
interface ServiceRequest {
  // Input parameters
}

interface ServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
}
```

### Async/Await Pattern
All services use modern async/await:
```typescript
export async function serviceFunction(params: ServiceRequest): Promise<ServiceResponse> {
  // Implementation
}
```

## 📊 Performance Considerations

### Caching Strategy
- **alchemy.ts**: Caches block data and transaction results
- **fetcher.ts**: Implements request deduplication
- **parser.ts**: Caches parsed results by profile ID
- **userSync.ts**: Stores sync state for resume capability

### Connection Pooling
- Database connections managed by Prisma
- HTTP connections reused where possible
- Blockchain RPC connection optimization

### Error Recovery
- Exponential backoff for transient failures
- Circuit breaker pattern for repeated failures
- Graceful degradation when services unavailable

## 🚀 Usage Guidelines

### Service Dependencies
```typescript
// Import services
import { fetchWithRetries } from './fetcher.js';
import { parseProfileData } from './parser.js';
import { normalizeProfile } from './normalizer.js';

// Chain services together
const html = await fetchWithRetries(url);
const rawData = await parseProfileData(html);
const normalized = await normalizeProfile(rawData);
```

### Error Propagation
```typescript
// Handle service errors appropriately
try {
  const result = await serviceCall();
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
} catch (error) {
  // Log and handle appropriately
  console.error('Service chain failed:', error);
  throw error;
}
```

### Testing Services
Each service should include:
- Unit tests for core functionality
- Integration tests for external dependencies
- Error condition testing
- Performance benchmarking

## 🔧 Adding New Services

When creating new services:

1. **Follow established patterns** from existing services
2. **Include comprehensive error handling** with proper logging
3. **Define TypeScript interfaces** for inputs and outputs
4. **Add retry logic** for external API calls
5. **Include progress tracking** for long-running operations
6. **Document public functions** with JSDoc comments
7. **Consider caching** for expensive operations
8. **Test error conditions** thoroughly

## 📈 Refactoring Benefits

The service-oriented architecture provides:
- **Clear separation of concerns** between business logic domains
- **Reusable service modules** across multiple endpoints
- **Consistent error handling** and logging patterns
- **Better testability** with focused unit tests
- **Improved maintainability** with single-responsibility services
- **Enhanced type safety** with comprehensive TypeScript interfaces