/** Appends CARTO's required `key` query param when a basemap API key is configured. */
export function buildCartoStreetTileUrlTemplate(
  variant: string,
  apiKey?: string | null,
): string {
  const base = `https://{s}.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}{r}.png`;
  const trimmed = apiKey?.trim();
  if (!trimmed) {
    return base;
  }
  return `${base}?key=${encodeURIComponent(trimmed)}`;
}
