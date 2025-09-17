// Modal Store - Centralized state management for card detail modal
import { writable, get } from 'svelte/stores';
import { buildRipCardUrl, slugifyName } from '$lib/utils/url';
import { adaptCard, toModalFormat, isSameCard, type UniformCardData } from '$lib/utils/cardAdapter';

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
  try {
    // Adapt the main card to uniform format
    const uniformCard = adaptCard(card);
    
    // Adapt all cards to uniform format for duplicate detection
    const uniformAllCards = allCards.map(c => {
      try {
        return adaptCard(c);
      } catch (error) {
        console.warn('Failed to adapt card for modal:', error);
        return null;
      }
    }).filter(Boolean) as UniformCardData[];

    // Find all duplicate cards using the uniform adapter
    const duplicates = uniformAllCards.filter(c => isSameCard(uniformCard, c));

    // Convert back to modal format
    const cardsToShow = duplicates.length > 1 
      ? duplicates.map(toModalFormat)
      : [toModalFormat(uniformCard)];

    allCardsForModal.set(cardsToShow);
    selectedCard.set(cardsToShow[0]);
    selectedCardIndex.set(0);
    isCardModalOpen.set(true);
  } catch (error) {
    console.error('Error opening card modal:', error);
    // Fallback to original behavior
    allCardsForModal.set([card]);
    selectedCard.set(card);
    selectedCardIndex.set(0);
    isCardModalOpen.set(true);
  }
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