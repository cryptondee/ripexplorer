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
  // Find all duplicate cards (same card ID and card number)
  const cardKey = `${card.card?.id || card.card?.name}_${card.card?.card_number}`;
  const duplicates = allCards.filter(c => {
    const cKey = `${c.card?.id || c.card?.name}_${c.card?.card_number}`;
    return cKey === cardKey;
  });
  
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