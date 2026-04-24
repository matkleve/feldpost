# Upload Location Config

## What It Is

Upload Location Config is the canonical contract for upload-location parsing thresholds, folder-hint precedence, and disambiguation parameters used by the upload pipeline. It owns the values that decide when parsed text becomes a resolved location, when ambiguity must be shown to the user, and when EXIF may assist a text-based candidate.

## What It Looks Like

This service is invisible to users. Its behavior surfaces only through upload triage: title/folder parsing, ambiguity prompts, missing-data routing, and whether EXIF can reconcile or override a textual candidate.

## Where It Lives

- Service: `UploadLocationConfigService` in `core/upload/upload-location-config.service.ts`
- Consumers: `FilenameParserService`, `LocationPathParserService`, `UploadManagerService`, folder scan and upload routing helpers
- Trigger: any upload path that needs to compare file-title, folder-title, and EXIF-derived location candidates

## Actions

| #   | Trigger                                         | System Response                                                                  | Notes                                                   |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | Parser evaluates a text candidate               | Returns confidence thresholds and precedence rules for the candidate pipeline    | File title wins over folder title when both are present |
| 2   | Folder path yields a location hint              | Applies folder-level defaults only when file-level candidate is absent or weaker | Folder hints are defaults, not forced overrides         |
| 3   | Parser encounters ambiguous street/city matches | Exposes threshold values for disambiguation and user prompt routing              | Auto-assign only above configured threshold             |
| 4   | EXIF and text-derived coordinates both exist    | Exposes the tolerance used for mismatch detection and reconciliation             | Upload preserves both sources                           |
| 5   | No resolvable candidate exists                  | Returns the missing-data contract values used by upload routing                  | Drives `missing_gps` / `document_unresolved` outcomes   |

## Component Hierarchy

```text
UploadLocationConfigService
├── Title confidence thresholds
├── Folder hint precedence rules
├── EXIF assist radius
└── Disambiguation thresholds
```

## Data

| Field                               | Type      | Purpose                                                                    |
| ----------------------------------- | --------- | -------------------------------------------------------------------------- |
| `titleConfidenceThreshold`          | `number`  | Minimum confidence for a parsed text candidate to enter the geocoding path |
| `disambiguationAutoAssignThreshold` | `number`  | Minimum probability for automatic candidate selection                      |
| `exifAssistRadiusMeters`            | `number`  | Radius used when EXIF assists textual disambiguation                       |
| `folderHintRequireHighConfidence`   | `boolean` | Whether folder hints may only come from high-confidence segment matches    |
| `folderHintUseRootFallback`         | `boolean` | Whether the root folder hint may be used as fallback only                  |
| `filenameAlwaysOverridesFolder`     | `boolean` | Whether file-level text always overrides folder-level defaults             |
| `minMeaningfulScore`                | `number`  | Minimum geocoding score for a candidate to remain meaningful               |
| `minTopGap`                         | `number`  | Minimum score gap between top candidates for an automatic decision         |

### Configurable Algorithm Constants (Canonical)

All algorithm variables of `UploadLocationConfigService` are configurable constants.
Source of truth: `apps/web/src/app/core/upload/upload-location-config.ts`.

| Constant | Type | Default | Purpose |
| --- | --- | --- | --- |
| `exifAssistRadiusMeters` | `number` | `300` | EXIF assist radius for narrowing ambiguous geocode candidates. |
| `minMeaningfulScore` | `number` | `0.55` | Minimum geocode score for a candidate to be considered meaningful. |
| `minTopGap` | `number` | `0.1` | Minimum score gap between rank 1 and rank 2 for automatic selection. |
| `titleConfidenceThreshold` | `number` | `0.8` | Minimum parser confidence needed to treat filename/folder text as resolvable location input. |
| `folderHierarchyTraversalOrder` | `'leaf-to-root' \| 'root-to-leaf'` | `'leaf-to-root'` | Traversal direction for directory segment scoring. |
| `folderHintRequireHighConfidence` | `boolean` | `true` | Restricts folder hints to high-confidence segment matches. |
| `folderHintUseRootFallback` | `boolean` | `true` | Allows root-level folder hint only as fallback. |
| `filenameAlwaysOverridesFolder` | `boolean` | `true` | Enforces file-level textual location precedence over folder-level hints. |
| `maxDirectorySegmentsForHint` | `number` | `32` | Guardrail for maximum directory depth considered during hint extraction. |
| `clusterAssistWeight.project` | `number` | `0.7` | Ranking weight for project cluster proximity in disambiguation. |
| `clusterAssistWeight.company` | `number` | `0.3` | Ranking weight for company cluster proximity in disambiguation. |
| `geocodeCacheTtlMs` | `number` | `300000` | TTL for cached geocoding responses. |
| `geocodeMaxProxyAttempts` | `number` | `3` | Maximum retry attempts for proxied geocode requests. |
| `geocodeLogDedupWindowMs` | `number` | `30000` | Deduplication window for repeated geocode error logs. |
| `geocodeAuthFailureCooldownMs` | `number` | `120000` | Cooldown after auth-related geocode failures before retrying. |
| `parserBaseConfidence` | `number` | `0.5` | Baseline confidence used by filename/path parser scoring. |
| `parserCityStreetIncrement` | `number` | `0.2` | Confidence increment for city+street signals in parser scoring. |
| `parserZipIncrement` | `number` | `0.25` | Confidence increment when postal code signal is present. |
| `disambiguationAutoAssignThreshold` | `number` | `0.95` | Probability threshold for automatic city/address assignment. |
| `disambiguationReviewLowerBound` | `number` | `0.7` | Lower probability bound for candidate review instead of immediate rejection. |
| `disambiguationZipCandidateProbability` | `number` | `0.8` | Base probability for candidates with matching ZIP evidence. |
| `disambiguationDefaultCandidateProbability` | `number` | `0.2` | Base probability for candidates without ZIP support. |
| `disambiguationAlgorithm` | `'cluster-majority'` | `'cluster-majority'` | Disambiguation algorithm identifier used by city ranking flow. |
| `filenameSingleWordMinLength` | `number` | `8` | Minimum length for single-word street fallback parsing. |
| `filenameSingleWordCityMinLength` | `number` | `3` | Minimum city token length in single-word fallback parsing. |
| `filenameMultiWordTokenMinLength` | `number` | `3` | Minimum token length in multi-word filename parsing fallback. |
| `filenameTrailingArtifactMinDigits` | `number` | `3` | Lower bound for numeric trailing artifact stripping in filenames. |
| `filenameTrailingArtifactMaxDigits` | `number` | `6` | Upper bound for numeric trailing artifact stripping in filenames. |
| `geocodeSearchDefaultLimit` | `number` | `10` | Default forward-geocode result limit. |

## State

No mutable user-facing state is owned here. The service exposes a deterministic configuration object.

## File Map

| File                                                                         | Purpose                            |
| ---------------------------------------------------------------------------- | ---------------------------------- |
| `docs/specs/service/media-upload-service/upload-location-config.md`          | Canonical location-config contract |
| `apps/web/src/app/core/upload/upload-location-config.service.ts`             | Runtime configuration source       |
| `apps/web/src/app/core/upload/upload-manager.service.ts`                     | Upload orchestration consumer      |
| `apps/web/src/app/core/filename-parser/filename-parser.service.ts`           | Filename candidate consumer        |
| `apps/web/src/app/core/location-path-parser/location-path-parser.service.ts` | Path candidate consumer            |

## Wiring

### Injected Services

- `UploadLocationConfigService` is provided in root and consumed by location parsing and upload orchestration services.

### Inputs / Outputs

- Inputs: none. Configuration is read-only.
- Outputs: deterministic config values consumed by parser and upload services.

### Subscriptions

None.

### Supabase Calls

None.

## Acceptance Criteria

- [ ] File-level text always overrides folder-level defaults when both are present.
- [ ] Folder hints can only win when file-level confidence is absent or lower.
- [ ] Ambiguous address candidates use the configured disambiguation threshold before auto-assigning.
- [ ] EXIF-assisted reconciliation uses the configured radius and preserves both source values.
- [ ] Missing-data routing uses the same config contract across upload entry points.
