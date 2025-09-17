/**
 * Sales Monitor Service (Refactored)
 * Clean, focused service that only handles WebSocket monitoring and event coordination
 * Delegates complex logic to specialized services
 */

import { EventEmitter } from 'events';
import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import { createPublicClient, http, parseAbiItem, decodeEventLog, type Log } from 'viem';
import { base } from 'viem/chains';
import { logger } from '$lib/utils/logger.js';
import { prisma } from '$lib/server/db/client.js';
import type { SalesEvent } from '$lib/types/sales.js';

// Specialized services
import { tokenMetadataService } from './metadata/TokenMetadataService.js';
import { cardEnrichmentEngine } from './enrichment/CardEnrichmentEngine.js';
import { userDiscoveryService } from './users/UserDiscoveryService.js';

// Configuration
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const CONTRACT_ADDRESS = '0x4e4112dCd5eDA35648AFA851f611c79fCD26aF64';
const PURCHASE_EVENT_TOPIC = '0xa08cb843320eabe9cff345973b948e6b72b8ce73556f718684638daa3e8a9e6b';

export interface PurchaseEvent {
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
  buyer: string;
  seller: string;
  nftContract: string;
  tokenId: string;
  price: string;
  currency: string;
}

export class SalesMonitorService extends EventEmitter {
  private static instance: SalesMonitorService;
  private wsServer: WebSocketServer | null = null;
  private ws: WebSocket | null = null;
  private isMonitoring = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  static getInstance(): SalesMonitorService {
    if (!SalesMonitorService.instance) {
      SalesMonitorService.instance = new SalesMonitorService();
    }
    return SalesMonitorService.instance;
  }

  /**
   * Start monitoring sales events
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      logger.log('⚠️ Sales monitor already running');
      return;
    }

    try {
      logger.log('🚀 Starting sales monitor...');
      
      // Initialize WebSocket server for client connections
      this.initializeWebSocketServer();
      
      // Connect to Alchemy WebSocket
      await this.connectToAlchemy();
      
      this.isMonitoring = true;
      logger.log('✅ Sales monitor started successfully');
      
    } catch (error) {
      logger.error('❌ Failed to start sales monitor:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    logger.log('🛑 Stopping sales monitor...');
    
    this.isMonitoring = false;
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = null;
    }
    
    logger.log('✅ Sales monitor stopped');
  }

  /**
   * Initialize WebSocket server for client connections
   */
  private initializeWebSocketServer(): void {
    this.wsServer = new WebSocketServer({ port: 8080 });
    
    this.wsServer.on('connection', (ws) => {
      logger.log('👥 New client connected to sales stream');
      
      ws.on('close', () => {
        logger.log('👋 Client disconnected from sales stream');
      });
    });
  }

  /**
   * Connect to Alchemy WebSocket
   */
  private async connectToAlchemy(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `wss://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
      
      logger.log('🔗 Connecting to Alchemy WebSocket...');
      this.ws = new WebSocket(wsUrl);
      
      this.ws.on('open', () => {
        logger.log('✅ WebSocket connection opened');
        this.subscribeToEvents();
        this.reconnectAttempts = 0;
        resolve();
      });
      
      this.ws.on('message', (data) => {
        this.handleWebSocketMessage(data);
      });
      
      this.ws.on('close', () => {
        logger.log('🔌 WebSocket connection closed');
        if (this.isMonitoring) {
          this.handleReconnection();
        }
      });
      
      this.ws.on('error', (error) => {
        logger.error('❌ WebSocket error:', error);
        reject(error);
      });
    });
  }

  /**
   * Subscribe to purchase events
   */
  private subscribeToEvents(): void {
    if (!this.ws) return;
    
    const subscription = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_subscribe',
      params: [
        'logs',
        {
          address: CONTRACT_ADDRESS,
          topics: [PURCHASE_EVENT_TOPIC]
        }
      ]
    };
    
    this.ws.send(JSON.stringify(subscription));
    logger.log('🔔 Subscribed to Purchase events');
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleWebSocketMessage(data: any): Promise<void> {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.method === 'eth_subscription' && message.params?.result) {
        const log = message.params.result;
        await this.processPurchaseEvent(log);
      }
    } catch (error) {
      logger.error('❌ Error processing WebSocket message:', error);
    }
  }

  /**
   * Process a purchase event (main business logic)
   */
  private async processPurchaseEvent(log: Log): Promise<void> {
    try {
      // Parse the event
      const event = this.parseLogToPurchaseEvent(log);
      if (!event) return;
      
      logger.log(`🛒 New purchase: Token ${event.tokenId} for ${event.price} Wei`);
      
      // Enrich and store the purchase
      await this.enrichAndStorePurchase(event);
      
    } catch (error) {
      logger.error('❌ Error processing purchase event:', error);
    }
  }

  /**
   * Parse blockchain log to purchase event
   */
  private parseLogToPurchaseEvent(log: Log): PurchaseEvent | null {
    try {
      const purchaseEventAbi = parseAbiItem(
        'event Purchase(address indexed buyer, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 price, address currency)'
      );
      
      const decoded = decodeEventLog({
        abi: [purchaseEventAbi],
        data: log.data,
        topics: log.topics
      });
      
      return {
        transactionHash: log.transactionHash || '',
        blockNumber: Number(log.blockNumber || 0),
        logIndex: Number(log.logIndex || 0),
        buyer: decoded.args.buyer as string,
        seller: decoded.args.seller as string,
        nftContract: decoded.args.nftContract as string,
        tokenId: decoded.args.tokenId.toString(),
        price: decoded.args.price.toString(),
        currency: decoded.args.currency as string
      };
    } catch (error) {
      logger.error('❌ Error parsing purchase event:', error);
      return null;
    }
  }

  /**
   * Enrich purchase with metadata and store in database
   */
  private async enrichAndStorePurchase(event: PurchaseEvent): Promise<void> {
    try {
      logger.log('🎨 Enriching purchase with metadata...');

      // Get enhanced data in parallel using specialized services
      const [userInfo, tokenMetadata] = await Promise.all([
        userDiscoveryService.enrichWithUsernames(event.buyer, event.seller),
        tokenMetadataService.getTokenMetadata(event.tokenId)
      ]);

      // Enrich card data if metadata is available
      let enrichedCardData = null;
      if (tokenMetadata) {
        const isRichMetadata = tokenMetadataService.isRichMetadata(tokenMetadata);
        enrichedCardData = await cardEnrichmentEngine.enrichCard(tokenMetadata, isRichMetadata);
      }

      // Store in database
      const salesEvent = await prisma.salesEvent.create({
        data: {
          transactionHash: event.transactionHash,
          blockNumber: BigInt(event.blockNumber),
          logIndex: event.logIndex,
          buyerAddress: event.buyer.toLowerCase(),
          sellerAddress: event.seller.toLowerCase(),
          nftContract: event.nftContract.toLowerCase(),
          tokenId: event.tokenId,
          price: event.price,
          currency: event.currency.toLowerCase(),
          
          // Enhanced card metadata
          cardName: enrichedCardData?.cardName || null,
          cardImage: enrichedCardData?.cardImage || null,
          cardUniqueId: enrichedCardData?.cardUniqueId || null,
          cardRarity: enrichedCardData?.cardRarity || null,
          cardSet: enrichedCardData?.cardSet || null,
          packetId: null,
          
          // User information
          buyerUsername: userInfo.buyerUsername,
          sellerUsername: userInfo.sellerUsername
        }
      });

      logger.log('💾 Purchase stored in database:', salesEvent.id);

      // Log enrichment details
      if (enrichedCardData?.enrichmentSource) {
        logger.log(`🎨 Enrichment source: ${enrichedCardData.enrichmentSource}`);
        if (enrichedCardData.setDownloaded) {
          logger.log(`📥 Downloaded new set for this card!`);
        }
      }

      // Create enriched event for broadcasting and emission
      const enrichedEvent = {
        id: salesEvent.id,
        transactionHash: salesEvent.transactionHash,
        blockNumber: salesEvent.blockNumber.toString(),
        buyer: {
          address: salesEvent.buyerAddress,
          username: salesEvent.buyerUsername || undefined
        },
        seller: {
          address: salesEvent.sellerAddress,
          username: salesEvent.sellerUsername || undefined
        },
        card: {
          name: salesEvent.cardName || undefined,
          image: salesEvent.cardImage || undefined,
          rarity: salesEvent.cardRarity || undefined,
          set: salesEvent.cardSet || undefined,
          uniqueId: salesEvent.cardUniqueId || undefined
        },
        price: salesEvent.price,
        currency: salesEvent.currency,
        timestamp: new Date().toISOString()
      };
      
      // Broadcast to WebSocket clients
      this.broadcastToWebSocketClients(enrichedEvent);
      
      // Emit event for subscribers (like SSE endpoints)
      this.emit('sale', enrichedEvent);
      
    } catch (error) {
      logger.error('❌ Error enriching and storing purchase:', error);
    }
  }

  /**
   * Broadcast to WebSocket clients
   */
  private broadcastToWebSocketClients(enrichedEvent: any): void {
    if (!this.wsServer) return;

    const message = JSON.stringify({
      type: 'new_sale',
      data: enrichedEvent
    });

    this.wsServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * Handle WebSocket reconnection
   */
  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    logger.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
    
    setTimeout(async () => {
      try {
        await this.connectToAlchemy();
      } catch (error) {
        logger.error('❌ Reconnection failed:', error);
        this.handleReconnection();
      }
    }, delay);
  }

  /**
   * Get monitoring status
   */
  getStatus(): { isMonitoring: boolean; reconnectAttempts: number; connectedClients: number } {
    return {
      isMonitoring: this.isMonitoring,
      reconnectAttempts: this.reconnectAttempts,
      connectedClients: this.wsServer?.clients.size || 0
    };
  }
}

// Export singleton instance
export const salesMonitorService = SalesMonitorService.getInstance();
