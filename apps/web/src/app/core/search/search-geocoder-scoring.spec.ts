import { describe, expect, it } from 'vitest';
import {
  clamp01,
  computeGeocoderTextScore,
  computeGeocoderWeightedScore,
  computeShortPrefixNoisePenalty,
  isCandidateInViewport,
} from './search-geocoder-scoring';

describe('search-geocoder-scoring', () => {
  it('uses best text score from primary or formatted label', () => {
    const score = computeGeocoderTextScore('Cafe X', 'Wilhelminenstrasse 85, 1160 Wien', 'wilhe');
    expect(score).toBeGreaterThanOrEqual(0.9);
  });

  it('detects viewport inclusion', () => {
    const inViewport = isCandidateInViewport('A', 48.2, 16.3, {
      viewportBounds: { north: 48.3, east: 16.5, south: 48.1, west: 16.2 },
    });
    expect(inViewport).toBe(true);
  });

  it('assigns no short-prefix penalty for long queries', () => {
    const penalty = computeShortPrefixNoisePenalty(
      'wilhelminenstrasse',
      0.8,
      false,
      0.7,
      0.2,
      'Wilhelminenstrasse 85',
    );
    expect(penalty).toBe(0);
  });

  it('penalizes short prefix for out-of-viewport country mismatch', () => {
    const penalty = computeShortPrefixNoisePenalty(
      'wilhe',
      0.8,
      false,
      0.7,
      0.2,
      'Wilhelminenstrasse 85',
    );
    expect(penalty).toBeGreaterThanOrEqual(0.35);
  });

  it('penalizes short prefix with very weak geo score even without country mismatch', () => {
    const penalty = computeShortPrefixNoisePenalty(
      'wilhe',
      0.8,
      false,
      1,
      0.1,
      'Wilhelminenstrasse 85',
    );
    expect(penalty).toBeGreaterThanOrEqual(0.25);
  });

  it('does not penalize short prefix when in viewport and geo-strong', () => {
    const penalty = computeShortPrefixNoisePenalty(
      'wilhe',
      0.92,
      true,
      1.6,
      0.75,
      'Wilhelminenstrasse 85',
    );
    expect(penalty).toBe(0);
  });

  it('heavily penalizes short prefix when label first token does not start with query', () => {
    const penalty = computeShortPrefixNoisePenalty(
      'wilhe',
      0.8,
      false,
      1.6,
      0.75,
      'Calle Big Wilhe',
    );
    expect(penalty).toBeGreaterThanOrEqual(0.6);
  });

  it('weights geo stronger for short prefixes', () => {
    const short = computeGeocoderWeightedScore('wilhe', 0.9, 0.2, 0.9, 0.5, 0);
    const long = computeGeocoderWeightedScore('wilhelminenstrasse', 0.9, 0.2, 0.9, 0.5, 0);
    expect(short).toBeLessThan(long);
  });

  it('reduces final weighted score by noise penalty', () => {
    const clean = computeGeocoderWeightedScore('wilhe', 0.85, 0.7, 0.5, 0.5, 0);
    const noisy = computeGeocoderWeightedScore('wilhe', 0.85, 0.7, 0.5, 0.5, 0.3);
    expect(noisy).toBeLessThan(clean);
  });

  it('clamps scores below zero to zero', () => {
    expect(clamp01(-0.5)).toBe(0);
  });

  it('clamps scores above one to one', () => {
    expect(clamp01(1.7)).toBe(1);
  });

  it('keeps in-range scores unchanged', () => {
    expect(clamp01(0.42)).toBe(0.42);
  });
});
