/**
 * External URL constants for the application
 * Centralizes all external API endpoints and service URLs
 */

export const EXTERNAL_URLS = {
  RIP_FUN: {
    BASE: 'https://www.rip.fun',
    API: 'https://www.rip.fun/api',
    // Profile pages
    PROFILE: (username: string) => `https://www.rip.fun/profile/${username}`,
    // Card pages
    CARD: (cardId: string) => `https://www.rip.fun/card/${cardId}`,
    // API endpoints
    API_AUTH: (address: string) => `https://rip.fun/api/auth/${address}`,
    API_USER_CARDS: (userId: string) => `https://www.rip.fun/api/user/${userId}/owned-cards`,
    API_SET_CARDS: (setId: string, params?: {
      page?: string;
      limit?: string;
      sort?: string;
      all?: string;
    }) => {
      const query = new URLSearchParams();
      if (params?.page) query.append('page', params.page);
      if (params?.limit) query.append('limit', params.limit);
      if (params?.sort) query.append('sort', params.sort);
      if (params?.all) query.append('all', params.all);
      const queryString = query.toString();
      return `https://www.rip.fun/api/set/${setId}/cards${queryString ? `?${queryString}` : ''}`;
    },
    API_CARD_LISTINGS: (cardId: string) => `https://www.rip.fun/api/card/${cardId}/listings`,
  },
  BASESCAN: {
    BASE: 'https://basescan.org',
    TX: (hash: string) => `https://basescan.org/tx/${hash}`,
  },
  ALCHEMY: {
    BASE_MAINNET_RPC: (apiKey: string) => `https://base-mainnet.g.alchemy.com/v2/${apiKey}`,
  },
  ANALYTICS: {
    UMAMI_SCRIPT: 'https://umami-production-8a51.up.railway.app/script.js',
    UMAMI_WEBSITE_ID: '55891753-49c9-42ea-a449-746ffd8b7e3d',
  }
} as const;

// Type exports for better type safety
export type RipFunUrls = typeof EXTERNAL_URLS.RIP_FUN;
export type BasescanUrls = typeof EXTERNAL_URLS.BASESCAN;
export type AlchemyUrls = typeof EXTERNAL_URLS.ALCHEMY;
