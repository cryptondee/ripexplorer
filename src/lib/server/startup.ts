import { salesMonitor } from './services/salesMonitor.js';

let initialized = false;

/**
 * Initialize server-side services
 */
export async function initializeServices() {
  if (initialized) {
    console.log('🔄 Services already initialized');
    return;
  }

  console.log('🚀 Initializing server services...');

  try {
    // Start sales monitoring if ALCHEMY_API_KEY is available
    const apiKey = process.env.ALCHEMY_API_KEY;
    if (apiKey) {
      console.log('🎯 Starting sales monitor...');
      await salesMonitor.startMonitoring();
      console.log('✅ Sales monitor started successfully');
    } else {
      console.warn('⚠️ ALCHEMY_API_KEY not found - sales monitoring disabled');
    }

    initialized = true;
    console.log('✅ All server services initialized');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    // Don't throw - let the app continue even if monitoring fails
  }
}

/**
 * Shutdown services gracefully
 */
export function shutdownServices() {
  if (!initialized) return;

  console.log('🛑 Shutting down services...');
  
  try {
    salesMonitor.stopMonitoring();
    console.log('✅ Sales monitor stopped');
  } catch (error) {
    console.error('❌ Error stopping sales monitor:', error);
  }

  initialized = false;
  console.log('✅ Services shutdown complete');
}

// Handle process shutdown gracefully
process.on('SIGINT', shutdownServices);
process.on('SIGTERM', shutdownServices);