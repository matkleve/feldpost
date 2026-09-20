export interface UploadLocationConfig {
  /**
   * Meters: folder/file text geocode vs EXIF metadata — auto-agree or `source` tray.
   * Not the org km cap (`contextDistanceMaxMeters` in Search Tuning).
   * @see docs/specs/service/search/search-tuning.distance-radii-contract.md
   */
  sourceAgreementRadiusMeters: number;
  /**
   * Meters: post-upload mismatch audit tolerance (title-geocode coords vs EXIF coords).
   * Differences within this radius are treated as the same location.
   * @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md
   */
  mismatchToleranceMeters: number;
  /**
   * Meters: among multiple geocode hits, prefer candidate within this distance of EXIF;
   * Step 7 pin nudge. Not the org km “internet results” realism cap.
   * @see docs/specs/service/search/search-tuning.distance-radii-contract.md
   */
  exifAssistRadiusMeters: number;
  /**
   * Meters: house-scale radius for D-09 — may EXIF supply a house number for a street the path
   * established without one. **Deliberately not `exifAssistRadiusMeters`.** That value answers
   * "which of these candidates does the GPS favour", where 80 m usefully contains one candidate;
   * this one answers "is this the house", where 80 m contains an entire terrace row. A separate
   * constant also stops the two meanings being tuned into each other later.
   *
   * `null` keeps the rule inert. STUDY-007 § 7 declines to name a value without a real device
   * export, and a guessed default would be exactly the invented precision the rule exists to
   * prevent — so the number is an explicit decision, not a default. Issue #221.
   * @see docs/specs/service/media-upload-service/upload-exif-house-number.supplement.md
   */
  exifHouseNumberRadiusMeters: number | null;
  /**
   * Meters: when SO has units and Photon returns multiple hits, pairwise distance above this
   * keeps ambiguous tray (units are not added to grouping_key).
   * @see docs/specs/service/media-upload-service/upload-search-object.md#photon-multi-hit-gate
   */
  unitGeocodeSplitMinMeters: number;
  /** Step 4: EXIF reverse superset check enabled. */
  exifContextCheck: boolean;
  /** `street_only` default country code (ISO). */
  defaultGeocodeCountry: string;
  /** Token normalizer fuzzy match minimum score. */
  tokenNormalizerFuzzyThreshold: number;
  /** Max dialogue units per resolver tray presentation bundle. */
  presentationBundleMaxDialogueUnits: number;
  minMeaningfulScore: number;
  minTopGap: number;
  titleConfidenceThreshold: number;
  folderHierarchyTraversalOrder: 'leaf-to-root' | 'root-to-leaf';
  folderHintRequireHighConfidence: boolean;
  folderHintUseRootFallback: boolean;
  filenameAlwaysOverridesFolder: boolean;
  maxDirectorySegmentsForHint: number;
  clusterAssistWeight: {
    project: number;
    company: number;
  };
  geocodeCacheTtlMs: number;
  geocodeMaxProxyAttempts: number;
  geocodeLogDedupWindowMs: number;
  geocodeAuthFailureCooldownMs: number;
  parserBaseConfidence: number;
  parserCityStreetIncrement: number;
  parserZipIncrement: number;
  disambiguationAutoAssignThreshold: number;
  disambiguationReviewLowerBound: number;
  disambiguationZipCandidateProbability: number;
  disambiguationDefaultCandidateProbability: number;
  disambiguationAlgorithm: 'cluster-majority';
  filenameSingleWordMinLength: number;
  filenameSingleWordCityMinLength: number;
  filenameMultiWordTokenMinLength: number;
  filenameTrailingArtifactMinDigits: number;
  filenameTrailingArtifactMaxDigits: number;
  geocodeSearchDefaultLimit: number;
  /**
   * D-11 street corroboration pre-check (admin_level_conflict/C3): explicit, higher-than-default
   * result cap so a street common enough to exist in many towns doesn't have both C3 candidates
   * fall outside the page and produce a false single-match.
   * @see docs/specs/service/media-upload-service/contradiction-resolution-model.c3-street-corroboration.supplement.md#cost
   */
  streetCorroborationSearchLimit: number;
}

export const DEFAULT_UPLOAD_LOCATION_CONFIG: UploadLocationConfig = {
  sourceAgreementRadiusMeters: 150,
  mismatchToleranceMeters: 15,
  exifAssistRadiusMeters: 80,
  // Unset on purpose — see the field's doc comment. Setting a number turns D-09 on.
  exifHouseNumberRadiusMeters: null,
  unitGeocodeSplitMinMeters: 25,
  exifContextCheck: true,
  defaultGeocodeCountry: 'AT',
  tokenNormalizerFuzzyThreshold: 0.85,
  presentationBundleMaxDialogueUnits: 5,
  minMeaningfulScore: 0.55,
  minTopGap: 0.1,
  titleConfidenceThreshold: 0.8,
  folderHierarchyTraversalOrder: 'leaf-to-root',
  folderHintRequireHighConfidence: true,
  folderHintUseRootFallback: true,
  filenameAlwaysOverridesFolder: true,
  maxDirectorySegmentsForHint: 32,
  clusterAssistWeight: {
    project: 0.7,
    company: 0.3,
  },
  geocodeCacheTtlMs: 300000,
  geocodeMaxProxyAttempts: 3,
  geocodeLogDedupWindowMs: 30000,
  geocodeAuthFailureCooldownMs: 120000,
  parserBaseConfidence: 0.5,
  parserCityStreetIncrement: 0.2,
  parserZipIncrement: 0.25,
  disambiguationAutoAssignThreshold: 0.95,
  disambiguationReviewLowerBound: 0.7,
  disambiguationZipCandidateProbability: 0.8,
  disambiguationDefaultCandidateProbability: 0.2,
  disambiguationAlgorithm: 'cluster-majority',
  filenameSingleWordMinLength: 8,
  filenameSingleWordCityMinLength: 3,
  filenameMultiWordTokenMinLength: 3,
  filenameTrailingArtifactMinDigits: 3,
  filenameTrailingArtifactMaxDigits: 6,
  geocodeSearchDefaultLimit: 10,
  streetCorroborationSearchLimit: 50,
};
