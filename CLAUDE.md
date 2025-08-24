# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a robust web application specifically designed to extract complete profile data from rip.fun user pages with intelligent username-to-ID resolution powered by blockchain integration. The app features comprehensive username bridging through Alchemy-powered Base network scanning, fetches HTML from rip.fun profiles with enhanced reliability features, parses the SvelteKit data structure from JavaScript code, automatically removes clip_embedding data to reduce payload size, and provides clean JSON output with comprehensive visualization of profile information, digital cards, packs, and collection statistics.

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

## Architecture

### Core Components

- **Frontend**: Enhanced user interface with username autocomplete, sync management, advanced card filtering, missing cards marketplace integration, localStorage caching, set-based organization, dual view modes, intelligent pack grouping, status tracking, and real-time progress updates
- **Username Bridging System**: Comprehensive blockchain-powered username resolution with Alchemy SDK integration, user search, and sync management
- **Blockchain Service**: Alchemy-powered Base network scanning for rip.fun smart contract pack purchase events
- **User Sync Service**: Background synchronization coordinator for blockchain data and rip.fun API integration
- **Database Layer**: SQLite with Prisma ORM for user mappings, address storage, and sync status tracking
- **Backend API**: Robust rip.fun HTML fetching with retry logic, SvelteKit data parsing, username resolution, and extraction logic
- **Enhanced Fetcher Service**: Automatic retry with exponential backoff, progressive timeouts, and smart error handling
- **Data Processing Pipeline**: 
  1. Reliable HTML fetching from rip.fun profile URLs (20-60s timeouts, 3 retry attempts)
  2. SvelteKit data structure parsing from JavaScript code
  3. Automatic removal of clip_embedding data from digital_cards and cards arrays
  4. Data sanitization and structure preservation with pack status analysis
  5. JSON export with complete profile, cards, packs, and statistics data
- **Data Visualization Engine**: Advanced card filtering, missing cards detection with marketplace integration, set-based organization, smart deduplication, pack grouping logic, status summarization, localStorage caching system, and interactive dual-view displays
- **Caching System**: Smart localStorage implementation with user-specific and set-specific caching, cache-first loading, and intelligent refresh logic
- **Marketplace Integration**: Real-time card listing data, buy now functionality, make offer links, and missing cards availability tracking

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
- **Framework**: SvelteKit (full-stack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite with Prisma ORM for user mappings and sync tracking
- **Blockchain**: Alchemy SDK for Base network integration
- **Parsing**: Cheerio for HTML manipulation

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