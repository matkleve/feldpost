export interface UploadLocationConfig {
  exifAssistRadiusMeters: number;
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
}

export const DEFAULT_UPLOAD_LOCATION_CONFIG: UploadLocationConfig = {
  exifAssistRadiusMeters: 300,
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
};
