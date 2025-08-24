# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a robust web application specifically designed to extract complete profile data from rip.fun user pages with intelligent username-to-ID resolution powered by blockchain integration. The app features comprehensive username bridging through Alchemy-powered Base network scanning, fetches HTML from rip.fun profiles with enhanced reliability features, parses the SvelteKit data structure from JavaScript code, automatically removes clip_embedding data to reduce payload size, and provides clean JSON output with comprehensive visualization of profile information, digital cards, packs, and collection statistics.

## 🏗️ Architecture Overview

The application follows a **component-based architecture** with clean separation of concerns:

- **Frontend**: Modular SvelteKit components with specialized functionality
- **Backend**: Service-oriented API layer with robust data processing  
- **Database**: SQLite with Prisma ORM for user mapping and sync tracking
- **Caching**: Smart localStorage system with component-level cache management
- **Integration**: Blockchain services and marketplace API integration

### 🧩 Component Architecture (Post-Refactoring)

The application has been extensively refactored from a monolithic structure to a clean component-based architecture:

**Before Refactoring:**
- `src/routes/extract/+page.svelte`: 2,216+ lines (monolithic)
- `src/routes/trade-finder/+page.svelte`: 803 lines (massive duplication)

**After Refactoring:**
- `src/routes/extract/+page.svelte`: 1,475 lines (**741 lines saved, 33.4% reduction**)
- `src/routes/trade-finder/+page.svelte`: 488 lines (**315 lines saved, 39% reduction**)
- **6 New Reusable Components**: CardFilters, CardGrid, CardTable, PackManager, TradeTable, UserSearchInput
- **1 Additional Trade Component**: SetSummaryTable
- **4 Shared Utility Modules**: cacheUtils, card, pricing, url
- **1 Trade Summary Utility**: trade/summaries

**Total Lines Saved: 1,000+ lines across the application**

### 🔄 Recent Major Refactoring (2025)
- **Component Architecture**: Complete refactoring from monolithic to component-based design
- **DRY Principles**: Eliminated over 1,000 lines of duplicate code across the application
- **Reusable Components**: Created specialized components for card filtering, display, and pack management
- **Centralized Utilities**: Extracted cache management and trade analysis into shared utilities
- **Type Safety**: Enhanced TypeScript interfaces and proper event handling between components
- **Performance Optimization**: Reduced bundle size and improved maintainability

### Recent Major Enhancements (2025)
- **Username Bridging System**: Alchemy-powered blockchain integration for username-to-ID resolution with autocomplete functionality
- **Blockchain Integration**: Base network scanning of rip.fun smart contract for automatic user discovery and mapping
- **User Sync Infrastructure**: Background synchronization system with progress tracking and status monitoring
- **localStorage Caching System**: Smart browser storage with user-specific and set-specific caching for instant loading
- **Missing Cards Marketplace Integration**: Complete missing cards detection with real-time listing data and buy now functionality
- **Advanced Missing Cards Features**: Show missing cards, only missing cards mode, available only filtering with marketplace prices
- **Buy Now/Make Offer Integration**: Direct links to rip.fun marketplace for purchasing missing cards with listing price display
- **Advanced Card Management**: Set-based filtering, smart deduplication (no UI toggle), and dual view modes (grid/table)
- **Smart Set Recognition**: Automatic parsing of set names from API data with proper fallback handling  
- **Intelligent Pack Grouping**: Automatic categorization of packs by name with toggleable detailed views
- **Pack Status Tracking**: Visual summaries showing opened, sealed, and pending open counts
- **Enhanced Reliability**: Retry logic with exponential backoff and progressive timeouts (20s-60s)
- **Cache-First Loading**: Instant data loading from localStorage with smart refresh capabilities
- **Improved UX**: Real-time progress updates, detailed error messages, cache status indicators, and responsive design
- **Advanced Data Visualization**: Expandable pack groups, missing cards integration, marketplace data, and comprehensive status tables

## 📁 File Structure & Components

### Core Application Structure

```
src/
├── lib/
│   ├── components/           # Reusable UI Components
│   │   ├── CardFilters.svelte     # Advanced filtering interface (247 lines)
│   │   ├── CardGrid.svelte        # Visual card display grid (230 lines)
│   │   ├── CardTable.svelte       # Sortable data table with marketplace (332 lines)
│   │   ├── PackManager.svelte     # Pack grouping and management (201 lines)
│   │   ├── TradeTable.svelte      # Reusable trade analysis table (127 lines)
│   │   ├── UserSearchInput.svelte # Username search with autocomplete (111 lines)
│   │   └── ProfileForm.svelte     # Legacy profile creation form
│   ├── server/               # Backend Services
│   │   ├── db/              # Database Layer
│   │   │   ├── client.ts         # Prisma database client
│   │   │   └── profiles.ts       # Profile data operations
│   │   └── services/        # Business Logic Services
│   │       ├── alchemy.ts        # Blockchain integration with Alchemy SDK
│   │       ├── fetcher.ts        # Enhanced HTTP fetching with retries
│   │       ├── parser.ts         # SvelteKit data extraction and parsing
│   │       ├── normalizer.ts     # Data cleaning and normalization
│   │       ├── userSync.ts       # Blockchain user synchronization
│   │       ├── comparator.ts     # Profile comparison logic
│   │       └── tradeAnalyzer.ts  # Centralized trade analysis
│   ├── utils/               # Shared Utilities
│   │   └── cacheUtils.ts         # Centralized localStorage management (162 lines)
│   └── types.ts             # TypeScript type definitions
├── routes/                  # SvelteKit Pages and API Endpoints
│   ├── api/                # API Layer
│   │   ├── extract/            # Core data extraction endpoint
│   │   ├── sync-users/         # Blockchain user synchronization
│   │   ├── resolve-username/   # Username-to-ID resolution
│   │   ├── search-users/       # User search with autocomplete
│   │   ├── set/[setId]/        # Pokemon TCG set data
│   │   ├── card/[cardId]/      # Individual card marketplace data
│   │   ├── trade-compare/      # Trade analysis endpoint
│   │   └── profiles/           # Legacy profile management
│   ├── extract/            # Main Data Extraction Interface
│   │   └── +page.svelte        # Refactored main extraction page (1,475 lines)
│   ├── trade-finder/       # Trade Analysis Interface
│   │   └── +page.svelte        # Refactored trade finder (488 lines)
│   ├── profiles/           # Legacy Profile Management
│   └── +layout.svelte      # Global application layout
└── app.html                # Root HTML template
```

### 🧩 Component Responsibilities

#### Frontend Components (`src/lib/components/`)

1. **CardFilters.svelte** (247 lines)
   - **Purpose**: Complete filtering interface for card management
   - **Features**: Set filtering, rarity filtering, view mode toggle, missing cards options
   - **Events**: Dispatches filter changes to parent components
   - **Integration**: Works with all card display components

2. **CardGrid.svelte** (230 lines)
   - **Purpose**: Visual grid display for cards with missing card indicators
   - **Features**: Set grouping, card status badges, missing card actions, marketplace links
   - **Responsive**: Adapts to mobile and desktop layouts
   - **Integration**: Receives filtered data from CardFilters

3. **CardTable.svelte** (332 lines)
   - **Purpose**: Comprehensive data table with sortable columns and marketplace integration
   - **Features**: Sortable headers, marketplace data, buy now/make offer buttons, status indicators
   - **Columns**: Card, Set, Rarity, Type, Value, Listed Price, Available, Action, Status
   - **Integration**: Full marketplace API integration for missing cards

4. **PackManager.svelte** (201 lines)
   - **Purpose**: Intelligent pack grouping and management interface
   - **Features**: Pack grouping by name, status summaries, expandable details, individual pack tables
   - **Logic**: Pack status analysis (opened, sealed, pending)
   - **Display**: Collapsible groups with summary statistics

5. **TradeTable.svelte** (127 lines)
   - **Purpose**: Reusable trade analysis table with highlighting
   - **Features**: Dynamic row highlighting, trade type indicators, card count badges
   - **Events**: Click handling for trade details
   - **Used By**: Both trade-finder and trade-compare pages

6. **UserSearchInput.svelte** (111 lines)
   - **Purpose**: Intelligent username search with blockchain integration
   - **Features**: Autocomplete, username resolution, loading states
   - **Integration**: Connects to blockchain sync service
   - **Used By**: Multiple pages requiring user input

#### Backend Services (`src/lib/server/services/`)

1. **alchemy.ts** - Blockchain integration with Base network scanning
2. **fetcher.ts** - Enhanced HTTP client with retry logic and timeout handling  
3. **parser.ts** - SvelteKit data extraction from rip.fun HTML
4. **normalizer.ts** - Data cleaning and structure normalization
5. **userSync.ts** - Background blockchain user synchronization
6. **comparator.ts** - Profile comparison and diff generation
7. **tradeAnalyzer.ts** - Centralized trade analysis logic (shared utility)

#### Shared Utilities (`src/lib/utils/`)

1. **cacheUtils.ts** (162 lines)
   - **Purpose**: Centralized localStorage management
   - **Features**: User-specific caching, set data caching, cache expiration
   - **Functions**: Smart cache keys, cleanup utilities, cache status checking
   - **Used By**: All components requiring data persistence

### Core Components

- **Component-Based Frontend**: Modular SvelteKit components with specialized functionality
  - **CardFilters Component** (248 lines): Advanced filtering interface with set-based organization, missing cards options, and search functionality
  - **CardGrid Component** (230 lines): Visual card display with set grouping, missing card indicators, and marketplace integration
  - **CardTable Component** (349 lines): Comprehensive sortable table with marketplace columns and action buttons
  - **PackManager Component** (202 lines): Intelligent pack grouping with expandable details and status summaries
  - **TradeTable Component** (127 lines): Reusable trade analysis table with dynamic highlighting
  - **UserSearchInput Component** (112 lines): Username search with blockchain integration and autocomplete
  - **SetSummaryTable Component** (53 lines): Generic reusable summary table for trade analysis

- **Service-Oriented Backend**: Modular services with specialized functionality
  - **Blockchain Service** (alchemyService): Alchemy-powered Base network scanning for NFT recipients and buyer addresses
  - **User Sync Service** (userSyncService): Background synchronization coordinator with database integration and progress tracking
  - **Enhanced Fetcher Service**: Progressive timeout handling (15s→45s) with exponential backoff retry logic
  - **Parser Service**: SvelteKit data extraction with improved regex methods and fallback strategies
  - **Normalizer Service**: Data cleaning with clip_embedding removal and structure standardization
  - **Trade Analyzer Service** ⭐: Centralized trade analysis logic extracted from duplicate code
  - **Comparator Service**: Profile comparison with field mapping and similarity analysis

- **Shared Utilities**: Centralized utility functions eliminating code duplication
  - **cacheUtils.ts** (163 lines): Smart localStorage management with user/set caching and expiration
  - **card.ts** (8 lines): Set name resolution utilities for consistent card display
  - **pricing.ts** (21 lines): Centralized pricing helpers for market and listed values  
  - **url.ts** (16 lines): URL building utilities for rip.fun card links
  - **trade/summaries.ts** (108 lines): Trade summary building utilities for consistent analysis

- **Enhanced Data Processing Pipeline**: 
  1. Reliable HTML/API fetching with intelligent fallback strategies
  2. Multi-method SvelteKit data parsing with improved regex and validation
  3. Automatic clip_embedding removal and data normalization
  4. Component-based display with specialized filtering and visualization
  5. Smart caching with user-specific and set-specific strategies
  6. Marketplace integration with real-time listing data and purchase links

- **Database Layer**: SQLite with Prisma ORM for user mappings, address storage, and sync status tracking

### Key Workflows

1. **Smart Input Resolution**: User provides either a rip.fun username (with autocomplete) or numeric user ID, system automatically resolves to appropriate extraction target
2. **Enhanced Data Extraction**: Backend fetches rip.fun profile HTML with automatic retries and progressive timeouts
   - Real-time progress updates to user during long extractions
   - Automatic retry on timeout/network errors with exponential backoff
   - Detailed error messages with troubleshooting guidance
3. **Data Processing**: Parses complete SvelteKit data structure with pack status analysis
   - Groups packs by name/type for organized display
   - Calculates opened, sealed, and pending open counts
   - Preserves all relevant data while removing clip_embedding bloat
4. **Advanced Visualization**: Interactive display with comprehensive card and pack management
   - **Card Filtering**: Set-based filtering with dropdown selection and card count display
   - **Missing Cards Integration**: Show missing cards with marketplace data, available only filtering, and buy now functionality
   - **Smart Deduplication**: Automatic card deduplication (always active, no toggle)
   - **Dual View Modes**: Grid view for visual browsing and table view with marketplace columns
   - **Smart Set Recognition**: Automatic parsing of set names from API data (e.g., "151", "Prismatic Evolutions")
   - **Marketplace Data**: Listed prices, availability status, buy now/make offer buttons for missing cards
   - **Collapsible Pack Groups**: Summary statistics with expandable detailed views
   - **Interactive Tables**: Enhanced tables with marketplace columns (Listed Price, Available, Action)
   - **Visual Indicators**: Color-coded status badges, availability icons (✅/❌), and marketplace integration
   - **Cache Status**: Visual indicators showing data source (📦 Cached vs 🌐 Live)
5. **Data Export**: Provides complete JSON output with profile, cards, packs, and statistics

## Security Considerations

- All fetched HTML and JSON must be sanitized to prevent XSS/injection
- Input validation and normalization for user profile data
- Secure rip.fun URL construction and validation
- HTTPS-only communication with rip.fun

## Data Processing Notes

### SvelteKit Data Extraction
- Target: `<script type="application/json" data-sveltekit-fetched>` elements
- Multiple script blocks may exist and need combining
- JSON parsing required for embedded data

### Data Cleaning and Normalization Pipeline
- Automatically remove clip_embedding from digital_cards and cards arrays
- Remove unused/irrelevant keys (including clip_embedding references)
- Convert date strings to standard format
- Flatten nested objects to key-value pairs
- Deduplicate arrays and strip empty values
- Handle field mapping between rip.fun data structure and profile schema

### Advanced Card Filtering and Display System
- **Set-Based Organization**: Automatically group cards by Pokemon TCG sets using API-provided set data
- **Smart Set Name Parsing**: Extract human-readable set names from `card.set.name` field (e.g., "151", "Prismatic Evolutions", "Black Bolt")
- **Missing Cards Integration**: Complete marketplace integration with listing data and purchase options
  - **Show Missing Cards**: Display missing cards alongside owned cards with red styling
  - **Only Missing Cards**: Filter to show only missing cards from selected sets
  - **Available Only**: Show only missing cards that have active marketplace listings
- **Smart Deduplication**: Always-active intelligent deduplication (no user toggle required)
- **Dual View Modes**: 
  - **Grid View**: Visual card layout with images, stats, and missing cards indicators
  - **Table View**: Comprehensive data table with marketplace columns (Card, Set, Rarity, Type, Value, Listed Price, Available, Action, Status)
- **Marketplace Columns**:
  - **Listed Price**: Lowest available price for missing cards
  - **Available**: ✅/❌ icons showing listing availability
  - **Action**: Buy Now (blue) or Make Offer (gray) buttons linking to rip.fun
- **Dynamic Filtering**: Real-time filter updates with card count display for each set
- **Fallback Handling**: Graceful degradation to set_id display when set names are unavailable

### Pack Grouping and Status Analysis
- Group digital_products by name to consolidate similar pack types
- Analyze `open_status` field to categorize packs:
  - **Opened**: status contains "opened" 
  - **Sealed**: status contains "sealed", "unopened", or default for owned packs
  - **Pending Open**: status contains "pending" or "opening"
- Calculate summary statistics for each pack group
- Preserve individual pack details while providing grouped overview

### Enhanced Fetcher Configuration
- **Initial Timeout**: 20 seconds for first attempt
- **Maximum Timeout**: 60 seconds for final retry attempts  
- **Retry Logic**: Up to 3 attempts with exponential backoff (1s, 2s, 4s delays)
- **Browser Headers**: Realistic User-Agent and headers to avoid blocking
- **Error Classification**: Distinguish temporary vs permanent failures for smart retry logic

## Development Setup

This project uses **SvelteKit** with **TypeScript**, **Tailwind CSS**, and **Prisma** for data management.

**Current Tech Stack**:
- **Framework**: SvelteKit (full-stack) with Svelte 5 runes
- **Language**: TypeScript with comprehensive type definitions
- **Styling**: Tailwind CSS with responsive design patterns
- **Database**: SQLite with Prisma ORM for user mappings and sync tracking
- **Blockchain**: Viem client with Alchemy for Base network integration
- **Parsing**: Cheerio for HTML manipulation and advanced regex parsing
- **HTTP Client**: Enhanced fetch with retry logic and timeout handling

**Setup Commands**:
```bash
npm install                    # Install dependencies
npm install alchemy-sdk        # Install Alchemy SDK for blockchain integration
cp .env.example .env          # Copy environment template
# Edit .env with your ALCHEMY_API_KEY
npx prisma generate           # Generate Prisma client
npx prisma db push           # Set up database (includes new username bridging schema)
npm run dev                  # Development server
npm run build               # Production build
npm run check              # Type checking
```

**Development Server**: Runs on `http://localhost:5173` (or next available port)

## Implementation Status & Priority

### ✅ Completed Features
1. **Enhanced HTML Fetching**: Reliable retrieval with retry logic and progressive timeouts ✓
2. **SvelteKit Parser**: Advanced extraction and parsing of JSON script blocks ✓ 
3. **Data Cleaning**: Comprehensive normalization and field mapping logic ✓
4. **localStorage Caching System**: Smart browser storage with user/set caching and cache-first loading ✓
5. **Missing Cards Marketplace Integration**: Complete marketplace data with buy now functionality ✓
6. **Advanced Card Management**: Set-based filtering, smart deduplication, grid/table views ✓
7. **Smart Set Recognition**: Automatic parsing of human-readable set names from API data ✓
8. **Pack Grouping System**: Intelligent categorization with status tracking ✓
9. **Marketplace API Integration**: Card listings API, buy now/make offer functionality ✓
10. **Advanced Filtering**: Missing cards modes, available only filter, cache management ✓
11. **Advanced Frontend Interface**: Interactive filtering, dual view modes, expandable groups, real-time progress ✓
12. **Error Handling**: User-friendly messages with troubleshooting guidance ✓

### 🚧 Current Architecture (Fully Implemented)
- **Primary Focus**: rip.fun data extraction and visualization
- **Data Source**: Direct HTML parsing from rip.fun profiles
- **User Interface**: `/extract` page with username input and comprehensive data display
- **Export Options**: JSON download and clipboard copy functionality

### 🔮 Future Enhancements (Optional)
1. **Authentication**: User sessions for saved extractions
2. **History Tracking**: Previous extraction records and comparison
3. **Comparison Engine**: Diff generation between profile snapshots
4. **Advanced Filtering**: Search and filter within extracted data
5. **Bulk Operations**: Extract multiple profiles simultaneously

### 🎯 Key Technical Achievements
- **Zero timeout failures** with enhanced retry logic
- **Instant loading** with smart localStorage caching system
- **Complete marketplace integration** with real-time listing data and purchase functionality
- **Advanced missing cards features** with multiple filtering modes and availability tracking
- **Intelligent caching strategy** preserving static set data while refreshing user data
- **Cross-user cache sharing** for Pokemon TCG set data efficiency
- **Advanced card filtering** with set-based organization and smart deduplication
- **Intelligent data parsing** with proper set name extraction from API responses
- **Dual view modes** providing both visual and analytical perspectives with marketplace data
- **Intuitive pack management** with grouped displays and status summaries
- **Real-time user feedback** during long-running operations with cache status indicators
- **Comprehensive error handling** with actionable guidance
- **Responsive design** optimized for all device sizes
- **🔄 Massive Code Reduction**: 1,000+ lines eliminated through strategic component architecture
- **🔄 DRY Compliance**: Zero code duplication in UI components and business logic
- **🔄 Maintainable Architecture**: Clear separation of concerns with specialized components
- **🔄 Type Safety**: Enhanced TypeScript interfaces and proper event handling
- **🔄 Performance Optimization**: Reduced bundle size and improved build times
- **🔄 Developer Experience**: Clear component boundaries and reusable utilities

### 📊 Refactoring Impact Summary

**Code Reduction:**
- `extract/+page.svelte`: 2,216 → 1,475 lines (**741 lines saved, 33.4% reduction**)
- `trade-finder/+page.svelte`: 803 → 488 lines (**315 lines saved, 39% reduction**)
- **Total Reduction**: 1,000+ lines across application

**New Architecture Created:**
- **6 Core Components**: CardFilters (248), CardGrid (230), CardTable (349), PackManager (202), TradeTable (127), UserSearchInput (112)
- **1 Trade Component**: SetSummaryTable (53 lines)
- **8 Backend Services**: Enhanced services with specialized functionality
- **5 Shared Utilities**: cacheUtils (163), card (8), pricing (21), url (16), trade/summaries (108)
- **Comprehensive API Layer**: 11 endpoints with consistent patterns and error handling

**Architecture Benefits:**
- ✅ **Zero Code Duplication**: All UI logic properly componentized
- ✅ **Service-Oriented Backend**: Clear separation between presentation and business logic
- ✅ **Maintainable Structure**: Component responsibilities and service boundaries well-defined
- ✅ **Reusable Components**: Shared across multiple pages with consistent interfaces
- ✅ **Enhanced Type Safety**: Comprehensive TypeScript with interfaces and event typing
- ✅ **Optimized Performance**: Reduced bundle size, smart caching, and component-level optimizations
- ✅ **Developer Experience**: Clear file structure, comprehensive documentation, and testing patterns
- ✅ **Scalable Foundation**: Modular architecture supporting future feature development

## 🛠️ Development Guidelines

### Component Development
When working with components, follow these patterns established in the refactoring:

1. **Event-Driven Architecture**: Use Svelte's event dispatcher for parent-child communication
2. **Props Interface**: Define clear TypeScript interfaces for component props
3. **Reusable Logic**: Extract common functionality into utility functions
4. **Consistent Styling**: Follow Tailwind CSS patterns established in existing components
5. **Error Handling**: Implement proper error states and loading indicators

### Adding New Components
1. Follow the established component structure in `src/lib/components/`
2. Include proper TypeScript types and interfaces
3. Use event dispatchers for parent communication
4. Add documentation comments explaining component purpose and usage
5. Consider reusability across multiple pages

### Cache Management
Use the centralized `cacheUtils.ts` for all localStorage operations:
```typescript
import { getCachedUserData, setCachedUserData, clearUserCache } from '$lib/utils/cacheUtils';
```

### API Integration
Follow service-oriented patterns in `src/lib/server/services/`:
1. Create focused service modules for specific functionality
2. Include proper error handling and retry logic
3. Use TypeScript interfaces for request/response types
4. Follow established patterns in existing services

## 📚 Component Documentation

Each component and service directory contains detailed CLAUDE.md files explaining:
- Purpose and responsibilities
- Key features and functionality
- Integration patterns and usage examples
- TypeScript interfaces and event handling
- Performance considerations and best practices

Refer to individual CLAUDE.md files in each directory for component-specific guidance.