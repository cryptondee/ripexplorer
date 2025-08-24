# rip.fun Data Extractor

A robust, **component-based** web application specifically designed to extract complete profile data from rip.fun user pages with intelligent username-to-ID resolution. The app features blockchain-powered username bridging, fetches HTML from rip.fun profiles, parses the SvelteKit data structure, and provides clean JSON output through a modular architecture with specialized components for card filtering, display, and pack management.

## 🔄 Recent Major Refactoring (2025)

The application has undergone a **complete architectural refactoring** from monolithic design to a clean, component-based structure:

- **1,000+ lines of code eliminated** through strategic component extraction
- **Zero code duplication** - all UI logic properly componentized  
- **Modular architecture** with 7 specialized reusable components
- **Enhanced maintainability** with clear separation of concerns
- **Type-safe component communication** with proper event handling
- **Performance improvements** through reduced bundle size

**Before/After:**
- Extract page: 2,216 → 1,475 lines (**33.4% reduction**)
- Trade finder: 803 → 488 lines (**39% reduction**)
- **New reusable components**: CardFilters, CardGrid, CardTable, PackManager, TradeTable, UserSearchInput

## ✨ Key Features

### 🔗 Username Bridging System
- **Smart Username Resolution**: Input usernames instead of numeric user IDs for seamless user experience
- **Blockchain Integration**: Alchemy-powered blockchain scanning of rip.fun smart contract interactions
- **Automatic User Discovery**: Syncs user data from Base blockchain pack purchase events
- **Database Mapping**: Persistent storage of address-to-username mappings with block number tracking
- **Real-time User Search**: Autocomplete functionality with partial username matching
- **Sync Status Tracking**: Background synchronization with progress monitoring and status updates
- **Dual Input Support**: Accepts both traditional user IDs and human-readable usernames

### Data Extraction & Processing
- **Complete Data Extraction**: Extract all profile data, cards, packs, and statistics
- **rip.fun Focused**: Specifically designed for rip.fun profile structure
- **SvelteKit Parser**: Advanced parsing of SvelteKit data from JavaScript code
- **Automatic Filtering**: Removes clip_embedding data while preserving all other information
- **Reliable Fetching**: Enhanced timeout handling with automatic retry logic and exponential backoff
- **localStorage Caching**: Smart browser storage with instant loading and cache-first strategy
- **Missing Cards Integration**: Real-time marketplace data with buy now/make offer functionality

### User Experience
- **Instant Loading**: Smart caching system provides immediate data loading for returning users
- **Cache Status Indicators**: Visual badges showing data source (📦 Cached vs 🌐 Live)
- **Smart Refresh System**: Refresh button updates user data while preserving static set caches
- **Intelligent Pack Grouping**: Automatically groups packs by name (e.g., "Black Bolt", "White Flar", "151") with toggleable details
- **Pack Status Tracking**: Visual summary showing opened, sealed, and pending open counts for each pack category
- **Progressive Loading**: Real-time status updates during long extractions with helpful timeout guidance
- **Enhanced Error Handling**: Detailed error messages with troubleshooting suggestions
- **JSON Export**: Download clean data as JSON files or copy to clipboard
- **Advanced Cache Management**: Collapsible cache options for power users
- **Responsive Design**: Clean interface optimized for all device sizes

### Advanced Card Management & Visualization
- **Set-Based Card Filtering**: Organize and filter cards by Pokemon TCG sets with real-time count updates
- **Missing Cards Marketplace Integration**: Complete missing cards detection with real-time listing data
  - **Show Missing Cards**: Display missing cards alongside owned cards with red styling
  - **Only Missing Cards**: Filter to show only missing cards from selected sets
  - **Available Only**: Show only missing cards with active marketplace listings
- **Buy Now/Make Offer Functionality**: Direct marketplace integration with purchase buttons
- **Smart Set Recognition**: Automatic parsing of human-readable set names (e.g., "151", "Prismatic Evolutions", "Black Bolt")
- **Smart Deduplication**: Always-active card deduplication for cleaner display (no user toggle)
- **Dual View Modes**: Switch between grid view (visual browsing) and table view with marketplace columns
- **Enhanced Card Tables**: Sortable columns including marketplace data (Listed Price, Available, Action)
- **Marketplace Columns**:
  - **Listed Price**: Lowest available price for missing cards
  - **Available**: ✅/❌ icons showing listing availability  
  - **Action**: Buy Now (blue) or Make Offer (gray) buttons
- **Organized Pack Display**: Table view with ID and status columns for each pack group
- **Collection Analytics**: Set-by-set breakdowns with rarity distribution and value tracking
- **Status Indicators**: Color-coded badges for listing status, pack conditions, and ownership
- **Visual Count Badges**: Availability indicators and marketplace status

## Tech Stack

- **Frontend & Backend**: SvelteKit (full-stack framework) with **component-based architecture**
- **UI Components**: 7 specialized Svelte components with TypeScript interfaces
- **Database**: SQLite with Prisma ORM for user mappings and sync tracking
- **Blockchain Integration**: Alchemy SDK for Base network interaction
- **HTML Parsing**: Cheerio for server-side DOM manipulation
- **Styling**: Tailwind CSS with consistent component patterns
- **Type Safety**: TypeScript throughout with proper event handling
- **Caching**: Centralized localStorage management through `cacheUtils.ts`
- **Architecture**: Service-oriented backend with modular component frontend

## Setup

### Prerequisites
- Node.js 18+ and npm
- [Alchemy API account](https://dashboard.alchemy.com/) for blockchain integration

### Installation

1. **Install dependencies** (including Alchemy SDK):
```sh
npm install
npm install alchemy-sdk
```

2. **Environment Configuration**:
```sh
# Copy the environment template
cp .env.example .env

# Edit .env and add your Alchemy API key:
# ALCHEMY_API_KEY=your_actual_api_key_here
```

3. **Database Setup**:
```sh
# Generate Prisma client and set up database schema
npx prisma generate
npx prisma db push
```

4. **Start Development Server**:
```sh
npm run dev
```

5. **Visit Application**: Open `http://localhost:5173` to use the application.

### First-Time Username Bridging Setup

After setup, you'll need to sync blockchain data to enable username resolution:

1. **Navigate to Extract Page**: Visit `/extract` in the application
2. **Trigger Initial Sync**: Click the "Sync Users" button to start blockchain data synchronization
3. **Monitor Sync Progress**: Check sync status - initial sync may take several minutes
4. **Start Using Usernames**: Once sync completes, you can input usernames instead of user IDs

## Usage

1. **Visit Extractor**: Go to `/extract` or click "Start Extracting" from the home page
2. **Enter Username or ID**: 
   - **Username Mode**: Type any rip.fun username (e.g., "johndoe") with autocomplete suggestions
   - **ID Mode**: Enter a numeric user ID directly (traditional method)
   - **Smart Resolution**: System automatically detects input type and resolves accordingly
3. **Extract Data**: Click "Extract Profile Data" to start the extraction process
   - Monitor real-time progress updates during extraction
   - Automatic retries handle temporary timeouts or network issues
4. **Review Results**: Explore the comprehensive data visualization:
   - **Card Management**: Use set-based filtering to organize cards by Pokemon TCG sets
     - Filter dropdown shows all available sets with card counts
     - **Missing Cards**: Check "Show missing cards" to see cards you don't own
     - **Only Missing**: Filter to show only missing cards with marketplace data
     - **Available Only**: Show only missing cards with active listings
     - Switch between grid view (visual) and table view with marketplace columns
   - **Marketplace Integration**: Buy missing cards directly from the interface
     - **Buy Now**: Blue buttons for cards with active listings
     - **Make Offer**: Gray buttons for cards without listings  
     - **Listed Prices**: Real-time marketplace pricing data
   - **Pack Groups**: Click any pack category to expand and see individual pack details
   - **Status Summary**: View opened/sealed/pending counts at the top of each pack group
   - **Collection Overview**: Browse set statistics, card rarities, and total values
5. **Export Data**: Download as JSON file or copy to clipboard for external use

### 🃏 Card Management Features

- **Set-Based Organization**: Cards automatically grouped by Pokemon TCG sets (e.g., "151", "Prismatic Evolutions", "Black Bolt")
- **Smart Filtering**: Dropdown filter with real-time card counts for each set
- **Missing Cards Integration**: Complete marketplace features for cards you don't own
  - **Show Missing Cards**: Red-styled missing cards displayed alongside owned cards
  - **Only Missing Cards**: Dedicated filter to show only missing cards
  - **Available Only**: Show only missing cards with active marketplace listings
- **Smart Deduplication**: Always-active card deduplication (no toggle needed)
- **Dual Display Modes**:
  - **Grid View**: Visual card browser with images, stats, and missing card indicators
  - **Table View**: Enhanced data table with marketplace columns (Card, Set, Rarity, Type, Value, Listed Price, Available, Action, Status)
- **Marketplace Integration**:
  - **Listed Price**: Real-time lowest prices for missing cards
  - **Availability Icons**: ✅ for available, ❌ for unavailable missing cards
  - **Buy Now/Make Offer**: Direct purchase buttons linking to rip.fun marketplace
- **Visual Indicators**: Availability status, color-coded indicators, marketplace integration
- **Responsive Design**: Optimized layouts for both desktop and mobile viewing

### 🎯 Pack Management Features

- **Grouped Display**: Packs are automatically grouped by name (e.g., multiple "Black Bolt" packs show as one expandable group)
- **Status Tracking**: Each group shows a summary of opened, sealed, and pending open packs
- **Quick Overview**: Collapsed headers display key statistics without needing to expand
- **Detailed View**: Expand any group to see a comprehensive table with individual pack IDs and statuses

### Data Extraction & Visualization

The application extracts and displays comprehensive data from rip.fun profiles:

**Profile Information:**
- `username` - rip.fun username
- `bio` - Profile bio/description  
- `email` - User email address
- `login_provider` - Authentication provider (Google, etc.)
- `avatar` - Profile avatar URL
- `banner` - Profile banner URL
- `smart_wallet_address` - Smart contract wallet address
- `owner_wallet_address` - Owner wallet address
- `verified` - Verification status
- Account creation and update timestamps

**Digital Cards (Advanced Management):**
- **Set-Based Organization**: Cards automatically grouped by Pokemon TCG sets with human-readable names
- **Missing Cards Marketplace Integration**: Complete marketplace features for cards not owned
  - **Real-Time Listing Data**: Live pricing from rip.fun marketplace API
  - **Buy Now Functionality**: Direct purchase buttons for available cards
  - **Make Offer Links**: Marketplace links for cards without active listings
  - **Availability Tracking**: Visual indicators for listing availability
- **Advanced Filtering System**: 
  - **Set-Based Filter**: Dropdown to show all sets or specific collections
  - **Show Missing Cards**: Display missing cards alongside owned cards
  - **Only Missing Cards**: Filter to show only missing cards
  - **Available Only**: Show only missing cards with active listings
- **Smart Deduplication**: Always-active intelligent deduplication (no user toggle)
- **Dual View Modes**: Grid view for visual browsing, table view with marketplace columns
- **Complete Card Details**: Name, card number, rarity, HP, types, abilities, attacks, weaknesses, resistances
- **Enhanced Market Data**: Owned card values, missing card listing prices, and marketplace status
- **Visual Assets**: Card images, artwork, and set symbols
- **Set Information**: Release dates, set statistics, and rarity distributions
- **Interactive Tables**: Enhanced sortable columns including marketplace data (Listed Price, Available, Action)

**Digital Products & Packs (Enhanced Display):**
- **Grouped Pack View**: Packs automatically organized by name/type
- **Status Summary**: Visual overview of opened, sealed, and pending open counts
- **Individual Pack Details**: Expandable tables showing each pack's ID and status
- **Pack Metadata**: Product names, types, values, and marketplace listings
- **Set Associations**: Connected artwork and release information  
- **Token IDs**: Blockchain ownership verification details

**Collection Analytics:**
- Set-by-set breakdowns with rarity distribution
- Total collection value calculations
- Card count statistics per set
- Visual organization by set and rarity
- Market value tracking

### Data Cleaning

The application automatically removes `clip_embedding` data from the extracted information to focus on relevant profile data and reduce payload size.

## 🔧 Reliability & Performance

### localStorage Caching System
- **Instant Loading**: Cache-first strategy provides immediate data loading
- **User-Specific Caching**: Individual user data cached separately with timestamps
- **Set Data Caching**: Pokemon TCG set data cached permanently (shared across users)
- **Smart Refresh Logic**: Refresh button updates user data while preserving set caches
- **Cache Status Indicators**: Visual badges showing data source (📦 Cached vs 🌐 Live)
- **Advanced Cache Management**: Power user options to clear specific cache types
- **Cross-User Efficiency**: Set data shared between different user profiles

### Enhanced Fetching System
- **Automatic Retries**: Up to 3 retry attempts with exponential backoff
- **Progressive Timeouts**: Starts at 20s, increases to 60s maximum
- **Smart Error Detection**: Distinguishes between temporary and permanent failures
- **Browser-like Headers**: Realistic request headers to avoid blocking
- **Detailed Logging**: Console output shows attempt progress and timing

### User-Friendly Error Handling
- **Timeout Guidance**: Explains possible causes (server load, network issues, large data)
- **Specific Error Types**: Different messages for 404s, 500s, network failures
- **Progress Updates**: Real-time feedback during long-running extractions
- **Retry Notifications**: Clear indication when automatic retries are happening

## API Endpoints

### Core Extraction
- `POST /api/extract` - Extract complete data from rip.fun username or user ID (Enhanced with retry logic and username resolution)

### Username Bridging System
- `POST /api/sync-users` - Trigger blockchain user synchronization from Base network
- `GET /api/sync-users` - Get current sync status and progress information
- `GET /api/resolve-username/[username]` - Resolve username to user ID and profile data
- `GET /api/search-users?q=[query]&limit=[n]` - Search users with autocomplete functionality

### Missing Cards & Marketplace Integration  
- `GET /api/set/[setId]` - Fetch complete Pokemon TCG set data (cached permanently)
- `GET /api/card/[cardId]/listings` - Get real-time marketplace listings for missing cards

### Legacy Profile Management
- `GET /api/profiles` - List all profiles (legacy feature)
- `POST /api/profiles` - Create a new profile (legacy feature)
- `GET /api/profiles/[id]` - Get a specific profile (legacy feature)
- `PUT /api/profiles/[id]` - Update a profile (legacy feature)
- `DELETE /api/profiles/[id]` - Delete a profile (legacy feature)
- `POST /api/compare` - Compare profiles (legacy feature)

## 📚 Documentation Structure

The application includes **comprehensive documentation** with detailed explanations of the component architecture:

- **`CLAUDE.md`** - Main project documentation with complete architecture overview
- **`src/lib/components/CLAUDE.md`** - Detailed component documentation with usage examples
- **`src/lib/server/services/CLAUDE.md`** - Backend services and business logic documentation
- **`src/lib/utils/CLAUDE.md`** - Shared utilities and cache management documentation
- **`src/routes/api/CLAUDE.md`** - API endpoints and integration patterns documentation
- **`src/routes/CLAUDE.md`** - Page structure and route organization documentation

Each directory contains specific guidance for developers working with that part of the codebase.

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## 🎯 Architecture Summary

**Component-Based Structure:**
- 7 specialized UI components eliminating code duplication
- Service-oriented backend with focused business logic modules  
- Centralized utilities for cache management and common operations
- Clear separation between presentation, business logic, and data layers

**Key Benefits:**
- ✅ **1,000+ lines of code eliminated** through strategic refactoring
- ✅ **Zero code duplication** across the application
- ✅ **Enhanced maintainability** with clear component boundaries
- ✅ **Type-safe architecture** with comprehensive TypeScript integration
- ✅ **Performance optimizations** through component-level caching
- ✅ **Developer experience** improvements with extensive documentation
