/**
 * Enrichment Strategies Export
 * Central export point for all enrichment strategies
 */

export * from './EnrichmentStrategy.js';
export * from './DatabaseEnrichmentStrategy.js';
export * from './AutoDownloadStrategy.js';
export * from './OnchainEnrichmentStrategy.js';
export * from './FallbackEnrichmentStrategy.js';

// Pre-configured strategy list in priority order
import { DatabaseEnrichmentStrategy } from './DatabaseEnrichmentStrategy.js';
import { AutoDownloadStrategy } from './AutoDownloadStrategy.js';
import { OnchainEnrichmentStrategy } from './OnchainEnrichmentStrategy.js';
import { FallbackEnrichmentStrategy } from './FallbackEnrichmentStrategy.js';

/**
 * Get default strategies in priority order:
 * 1. Database (100) - Try local DB first
 * 2. AutoDownload (90) - Download missing sets
 * 3. Onchain (50) - Use blockchain metadata
 * 4. Fallback (0) - Always returns something
 */
export function getDefaultStrategies() {
  return [
    new DatabaseEnrichmentStrategy(),
    new AutoDownloadStrategy(),
    new OnchainEnrichmentStrategy(),
    new FallbackEnrichmentStrategy()
  ];
}
