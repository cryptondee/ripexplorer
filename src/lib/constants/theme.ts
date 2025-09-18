/**
 * Theme constants for RipExplorer
 * Centralized color tokens, gradients, and style values
 */

export const theme = {
  colors: {
    highlight: {
      orange: {
        bg: '#fed7aa',
        border: '#ea580c',
        text: '#ea580c',
      },
      green: {
        bg: '#bbf7d0',
        border: '#16a34a',
        text: '#16a34a',
      },
      red: {
        bg: '#fee2e2',
        border: '#dc2626',
        text: '#dc2626',
      },
      gray: {
        bg: '#f9fafb',
        border: '#d1d5db',
        text: '#9ca3af',
      },
    },
    status: {
      success: { 
        text: '#16a34a', 
        bg: '#dcfce7',
        border: '#16a34a',
      },
      warning: { 
        text: '#ea580c', 
        bg: '#fed7aa',
        border: '#ea580c',
      },
      error: { 
        text: '#dc2626', 
        bg: '#fee2e2',
        border: '#dc2626',
      },
      info: { 
        text: '#2563eb', 
        bg: '#dbeafe',
        border: '#2563eb',
      },
    },
    badge: {
      green: 'bg-green-100 text-green-800',
      blue: 'bg-blue-100 text-blue-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      red: 'bg-red-100 text-red-800',
      gray: 'bg-gray-100 text-gray-800',
      orange: 'bg-orange-100 text-orange-800',
    },
  },
  gradients: {
    gray: 'from-gray-50 to-gray-100',
    grayHover: 'from-gray-100 to-gray-200',
    blue: 'from-blue-50 to-blue-100',
    blueHover: 'from-blue-100 to-blue-200',
    green: 'from-green-50 to-green-100',
    greenHover: 'from-green-100 to-green-200',
  },
  badges: {
    /**
     * Returns badge classes based on completion percentage
     */
    completion: (percentage: number): string => {
      if (percentage >= 100) return theme.colors.badge.green;
      if (percentage >= 75) return theme.colors.badge.blue;
      if (percentage >= 50) return theme.colors.badge.yellow;
      if (percentage >= 25) return theme.colors.badge.orange;
      return theme.colors.badge.gray;
    },
    /**
     * Returns badge classes based on rarity
     */
    rarity: (rarity: string): string => {
      const rarityLower = rarity.toLowerCase();
      if (rarityLower === 'legendary' || rarityLower === 'mythic') return theme.colors.badge.orange;
      if (rarityLower === 'rare' || rarityLower === 'ultra rare') return theme.colors.badge.blue;
      if (rarityLower === 'uncommon') return theme.colors.badge.green;
      return theme.colors.badge.gray;
    },
    /**
     * Returns badge classes based on status
     */
    status: (status: 'success' | 'warning' | 'error' | 'info'): string => {
      const statusMap = {
        success: theme.colors.badge.green,
        warning: theme.colors.badge.yellow,
        error: theme.colors.badge.red,
        info: theme.colors.badge.blue,
      };
      return statusMap[status] || theme.colors.badge.gray;
    },
  },
  /**
   * Returns row style for trade tables based on trade type and count
   */
  tradeRow: {
    deselected: {
      backgroundColor: '#f9fafb',
      color: '#9ca3af',
      opacity: '0.6',
    },
    single: {
      backgroundColor: '#fed7aa',
      borderLeft: '4px solid #ea580c',
    },
    multiple: {
      backgroundColor: '#bbf7d0',
      borderLeft: '4px solid #16a34a',
    },
    getStyle: (isSelected: boolean, count: number): string => {
      if (!isSelected) {
        return `background-color: ${theme.tradeRow.deselected.backgroundColor}; color: ${theme.tradeRow.deselected.color}; opacity: ${theme.tradeRow.deselected.opacity};`;
      }
      if (count === 1) {
        return `background-color: ${theme.tradeRow.single.backgroundColor}; border-left: ${theme.tradeRow.single.borderLeft};`;
      }
      if (count > 1) {
        return `background-color: ${theme.tradeRow.multiple.backgroundColor}; border-left: ${theme.tradeRow.multiple.borderLeft};`;
      }
      return '';
    },
  },
  /**
   * Trade balance styles
   */
  tradeBalance: {
    positive: {
      container: 'bg-green-50 border-green-200',
      text: 'text-green-600',
      label: 'text-green-700',
    },
    negative: {
      container: 'bg-red-50 border-red-200',
      text: 'text-red-600',
      label: 'text-red-700',
    },
    neutral: {
      container: 'bg-gray-50 border-gray-200',
      text: 'text-gray-600',
      label: 'text-gray-700',
    },
    getClasses: (balance: number) => {
      if (balance > 0) return theme.tradeBalance.positive;
      if (balance < 0) return theme.tradeBalance.negative;
      return theme.tradeBalance.neutral;
    },
  },
} as const;

export type Theme = typeof theme;
