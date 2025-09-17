/**
 * Filters composable for reusable filter management
 * Centralizes filter state and handlers with automatic pagination reset
 */

export interface FilterOptions {
  onFilterChange?: (filterName: string, value: any) => Promise<void>;
  resetPagination?: boolean;
}

export interface FilterState {
  selectedSet: string;
  selectedSetA: string;
  selectedSetB: string;
  selectedRarity: string;
  selectedTradeType: string;
  showDuplicatesOnly: boolean;
  enableCrossSetTrading: boolean;
  currentPage: number;
  itemsPerPage: number;
}

export function useFilters(
  initialState: Partial<FilterState> = {},
  options: FilterOptions = {}
) {
  const {
    onFilterChange,
    resetPagination = true
  } = options;

  // Initialize filter state with defaults
  let filters: FilterState = {
    selectedSet: 'all',
    selectedSetA: 'all',
    selectedSetB: 'all',
    selectedRarity: 'all',
    selectedTradeType: 'all',
    showDuplicatesOnly: false,
    enableCrossSetTrading: false,
    currentPage: 1,
    itemsPerPage: 50,
    ...initialState
  };

  /**
   * Generic filter change handler
   * Automatically resets pagination and calls onChange callback
   */
  async function handleFilterChange<K extends keyof FilterState>(
    filterName: K,
    value: FilterState[K]
  ): Promise<void> {
    filters[filterName] = value;
    
    // Reset pagination when filters change (except page changes)
    if (resetPagination && filterName !== 'currentPage' && filterName !== 'itemsPerPage') {
      filters.currentPage = 1;
    }
    
    // Call the provided onChange callback
    if (onFilterChange) {
      await onFilterChange(filterName, value);
    }
  }

  /**
   * Reset all filters to default values
   */
  async function resetFilters(): Promise<void> {
    filters.selectedSet = 'all';
    filters.selectedSetA = 'all';
    filters.selectedSetB = 'all';
    filters.selectedRarity = 'all';
    filters.selectedTradeType = 'all';
    filters.showDuplicatesOnly = false;
    filters.enableCrossSetTrading = false;
    filters.currentPage = 1;
    
    if (onFilterChange) {
      await onFilterChange('reset', null);
    }
  }

  /**
   * Apply multiple filter changes at once
   */
  async function applyFilters(changes: Partial<FilterState>): Promise<void> {
    Object.entries(changes).forEach(([key, value]) => {
      (filters as any)[key] = value;
    });
    
    if (resetPagination && !('currentPage' in changes)) {
      filters.currentPage = 1;
    }
    
    if (onFilterChange) {
      await onFilterChange('batch', changes);
    }
  }

  return {
    filters,
    
    // Individual handlers for each filter
    handleSetChange: (value: string) => handleFilterChange('selectedSet', value),
    handleRarityChange: (value: string) => handleFilterChange('selectedRarity', value),
    handleTradeTypeChange: (value: string) => handleFilterChange('selectedTradeType', value),
    handleDuplicatesToggle: (value: boolean) => handleFilterChange('showDuplicatesOnly', value),
    handlePageChange: (value: number) => handleFilterChange('currentPage', value),
    handlePageSizeChange: (value: number) => handleFilterChange('itemsPerPage', value),
    
    // Utility functions
    handleFilterChange,
    resetFilters,
    applyFilters
  };
}
