# API Routes Directory

This directory contains **SvelteKit API endpoints** that provide backend functionality for the application. Each endpoint follows RESTful conventions and includes proper error handling, TypeScript typing, and integration with backend services.

## 🚀 API Architecture

All API endpoints follow consistent patterns:
- **RESTful design** with appropriate HTTP methods
- **TypeScript request/response** typing
- **Comprehensive error handling** with proper HTTP status codes
- **Service layer integration** for business logic
- **Request validation** and sanitization
- **Rate limiting considerations** for external API calls

## 📡 Endpoint Categories

### Core Data Extraction

#### `POST /api/extract`
**Purpose**: Main data extraction endpoint for rip.fun profiles

**Functionality:**
- Accepts username or numeric user ID
- Handles username-to-ID resolution via blockchain integration
- Fetches profile HTML with retry logic and timeout handling
- Parses SvelteKit data structure from HTML
- Normalizes and cleans extracted data
- Returns complete profile, cards, packs, and statistics

**Request Body:**
```typescript
{
  userIdOrUsername: string; // Username or numeric ID
  skipCache?: boolean;      // Optional cache bypass
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    profile: UserProfile;
    cards: Card[];
    packs: Pack[];
    statistics: ProfileStats;
  };
  error?: string;
  cached?: boolean; // Indicates if data came from cache
}
```

**Integration:**
- Uses `fetcher.ts` for reliable HTML fetching
- Uses `parser.ts` for SvelteKit data extraction
- Uses `normalizer.ts` for data cleaning
- Integrates with username resolution system

### Username Bridging System

#### `POST /api/sync-users`
**Purpose**: Trigger blockchain user synchronization

**Functionality:**
- Initiates blockchain scanning for user addresses
- Processes pack purchase events from Base network
- Updates database with address-to-username mappings
- Provides progress tracking for long-running sync operations

**Request Body:**
```typescript
{
  fromBlock?: number;  // Optional starting block
  toBlock?: number;    // Optional ending block
  resume?: boolean;    // Resume interrupted sync
}
```

**Response:**
```typescript
{
  success: boolean;
  syncId: string;
  message: string;
  blocksProcessed?: number;
  usersFound?: number;
}
```

#### `GET /api/sync-users`
**Purpose**: Get current synchronization status

**Functionality:**
- Returns current sync progress
- Shows blocks processed and users discovered
- Indicates if sync is running, completed, or failed

**Response:**
```typescript
{
  isRunning: boolean;
  progress: {
    currentBlock: number;
    totalBlocks: number;
    usersFound: number;
    startTime: string;
    estimatedCompletion?: string;
  };
  lastSync?: {
    completedAt: string;
    blocksProcessed: number;
    usersFound: number;
  };
}
```

#### `GET /api/resolve-username/[username]`
**Purpose**: Resolve username to user ID and basic profile data

**Functionality:**
- Searches database for username mappings
- Falls back to blockchain address lookup if needed
- Returns user ID and basic profile information
- Caches resolution results for performance

**Response:**
```typescript
{
  success: boolean;
  userId?: string;
  username: string;
  profileData?: {
    avatar?: string;
    verified?: boolean;
    walletAddress?: string;
  };
  cached?: boolean;
}
```

#### `GET /api/search-users?q=[query]&limit=[n]`
**Purpose**: Search users with autocomplete functionality

**Functionality:**
- Searches usernames with partial matching
- Returns suggestions for autocomplete
- Limits results for performance
- Includes basic profile data for display

**Query Parameters:**
- `q`: Search query (minimum 2 characters)
- `limit`: Maximum results (default 10, max 50)

**Response:**
```typescript
{
  success: boolean;
  users: Array<{
    userId: string;
    username: string;
    avatar?: string;
    verified?: boolean;
    relevanceScore: number;
  }>;
  totalResults: number;
}
```

### Marketplace Integration

#### `GET /api/set/[setId]`
**Purpose**: Fetch Pokemon TCG set data with caching

**Functionality:**
- Retrieves complete set information
- Includes all cards in the set with metadata
- Caches set data permanently (sets rarely change)
- Provides fallback for missing set data

**Response:**
```typescript
{
  success: boolean;
  setData?: {
    id: string;
    name: string;
    series: string;
    releaseDate: string;
    cardCount: number;
    cards: Card[];
  };
  cached?: boolean;
}
```

#### `GET /api/card/[cardId]/listings`
**Purpose**: Get real-time marketplace listings for cards

**Functionality:**
- Fetches current marketplace listings from rip.fun
- Returns pricing information and availability
- Includes buy now and make offer options
- Caches listing data briefly (5-minute TTL)

**Response:**
```typescript
{
  success: boolean;
  listings?: Array<{
    listingId: string;
    price: number;
    currency: string;
    seller: string;
    condition?: string;
    available: boolean;
  }>;
  lowestPrice?: number;
  hasListings: boolean;
}
```

### Trade Analysis

#### `POST /api/trade-compare` ⭐ **Refactored**
**Purpose**: Compare two user profiles for trade opportunities

**Functionality:**
- Analyzes card collections between two users
- Identifies trade opportunities and matches
- Calculates trade value and fairness
- Uses centralized `tradeAnalyzer.ts` service (post-refactoring)

**Request Body:**
```typescript
{
  userAId: string;
  userBId: string;
  tradePreferences?: {
    maxValueDifference?: number;
    preferredRarities?: string[];
    excludeSets?: string[];
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  analysis?: {
    userA: UserProfile;
    userB: UserProfile;
    tradeOpportunities: TradeOpportunity[];
    summary: TradeSummary;
  };
}
```

**Refactoring Impact:**
- **Reduced endpoint complexity** from 200+ lines to 50 lines
- **Centralized trade logic** in `tradeAnalyzer.ts`
- **Eliminated duplicate code** between GET/POST handlers
- **Improved maintainability** and testability

### Legacy Profile Management

#### `GET /api/profiles`
**Purpose**: List all stored profiles (legacy feature)

#### `POST /api/profiles` 
**Purpose**: Create new profile (legacy feature)

#### `GET /api/profiles/[id]`
**Purpose**: Get specific profile (legacy feature)

#### `PUT /api/profiles/[id]`
**Purpose**: Update profile (legacy feature)

#### `DELETE /api/profiles/[id]`
**Purpose**: Delete profile (legacy feature)

#### `POST /api/compare`
**Purpose**: Compare profiles (legacy feature)

*Note: These endpoints are maintained for backwards compatibility but are being phased out in favor of the new extraction and blockchain integration system.*

### Debug & Development

#### `GET /api/debug-cards`
**Purpose**: Debug endpoint for card data analysis (development only)

**Functionality:**
- Provides detailed card data structure analysis
- Shows data quality metrics and validation results
- Includes cache status and performance metrics
- Only available in development environment

## 🔧 API Development Patterns

### Error Handling
All endpoints follow consistent error handling:
```typescript
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    const body = await request.json();
    
    // Validate input
    if (!body.requiredField) {
      return json({ success: false, error: 'Missing required field' }, { status: 400 });
    }
    
    // Process request
    const result = await serviceFunction(body);
    
    return json({ success: true, data: result });
  } catch (error) {
    console.error('API Error:', error);
    return json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
```

### Request Validation
Input validation using TypeScript and runtime checks:
```typescript
import { z } from 'zod';

const requestSchema = z.object({
  userIdOrUsername: z.string().min(1),
  skipCache: z.boolean().optional()
});

export async function POST({ request }) {
  try {
    const body = await request.json();
    const validated = requestSchema.parse(body);
    
    // Process validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ 
        success: false, 
        error: 'Invalid request data',
        details: error.errors 
      }, { status: 400 });
    }
  }
}
```

### Service Integration
APIs integrate with service layer:
```typescript
import { fetchWithRetries } from '$lib/server/services/fetcher.js';
import { parseProfileData } from '$lib/server/services/parser.js';
import { normalizeProfile } from '$lib/server/services/normalizer.js';

export async function POST({ request }) {
  try {
    // Chain services together
    const html = await fetchWithRetries(url);
    const rawData = await parseProfileData(html);
    const normalized = await normalizeProfile(rawData);
    
    return json({ success: true, data: normalized });
  } catch (error) {
    // Handle service errors
  }
}
```

### Caching Strategy
APIs implement appropriate caching:
```typescript
import { getCachedUserData, setCachedUserData } from '$lib/utils/cacheUtils.js';

export async function GET({ params }) {
  const { userId } = params;
  
  // Check cache first
  const cached = getCachedUserData(userId);
  if (cached) {
    return json({ success: true, data: cached.data, cached: true });
  }
  
  // Fetch fresh data
  const freshData = await fetchData(userId);
  
  // Cache for future requests
  setCachedUserData(userId, freshData, 15);
  
  return json({ success: true, data: freshData, cached: false });
}
```

## 📊 Performance Considerations

### Rate Limiting
- Implement rate limiting for external API calls
- Use exponential backoff for retry logic
- Cache frequently requested data
- Batch operations where possible

### Database Optimization
- Use database indexes for search operations
- Implement connection pooling
- Use prepared statements for repeated queries
- Monitor query performance

### Response Optimization
- Minimize response payload sizes
- Use compression for large responses
- Implement proper HTTP caching headers
- Return only necessary data fields

## 🚀 Adding New Endpoints

When creating new API endpoints:

1. **Follow RESTful conventions** for URL structure and HTTP methods
2. **Include comprehensive error handling** with appropriate status codes
3. **Validate all input data** using TypeScript and runtime validation
4. **Integrate with service layer** rather than implementing logic directly
5. **Include proper TypeScript types** for requests and responses
6. **Consider caching strategy** for performance optimization
7. **Add appropriate logging** for debugging and monitoring
8. **Test thoroughly** including error conditions and edge cases

### Example New Endpoint Structure
```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Parse and validate request
    const body = await request.json();
    
    // Input validation
    if (!body.requiredField) {
      return json({ 
        success: false, 
        error: 'Missing required field' 
      }, { status: 400 });
    }
    
    // Business logic via service
    const result = await serviceFunction(body);
    
    // Success response
    return json({ success: true, data: result });
    
  } catch (error) {
    console.error('API endpoint error:', error);
    return json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
};

// TypeScript interfaces
interface RequestBody {
  requiredField: string;
  optionalField?: number;
}

interface ResponseData {
  success: boolean;
  data?: any;
  error?: string;
}
```

## 📈 Refactoring Benefits

The API refactoring provides:
- **Consistent error handling** across all endpoints
- **Centralized business logic** in service layer
- **Improved maintainability** with clear separation of concerns
- **Better performance** through intelligent caching
- **Enhanced type safety** with comprehensive TypeScript
- **Reduced code duplication** through shared utilities