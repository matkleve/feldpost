import type {
  DisambiguationAlgorithm,
  DisambiguationCandidate,
  DisambiguationContext,
  DisambiguationOutcome,
} from './disambiguation-strategy';

const MIN_SCORE = 0.0001;
const KM_EARTH_RADIUS = 6371;
const DEGREE_DIVISOR = 180;
const DISTANCE_DECAY = -0.1;
const DISTANCE_FALLBACK_SCORE = 0.3;
const CLUSTER_ZIP_WEIGHT = 0.35;
const CLUSTER_COUNTRY_WEIGHT = 0.2;
const CLUSTER_CONFIDENCE_WEIGHT = 0.45;
const CONFIDENCE_FALLBACK = 0.5;
const DISTANCE_STREET_WEIGHT = 0.35;
const DISTANCE_HOUSE_WEIGHT = 0.35;
const DISTANCE_ZIP_WEIGHT = 0.3;
const DEFAULT_PRIOR = 0.1;
const ZIP_LIKELIHOOD_TRUE = 0.9;
const ZIP_LIKELIHOOD_FALSE = 0.4;
const COUNTRY_LIKELIHOOD_TRUE = 0.9;
const COUNTRY_LIKELIHOOD_FALSE = 0.5;
const STREET_LIKELIHOOD_TRUE = 0.8;
const STREET_LIKELIHOOD_FALSE = 0.55;
const HOUSE_LIKELIHOOD_TRUE = 0.8;
const HOUSE_LIKELIHOOD_FALSE = 0.6;
const AUTO_ASSIGN_THRESHOLD_DEFAULT = 0.95;
const REVIEW_LOWER_BOUND_DEFAULT = 0.7;

function clampProbability(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function normalize(
  candidates: Array<{ city: string; score: number }>,
): Array<{ city: string; probability: number }> {
  const positive = candidates.map((entry) => ({
    city: entry.city,
    score: Math.max(MIN_SCORE, entry.score),
  }));
  const total = positive.reduce((sum, entry) => sum + entry.score, 0);
  if (total <= 0) return positive.map((entry) => ({ city: entry.city, probability: 0 }));
  return positive
    .map((entry) => ({ city: entry.city, probability: clampProbability(entry.score / total) }))
    .sort((a, b) => b.probability - a.probability);
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number): number => (deg * Math.PI) / DEGREE_DIVISOR;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s1 + s2), Math.sqrt(1 - s1 - s2));
  return KM_EARTH_RADIUS * c;
}

export function rankByClusterMajority(
  candidates: readonly DisambiguationCandidate[],
  ctx: DisambiguationContext,
): Array<{ city: string; probability: number }> {
  const freq = new Map<string, number>();
  for (const city of ctx.batchResolvedCities ?? []) freq.set(city, (freq.get(city) ?? 0) + 1);
  const maxFreq = Math.max(1, ...freq.values(), 1);

  return normalize(
    candidates.map((candidate) => {
      const prior = (freq.get(candidate.city) ?? 0) / maxFreq;
      const feature =
        CLUSTER_ZIP_WEIGHT * (candidate.zipMatch ? 1 : 0) +
        CLUSTER_COUNTRY_WEIGHT * (candidate.countryMatch ? 1 : 0) +
        CLUSTER_CONFIDENCE_WEIGHT * (candidate.parserConfidence ?? CONFIDENCE_FALLBACK);
      return { city: candidate.city, score: prior + feature };
    }),
  );
}

export function rankByDistanceWeighted(
  candidates: readonly DisambiguationCandidate[],
  ctx: DisambiguationContext,
): Array<{ city: string; probability: number }> {
  const centroid = ctx.clusterCentroid;
  return normalize(
    candidates.map((candidate) => {
      const distanceScore =
        centroid && Number.isFinite(candidate.cityLat) && Number.isFinite(candidate.cityLng)
          ? Math.exp(
              DISTANCE_DECAY *
                haversineKm({ lat: candidate.cityLat!, lng: candidate.cityLng! }, centroid),
            )
          : DISTANCE_FALLBACK_SCORE;
      const feature =
        DISTANCE_STREET_WEIGHT * (candidate.streetExact ? 1 : 0) +
        DISTANCE_HOUSE_WEIGHT * (candidate.houseNumberExact ? 1 : 0) +
        DISTANCE_ZIP_WEIGHT * (candidate.zipMatch ? 1 : 0);
      return { city: candidate.city, score: distanceScore + feature };
    }),
  );
}

export function rankByBayesianContext(
  candidates: readonly DisambiguationCandidate[],
  ctx: DisambiguationContext,
): Array<{ city: string; probability: number }> {
  const fallbackPrior = ctx.defaultPrior ?? DEFAULT_PRIOR;
  return normalize(
    candidates.map((candidate) => {
      const prior = ctx.cityPrior?.[candidate.city] ?? fallbackPrior;
      const likelihood =
        (candidate.zipMatch ? ZIP_LIKELIHOOD_TRUE : ZIP_LIKELIHOOD_FALSE) *
        (candidate.countryMatch ? COUNTRY_LIKELIHOOD_TRUE : COUNTRY_LIKELIHOOD_FALSE) *
        (candidate.streetExact ? STREET_LIKELIHOOD_TRUE : STREET_LIKELIHOOD_FALSE) *
        (candidate.houseNumberExact ? HOUSE_LIKELIHOOD_TRUE : HOUSE_LIKELIHOOD_FALSE);
      return { city: candidate.city, score: prior * likelihood };
    }),
  );
}

export function runDisambiguation(
  algorithm: DisambiguationAlgorithm,
  candidates: readonly DisambiguationCandidate[],
  ctx: DisambiguationContext,
  autoAssignThreshold = AUTO_ASSIGN_THRESHOLD_DEFAULT,
  reviewLowerBound = REVIEW_LOWER_BOUND_DEFAULT,
): DisambiguationOutcome {
  const ranked =
    algorithm === 'distance-weighted'
      ? rankByDistanceWeighted(candidates, ctx)
      : algorithm === 'bayesian-context'
        ? rankByBayesianContext(candidates, ctx)
        : rankByClusterMajority(candidates, ctx);

  const top = ranked[0];
  const topProbability = top?.probability ?? 0;
  return {
    algorithm,
    chosen_city: topProbability >= autoAssignThreshold ? (top?.city ?? null) : null,
    probability: topProbability,
    candidates: ranked,
    auto_assigned: topProbability >= autoAssignThreshold,
    needs_review: topProbability >= reviewLowerBound && topProbability < autoAssignThreshold,
  };
}
