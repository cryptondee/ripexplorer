import { EventEmitter } from 'events';
import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import { createPublicClient, http, parseAbiItem, decodeEventLog, type Log } from 'viem';
import { logger } from '$lib/utils/logger.js';
import { EXTERNAL_URLS } from '$lib/constants/urls.js';
import { DEFAULT_HEADERS } from '$lib/constants/http.js';
import { cardSyncService } from '$lib/services/CardSyncService.js';
import { prisma } from '$lib/server/db/client.js';
import { userSyncService } from '$lib/server/services/userSync.js';
import type { SalesEvent } from '$lib/types/sales.js';

// Contract configuration based on your working WebSocket code
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const CONTRACT_ADDRESS = '0x4e4112dCd5eDA35648AFA851f611c79fCD26aF64';
const PURCHASE_EVENT_TOPIC = '0xa08cb843320eabe9cff345973b948e6b72b8ce73556f718684638daa3e8a9e6b';
const NFT_CONTRACT_ADDRESS = '0xF4710eE68f151B6CB0c377400738c0De9B39284f';

console.log('🎯 Sales Monitor - Looking for Purchase events');
console.log('📍 Contract:', CONTRACT_ADDRESS);
console.log('📋 Event Topic:', PURCHASE_EVENT_TOPIC);

export interface PurchaseEvent {
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
  buyer: string;        // from topics[1]
  seller: string;       // from topics[2] 
  nftContract: string;  // from topics[3]
  tokenId: string;      // from data
  price: string;        // from data (Wei)
  currency: string;     // from data
}

export interface EnrichedSalesEvent {
  id: string;
  transactionHash: string;
  blockNumber: string;
  buyer: {
    address: string;
    username?: string;
  };
  seller: {
    address: string;
    username?: string;
  };
  card: {
    name?: string;
    image?: string;
    rarity?: string;
    set?: string;
    uniqueId?: string;
    tokenId: string;
  };
  price: {
    wei: string;
    currency: string;
    formatted?: string;
  };
  timestamp: string;
}

type SalesEventSubscriber = (event: EnrichedSalesEvent) => void;

export class SalesMonitorService {
  private ws: WebSocket | null = null;
  private subscribers = new Set<SalesEventSubscriber>();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private subscriptionId: string | null = null;
  
  // Negative cache for addresses that don't have rip.fun users
  private negativeCache = new Map<string, number>(); // address -> timestamp
  private negativeCacheTimeout = 60 * 60 * 1000; // 1 hour in milliseconds
  
  // Rate limiting for API calls
  private lastApiCall = 0;
  private apiCallDelay = 500; // 500ms between API calls (2 requests per second)

  async startMonitoring(): Promise<void> {
    if (this.ws && this.isConnected) {
      console.log('🔄 Sales monitor already running');
      return;
    }

    if (!ALCHEMY_API_KEY) {
      throw new Error('❌ ALCHEMY_API_KEY not configured');
    }

    console.log('🚀 Starting sales monitor...');
    
    try {
      await this.connect();
    } catch (error) {
      console.error('❌ Failed to start sales monitor:', error);
      throw error;
    }
  }

  stopMonitoring(): void {
    console.log('🛑 Stopping sales monitor...');
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.subscriptionId = null;
    this.reconnectAttempts = 0;
  }

  subscribe(callback: SalesEventSubscriber): () => void {
    this.subscribers.add(callback);
    console.log(`👥 New subscriber added. Total: ${this.subscribers.size}`);
    
    return () => {
      this.subscribers.delete(callback);
      console.log(`👥 Subscriber removed. Total: ${this.subscribers.size}`);
    };
  }

  getStatus(): { connected: boolean; subscribers: number } {
    return {
      connected: this.isConnected,
      subscribers: this.subscribers.size
    };
  }

  private async connect(): Promise<void> {
    const wsUrl = `wss://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
    
    console.log(`🔗 Connecting to Alchemy WebSocket...`);

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('✅ WebSocket connection opened');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        
        this.subscribeToPurchaseEvents();
        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        this.isConnected = false;
        this.subscriptionId = null;
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          console.error('❌ Max reconnection attempts reached');
        }
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        reject(error);
      });
    });
  }

  private subscribeToPurchaseEvents(): void {
    if (!this.ws || !this.isConnected) {
      return;
    }

    // Using your working subscription message format
    const subscriptionMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_subscribe',
      params: [
        'logs',
        {
          address: CONTRACT_ADDRESS,
          topics: [PURCHASE_EVENT_TOPIC]
        },
      ],
    };

    console.log('🔔 Subscribing to Purchase events...');
    this.ws.send(JSON.stringify(subscriptionMessage));
  }

  private async handleMessage(message: any): Promise<void> {
    try {
      // Handle subscription confirmation
      if (message.id === 1 && message.result) {
        this.subscriptionId = message.result;
        console.log(`✅ Subscribed to Purchase events with ID: ${this.subscriptionId}`);
        return;
      }

      // Handle purchase events
      if (message.method === 'eth_subscription') {
        console.log('🎉 Purchase event received!');
        console.log('📋 Event details:', JSON.stringify(message.params.result, null, 2));
        
        const logData = message.params.result;
        await this.processPurchaseLog(logData);
      }
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error);
    }
  }

  private async processPurchaseLog(logData: any): Promise<void> {
    try {
      console.log('🔍 Processing purchase log...');
      
      // Parse the log data according to Purchase event structure
      const purchaseEvent: PurchaseEvent = {
        transactionHash: logData.transactionHash,
        blockNumber: parseInt(logData.blockNumber, 16),
        logIndex: parseInt(logData.logIndex, 16),
        buyer: await this.cleanAddress(logData.topics[1]), // indexed parameter - clean padding
        seller: await this.cleanAddress(logData.topics[2]), // indexed parameter - clean padding
        nftContract: await this.cleanAddress(logData.topics[3]), // indexed parameter - clean padding
        tokenId: this.parseTokenIdFromData(logData.data),
        price: this.parsePriceFromData(logData.data),
        currency: await this.parseCurrencyFromData(logData.data)
      };

      console.log('📦 Parsed purchase:', {
        buyer: purchaseEvent.buyer,
        seller: purchaseEvent.seller,
        nftContract: purchaseEvent.nftContract,
        tokenId: purchaseEvent.tokenId,
        price: purchaseEvent.price
      });

      // Check if already processed (using composite key for bulk purchases)
      const existing = await prisma.salesEvent.findUnique({
        where: { 
          transactionHash_logIndex: {
            transactionHash: purchaseEvent.transactionHash,
            logIndex: purchaseEvent.logIndex
          }
        }
      });

      if (existing) {
        console.log('⚠️ Purchase already processed, skipping');
        return;
      }

      // Enrich with metadata and usernames
      await this.enrichAndStorePurchase(purchaseEvent);

    } catch (error) {
      console.error('❌ Error processing purchase log:', error);
    }
  }

  private async cleanAddress(paddedAddress: string): Promise<string> {
    // Remove padding zeros from topics to get clean address
    // topics are 64 characters (32 bytes), addresses are 40 characters (20 bytes)
    // Remove 0x prefix, take last 40 characters, add 0x back
    const cleaned = paddedAddress.slice(-40);
    const address = '0x' + cleaned;
    
    // Convert to EIP-55 checksum format for rip.fun API compatibility
    try {
      const { getAddress } = await import('viem');
      return getAddress(address);
    } catch (error) {
      console.warn('Failed to convert to checksum address:', address, error);
      return address;
    }
  }

  private parseTokenIdFromData(data: string): string {
    // Remove 0x prefix and parse first 32 bytes as tokenId
    const cleanData = data.slice(2);
    const tokenIdHex = cleanData.slice(0, 64);
    return BigInt('0x' + tokenIdHex).toString();
  }

  private parsePriceFromData(data: string): string {
    // Parse second 32 bytes as price
    const cleanData = data.slice(2);
    const priceHex = cleanData.slice(64, 128);
    return BigInt('0x' + priceHex).toString();
  }

  private async parseCurrencyFromData(data: string): Promise<string> {
    // Parse third 32 bytes as currency address
    const cleanData = data.slice(2);
    const currencyHex = cleanData.slice(128, 192);
    // Remove padding zeros - take last 40 characters for address
    const address = '0x' + currencyHex.slice(-40);
    
    // Convert to EIP-55 checksum format
    try {
      const { getAddress } = await import('viem');
      return getAddress(address);
    } catch (error) {
      console.warn('Failed to convert currency to checksum address:', address, error);
      return address;
    }
  }

  private async enrichAndStorePurchase(event: PurchaseEvent): Promise<void> {
    try {
      console.log('🎨 Enriching purchase with metadata...');

      // Get usernames and enhanced card metadata in parallel
      const [usernames, enrichedCardData] = await Promise.all([
        this.enrichWithUsernames(event.buyer, event.seller),
        this.getEnhancedCardMetadata(event.tokenId)
      ]);

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
          
          // Enhanced card metadata from auto-enriching service
          cardName: enrichedCardData?.cardName || null,
          cardImage: enrichedCardData?.cardImage || null,
          cardUniqueId: enrichedCardData?.cardUniqueId || null,
          // cardId: enrichedCardData?.cardId || null, // TODO: Add to schema if needed
          cardRarity: enrichedCardData?.cardRarity || null,
          cardSet: enrichedCardData?.cardSet || null,
          packetId: null, // Will be populated if available in enriched data
          
          // Usernames
          buyerUsername: usernames.buyerUsername,
          sellerUsername: usernames.sellerUsername
        }
      });

      console.log('💾 Purchase stored in database:', salesEvent.id);

      // Log enrichment details
      if (enrichedCardData?.enrichmentSource) {
        console.log(`🎨 Enrichment source: ${enrichedCardData.enrichmentSource}`);
        if (enrichedCardData.setDownloaded) {
          console.log(`📥 Downloaded new set for this card!`);
        }
      }

      // Card data is already enriched by AutoEnrichingSalesService
      // No additional enrichment needed

      // Create enriched event for subscribers
      const enrichedEvent: SalesEvent = {
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
        card: enrichedCard ? {
          // Enriched data (matches extract/trade format)
          id: enrichedCard.id,
          name: enrichedCard.name,
          card_number: enrichedCard.card_number,
          rarity: enrichedCard.rarity,
          set_id: enrichedCard.set_id,
          large_image_url: enrichedCard.large_image_url,
          small_image_url: enrichedCard.small_image_url,
          uniqueId: enrichedCard.uniqueId,
          tokenId: enrichedCard.tokenId,
          // Backward compatibility
          image: enrichedCard.image,
          set: enrichedCard.set_name
        } : {
          // Fallback to original data
          name: salesEvent.cardName || undefined,
          image: salesEvent.cardImage || undefined,
          rarity: salesEvent.cardRarity || undefined,
          set: salesEvent.cardSet || undefined,
          uniqueId: salesEvent.cardUniqueId || undefined,
          tokenId: salesEvent.tokenId
        },
        price: {
          wei: salesEvent.price,
          currency: salesEvent.currency,
          formatted: this.formatPrice(salesEvent.price, salesEvent.currency)
        },
        timestamp: salesEvent.timestamp.toISOString()
      };

      // Broadcast to all subscribers
      this.broadcastToSubscribers(enrichedEvent);

    } catch (error) {
      console.error('❌ Error enriching purchase:', error);
    }
  }

  private async enrichWithUsernames(buyerAddress: string, sellerAddress: string): Promise<{
    buyerUsername: string | null;
    sellerUsername: string | null;
  }> {
    try {
      // First check database for existing users
      const [buyer, seller] = await Promise.all([
        prisma.ripUser.findFirst({
          where: { 
            addresses: { 
              some: { address: buyerAddress.toLowerCase() } 
            } 
          },
          select: { username: true }
        }),
        prisma.ripUser.findFirst({
          where: { 
            addresses: { 
              some: { address: sellerAddress.toLowerCase() } 
            } 
          },
          select: { username: true }
        })
      ]);

      // For addresses not in database, try real-time API lookup
      const promises: Promise<string | null>[] = [];
      
      if (!buyer) {
        console.log(`🔍 Buyer address ${buyerAddress} not in database, trying real-time lookup...`);
        promises.push(this.discoverAndStoreUser(buyerAddress));
      } else {
        promises.push(Promise.resolve(buyer.username));
      }

      if (!seller) {
        console.log(`🔍 Seller address ${sellerAddress} not in database, trying real-time lookup...`);
        promises.push(this.discoverAndStoreUser(sellerAddress));
      } else {
        promises.push(Promise.resolve(seller.username));
      }

      const [buyerUsername, sellerUsername] = await Promise.all(promises);

      return {
        buyerUsername,
        sellerUsername
      };
    } catch (error) {
      console.error('❌ Error enriching with usernames:', error);
      return {
        buyerUsername: null,
        sellerUsername: null
      };
    }
  }

  /**
   * Discovers user data from rip.fun API and stores in database
   */
  private async discoverAndStoreUser(address: string): Promise<string | null> {
    try {
      const addressKey = address.toLowerCase();
      
      // Check negative cache first
      const cachedTime = this.negativeCache.get(addressKey);
      if (cachedTime && (Date.now() - cachedTime < this.negativeCacheTimeout)) {
        console.log(`⚡ Address ${address} in negative cache, skipping API call`);
        return null;
      }

      // Convert to EIP-55 checksum format for rip.fun API compatibility
      let checksumAddress = address;
      try {
        const { getAddress } = await import('viem');
        checksumAddress = getAddress(address);
        console.log(`🔎 Looking up user data for address ${checksumAddress}...`);
      } catch (error) {
        console.warn('Failed to convert to checksum address:', address, error);
        console.log(`🔎 Looking up user data for address ${address} (no checksum)...`);
      }
      
      // Rate limiting: ensure minimum delay between API calls
      const timeSinceLastCall = Date.now() - this.lastApiCall;
      if (timeSinceLastCall < this.apiCallDelay) {
        const waitTime = this.apiCallDelay - timeSinceLastCall;
        console.log(`⏱️ Rate limiting: waiting ${waitTime}ms before API call`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      this.lastApiCall = Date.now();
      
      // Call rip.fun API to get user data with checksum address
      const userData = await userSyncService.fetchRipFunUserByAddress(checksumAddress);
      
      if (userData && userData.id && userData.username) {
        console.log(`✅ Found user ${userData.username} for address ${address}`);
        
        // Store user data in database
        try {
          await prisma.ripUser.upsert({
            where: { id: userData.id },
            create: {
              id: userData.id,
              username: userData.username,
              smartWalletAddress: userData.smart_wallet_address || null,
              ownerWalletAddress: userData.owner_wallet_address || null,
              avatar: userData.avatar || null,
              banner: userData.banner || null,
              type: userData.type || null
            },
            update: {
              username: userData.username,
              smartWalletAddress: userData.smart_wallet_address || null,
              ownerWalletAddress: userData.owner_wallet_address || null,
              avatar: userData.avatar || null,
              banner: userData.banner || null,
              type: userData.type || null,
              updatedAt: new Date()
            }
          });

          // Create address mapping
          await prisma.ripUserAddress.upsert({
            where: { 
              address_ripUserId: { 
                address: address.toLowerCase(), 
                ripUserId: userData.id 
              }
            },
            create: {
              address: address.toLowerCase(),
              ripUserId: userData.id,
              blockNumber: BigInt(0) // Will be updated later if needed
            },
            update: {
              // Keep existing data
            }
          });

          console.log(`💾 Stored user ${userData.username} and address mapping in database`);
          return userData.username;
          
        } catch (dbError) {
          console.error(`❌ Error storing user data for ${address}:`, dbError);
          // Return the username even if storage failed
          return userData.username;
        }
      } else {
        console.log(`❌ No user found for address ${address}, adding to negative cache`);
        // Add to negative cache to avoid repeated API calls
        this.negativeCache.set(addressKey, Date.now());
        return null;
      }
    } catch (error) {
      console.error(`❌ Error discovering user for address ${address}:`, error);
      
      // Add to negative cache on API errors to avoid immediate retries
      if (error instanceof Error && 
          (error.message.includes('404') || 
           error.message.includes('timeout') || 
           error.message.includes('network'))) {
        console.log(`📝 Adding ${address} to negative cache due to API error`);
        this.negativeCache.set(addressKey, Date.now());
      }
      
      return null;
    }
  }

  /**
   * Enhanced card metadata using auto-enriching service
   */
  private async getEnhancedCardMetadata(tokenId: string): Promise<any> {
    try {
      console.log(`🎯 Getting enhanced card metadata for token ${tokenId}...`);
      
      // Get raw onchain metadata first
      const onchainMetadata = await this.getRawOnchainMetadata(tokenId);
      
      if (!onchainMetadata) {
        console.log(`❌ No onchain metadata found for token ${tokenId}`);
        return null;
      }
      
      // Use direct enrichment with auto-downloading
      const enrichedData = await this.enrichWithAutoDownload(onchainMetadata);
      
      console.log(`✅ Enhanced metadata for ${tokenId}:`, {
        name: enrichedData?.cardName,
        set: enrichedData?.cardSet,
        rarity: enrichedData?.cardRarity,
        source: enrichedData?.enrichmentSource
      });
      
      return enrichedData;
      
    } catch (error) {
      console.error(`❌ Error getting enhanced metadata for token ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Enrich with auto-downloading capability
   * Handles both URL-fetched rich data and direct JSON limited data
   */
  private async enrichWithAutoDownload(onchainMetadata: any): Promise<any> {
    try {
      // Determine metadata type and quality
      const isRichMetadata = this.hasRichMetadata(onchainMetadata);
      console.log(`📋 Metadata type: ${isRichMetadata ? 'RICH (URL-fetched)' : 'LIMITED (direct JSON)'}`);
      
      // Extract identifiers from onchain metadata
      const identifiers = this.extractIdentifiers(onchainMetadata);
      console.log(`📋 Extracted identifiers:`, identifiers);
      
      // For LIMITED metadata (Scenario 2), prioritize database reconciliation
      if (!isRichMetadata) {
        console.log(`🔍 LIMITED metadata detected - prioritizing database reconciliation`);
        const dbEnrichedData = await this.attemptDatabaseReconciliation(onchainMetadata, identifiers);
        if (dbEnrichedData) {
          return dbEnrichedData;
        }
      }
      
      // Check if we have this collection in our database
      let hasCollection = await this.checkCollectionAvailability(identifiers.collectionName);
      let setDownloaded = false;
      
      // If collection missing, try to download it
      if (!hasCollection && identifiers.collectionName) {
        const setId = this.mapCollectionToSetId(identifiers.collectionName);
        if (setId) {
          console.log(`📥 Collection missing, attempting to download set: ${setId}`);
          setDownloaded = await this.downloadSetIfNeeded(setId);
          
          if (setDownloaded) {
            hasCollection = await this.checkCollectionAvailability(identifiers.collectionName);
            console.log(`🔄 Post-download availability: ${hasCollection}`);
          }
        }
      }
      
      // Try database lookup if we have the collection
      if (hasCollection) {
        let dbCard = null;
        
        // For new format, try card_id lookup
        if (identifiers.cardId) {
          console.log(`🗄️ Looking up card_id: ${identifiers.cardId}`);
          dbCard = await this.lookupCardById(identifiers.cardId);
        }
        
        // For legacy format or if card_id lookup failed, try name + set lookup
        if (!dbCard && onchainMetadata.name && identifiers.setName) {
          console.log(`🔍 Searching by name: ${onchainMetadata.name}, set: ${identifiers.setName}`);
          dbCard = await this.lookupCardByNameAndSet(onchainMetadata.name, identifiers.setName);
        }
        
        if (dbCard) {
          console.log(`✅ Found in database: ${dbCard.name}`);
          return this.createEnrichedDataFromDB(dbCard, identifiers, onchainMetadata, setDownloaded);
        }
      }
      
      // Fallback to onchain data
      console.log(`📦 Using onchain data only`);
      return this.createEnrichedDataFromOnchain(identifiers, onchainMetadata);
      
    } catch (error) {
      console.error('❌ Auto-enrichment failed:', error);
      return this.createFallbackData(onchainMetadata);
    }
  }

  /**
   * Check if metadata is rich (URL-fetched) or limited (direct JSON)
   */
  private hasRichMetadata(metadata: any): boolean {
    // Rich metadata typically has more fields and structured data
    return !!(metadata.attributes && Array.isArray(metadata.attributes)) ||
           !!(metadata.collection_name && metadata.image) ||
           !!(metadata.description && metadata.external_url);
  }

  /**
   * Attempt database reconciliation for limited metadata (Scenario 2)
   * This is crucial for direct JSON tokens that lack rich data
   */
  private async attemptDatabaseReconciliation(onchainMetadata: any, identifiers: any): Promise<any | null> {
    try {
      console.log(`🔍 Attempting database reconciliation for limited metadata`);
      
      // Multiple lookup strategies for limited data
      let dbCard = null;
      
      // Strategy 1: Exact name + set match
      if (onchainMetadata.name && identifiers.setName) {
        console.log(`🎯 Strategy 1: Exact name + set lookup`);
        dbCard = await this.lookupCardByNameAndSet(onchainMetadata.name, identifiers.setName);
      }
      
      // Strategy 2: Name-only search across all sets (if set lookup failed)
      if (!dbCard && onchainMetadata.name) {
        console.log(`🎯 Strategy 2: Name-only search across all sets`);
        dbCard = await this.lookupCardByNameOnly(onchainMetadata.name);
      }
      
      // Strategy 3: Unique ID lookup (if available)
      if (!dbCard && onchainMetadata.unique_id) {
        console.log(`🎯 Strategy 3: Unique ID search`);
        // This would require adding unique_id to our database schema
        // For now, skip this strategy
      }
      
      if (dbCard) {
        console.log(`✅ Database reconciliation successful: ${dbCard.name} (${dbCard.setName})`);
        return this.createEnrichedDataFromDB(dbCard, identifiers, onchainMetadata, false);
      }
      
      console.log(`❌ Database reconciliation failed - no matches found`);
      return null;
      
    } catch (error) {
      console.error('❌ Database reconciliation error:', error);
      return null;
    }
  }

  private extractIdentifiers(metadata: any) {
    // Handle new format (with attributes array)
    if (metadata.attributes && Array.isArray(metadata.attributes)) {
      const attributesMap = new Map();
      metadata.attributes.forEach((attr: any) => {
        if (attr.trait_type && attr.value !== undefined) {
          attributesMap.set(attr.trait_type, attr.value);
        }
      });

      return {
        cardId: attributesMap.get('Card Id') || null,
        serialNumber: attributesMap.get('Serial Number') || null,
        collectionName: metadata.collection_name,
        setName: attributesMap.get('Set') || null,
        rarity: attributesMap.get('Rarity') || null,
        isLegacyFormat: false
      };
    }
    
    // Handle legacy format (direct fields)
    else {
      console.log('📄 Detected legacy metadata format');
      return {
        cardId: null, // Legacy format doesn't have card_id
        serialNumber: metadata.unique_id || null,
        collectionName: metadata.set || null, // Use set as collection for legacy
        setName: metadata.set || null,
        rarity: metadata.rarity || null,
        isLegacyFormat: true
      };
    }
  }

  private async checkCollectionAvailability(collectionName: string): Promise<boolean> {
    if (!collectionName) return false;
    
    try {
      const collectionToSetMap: Record<string, string[]> = {
        '151': ['151', 'sv3pt5'],
        'Paldean Fates': ['Paldean Fates', 'sv4pt5'],
        'Obsidian Flames': ['Obsidian Flames', 'sv3'],
        'Paradox Rift': ['Paradox Rift', 'sv4'],
        'Temporal Forces': ['Temporal Forces', 'sv5'],
        'Twilight Masquerade': ['Twilight Masquerade', 'sv6'],
        'Shrouded Fable': ['Shrouded Fable', 'sv7'],
        'Stellar Crown': ['Stellar Crown', 'sv8'],
        'Surging Sparks': ['Surging Sparks', 'sv8pt5'],
        'Prismatic Evolutions': ['Prismatic Evolutions', 'sv9'],
        // Legacy format compatibility
        'sv9': ['Prismatic Evolutions', 'sv9'],
        'Base Set': ['Base Set', 'base1'],
        'Jungle': ['Jungle', 'jungle'],
        'Fossil': ['Fossil', 'fossil']
      };

      const possibleSetNames = collectionToSetMap[collectionName] || [collectionName];
      
      const cardCount = await prisma.card.count({
        where: {
          OR: [
            { setName: { in: possibleSetNames } },
            { setId: { in: possibleSetNames } }
          ]
        }
      });

      return cardCount > 0;
    } catch (error) {
      console.error(`Error checking collection availability:`, error);
      return false;
    }
  }

  private mapCollectionToSetId(collectionName: string): string | null {
    const collectionToSetMap: Record<string, string> = {
      '151': 'sv3pt5',
      'Paldean Fates': 'sv4pt5',
      'Obsidian Flames': 'sv3',
      'Paradox Rift': 'sv4',
      'Temporal Forces': 'sv5',
      'Twilight Masquerade': 'sv6',
      'Shrouded Fable': 'sv7',
      'Stellar Crown': 'sv8',
      'Surging Sparks': 'sv8pt5',
      'Prismatic Evolutions': 'sv9',
      'Base Set': 'base1',
      'Jungle': 'jungle',
      'Fossil': 'fossil'
    };
    
    return collectionToSetMap[collectionName] || null;
  }

  private async downloadSetIfNeeded(setId: string): Promise<boolean> {
    try {
      console.log(`📥 Downloading set: ${setId}`);
      const cardCount = await cardSyncService.syncSet(setId);
      
      if (cardCount > 0) {
        console.log(`✅ Successfully downloaded ${cardCount} cards from ${setId}`);
        return true;
      } else {
        console.log(`⚠️ No cards downloaded from ${setId}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Failed to download set ${setId}:`, error);
      return false;
    }
  }

  private async lookupCardById(cardId: string) {
    try {
      return await prisma.card.findUnique({
        where: { id: cardId }
      });
    } catch (error) {
      console.error(`Error looking up card ${cardId}:`, error);
      return null;
    }
  }

  private async lookupCardByNameAndSet(cardName: string, setName: string) {
    try {
      return await prisma.card.findFirst({
        where: {
          name: { contains: cardName },
          OR: [
            { setName: { contains: setName } },
            { setId: { contains: setName } }
          ]
        }
      });
    } catch (error) {
      console.error(`Error looking up card by name and set:`, error);
      return null;
    }
  }

  private async lookupCardByNameOnly(cardName: string) {
    try {
      return await prisma.card.findFirst({
        where: {
          name: { contains: cardName }
        },
        orderBy: [
          // Prefer exact matches
          { name: 'asc' }
        ]
      });
    } catch (error) {
      console.error(`Error looking up card by name only:`, error);
      return null;
    }
  }

  private createEnrichedDataFromDB(dbCard: any, identifiers: any, metadata: any, setDownloaded: boolean) {
    const onchainImageUrl = metadata.image 
      ? `https://d2hl7maqck52px.cloudfront.net/${metadata.image}`
      : null;

    return {
      cardName: dbCard.name,
      cardImage: dbCard.largeImageUrl || onchainImageUrl,
      cardUniqueId: identifiers.serialNumber,
      cardId: identifiers.cardId,
      cardRarity: dbCard.rarity,
      cardSet: dbCard.setName,
      enrichmentSource: setDownloaded ? 'database_after_download' : 'database'
    };
  }

  private createEnrichedDataFromOnchain(identifiers: any, metadata: any) {
    const imageUrl = metadata.image 
      ? `https://d2hl7maqck52px.cloudfront.net/${metadata.image}`
      : null;

    return {
      cardName: metadata.name,
      cardImage: imageUrl,
      cardUniqueId: identifiers.serialNumber,
      cardId: identifiers.cardId,
      cardRarity: identifiers.rarity,
      cardSet: identifiers.setName,
      enrichmentSource: 'onchain'
    };
  }

  private createFallbackData(metadata: any) {
    return {
      cardName: metadata.name || 'Unknown Card',
      cardImage: null,
      cardUniqueId: null,
      cardId: null,
      cardRarity: null,
      cardSet: metadata.collection_name || null,
      enrichmentSource: 'fallback'
    };
  }

  /**
   * Get raw onchain metadata (original method)
   */
  private async getRawOnchainMetadata(tokenId: string): Promise<any> {
    try {
      console.log(`🎨 Fetching card metadata for token ${tokenId}...`);
      
      // Create a viem client for reading the NFT contract
      const { createPublicClient, http } = await import('viem');
      const { base } = await import('viem/chains');
      
      const client = createPublicClient({
        chain: base,
        transport: http(`https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`)
      });
      
      // Call tokenURI function on NFT contract
      const tokenURI = await client.readContract({
        address: NFT_CONTRACT_ADDRESS as `0x${string}`,
        abi: [
          {
            inputs: [{ name: 'tokenId', type: 'uint256' }],
            name: 'tokenURI',
            outputs: [{ name: '', type: 'string' }],
            stateMutability: 'view',
            type: 'function'
          }
        ],
        functionName: 'tokenURI',
        args: [BigInt(tokenId)]
      });
      
      console.log(`📋 Token URI for ${tokenId}:`, tokenURI);
      
      if (tokenURI) {
        try {
          // Handle URL-based metadata (older tokens)
          if (typeof tokenURI === 'string' && tokenURI.startsWith('http')) {
            console.log(`🔗 Token ${tokenId} returns URL, fetching: ${tokenURI}`);
            try {
              const response = await fetch(tokenURI);
              if (response.ok) {
                const metadata = await response.json();
                console.log(`✅ Fetched metadata from URL for ${tokenId}:`, metadata);
                return metadata;
              } else {
                console.log(`❌ Failed to fetch URL: ${response.status}`);
                return null;
              }
            } catch (fetchError) {
              console.error(`❌ Error fetching URL:`, fetchError.message);
              return null;
            }
          }
          
          // Handle direct JSON metadata (newer tokens) - LIMITED DATA
          const metadata = JSON.parse(tokenURI as string);
          console.log(`✅ Raw onchain metadata for ${tokenId}:`, metadata);
          console.log(`⚠️ Direct JSON detected - limited data, will reconcile with database`);
          
          // Return raw metadata for enrichment process
          // The enrichWithAutoDownload will handle database reconciliation
          return metadata;
        } catch (parseError) {
          console.error(`❌ Error parsing tokenURI JSON for ${tokenId}:`, parseError);
        }
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error fetching card metadata for token ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Transform onchain metadata to our expected format
   * Parses the attributes array to extract card information
   */
  private transformOnchainMetadata(onchainMetadata: any): any {
    try {
      // Extract attributes into a map for easier access
      const attributesMap = new Map();
      if (onchainMetadata.attributes && Array.isArray(onchainMetadata.attributes)) {
        onchainMetadata.attributes.forEach((attr: any) => {
          if (attr.trait_type && attr.value !== undefined) {
            attributesMap.set(attr.trait_type, attr.value);
          }
        });
      }

      // Extract the card ID from attributes (e.g., "sv3pt5-104")
      const cardId = attributesMap.get('Card Id');
      const serialNumber = attributesMap.get('Serial Number'); // e.g., "CARD-RIP2CDF287728A0"
      const setName = attributesMap.get('Set'); // e.g., "151"
      const series = attributesMap.get('Series'); // e.g., "Scarlet & Violet"
      
      // Build full image URL
      const imageUrl = onchainMetadata.image 
        ? `https://d2hl7maqck52px.cloudfront.net/${onchainMetadata.image}`
        : null;

      return {
        // Basic card info
        name: onchainMetadata.name || 'Unknown Card',
        image: imageUrl,
        unique_id: serialNumber,
        
        // Card details from attributes
        card_id: cardId, // This is the key for rip.fun compatibility!
        set: setName,
        series: series,
        collection_name: onchainMetadata.collection_name,
        
        // Token info
        token_id: onchainMetadata.token_info?.token_id,
        
        // Additional metadata
        description: onchainMetadata.description,
        external_url: onchainMetadata.external_url,
        
        // Reveal state
        is_revealed: onchainMetadata.reveal_state?.is_revealed || false,
        revealed_at: onchainMetadata.reveal_state?.revealed_at,
        
        // Raw attributes for debugging
        _raw_attributes: onchainMetadata.attributes
      };
    } catch (error) {
      console.error('Error transforming onchain metadata:', error);
      return {
        name: onchainMetadata.name || 'Unknown Card',
        image: onchainMetadata.image,
        unique_id: null,
        _error: 'Failed to parse attributes'
      };
    }
  }

  private formatPrice(priceWei: string, currency: string): string {
    try {
      const price = BigInt(priceWei);
      
      // Common currency addresses on Base
      const USDC_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
      const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

      if (currency.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
        const usdcAmount = Number(price) / 1e6;
        return `$${usdcAmount.toFixed(2)}`;
      } else if (currency.toLowerCase() === ETH_ADDRESS.toLowerCase()) {
        const ethAmount = Number(price) / 1e18;
        return `${ethAmount.toFixed(4)} ETH`;
      } else {
        return `${price.toString()} wei`;
      }
    } catch (error) {
      console.error('❌ Error formatting price:', error);
      return `${priceWei} wei`;
    }
  }

  private broadcastToSubscribers(event: EnrichedSalesEvent): void {
    console.log(`📢 Broadcasting to ${this.subscribers.size} subscribers`);
    
    for (const subscriber of this.subscribers) {
      try {
        subscriber(event);
      } catch (error) {
        console.error('❌ Error calling subscriber:', error);
      }
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    
    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect().catch(error => {
          console.error('❌ Reconnection failed:', error);
        });
        
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      }
    }, this.reconnectDelay);
  }
}

// Export singleton instance
export const salesMonitor = new SalesMonitorService();