/**
 * Sales Service
 * Handles all sales-related API calls and business logic
 */

import { logger } from '$lib/utils/logger';

export interface SalesFilters {
  timeframe: string;
  cardSet: string | null;
  rarity: string | null;
  minPrice: number | null;
  maxPrice: number | null;
}

export interface SalesMonitorStatus {
  connected: boolean;
  subscribers: number;
}

export interface HistoricalSalesParams {
  filters?: SalesFilters;
  page?: number;
  limit?: number;
}

export class SalesService {
  /**
   * Check sales monitor connection status
   */
  async checkMonitorStatus(): Promise<SalesMonitorStatus> {
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.status;
      }
      
      throw new Error(data.error || 'Failed to check monitor status');
    } catch (error) {
      logger.error('Error checking monitor status:', error);
      return { connected: false, subscribers: 0 };
    }
  }
  
  /**
   * Load historical sales data with filters and pagination
   */
  async loadHistoricalSales(params: HistoricalSalesParams = {}): Promise<any> {
    const {
      filters = {
        timeframe: '24h',
        cardSet: null,
        rarity: null,
        minPrice: null,
        maxPrice: null
      },
      page = 1,
      limit = 20
    } = params;
    
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'query',
          filters,
          page,
          limit
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        return {
          sales: data.sales || [],
          totalSales: data.total || 0,
          currentPage: data.page || page,
          totalPages: data.totalPages || 0
        };
      }
      
      throw new Error(data.error || 'Failed to load sales data');
    } catch (error) {
      logger.error('Error loading historical sales:', error);
      throw error;
    }
  }
  
  /**
   * Get sales statistics for a given timeframe
   */
  async getSalesStats(timeframe: string = '24h'): Promise<any> {
    try {
      const response = await fetch('/api/sales/stats', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.stats;
      }
      
      throw new Error(data.error || 'Failed to load sales statistics');
    } catch (error) {
      logger.error('Error loading sales stats:', error);
      throw error;
    }
  }
  
  /**
   * Format sales data for export
   */
  formatSalesForExport(sales: any[]): string {
    const headers = ['Date', 'Card Name', 'Set', 'Rarity', 'Buyer', 'Seller', 'Price', 'Transaction'];
    const rows = sales.map(sale => [
      new Date(sale.timestamp).toLocaleString(),
      sale.card?.name || 'Unknown',
      sale.card?.set?.name || 'Unknown',
      sale.card?.rarity || '',
      sale.buyer?.username || sale.buyer?.address || '',
      sale.seller?.username || sale.seller?.address || '',
      sale.price?.formatted || sale.price?.wei || '',
      sale.transactionHash || ''
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csv;
  }
}

// Export singleton instance
export const salesService = new SalesService();
