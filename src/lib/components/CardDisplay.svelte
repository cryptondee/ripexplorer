<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import CardGrid from './CardGrid.svelte';
  import CardTable from './CardTable.svelte';
  import { getSetNameFromCard } from '$lib/utils/card';
  import { getMarketValue, getListedPrice } from '$lib/utils/pricing';
  
  interface Props {
    extractedData: any;
    combinedCards: any[];
    cardsBySet: any;
    setCardsData: any;
    viewMode: 'grid' | 'table';
    sortColumn: string;
    sortDirection: 'asc' | 'desc';
    selectedSet: string;
    selectedRarity: string;
    searchQuery: string;
    availableOnly: boolean;
    pageSize: number;
    currentPage: number;
    totalPages?: number;
    filteredCardsCount?: number;
  }
  
  let {
    extractedData,
    combinedCards,
    cardsBySet,
    setCardsData,
    viewMode = $bindable(),
    sortColumn = $bindable(),
    sortDirection = $bindable(),
    selectedSet,
    selectedRarity,
    searchQuery,
    availableOnly,
    pageSize,
    currentPage = $bindable(),
    totalPages = $bindable(),
    filteredCardsCount = $bindable()
  }: Props = $props();
  
  const dispatch = createEventDispatcher<{
    cardClick: any;
    sortChange: { column: string };
    pageChange: { page: number };
  }>();
  
  // Sorting function
  function sortCards(cards: any[]) {
    return [...cards].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortColumn) {
        case 'card_number':
          aValue = parseInt(a.card?.card_number || '0');
          bValue = parseInt(b.card?.card_number || '0');
          break;
        case 'name':
          aValue = a.card?.name || '';
          bValue = b.card?.name || '';
          break;
        case 'set':
          aValue = getSetNameFromCard(a, setCardsData);
          bValue = getSetNameFromCard(b, setCardsData);
          break;
        case 'rarity':
          aValue = a.card?.rarity || '';
          bValue = b.card?.rarity || '';
          break;
        case 'type':
          aValue = a.card?.types?.join(', ') || '';
          bValue = b.card?.types?.join(', ') || '';
          break;
        case 'value':
          aValue = getMarketValue(a);
          bValue = getMarketValue(b);
          break;
        case 'listedPrice':
          aValue = getListedPrice(a);
          bValue = getListedPrice(b);
          break;
        case 'quantity':
          aValue = a.quantity || 1;
          bValue = b.quantity || 1;
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const result = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? result : -result;
      } else {
        const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return sortDirection === 'asc' ? result : -result;
      }
    });
  }
  
  // Handle column header clicks for sorting
  function handleSort(column: string) {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'asc';
    }
    // Reset to first page when sorting changes
    currentPage = 1;
    dispatch('sortChange', { column });
  }
  
  // Paginate cards
  function paginateCards(cards: any[]) {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return cards.slice(startIndex, endIndex);
  }
  
  // Process cards to add quantity information
  const cardsWithQuantity = $derived.by(() => {
    // Always use combinedCards as the source since it already includes missing cards when enabled
    let cards = combinedCards;
    
    console.log(`📊 CardDisplay: Starting with ${combinedCards.length} combined cards`);
    
    // If a specific set is selected, filter to that set
    if (selectedSet !== 'all') {
      cards = combinedCards.filter((card: any) => {
        const setName = getSetNameFromCard(card, setCardsData);
        return setName === selectedSet;
      });
      console.log(`📊 CardDisplay: After filtering to set "${selectedSet}", have ${cards.length} cards`);
    }
    
    // Group cards by unique identifier to calculate quantities
    const cardGroups: { [key: string]: any[] } = {};
    const allUserCards = extractedData?.profile?.digital_cards || [];
    
    // Group all user cards by card identifier
    allUserCards.forEach((userCard: any) => {
      const cardKey = `${userCard.card?.id || userCard.card?.name}_${userCard.card?.card_number}_${userCard.card?.set_id}`;
      if (!cardGroups[cardKey]) {
        cardGroups[cardKey] = [];
      }
      cardGroups[cardKey].push(userCard);
    });
    
    // Add quantity to each card
    return cards.map((card: any) => {
      const cardKey = `${card.card?.id || card.card?.name}_${card.card?.card_number}_${card.card?.set_id}`;
      const quantity = cardGroups[cardKey]?.length || 1;
      return {
        ...card,
        quantity
      };
    });
  });
  
  // Derived states for card processing
  const filteredCards = $derived.by(() => {
    // Apply filters
    return cardsWithQuantity.filter((card: any) => {
      const matchesSearch = !searchQuery || 
        (card.card?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (card.card?.card_number || '').includes(searchQuery) ||
        getSetNameFromCard(card, setCardsData).toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRarity = selectedRarity === 'all' || card.card?.rarity === selectedRarity;
      
      // Available only filter - only applies to missing cards  
      // For missing cards, check if they have actual marketplace listings
      const matchesAvailable = !availableOnly || !card.isMissing || (card.is_listed && card.listing?.listings?.length > 0);
      
      return matchesSearch && matchesRarity && matchesAvailable;
    });
  });
  
  const sortedCards = $derived.by(() => sortCards(filteredCards));
  const paginatedCards = $derived.by(() => paginateCards(sortedCards));
  
  // Update bound values
  $effect(() => {
    totalPages = Math.ceil(sortedCards.length / pageSize);
    filteredCardsCount = filteredCards.length;
  });
  
  // Forward card click events
  function handleCardClick(event: CustomEvent) {
    dispatch('cardClick', event.detail);
  }
  
  // Forward sort events
  function handleTableSort(event: CustomEvent) {
    handleSort(event.detail.column);
  }
</script>

<div class="card-display">
  <!-- Card Display Components -->
  {#if viewMode === 'grid'}
    <CardGrid
      selectedSet={selectedSet}
      {cardsBySet}
      {paginatedCards}
      on:cardClick={handleCardClick}
    />
  {:else}
    <CardTable
      {paginatedCards}
      {sortColumn}
      {sortDirection}
      setNameById={{}}
      resolveSetName={(card) => getSetNameFromCard(card, setCardsData)}
      on:cardClick={handleCardClick}
      on:sort={handleTableSort}
    />
  {/if}
  
  <!-- Export computed values for parent component -->
  <div class="hidden">
    <!-- These values are accessible via binding or can be exposed as needed -->
    <!-- totalPages: {totalPages} -->
    <!-- filteredCount: {filteredCards.length} -->
    <!-- sortedCount: {sortedCards.length} -->
  </div>
</div>

<style>
  .card-display {
    /* Component-specific styles if needed */
  }
  
  .hidden {
    display: none;
  }
</style>