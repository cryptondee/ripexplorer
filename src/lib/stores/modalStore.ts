// Modal Store - Centralized state management for card detail modal
import { writable } from 'svelte/store';

// ==========================================
// MODAL STATE STORES
// ==========================================

export const isCardModalOpen = writable(false);
export const selectedCard = writable<any>(null);

// ==========================================
// MODAL ACTIONS
// ==========================================

export function openCardModal(card: any) {
  selectedCard.set(card);
  isCardModalOpen.set(true);
}

export function closeCardModal() {
  selectedCard.set(null);
  isCardModalOpen.set(false);
}