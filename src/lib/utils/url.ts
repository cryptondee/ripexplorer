export function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Accepts either a wrapper { card: {...} } or a raw card object
export function buildRipCardUrl(input: any): string {
  const card = input?.card ?? input;
  const identifier = card?.id || (card?.name ? slugifyName(card.name) : '');
  return identifier ? `https://www.rip.fun/card/${identifier}` : 'https://www.rip.fun';
}
