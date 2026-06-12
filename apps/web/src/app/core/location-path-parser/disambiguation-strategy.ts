export type DisambiguationAlgorithm = 'cluster-majority' | 'distance-weighted' | 'bayesian-context';

export interface DisambiguationCandidate {
  city: string;
  probability: number;
  country?: string;
  zipMatch?: boolean;
  countryMatch?: boolean;
  parserConfidence?: number;
  streetExact?: boolean;
  houseNumberExact?: boolean;
  cityLat?: number;
  cityLng?: number;
}

export interface DisambiguationContext {
  batchResolvedCities?: readonly string[];
  cityPrior?: Readonly<Record<string, number>>;
  defaultPrior?: number;
  clusterCentroid?: { lat: number; lng: number };
}

export interface DisambiguationOutcome {
  algorithm: DisambiguationAlgorithm;
  chosen_city: string | null;
  probability: number;
  candidates: Array<{ city: string; probability: number }>;
  auto_assigned: boolean;
  needs_review: boolean;
}
