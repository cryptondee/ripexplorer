import { createPublicClient, http, getAddress, type PublicClient } from 'viem';
import { base } from 'viem/chains';

// Configuration for Alchemy
const config = {
  apiKey: process.env.ALCHEMY_API_KEY || '',
};

// Contract addresses
const RIP_CONTRACT_ADDRESS = '0xeBeA10BCd609d3F6fb2Ea104baB638396C037388';
const RIP_NFT_CONTRACT_ADDRESS = '0x6292bf78996e189bAd8f9CF3e3Cb31017bb70540';

export interface NFTTransfer {
  from: string;
  to: string;
  tokenId: string;
  blockNumber: number;
  transactionHash: string;
}

export class AlchemyService {
  private client: PublicClient;

  constructor() {
    // Create Viem client for better asset transfer handling
    this.client = createPublicClient({
      chain: base,
      transport: http(`https://base-mainnet.g.alchemy.com/v2/${config.apiKey}`)
    });
  }

  /**
   * Get all addresses that received NFTs from the rip.fun contract
   * Uses Viem with proper pagination to get complete results
   */
  async getRipFunNFTRecipients(fromBlock?: number, toBlock?: number | 'latest'): Promise<Map<string, number>> {
    try {
      if (!config.apiKey) {
        throw new Error('Alchemy API key not configured');
      }

      // Determine block range
      const latestBlock = toBlock === 'latest' ? await this.getLatestBlockNumber() : (toBlock || await this.getLatestBlockNumber());
      const startBlock = fromBlock || 0;
      
      console.log(`Fetching NFT transfers from rip.fun contract from block ${startBlock} to ${latestBlock} with pagination...`);

      // Collect all transfers with pagination (Alchemy pageKey)
      let allTransfers: any[] = [];
      let pageKey: string | undefined;

      const baseParams = {
        fromBlock: `0x${startBlock.toString(16)}`,
        toBlock: toBlock === 'latest' ? 'latest' : `0x${latestBlock.toString(16)}`,
        fromAddress: RIP_CONTRACT_ADDRESS,
        contractAddresses: [RIP_NFT_CONTRACT_ADDRESS],
        category: ['erc721', 'erc1155'],
        withMetadata: false,
        maxCount: '0x3e8', // 1000 transfers per page
        excludeZeroValue: true
      } as const;

      let pageCount = 0;
      do {
        pageCount++;
        console.log(`Fetching page ${pageCount} of asset transfers...`);

        const params: any = { ...baseParams };
        if (pageKey) params.pageKey = pageKey;

        const pageResult = (await this.client.request({
          method: 'alchemy_getAssetTransfers',
          params: [params]
        })) as { transfers?: any[]; pageKey?: string };

        if (pageResult?.transfers) {
          allTransfers.push(...pageResult.transfers);
          console.log(`Page ${pageCount}: Found ${pageResult.transfers.length} transfers (Total: ${allTransfers.length})`);
        } else {
          console.log(`Page ${pageCount}: No transfers found`);
        }

        pageKey = pageResult?.pageKey;
      } while (pageKey);

      console.log(`Completed pagination: ${allTransfers.length} total transfers across ${pageCount} pages`);

      // Count transfers per recipient address
      const counts = new Map<string, number>();
      for (const tx of allTransfers) {
        const to = (tx as any).to as string | undefined;
        if (!to || to === '0x0000000000000000000000000000000000000000') continue;
        
        try {
          const checksum = getAddress(to);
          counts.set(checksum, (counts.get(checksum) || 0) + 1);
        } catch {
          // Invalid address, ignore
          console.warn(`Invalid address found: ${to}`);
        }
      }

      console.log(`Found ${counts.size} unique recipient addresses`);
      return counts;

    } catch (error) {
      console.error('Error fetching NFT recipients:', error);
      throw new Error(`Failed to fetch NFT recipient data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get unique addresses that received NFTs from rip.fun
   * Returns just the addresses (not the counts)
   */
  async getUniqueBuyerAddresses(fromBlock?: number, toBlock?: number | 'latest'): Promise<string[]> {
    try {
      const recipientCounts = await this.getRipFunNFTRecipients(fromBlock, toBlock);
      const addresses = Array.from(recipientCounts.keys());
      
      console.log(`Returning ${addresses.length} unique buyer addresses from block range ${fromBlock || 0} to ${toBlock || 'latest'}`);
      return addresses;
      
    } catch (error) {
      console.error('Error getting unique buyer addresses:', error);
      throw new Error(`Failed to fetch buyer addresses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the latest block number
   */
  async getLatestBlockNumber(): Promise<number> {
    try {
      const blockNumber = await this.client.getBlockNumber();
      return Number(blockNumber);
    } catch (error) {
      console.error('Error fetching latest block number:', error);
      throw new Error(`Failed to fetch latest block: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get recipient addresses with their transfer counts
   * Useful for analytics or debugging
   */
  async getBuyerAddressesWithCounts(): Promise<{ address: string; count: number }[]> {
    try {
      const recipientCounts = await this.getRipFunNFTRecipients();
      
      return Array.from(recipientCounts.entries())
        .map(([address, count]) => ({ address, count }))
        .sort((a, b) => b.count - a.count); // Sort by count descending
        
    } catch (error) {
      console.error('Error getting buyer addresses with counts:', error);
      throw new Error(`Failed to fetch buyer address counts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const alchemyService = new AlchemyService();