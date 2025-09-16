import { EXTERNAL_URLS } from '$lib/constants/urls.js';

export function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Build a rip.fun card URL from a card object or identifier
 */
export function buildRipCardUrl(input: any): string {
  const card = input?.card ?? input;
  const identifier = card?.id || (card?.name ? slugifyName(card.name) : '');
  return identifier ? EXTERNAL_URLS.RIP_FUN.CARD(identifier) : EXTERNAL_URLS.RIP_FUN.BASE;
}
