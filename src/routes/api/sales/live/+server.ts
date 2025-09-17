import type { RequestHandler } from './$types';
import { salesMonitorService } from '$lib/server/services/index.js';

// TODO: Update EnrichedSalesEvent type to match new architecture
type EnrichedSalesEvent = any;

export const GET: RequestHandler = async ({ request }) => {
  // Set up Server-Sent Events headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      console.log('🔗 Starting SSE stream for live sales');
      
      // Track cleanup state
      let isClosed = false;
      let keepAliveInterval: NodeJS.Timeout | null = null;
      let unsubscribe: (() => void) | null = null;

      // Cleanup function
      const cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        console.log('🔌 Cleaning up SSE stream');
        
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }
        
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        
        try {
          controller.close();
        } catch (error) {
          // Controller might already be closed
        }
      };

      // Safe enqueue helper
      const safeEnqueue = (data: string): boolean => {
        if (isClosed) return false;
        
        try {
          controller.enqueue(new TextEncoder().encode(data));
          return true;
        } catch (error) {
          // Controller is closed, mark as closed and cleanup
          if (!isClosed) cleanup();
          return false;
        }
      };

      // Send initial connection message
      if (!safeEnqueue(`data: ${JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString(),
        message: 'Connected to live sales feed'
      })}\n\n`)) {
        return;
      }

      // Subscribe to sales events
      unsubscribe = salesMonitorService.on('sale', (saleEvent: EnrichedSalesEvent) => {
        if (isClosed) return;
        
        const eventData = {
          type: 'sale',
          data: saleEvent
        };
        
        safeEnqueue(`data: ${JSON.stringify(eventData)}\n\n`);
      });

      // Start keepalive interval (every 30 seconds)
      keepAliveInterval = setInterval(() => {
        if (isClosed) return;
        
        const keepAlive = `data: ${JSON.stringify({
          type: 'keepalive',
          timestamp: new Date().toISOString(),
          status: salesMonitorService.getStatus()
        })}\n\n`;
        
        if (!safeEnqueue(keepAlive)) {
          cleanup();
        }
      }, 30000);

      // Handle client disconnect
      request.signal?.addEventListener('abort', cleanup);
    },
    
    cancel() {
      console.log('🔌 SSE stream cancelled by client');
    }
  });

  return new Response(stream, { headers });
};