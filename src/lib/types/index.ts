/**
 * Comprehensive type definitions for RipExplorer
 */

// User and Profile Types
export interface User {
  id: string;
  username: string;
  address?: string;
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserProfile extends User {
  digital_cards: UserCard[];
  statistics?: UserStatistics;
}

export interface UserStatistics {
  totalCards: number;
  uniqueCards: number;
  totalValue: number;
  completedSets: number;
  favoriteSet?: string;
}

// Card Types
export interface Card {
  id: string;
  name: string;
  card_number: string;
  set_id: string;
  set_name?: string;
  rarity: CardRarity;
  type?: CardType;
  small_image_url?: string;
  large_image_url?: string;
  market_price?: number;
  raw_price?: number;
  foil_type?: FoilType;
  description?: string;
  metadata?: Record<string, any>;
}

export interface UserCard {
  card: Card;
  quantity?: number;
  is_listed?: boolean;
  listing?: CardListing;
  lowestPrice?: number;
  marketValue?: number;
  isMissing?: boolean;
}

export interface CardListing {
  id: string;
  card_id: string;
  seller_id: string;
  price: number;
  usd_price?: string;
  currency: string;
  quantity: number;
  status: ListingStatus;
  created_at?: Date;
  updated_at?: Date;
}

// Set Types
export interface CardSet {
  id: string;
  name: string;
  series?: string;
  release_date?: Date;
  total_cards: number;
  symbol?: string;
  logo_url?: string;
}

export interface SetData {
  set: CardSet;
  cards: Card[];
  cached?: boolean;
  timestamp?: string;
}

// Trade Types
export interface Trade {
  card: Card;
  userACount: number;
  userBCount: number;
  estimatedValue?: number;
  tradeType: TradeType;
}

export interface TradeAnalysis {
  userA: {
    username: string;
    cards: UserCard[];
  };
  userB: {
    username: string;
    cards: UserCard[];
  };
  giveTrades: Trade[];
  receiveTrades: Trade[];
  perfectTrades: Trade[];
  summary: TradeSummary;
}

export interface TradeSummary {
  totalGive: number;
  totalReceive: number;
  totalPerfect: number;
  giveValue: number;
  receiveValue: number;
  balance: number;
  tradeRatio: number;
}

// Sales Types (importing from existing sales.ts)
export type { 
  SalesEvent, 
  EnrichedSalesEvent, 
  SalesFilter,
  SalesStats 
} from './sales';

// Authentication Types
export interface AuthState {
  isAuthenticated: boolean;
  user?: User;
  sessionToken?: string;
  expiresAt?: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  details?: string;
  cached?: boolean;
  timestamp?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Sync Types
export interface SyncStatus {
  isRunning: boolean;
  lastSync?: Date;
  nextSync?: Date;
  rateLimited?: boolean;
  remainingMs?: number;
  error?: string;
}

// Filter Types
export interface CardFilter {
  set?: string;
  rarity?: CardRarity;
  type?: CardType;
  minValue?: number;
  maxValue?: number;
  search?: string;
  showDuplicates?: boolean;
}

export interface TradeFilter extends CardFilter {
  tradeType?: TradeType;
  minCount?: number;
  balanceThreshold?: number;
}

// Enums
export enum CardRarity {
  Common = 'common',
  Uncommon = 'uncommon',
  Rare = 'rare',
  UltraRare = 'ultra rare',
  Legendary = 'legendary',
  Mythic = 'mythic',
}

export enum CardType {
  Pokemon = 'pokemon',
  Trainer = 'trainer',
  Energy = 'energy',
  Special = 'special',
}

export enum FoilType {
  Normal = 'normal',
  Holo = 'holo',
  ReverseHolo = 'reverse holo',
  FullArt = 'full art',
}

export enum TradeType {
  Give = 'give',
  Receive = 'receive',
  Perfect = 'perfect',
}

export enum ListingStatus {
  Active = 'active',
  Sold = 'sold',
  Cancelled = 'cancelled',
  Expired = 'expired',
}

// Component Props Types
export interface CardDisplayProps {
  extractedData: UserProfile | null;
  combinedCards: UserCard[];
  cardsBySet: Record<string, UserCard[]>;
  setCardsData: Record<string, SetData>;
  viewMode: 'grid' | 'table';
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  selectedSet: string;
  currentPage: number;
}

export interface TradeTableProps {
  title: string;
  trades: Trade[];
  userCountField: 'userACount' | 'userBCount';
  titleColor?: string;
  enableSelection?: boolean;
  selectedCards?: Set<string>;
}

// Utility Types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncData<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

// Re-export sales types for convenience
export * from './sales';
