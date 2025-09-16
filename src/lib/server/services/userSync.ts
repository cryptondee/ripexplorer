import { PrismaClient } from '@prisma/client';
import { alchemyService } from './alchemy.js';
import { getAddress } from 'viem';
import { EXTERNAL_URLS } from '$lib/constants/urls.js';
import { createRipFunFetchOptions } from '$lib/constants/http.js';
import { logger } from '$lib/utils/logger.js';

const prisma = new PrismaClient();

export interface RipFunUserData {
  smart_wallet_address: string;
  owner_wallet_address: string;
  username: string;
  type: string;
  id: number;
  avatar: string;
  banner: string;
}

export class UserSyncService {
  /**
   * Fetch user data from rip.fun API by address
   */
  async fetchRipFunUserByAddress(address: string): Promise<RipFunUserData | null> {
    try {
      // Convert to EIP-55 checksum format for rip.fun API compatibility
      let checksumAddress = address;
      try {
        checksumAddress = getAddress(address as `0x${string}`);
      } catch (error) {
        logger.warn('Failed to convert to checksum address:', address, error);
      }
      
      const apiUrl = EXTERNAL_URLS.RIP_FUN.API_AUTH(checksumAddress);
      const response = await fetch(apiUrl, createRipFunFetchOptions());

      if (!response.ok) {
        if (response.status === 404) {
          // User not found, this is normal
          return null;
        }
        throw new Error(`rip.fun API returned ${response.status}: ${response.statusText}`);
      }

      const userData: RipFunUserData = await response.json();
      return userData;

    } catch (error) {
      logger.error(`Error fetching user info for ${address}:`, error);
      return null;
    }
  }

  /**
   * Sync blockchain addresses with rip.fun user data
   */
  async syncUsersFromBlockchain(fromBlock?: number): Promise<{
    addressesProcessed: number;
    usersFound: number;
    usersUpdated: number;
    lastBlockNumber: number;
  }> {
    console.log('Starting user sync from blockchain data...');

    // Get current sync status
    let syncStatus = await prisma.syncStatus.findUnique({
      where: { syncType: 'blockchain_users' }
    });

    // Determine starting block
    const startBlock = fromBlock || (syncStatus?.lastBlockNumber ? Number(syncStatus.lastBlockNumber) : undefined);
    
    // Update sync status to running
    syncStatus = await prisma.syncStatus.upsert({
      where: { syncType: 'blockchain_users' },
      create: {
        syncType: 'blockchain_users',
        status: 'running',
        lastSyncAt: new Date()
      },
      update: {
        status: 'running',
        lastSyncAt: new Date(),
        errorMessage: null
      }
    });

    try {
      // Get latest block number for tracking
      const latestBlockNumber = await alchemyService.getLatestBlockNumber();
      
      // Fetch unique addresses from blockchain
      const addresses = await alchemyService.getUniqueBuyerAddresses(startBlock, 'latest');
      console.log(`Processing ${addresses.length} unique addresses...`);

      let usersFound = 0;
      let usersUpdated = 0;
      const batchSize = 10;

      // Process addresses in batches to avoid overwhelming APIs
      for (let i = 0; i < addresses.length; i += batchSize) {
        const batch = addresses.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(addresses.length / batchSize)}`);

        await Promise.all(batch.map(async (address) => {
          try {
            // Fetch user data from rip.fun
            const userData = await this.fetchRipFunUserByAddress(address);
            
            if (userData) {
              logger.log(`  Found user for ${address}: ${userData.username} (ID: ${userData.id})`);
            }
            
            if (userData && userData.id && userData.username) {
              usersFound++;
              
              // Upsert user data
              const user = await prisma.ripUser.upsert({
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

              // Create or update address mapping
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
                  blockNumber: BigInt(latestBlockNumber)
                },
                update: {
                  blockNumber: BigInt(latestBlockNumber)
                }
              });

              usersUpdated++;
            }

          } catch (error) {
            logger.error(`Error processing address ${address}:`, error);
          }
        }));

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update sync status to completed
      await prisma.syncStatus.update({
        where: { syncType: 'blockchain_users' },
        data: {
          status: 'completed',
          lastBlockNumber: BigInt(latestBlockNumber),
          lastSyncAt: new Date(),
          errorMessage: null
        }
      });

      const result = {
        addressesProcessed: addresses.length,
        usersFound,
        usersUpdated,
        lastBlockNumber: latestBlockNumber
      };

      console.log('User sync completed:', result);
      return result;

    } catch (error) {
      // Update sync status to error
      await prisma.syncStatus.update({
        where: { syncType: 'blockchain_users' },
        data: {
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          lastSyncAt: new Date()
        }
      });

      console.error('User sync failed:', error);
      throw error;
    }
  }

  /**
   * Get user ID by username
   */
  async getUserIdByUsername(username: string): Promise<number | null> {
    try {
      const user = await prisma.ripUser.findUnique({
        where: { username: username.toLowerCase() }
      });

      return user?.id || null;
    } catch (error) {
      logger.error(`Error finding user by username ${username}:`, error);
      return null;
    }
  }

  /**
   * Get user data by username
   */
  async getUserByUsername(username: string): Promise<any | null> {
    try {
      const user = await prisma.ripUser.findUnique({
        where: { username: username.toLowerCase() },
        include: {
          addresses: true
        }
      });

      return user;
    } catch (error) {
      logger.error(`Error finding user by username ${username}:`, error);
      return null;
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    return await prisma.syncStatus.findUnique({
      where: { syncType: 'blockchain_users' }
    });
  }

  /**
   * Search users by partial username
   */
  async searchUsers(query: string, limit: number = 10): Promise<any[]> {
    try {
      const users = await prisma.ripUser.findMany({
        where: {
          username: {
            contains: query.toLowerCase()
          }
        },
        take: limit,
        orderBy: {
          updatedAt: 'desc'
        },
        select: {
          id: true,
          username: true,
          avatar: true,
          type: true,
          updatedAt: true
        }
      });

      return users;
    } catch (error) {
      logger.error(`Error searching users with query ${query}:`, error);
      return [];
    }
  }
}

// Export singleton instance
export const userSyncService = new UserSyncService();