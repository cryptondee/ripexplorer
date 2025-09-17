/**
 * TypeScript interfaces for sales system
 * Provides type safety across all sales-related components
 */

export interface SalesFilters {
  timeframe: '1h' | '24h' | '7d' | '30d' | 'all';
  cardSet: string | null;
  rarity: string | null;
  minPrice: string | null;
  maxPrice: string | null;
}

export interface SalesEvent {
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
    // Enriched card data (matches extract/trade format)
    id?: string;
    name?: string;
    card_number?: string;
    rarity?: string;
    set_id?: string;
    large_image_url?: string;
    small_image_url?: string;
    uniqueId?: string;
    tokenId: string;
    // Backward compatibility
    image?: string;
    set?: string;
  };
  price: {
    wei: string;
    currency: string;
    formatted?: string;
  };
  timestamp: string;
}

export interface EnrichedSalesEvent extends SalesEvent {
  card: SalesEvent['card'] & {
    metadata?: {
      name: string;
      image: string;
      rarity: string;
      set: string;
    };
  };
}

export interface ConnectionStatus {
  connected: boolean;
  subscribers: number;
}

export interface SalesStats {
  totalSales: number;
  totalVolume: string;
  averagePrice: string;
  uniqueBuyers: number;
  uniqueSellers: number;
  topSet?: string;
  topRarity?: string;
}

export interface SalesMonitorStatus {
  connected: boolean;
  subscribers: number;
}

export interface HistoricalSalesParams {
  filters?: Partial<SalesFilters>;
  page?: number;
  limit?: number;
}

export interface HistoricalSalesResponse {
  sales: SalesEvent[];
  totalSales: number;
  currentPage: number;
  totalPages: number;
}

export interface SalesServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type TimeframeOption = {
  readonly value: SalesFilters['timeframe'];
  readonly label: string;
};

export type RarityOption = {
  readonly value: string;
  readonly label: string;
};

// Event types for component communication
export interface SalesEventHandlers {
  newSale: (event: SalesEvent) => void;
  connected: () => void;
  filterChange: (filters: SalesFilters) => void;
  pageChange: (page: number) => void;
}
