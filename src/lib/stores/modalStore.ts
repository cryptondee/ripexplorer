// Modal Store - Centralized state management for card detail modal
import { writable } from 'svelte/store';

// ==========================================
// MODAL STATE STORES
// ==========================================

export const isCardModalOpen = writable(false);
export const selectedCard = writable<any>(null);
export const allCardsForModal = writable<any[]>([]);
export const selectedCardIndex = writable(0);

// ==========================================
// MODAL ACTIONS
// ==========================================

export function openCardModal(card: any, allCards: any[] = []) {
  // Handle both flat (trade-finder) and nested (extract) structures
  const getCardId = (c: any) => {
    // Try nested structure first (extract page)
    if (c.card?.id) return c.card.id;
    // Then try flat structure (trade-finder)
    if (c.id) return c.id;
    // Fallback to name
    return c.card?.name || c.name || '';
  };
  
  const getCardNumber = (c: any) => {
    return c.card?.card_number || c.card_number || '';
  };
  
  // Find all duplicate cards (same card ID and card number)
  const cardId = getCardId(card);
  const cardNumber = getCardNumber(card);
  const cardKey = `${cardId}_${cardNumber}`;
  
  console.log('Modal: Looking for duplicates with key:', cardKey);
  
  const duplicates = allCards.filter(c => {
    const cId = getCardId(c);
    const cNum = getCardNumber(c);
    const cKey = `${cId}_${cNum}`;
    return cKey === cardKey;
  });
  
  console.log('Modal: Found duplicates:', duplicates.length);
  
  // If we found duplicates, use them, otherwise just the single card
  const cardsToShow = duplicates.length > 1 ? duplicates : [card];
  
  allCardsForModal.set(cardsToShow);
  selectedCard.set(cardsToShow[0]);
  selectedCardIndex.set(0);
  isCardModalOpen.set(true);
}

export function setSelectedCardIndex(index: number) {
  const cards = get(allCardsForModal);
  if (index >= 0 && index < cards.length) {
    selectedCardIndex.set(index);
    selectedCard.set(cards[index]);
  }
}

export function closeCardModal() {
  selectedCard.set(null);
  allCardsForModal.set([]);
  selectedCardIndex.set(0);
  isCardModalOpen.set(false);
}

// Import get for internal use
import { get } from 'svelte/store';