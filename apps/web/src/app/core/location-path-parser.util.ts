import { COUNTRY_NAMES, CITY_REGISTRY } from './location-path-parser/city-registry.const';
import { STREET_KEYWORDS } from './location-path-parser/street-keywords.const';

export const NOISE_SEGMENTS = new Set([
  'fotos',
  'fotos von montag',
  'urlaub',
  'neu',
  'misc',
  'images',
  'bilder',
  'camera',
]);

export function normalizeSegment(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function splitPathSegments(fullPath: string): string[] {
  return fullPath
    .split(/[\\/]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

export function isNoiseSegment(segment: string): boolean {
  return NOISE_SEGMENTS.has(normalizeSegment(segment));
}

export function stripFileExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

export function detectCountryCode(segment: string): string | null {
  const normalized = normalizeSegment(segment);
  for (const [code, aliases] of Object.entries(COUNTRY_NAMES)) {
    if (aliases.includes(normalized)) {
      return code;
    }
  }
  return null;
}

export function findCityBySegment(segment: string): { city: string; country: string } | null {
  const normalized = normalizeSegment(segment);
  for (const city of CITY_REGISTRY) {
    const names = [city.name, ...(city.aliases ?? [])].map((entry) => normalizeSegment(entry));
    if (names.includes(normalized)) {
      return { city: city.name, country: city.country };
    }
  }
  return null;
}

export function findCityByZip(zip: string): { city: string; country: string } | null {
  for (const city of CITY_REGISTRY) {
    if (city.zips.includes(zip)) {
      return { city: city.name, country: city.country };
    }
  }
  return null;
}

export function hasStreetKeyword(segment: string): boolean {
  const normalized = normalizeSegment(segment);
  const words = normalized.split(/\s+/).filter(Boolean);
  return words.some((word) => STREET_KEYWORDS.has(word));
}

export function parseStreetAndHouse(segment: string): {
  street: string | null;
  houseNumber: string | null;
  unit: string | null;
} {
  const cleaned = segment.replace(/[_]+/g, ' ').trim();
  const match = cleaned.match(
    /^([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß.'\-\s]+?)\s+(\d{1,4}[A-Za-z]?)(?:[\s,/-]+(Top\s*\d+|Stiege\s*[A-Za-z0-9]+|Tür\s*\d+|Unit\s*[A-Za-z0-9]+))?$/i,
  );

  if (!match) {
    return { street: null, houseNumber: null, unit: null };
  }

  return {
    street: (match[1] ?? '').trim() || null,
    houseNumber: (match[2] ?? '').trim() || null,
    unit: (match[3] ?? '').trim() || null,
  };
}

export function parseZipAndCity(segment: string): { zip: string | null; city: string | null } {
  const cleaned = segment.replace(/[_-]+/g, ' ').trim();
  const zipMatch = cleaned.match(/\b(\d{4,5})\b/);
  if (!zipMatch) {
    return { zip: null, city: null };
  }

  const zip = zipMatch[1];
  const rest = cleaned.replace(zipMatch[0], '').trim();
  return {
    zip,
    city: rest.length > 0 ? rest : null,
  };
}

export function formatAddressLine(
  street: string | null,
  houseNumber: string | null,
  city: string | null,
): string {
  const parts: string[] = [];
  if (street && houseNumber) {
    parts.push(`${street} ${houseNumber}`);
  } else if (street) {
    parts.push(street);
  }
  if (city) {
    parts.push(city);
  }
  return parts.join(', ').trim();
}
