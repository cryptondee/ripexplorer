import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db/client.js';
import { salesMonitorService } from '$lib/server/services/index.js';
import { CURRENCY_ADDRESSES, CURRENCY_DECIMALS } from '$lib/constants/sales';
import { cardEnrichmentService } from '$lib/services/CardEnrichmentService.js';

// Helper function to parse timeframe
function getTimeframeDate(timeframe: string): Date {
  const now = new Date();
  
  switch (timeframe) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to 24h
  }
}

// Helper function to format price
function formatPrice(priceWei: string, currency: string): string {
  try {
    const price = BigInt(priceWei);
    
    if (currency.toLowerCase() === CURRENCY_ADDRESSES.USDC.toLowerCase()) {
      // USDC formatting
      const usdcAmount = Number(price) / Math.pow(10, CURRENCY_DECIMALS.USDC);
      return `$${usdcAmount.toFixed(2)}`;
    } else if (currency.toLowerCase() === CURRENCY_ADDRESSES.ETH.toLowerCase()) {
      // ETH formatting
      const ethAmount = Number(price) / Math.pow(10, CURRENCY_DECIMALS.ETH);
      return `${ethAmount.toFixed(4)} ETH`;
    } else {
      // Unknown currency, show raw Wei
      return `${price.toString()} wei`;
    }
  } catch (error) {
    console.error('Error formatting price:', error);
    return `${priceWei} wei`;
  }
}

export const GET: RequestHandler = async ({ url }) => {
  try {
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100); // Max 100 per request
    const timeframe = url.searchParams.get('timeframe') || '24h';
    const cardSet = url.searchParams.get('set');
    const rarity = url.searchParams.get('rarity');
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');

    // Build where clause
    const where: any = {};

    // Time filtering
    if (timeframe !== 'all') {
      where.timestamp = { gte: getTimeframeDate(timeframe) };
    }

    // Set filtering
    if (cardSet) {
      where.cardSet = { contains: cardSet };
    }

    // Rarity filtering
    if (rarity) {
      where.cardRarity = { equals: rarity };
    }

    // Price filtering (in Wei)
    if (minPrice || maxPrice) {
      const priceFilter: any = {};
      if (minPrice) {
        priceFilter.gte = (BigInt(parseFloat(minPrice) * 1e6)).toString(); // Assume USDC for now
      }
      if (maxPrice) {
        priceFilter.lte = (BigInt(parseFloat(maxPrice) * 1e6)).toString(); // Assume USDC for now
      }
      where.price = priceFilter;
    }

    // Get total count for pagination
    const total = await prisma.salesEvent.count({ where });

    // Get sales events with pagination
    const sales = await prisma.salesEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    // Enrich card data for uniform structure
    const enrichedSales = await Promise.all(sales.map(async (sale) => {
      // Enrich card data to match extract/trade format
      const enrichedCard = await cardEnrichmentService.enrichCardData({
        name: sale.cardName || undefined,
        uniqueId: sale.cardUniqueId || undefined,
        tokenId: sale.tokenId,
        rarity: sale.cardRarity || undefined,
        set: sale.cardSet || undefined,
        image: sale.cardImage || undefined,
        card_id: sale.cardId || undefined // Use the stored card_id from onchain metadata
      });

      return {
        id: sale.id,
        transactionHash: sale.transactionHash,
        blockNumber: sale.blockNumber.toString(),
        buyer: {
          address: sale.buyerAddress,
          username: sale.buyerUsername || undefined
        },
        seller: {
          address: sale.sellerAddress,
          username: sale.sellerUsername || undefined
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
          name: sale.cardName || undefined,
          image: sale.cardImage || undefined,
          rarity: sale.cardRarity || undefined,
          set: sale.cardSet || undefined,
          uniqueId: sale.cardUniqueId || undefined,
          tokenId: sale.tokenId
        },
        price: {
          wei: sale.price,
          currency: sale.currency,
          formatted: formatPrice(sale.price, sale.currency)
        },
        timestamp: sale.timestamp.toISOString()
      };
    }));

    return json({
      success: true,
      sales: enrichedSales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      filters: {
        timeframe,
        cardSet,
        rarity,
        minPrice,
        maxPrice
      }
    });

  } catch (error) {
    console.error('Error fetching sales data:', error);
    return json(
      {
        success: false,
        error: 'Failed to fetch sales data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'start') {
      // Start the sales monitor
      await salesMonitorService.startMonitoring();
      
      return json({
        success: true,
        message: 'Sales monitoring started',
        status: salesMonitorService.getStatus()
      });

    } else if (action === 'stop') {
      // Stop the sales monitor
      salesMonitorService.stopMonitoring();
      
      return json({
        success: true,
        message: 'Sales monitoring stopped',
        status: salesMonitorService.getStatus()
      });

    } else if (action === 'status') {
      // Get current status
      return json({
        success: true,
        status: salesMonitorService.getStatus()
      });

    } else {
      return json(
        {
          success: false,
          error: 'Invalid action. Use "start", "stop", or "status"'
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error handling sales monitor request:', error);
    return json(
      {
        success: false,
        error: 'Failed to handle request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};