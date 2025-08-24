# Components Directory

This directory contains **reusable Svelte components** created during the major 2025 refactoring that eliminated 1,000+ lines of duplicate code from the application.

## 🎯 Component Architecture Overview

Each component follows established patterns:
- **Event-driven communication** with parent components
- **TypeScript interfaces** for props and events
- **Tailwind CSS** for consistent styling
- **Reusable across multiple pages**
- **Proper error handling** and loading states

## 📦 Components

### CardFilters.svelte (248 lines)
**Purpose**: Complete filtering interface for card management with advanced options

**Key Features:**
- Set-based filtering with dropdown showing available Pokemon TCG sets
- Rarity filtering with dynamic options
- View mode toggle (Grid/Table)
- Missing cards management (Show Missing, Only Missing, Available Only)
- Page size control with dynamic limits
- Real-time search with instant filtering
- Loading states and error handling for async operations

**Events Dispatched:**
```typescript
{
  searchChange: string;
  setChange: string;
  rarityChange: string;
  viewModeChange: 'grid' | 'table';
  missingCardsToggle: boolean;
  onlyMissingToggle: boolean;
  availableOnlyToggle: boolean;
  pageSizeChange: number;
}
```

**Usage:**
```svelte
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
  on:searchChange={handleSearch}
  on:setChange={handleSetChange}
  on:rarityChange={handleRarityChange}
/>
```

### CardGrid.svelte (230 lines)
**Purpose**: Visual grid display for cards with missing card indicators and marketplace integration

**Key Features:**
- Responsive grid layout (1-3 columns based on screen size)
- Set grouping with expandable sections for "All Sets" view
- Individual card view with details for single set selection  
- Missing card indicators with red styling
- Marketplace integration (Buy Now/Make Offer buttons)
- Card status badges (Listed/Owned/Missing)
- Click handling for card detail modals

**Events Dispatched:**
```typescript
{
  cardClick: any; // Card object clicked
}
```

**Props Interface:**
```typescript
{
  selectedSet: string;
  cardsBySet: any;
  paginatedCards: any[];
}
```

### CardTable.svelte (349 lines)
**Purpose**: Comprehensive sortable data table with marketplace integration

**Key Features:**
- Sortable columns (Card, Set, Rarity, Type, Value, Listed Price, etc.)
- Marketplace data integration with real-time pricing
- Buy Now/Make Offer action buttons for missing cards
- Availability indicators (✅/❌ icons)
- Status badges (Listed/Owned/Missing)
- Responsive table with proper mobile handling
- Card image thumbnails with fallback icons
- Click-to-sort headers with visual indicators

**Events Dispatched:**
```typescript
{
  cardClick: any; // Card object clicked
  sort: { column: string; direction: 'asc' | 'desc' };
}
```

**Columns:**
- Card (with image and details)
- Set (Pokemon TCG set name)
- Rarity (with badge styling)
- Type (Pokemon card types)
- Value (current market value)
- Listed Price (marketplace pricing)
- Available (availability status)
- Action (Buy Now/Make Offer buttons)
- Status (Listed/Owned/Missing badges)

### PackManager.svelte (202 lines)
**Purpose**: Intelligent pack grouping and management with expandable details

**Key Features:**
- Automatic pack grouping by name (e.g., "Black Bolt", "151", "Prismatic Evolutions")
- Status analysis and summaries (opened, sealed, pending open counts)
- Expandable pack groups with detailed individual pack tables
- Pack value calculations and total statistics
- Sample image display for each pack group
- Click-to-expand/collapse functionality with smooth transitions
- Individual pack details with ID and status columns

**Props Interface:**
```typescript
{
  digitalProducts: any[]; // Raw pack data from API
}
```

**Pack Status Analysis:**
- **Opened**: `open_status` contains "opened"
- **Sealed**: `open_status` contains "sealed", "unopened", or default for owned
- **Pending Open**: `open_status` contains "pending" or "opening"

### TradeTable.svelte (127 lines)
**Purpose**: Reusable trade analysis table with dynamic highlighting

**Key Features:**
- Dynamic row highlighting based on trade availability
- Color-coded indicators (orange for single card, green for multiple cards)
- Trade type handling (give/receive/perfect matches)
- User count badges and card availability indicators
- Click handling for detailed trade information
- Reused across trade-finder and trade-compare pages

**Events Dispatched:**
```typescript
{
  tradeClick: any; // Trade object clicked
}
```

**Props Interface:**
```typescript
{
  trades: any[];
  title: string;
  userCountField: 'userACount' | 'userBCount';
}
```

### UserSearchInput.svelte (112 lines)
**Purpose**: Intelligent username search with blockchain integration and autocomplete

**Key Features:**
- Real-time username search with autocomplete suggestions
- Blockchain integration for username resolution
- Loading states during search operations
- Input validation and error handling
- Support for both username and numeric ID input
- Debounced search to prevent excessive API calls

**Events Dispatched:**
```typescript
{
  userSelected: { username: string; userId: string };
  searchChange: string;
}
```

**Props Interface:**
```typescript
{
  placeholder?: string;
  disabled?: boolean;
  initialValue?: string;
}
```

## 🔧 Development Patterns

### Component Communication
All components use Svelte's event dispatcher pattern:
```typescript
import { createEventDispatcher } from 'svelte';

const dispatch = createEventDispatcher<{
  eventName: EventPayloadType;
}>();

function handleAction() {
  dispatch('eventName', payload);
}
```

### TypeScript Integration
Components include proper TypeScript support:
```typescript
// Props interface
export let propName: PropType = defaultValue;

// Event typing
const dispatch = createEventDispatcher<{
  eventName: PayloadType;
}>();
```

### Styling Consistency
All components follow Tailwind CSS patterns:
- Consistent color scheme (indigo for primary, gray for neutral)
- Responsive design with mobile-first approach
- Hover states and transitions
- Consistent spacing and typography

### Error Handling
Components include proper error states:
- Loading indicators during async operations
- Error messages with user-friendly explanations
- Graceful fallbacks for missing data
- Disabled states during processing

## 🎯 Usage Guidelines

1. **Import components** from `$lib/components/ComponentName.svelte`
2. **Pass required props** using TypeScript interfaces
3. **Handle events** with proper event listeners
4. **Follow established styling** patterns in Tailwind CSS
5. **Include error handling** for async operations
6. **Test component reusability** across different pages

## 📈 Performance Benefits

The component architecture provides:
- **Reduced bundle size** through code elimination
- **Improved caching** of component code
- **Better tree-shaking** for unused features
- **Modular loading** for better performance
- **Reusable logic** across multiple pages