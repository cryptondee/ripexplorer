# rip.fun Data Extractor

A robust web application specifically designed to extract complete profile data from rip.fun user pages. The app fetches HTML from rip.fun profiles, parses the SvelteKit data structure, automatically removes clip_embedding data to reduce payload size, and provides clean JSON output with all profile information, cards, packs, and statistics.

## ✨ Key Features

### Data Extraction & Processing
- **Complete Data Extraction**: Extract all profile data, cards, packs, and statistics
- **rip.fun Focused**: Specifically designed for rip.fun profile structure
- **SvelteKit Parser**: Advanced parsing of SvelteKit data from JavaScript code
- **Automatic Filtering**: Removes clip_embedding data while preserving all other information
- **Reliable Fetching**: Enhanced timeout handling with automatic retry logic and exponential backoff

### User Experience
- **Intelligent Pack Grouping**: Automatically groups packs by name (e.g., "Black Bolt", "White Flar", "151") with toggleable details
- **Pack Status Tracking**: Visual summary showing opened, sealed, and pending open counts for each pack category
- **Progressive Loading**: Real-time status updates during long extractions with helpful timeout guidance
- **Enhanced Error Handling**: Detailed error messages with troubleshooting suggestions
- **JSON Export**: Download clean data as JSON files or copy to clipboard
- **Responsive Design**: Clean interface optimized for all device sizes

### Data Visualization
- **Organized Pack Display**: Table view with ID and status columns for each pack group
- **Collection Analytics**: Set-by-set breakdowns with rarity distribution and value tracking
- **Status Indicators**: Color-coded badges for listing status, pack conditions, and ownership
- **Interactive Tables**: Expandable pack groups with detailed summaries and individual item listings

## Tech Stack

- **Frontend & Backend**: SvelteKit (full-stack framework)
- **Database**: SQLite with Prisma ORM
- **HTML Parsing**: Cheerio for server-side DOM manipulation
- **Styling**: Tailwind CSS
- **Type Safety**: TypeScript throughout

## Setup

1. Install dependencies:
```sh
npm install
```

2. Set up the database:
```sh
npx prisma generate
npx prisma db push
```

3. Start the development server:
```sh
npm run dev
```

4. Visit `http://localhost:5173` to use the application.

## Usage

1. **Visit Extractor**: Go to `/extract` or click "Start Extracting" from the home page
2. **Enter Username**: Type any rip.fun username (e.g., "johndoe") 
3. **Extract Data**: Click "Extract Profile Data" to start the extraction process
   - Monitor real-time progress updates during extraction
   - Automatic retries handle temporary timeouts or network issues
4. **Review Results**: Explore the comprehensive data visualization:
   - **Pack Groups**: Click any pack category to expand and see individual pack details
   - **Status Summary**: View opened/sealed/pending counts at the top of each pack group
   - **Collection Overview**: Browse set statistics, card rarities, and total values
5. **Export Data**: Download as JSON file or copy to clipboard for external use

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

**Digital Cards (Complete Details):**
- Individual card information including name, card number, rarity, HP
- Card types, abilities, attacks, weaknesses, resistances
- Market values and listing prices
- Card images and artwork
- Set information with release dates
- Listing status and marketplace data
- Cards organized by set with statistics

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

- `POST /api/extract` - Extract complete data from rip.fun username (Enhanced with retry logic)
- `GET /api/profiles` - List all profiles (legacy feature)
- `POST /api/profiles` - Create a new profile (legacy feature)
- `GET /api/profiles/[id]` - Get a specific profile (legacy feature)
- `PUT /api/profiles/[id]` - Update a profile (legacy feature)
- `DELETE /api/profiles/[id]` - Delete a profile (legacy feature)

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
