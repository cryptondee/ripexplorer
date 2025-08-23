# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a robust web application specifically designed to extract complete profile data from rip.fun user pages. The app fetches HTML from rip.fun profiles with enhanced reliability features, parses the SvelteKit data structure from JavaScript code, automatically removes clip_embedding data to reduce payload size, and provides clean JSON output with comprehensive visualization of profile information, digital cards, packs, and collection statistics.

### Recent Major Enhancements (2025)
- **Intelligent Pack Grouping**: Automatic categorization of packs by name with toggleable detailed views
- **Pack Status Tracking**: Visual summaries showing opened, sealed, and pending open counts  
- **Enhanced Reliability**: Retry logic with exponential backoff and progressive timeouts (20s-60s)
- **Improved UX**: Real-time progress updates, detailed error messages, and responsive design
- **Advanced Data Visualization**: Expandable pack groups with comprehensive status tables

## Architecture

### Core Components

- **Frontend**: Enhanced user interface with intelligent pack grouping, status tracking, and real-time progress updates
- **Backend API**: Robust rip.fun HTML fetching with retry logic, SvelteKit data parsing, and extraction logic
- **Enhanced Fetcher Service**: Automatic retry with exponential backoff, progressive timeouts, and smart error handling
- **Data Processing Pipeline**: 
  1. Reliable HTML fetching from rip.fun profile URLs (20-60s timeouts, 3 retry attempts)
  2. SvelteKit data structure parsing from JavaScript code
  3. Automatic removal of clip_embedding data from digital_cards and cards arrays
  4. Data sanitization and structure preservation with pack status analysis
  5. JSON export with complete profile, cards, packs, and statistics data
- **Data Visualization Engine**: Pack grouping logic, status summarization, and interactive table display

### Key Workflows

1. **Username Input**: User provides a rip.fun username for extraction
2. **Enhanced Data Extraction**: Backend fetches rip.fun profile HTML with automatic retries and progressive timeouts
   - Real-time progress updates to user during long extractions
   - Automatic retry on timeout/network errors with exponential backoff
   - Detailed error messages with troubleshooting guidance
3. **Data Processing**: Parses complete SvelteKit data structure with pack status analysis
   - Groups packs by name/type for organized display
   - Calculates opened, sealed, and pending open counts
   - Preserves all relevant data while removing clip_embedding bloat
4. **Advanced Visualization**: Interactive display with grouped pack management
   - Collapsible pack groups with summary statistics
   - Individual pack tables with ID and status columns
   - Color-coded status indicators and value tracking
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
- **Database**: SQLite with Prisma ORM
- **Parsing**: Cheerio for HTML manipulation

**Setup Commands**:
```bash
npm install                    # Install dependencies
npx prisma generate           # Generate Prisma client
npx prisma db push           # Set up database
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
4. **Pack Grouping System**: Intelligent categorization with status tracking ✓
5. **Advanced Frontend Interface**: Interactive tables, expandable groups, real-time progress ✓
6. **Error Handling**: User-friendly messages with troubleshooting guidance ✓

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
- **Intuitive pack management** with grouped displays and status summaries
- **Real-time user feedback** during long-running operations
- **Comprehensive error handling** with actionable guidance
- **Responsive design** optimized for all device sizes