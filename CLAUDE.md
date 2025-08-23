# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web application specifically designed to extract complete profile data from rip.fun user pages. The app fetches HTML from rip.fun profiles, parses the SvelteKit data structure from JavaScript code, automatically removes clip_embedding data to reduce payload size, and provides clean JSON output with all profile information, digital cards, packs, and collection statistics.

## Architecture

### Core Components

- **Frontend**: User interface for data extraction and JSON export
- **Backend API**: Handles rip.fun HTML fetching, SvelteKit data parsing, and extraction logic
- **Data Processing Pipeline**: 
  1. HTML fetching from rip.fun profile URLs
  2. SvelteKit data structure parsing from JavaScript code
  3. Automatic removal of clip_embedding data from digital_cards and cards arrays
  4. Data sanitization and structure preservation
  5. JSON export with complete profile, cards, packs, and statistics data

### Key Workflows

1. **Username Input**: User provides a rip.fun username for extraction
2. **rip.fun Data Extraction**: Backend fetches rip.fun profile HTML and parses complete SvelteKit data structure
3. **Data Cleaning**: Automatically removes clip_embedding data while preserving all other information
4. **Data Export**: Provides complete JSON output with profile, cards, packs, and statistics
5. **Result Display**: Shows organized summary view and exportable raw JSON data

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

## Development Setup

Since this is a new project, the specific build commands will depend on the chosen tech stack. Common patterns:

**Frontend (if React/Next.js)**:
```bash
npm run dev     # Development server
npm run build   # Production build
npm run lint    # Linting
npm test        # Run tests
```

**Frontend (if Svelte/SvelteKit)**:
```bash
npm run dev     # Development server
npm run build   # Production build
npm run check   # Type checking
npm test        # Run tests
```

**Backend (if Node.js)**:
```bash
npm run dev     # Development server with hot reload
npm run start   # Production server
npm test        # Run tests
npm run lint    # Linting
```

**Backend (if Python)**:
```bash
pip install -r requirements.txt
python -m uvicorn main:app --reload  # Development server
pytest                              # Run tests
black . && isort .                   # Formatting
```

## Implementation Priority

1. **MVP Profile System**: Basic CRUD for user profiles
2. **HTML Fetching**: Reliable retrieval of target pages
3. **SvelteKit Parser**: Extraction and parsing of JSON script blocks
4. **Data Cleaning**: Normalization and field mapping logic
5. **Comparison Engine**: Diff generation between datasets
6. **Frontend Interface**: Profile forms and comparison display
7. **Authentication**: User sessions (magic links/OAuth)
8. **History Tracking**: Previous comparison records