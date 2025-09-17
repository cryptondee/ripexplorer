/**
 * Token Metadata Service
 * Handles fetching and processing NFT token metadata from blockchain
 * Extracted from salesMonitor.ts for better separation of concerns
 */

import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { logger } from '$lib/utils/logger.js';

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const NFT_CONTRACT_ADDRESS = '0xF4710eE68f151B6CB0c377400738c0De9B39284f';

export interface TokenMetadata {
  name?: string;
  collection_name?: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
  rarity?: string;
  set?: string;
  unique_id?: string;
  description?: string;
  external_url?: string;
}

export class TokenMetadataService {
  private static instance: TokenMetadataService;
  private client: any;

  private constructor() {
    this.client = createPublicClient({
      chain: base,
      transport: http(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`)
    });
  }

  static getInstance(): TokenMetadataService {
    if (!TokenMetadataService.instance) {
      TokenMetadataService.instance = new TokenMetadataService();
    }
    return TokenMetadataService.instance;
  }

  /**
   * Get token metadata - handles both URL and direct JSON scenarios
   */
  async getTokenMetadata(tokenId: string): Promise<TokenMetadata | null> {
    try {
      logger.log(`🎨 Fetching metadata for token ${tokenId}...`);
      
      // Get tokenURI from contract
      const tokenURI = await this.client.readContract({
        address: NFT_CONTRACT_ADDRESS,
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
      
      if (!tokenURI) {
        logger.log(`❌ No tokenURI found for token ${tokenId}`);
        return null;
      }

      logger.log(`📋 TokenURI for ${tokenId}: ${tokenURI}`);
      
      // Handle URL-based metadata (Scenario 1)
      if (typeof tokenURI === 'string' && tokenURI.startsWith('http')) {
        return await this.fetchMetadataFromUrl(tokenURI, tokenId);
      }
      
      // Handle direct JSON metadata (Scenario 2)
      return this.parseDirectJsonMetadata(tokenURI, tokenId);
      
    } catch (error) {
      logger.error(`❌ Error fetching metadata for token ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Fetch metadata from URL (Scenario 1 - Rich metadata)
   */
  private async fetchMetadataFromUrl(url: string, tokenId: string): Promise<TokenMetadata | null> {
    try {
      logger.log(`🔗 Fetching metadata from URL for token ${tokenId}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        logger.log(`❌ Failed to fetch URL: ${response.status}`);
        return null;
      }
      
      const metadata = await response.json();
      logger.log(`✅ Successfully fetched rich metadata for token ${tokenId}`);
      return metadata;
      
    } catch (error) {
      logger.error(`❌ Error fetching metadata from URL:`, error);
      return null;
    }
  }

  /**
   * Parse direct JSON metadata (Scenario 2 - Limited metadata)
   */
  private parseDirectJsonMetadata(tokenURI: string, tokenId: string): TokenMetadata | null {
    try {
      const metadata = JSON.parse(tokenURI);
      logger.log(`✅ Parsed direct JSON metadata for token ${tokenId}`);
      logger.log(`⚠️ Limited metadata detected - will need database reconciliation`);
      return metadata;
      
    } catch (error) {
      logger.error(`❌ Error parsing direct JSON metadata:`, error);
      return null;
    }
  }

  /**
   * Check if metadata is rich (URL-fetched) or limited (direct JSON)
   */
  isRichMetadata(metadata: TokenMetadata): boolean {
    return !!(metadata.attributes && Array.isArray(metadata.attributes)) ||
           !!(metadata.collection_name && metadata.image) ||
           !!(metadata.description && metadata.external_url);
  }
}

// Export singleton instance
export const tokenMetadataService = TokenMetadataService.getInstance();
