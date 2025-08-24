# Routes Directory

This directory contains **SvelteKit pages and layouts** that provide the user interface for the application. The routes have been extensively refactored to use a component-based architecture, eliminating over 1,000 lines of duplicate code.

## 🏗️ Route Architecture

The application follows SvelteKit's file-based routing with:
- **Component-based pages** using specialized UI components
- **Consistent layout structure** with shared navigation
- **TypeScript integration** throughout all pages
- **Responsive design** optimized for all device sizes
- **Progressive enhancement** with proper fallbacks

## 📄 Pages Overview

### Main Application Pages

#### `+layout.svelte`
**Purpose**: Global application layout and navigation structure

**Key Features:**
- Responsive navigation with mobile hamburger menu
- Global styling and Tailwind CSS integration
- Consistent header/footer across all pages
- Navigation state management
- SEO meta tag management

**Structure:**
```svelte
<nav>Global Navigation</nav>
<main><slot /></main>
<footer>Application Footer</footer>
```

#### `+page.svelte` (Home Page)
**Purpose**: Application landing page and feature overview

**Key Features:**
- Feature highlights and value proposition
- Quick access to main extraction functionality
- Usage instructions and getting started guide
- Recent updates and changelog highlights
- Call-to-action buttons for key features

### Core Functionality Pages

#### `extract/+page.svelte` ⭐ **Major Refactoring** (2,216 → 1,475 lines)
**Purpose**: Main data extraction interface with component-based architecture

**Component Integration:**
- **CardFilters Component**: Complete filtering interface (247 lines)
- **CardGrid Component**: Visual card display (230 lines) 
- **CardTable Component**: Data table with marketplace integration (332 lines)
- **PackManager Component**: Pack grouping and management (201 lines)
- **UserSearchInput Component**: Username search with autocomplete (111 lines)

**Key Features:**
- **Username Resolution**: Blockchain-powered username-to-ID mapping
- **Real-time Progress**: Live updates during long extractions
- **Smart Caching**: localStorage integration with cache status indicators
- **Missing Cards Integration**: Marketplace data with buy/offer functionality
- **Dual View Modes**: Grid and table views with specialized components
- **Advanced Filtering**: Set-based, rarity, and availability filters
- **Pack Management**: Intelligent grouping with expandable details
- **Export Functionality**: JSON download and clipboard copy

**Refactoring Impact:**
- **741 lines eliminated** (33.4% reduction)
- **Zero code duplication** in filtering and display logic
- **Improved maintainability** with clear component boundaries
- **Enhanced type safety** with proper component interfaces
- **Better performance** through component-level optimizations

#### `trade-finder/+page.svelte` ⭐ **Major Refactoring** (803 → 488 lines)
**Purpose**: Trade analysis and opportunity discovery

**Component Integration:**
- **TradeTable Component**: Reusable trade display table (127 lines)
- **UserSearchInput Component**: Dual user selection interface (111 lines)

**Key Features:**
- **Dual User Selection**: Search and compare two user profiles
- **Trade Analysis**: Automated opportunity discovery
- **Visual Indicators**: Color-coded trade availability
- **Trade Value Calculation**: Fair trade assessment
- **Detailed Trade Views**: Expandable trade information

**Refactoring Impact:**
- **315 lines eliminated** (39% reduction)
- **Eliminated duplicate table code** between give/receive sections
- **Centralized trade logic** in shared components
- **Improved consistency** in trade data display

### Legacy Pages (Maintained for Compatibility)

#### `profiles/+page.svelte`
**Purpose**: Profile management interface (legacy feature)

**Features:**
- Profile listing with search and filtering
- CRUD operations for stored profiles
- Profile comparison functionality
- Import/export capabilities

#### `profiles/[id]/+page.svelte`
**Purpose**: Individual profile view and editing

**Features:**
- Detailed profile information display
- Edit mode with form validation
- Profile statistics and analytics
- Export options for profile data

#### `profiles/new/+page.svelte`
**Purpose**: Create new profile interface

**Features:**
- Profile creation form with validation
- Field guidance and help text
- Real-time validation feedback
- Integration with profile storage system

## 🧩 Component Usage Patterns

### Extract Page Component Integration

```svelte
<!-- Advanced filtering interface -->
<CardFilters
  bind:selectedSet
  bind:selectedRarity
  bind:viewMode
  bind:showMissingCards
  bind:onlyMissingCards
  bind:availableOnly
  bind:searchTerm
  bind:pageSize
  {cardsBySet}
  {allRarities}
  {fetchingAllSets}
  {loadingSetData}
  {setDataErrors}
  {bulkFetchErrors}
  on:searchChange={(e) => searchQuery = e.detail}
  on:setChange={() => handleSetChange()}
  on:rarityChange={() => handleRarityChange()}
  on:viewModeChange={(e) => viewMode = e.detail}
  on:missingCardsToggle={(e) => showMissingCards = e.detail}
  on:onlyMissingToggle={(e) => onlyMissingCards = e.detail}
  on:availableOnlyToggle={(e) => availableOnly = e.detail}
  on:pageSizeChange={(e) => handlePageSizeChange(e.detail)}
/>

<!-- Conditional display based on view mode -->
{#if viewMode === 'grid'}
  <CardGrid
    {selectedSet}
    {cardsBySet}
    paginatedCards={paginatedCards}
    on:cardClick={(e) => openCardModal(e.detail)}
  />
{:else}
  <CardTable
    paginatedCards={paginatedCards}
    {sortColumn}
    {sortDirection}
    on:cardClick={(e) => openCardModal(e.detail)}
    on:sort={(e) => handleSort(e.detail.column)}
  />
{/if}

<!-- Pack management with intelligent grouping -->
{#if extractedData.profile.digital_products?.length > 0}
  <PackManager digitalProducts={extractedData.profile.digital_products} />
{/if}
```

### Trade Finder Component Integration

```svelte
<!-- Reusable trade analysis tables -->
<TradeTable
  trades={giveTrades}
  title="Cards You Can Give"
  userCountField="userACount"
  on:tradeClick={handleTradeClick}
/>

<TradeTable
  trades={receiveTrades}
  title="Cards You Can Receive"
  userCountField="userBCount"
  on:tradeClick={handleTradeClick}
/>
```

## 🎨 Styling and Design Patterns

### Consistent Design System
All pages follow established design patterns:

**Color Scheme:**
- Primary: Indigo (`bg-indigo-600`, `text-indigo-600`)
- Success: Green (`bg-green-600`, `text-green-600`)
- Warning: Orange (`bg-orange-600`, `text-orange-600`)
- Error: Red (`bg-red-600`, `text-red-600`)
- Neutral: Gray (`bg-gray-50`, `text-gray-900`)

**Typography:**
- Headings: `text-lg font-medium` to `text-xl font-semibold`
- Body text: `text-sm text-gray-900`
- Captions: `text-xs text-gray-500`

**Interactive Elements:**
- Buttons: `px-4 py-2 rounded-md` with hover states
- Inputs: `border-gray-300 focus:border-indigo-500 focus:ring-indigo-500`
- Cards: `bg-white shadow rounded-lg p-6`

### Responsive Design
All pages implement mobile-first responsive design:
- Grid layouts with `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Flexible navigation with mobile hamburger menu
- Touch-friendly interactive elements
- Optimized content hierarchy for small screens

## 📊 Performance Optimizations

### Component-Level Optimizations
- **Lazy loading** for heavy components
- **Virtual scrolling** for large data sets
- **Memoization** for expensive calculations
- **Event delegation** for multiple similar elements

### Cache Integration
Pages utilize centralized cache utilities:
```typescript
import { getCachedUserData, setCachedUserData } from '$lib/utils/cacheUtils';

// Cache-first loading strategy
onMount(async () => {
  const cached = getCachedUserData(userId);
  if (cached) {
    data = cached.data;
    showCacheIndicator = true;
  } else {
    data = await fetchFreshData();
    setCachedUserData(userId, data, 15);
  }
});
```

### Progressive Enhancement
- Works without JavaScript for basic functionality
- Enhanced features progressively load with JS
- Proper fallbacks for failed network requests
- Graceful degradation for unsupported features

## 🔄 State Management

### Reactive State Patterns
Pages use Svelte's reactive statements for efficient updates:
```typescript
// Reactive filtering
$: filteredCards = cards.filter(card => {
  if (selectedSet !== 'all' && card.set !== selectedSet) return false;
  if (selectedRarity !== 'all' && card.rarity !== selectedRarity) return false;
  if (searchQuery && !card.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
  return true;
});

// Reactive pagination
$: totalPages = Math.ceil(filteredCards.length / pageSize);
$: paginatedCards = filteredCards.slice(
  (currentPage - 1) * pageSize, 
  currentPage * pageSize
);
```

### Component State Communication
Components communicate through event dispatching:
```typescript
// Child component dispatches events
dispatch('filterChange', { type: 'set', value: selectedSet });

// Parent component handles events
function handleFilterChange(event) {
  const { type, value } = event.detail;
  updateFilters(type, value);
}
```

## 🚀 Adding New Pages

When creating new pages:

1. **Follow established file structure** in routes directory
2. **Use existing components** where possible for consistency
3. **Implement responsive design** with mobile-first approach
4. **Include proper TypeScript typing** for all data
5. **Add appropriate loading states** and error handling
6. **Consider caching strategy** for data-heavy pages
7. **Follow SEO best practices** with proper meta tags
8. **Test across different device sizes** and browsers

### New Page Template
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import ComponentName from '$lib/components/ComponentName.svelte';
  import { getCachedData, setCachedData } from '$lib/utils/cacheUtils';
  
  // TypeScript interfaces
  interface PageData {
    // Define data structure
  }
  
  // Reactive state
  let data: PageData[] = [];
  let loading = false;
  let error: string | null = null;
  
  // Lifecycle
  onMount(async () => {
    await loadData();
  });
  
  // Functions
  async function loadData() {
    loading = true;
    try {
      // Implement data loading
      const result = await fetchData();
      data = result;
    } catch (err) {
      error = 'Failed to load data';
      console.error(err);
    } finally {
      loading = false;
    }
  }
  
  function handleComponentEvent(event) {
    // Handle component events
  }
</script>

<svelte:head>
  <title>Page Title</title>
  <meta name="description" content="Page description" />
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold text-gray-900 mb-8">Page Title</h1>
  
  {#if loading}
    <div class="text-center">Loading...</div>
  {:else if error}
    <div class="text-red-600">{error}</div>
  {:else if data.length > 0}
    <ComponentName {data} on:event={handleComponentEvent} />
  {:else}
    <div class="text-gray-500">No data available</div>
  {/if}
</div>
```

## 📈 Refactoring Benefits

The route refactoring provides:
- **Massive code reduction** (1,000+ lines eliminated)
- **Improved maintainability** with component-based structure
- **Consistent user experience** across all pages
- **Better performance** through component optimizations
- **Enhanced type safety** with TypeScript integration
- **Easier testing** with isolated component logic
- **Future-proof architecture** for new feature development