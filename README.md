# rip.fun Data Extractor

A web application specifically designed to extract complete profile data from rip.fun user pages. The app fetches HTML from rip.fun profiles, parses the SvelteKit data structure, automatically removes clip_embedding data to reduce payload size, and provides clean JSON output with all profile information, cards, packs, and statistics.

## Features

- **Complete Data Extraction**: Extract all profile data, cards, packs, and statistics
- **rip.fun Focused**: Specifically designed for rip.fun profile structure
- **SvelteKit Parser**: Advanced parsing of SvelteKit data from JavaScript code
- **Automatic Filtering**: Removes clip_embedding data while preserving all other information
- **JSON Export**: Download clean data as JSON files or copy to clipboard
- **Username Interface**: Simply enter any rip.fun username to extract their data
- **Data Visualization**: Preview extracted data with organized summary view
- **Responsive UI**: Clean interface with expandable data views

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
3. **Extract Data**: Click "Extract Profile Data" to fetch and parse the complete profile
4. **Review Results**: View the extracted data in the organized summary or raw JSON format
5. **Export Data**: Download as JSON file or copy to clipboard for external use

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

**Digital Products & Packs:**
- Product names and types
- Pack opening status and reveal states
- Product values and marketplace listings
- Set associations and artwork
- Token IDs and ownership details

**Collection Analytics:**
- Set-by-set breakdowns with rarity distribution
- Total collection value calculations
- Card count statistics per set
- Visual organization by set and rarity
- Market value tracking

### Data Cleaning

The application automatically removes `clip_embedding` data from the extracted information to focus on relevant profile data and reduce payload size.

## API Endpoints

- `POST /api/extract` - Extract complete data from rip.fun username
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
