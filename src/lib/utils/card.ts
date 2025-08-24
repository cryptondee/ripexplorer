// Utilities related to card data structures used across components
export function getSetNameFromCard(input: any): string {
  const card = input?.card ?? input;
  if (card?.set?.name) return card.set.name;
  if (card?.card?.set?.name) return card.card.set.name;
  return card?.card?.set_id || card?.set_id || 'Unknown Set';
}
