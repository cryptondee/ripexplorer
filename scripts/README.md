# Scripts Directory

This directory contains various utility scripts organized by purpose.

## Directory Structure

### `/dev/`
Development and debugging scripts for troubleshooting and data inspection.
- `check-sales-data.js` - Verify sales data integrity
- `cleanup-unknown-cards.js` - Clean up cards with missing metadata
- `debug-*.js` - Various debugging utilities for different components
- `fix-hippopotas-sale.js` - Specific data fix script

### `/test/`
Test scripts for validating functionality and API endpoints.
- `test-card-sync-api.js` - Test card synchronization API
- `test-good-sale.js` - Test sales functionality with valid data
- `test-hippopotas-token.js` - Test specific token handling
- `test-migration.js` - Test database migrations
- `test-sales-with-data.js` - Test sales with enriched data
- `test-specific-enrichment.js` - Test card enrichment service
- `test-two-scenarios.js` - Test multiple use cases

### `/migrations/`
Database migration and data seeding scripts.
- `migrate-sales.js` - Sales data migration
- `find-good-sales.js` - Identify quality sales data
- `preload-popular-sets.js` - Cache warming for popular card sets
- `sync-cards.js` - Synchronize card data with external API

## Usage

These scripts are primarily for development and maintenance. They should not be included in production builds.

### Running Scripts

From the project root:
```bash
# Development/Debug scripts
node scripts/dev/check-sales-data.js

# Test scripts
node scripts/test/test-card-sync-api.js

# Migration scripts
node scripts/migrations/migrate-sales.js
```

## Notes

- These scripts were previously in the root directory and have been organized here for better project structure
- Most scripts require environment variables to be set (see `.env.example`)
- Always test migrations on a backup database first
