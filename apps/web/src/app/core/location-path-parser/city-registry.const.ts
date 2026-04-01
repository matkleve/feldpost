export interface CityRecord {
  name: string;
  country: string;
  zips: readonly string[];
  lat: number;
  lng: number;
  aliases?: readonly string[];
}

export const CITY_REGISTRY: readonly CityRecord[] = [
  {
    name: 'Wien',
    country: 'AT',
    zips: ['1010', '1020', '1030', '1040', '1050', '1060', '1070', '1080', '1090'],
    lat: 48.2082,
    lng: 16.3738,
    aliases: ['vienna'],
  },
  {
    name: 'Salzburg',
    country: 'AT',
    zips: ['5020'],
    lat: 47.8095,
    lng: 13.055,
  },
  {
    name: 'Linz',
    country: 'AT',
    zips: ['4020'],
    lat: 48.3069,
    lng: 14.2858,
  },
  {
    name: 'Berlin',
    country: 'DE',
    zips: ['10115', '10117', '10119', '10178', '10179'],
    lat: 52.52,
    lng: 13.405,
  },
  {
    name: 'Muenchen',
    country: 'DE',
    zips: ['80331', '80333', '80335', '80336'],
    lat: 48.1372,
    lng: 11.5756,
    aliases: ['munich', 'muenchen'],
  },
  {
    name: 'Zuerich',
    country: 'CH',
    zips: ['8001', '8002', '8003', '8004', '8005'],
    lat: 47.3769,
    lng: 8.5417,
    aliases: ['zurich', 'zuerich'],
  },
];

export const COUNTRY_NAMES: Readonly<Record<string, readonly string[]>> = {
  AT: ['austria', 'oesterreich', 'osterreich', 'at'],
  DE: ['deutschland', 'germany', 'de'],
  CH: ['schweiz', 'switzerland', 'ch'],
};
