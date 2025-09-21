/**
 * Sales Services Index
 * Clean exports for all refactored sales-related services
 */

// Main sales monitor (refactored)
export { salesMonitorService, SalesMonitorService } from './SalesMonitorService.js';

// Specialized services
export { tokenMetadataService, TokenMetadataService } from './metadata/TokenMetadataService.js';
// REMOVED: cardEnrichmentEngine - replaced by unified SalesEnrichmentService
export { userDiscoveryService, UserDiscoveryService } from './users/UserDiscoveryService.js';

// Types
export type { PurchaseEvent } from './SalesMonitorService.js';
export type { TokenMetadata } from './metadata/TokenMetadataService.js';
export type { UserInfo } from './users/UserDiscoveryService.js';
