# Search Bar - Data And Service V2

> **Parent spec:** [search-bar](search-bar.md)
> **Query behavior contract:** [search-bar-query-behavior](search-bar-query-behavior.md)

## What It Is

This spec defines the v2 data-flow and service architecture for personalized geosearch. It establishes strict boundaries for normalization, candidate retrieval, scoring, deduplication, fallback escalation, explanation labeling, and deterministic output ordering.

## What It Looks Like

Search remains progressive and non-blocking: typing feedback first, DB and recents second, geocoder append third. Ranking is personalized by active marker geography, active project geography, current user geography, and viewport geography. Irrelevant global candidates are strongly de-prioritized for short ambiguous prefixes unless user intent explicitly widens geography.

## Where It Lives

- **Parent**: `SearchBarComponent` orchestration contract
- **Core pipeline**: `SearchOrchestratorService` and search-core collaborators
- **Context source**: `MapShellComponent` + workspace/user state providers

## Actions

| #   | Trigger                     | System Response                                                | Phase              |
| --- | --------------------------- | -------------------------------------------------------------- | ------------------ |
| 1   | Debounced query             | Build context snapshot and run strict stage                    | `typing`           |
| 2   | Strict retrieval returns    | Emit partial ranked DB/recents output                          | `results-partial`  |
| 3   | Geocoder returns or fails   | Append geocoder results or preserve partial                    | `results-complete` |
| 3a  | Geocoder returns `401` once | Refresh auth session, retry geocoder once                      | `results-complete` |
| 3b  | Retry still `401`           | Sign out, redirect to login, preserve partial until route swap | `results-complete` |
| 4   | Strict quality insufficient | Escalate fallback widening stage                               | `results-complete` |
| 5   | Commit candidate            | Persist recency and update priors                              | commit path        |

### Pipeline Overview

```mermaid
flowchart TD
    A[Debounced Query] --> B[Build Personalization Context]
    B --> C[Normalize and Detect Intent]
    C --> D{Coordinate or URL}
    D -- Yes --> E[Commit Map Center]
    D -- No --> F[Strict Retrieval]
    F --> G[Score Candidates]
    G --> H[Deduplicate]
    H --> I[Deterministic Rank]
    I --> J{Stop Criteria Met}
    J -- Yes --> K[Emit Final]
    J -- No --> L[Widen Geography Stage]
    L --> F
```

### Progressive Rendering Timeline

```mermaid
sequenceDiagram
    participant UI as SearchBarComponent
    participant ORCH as SearchOrchestrator
    participant DB as DB Resolvers
    participant GEO as Geocoder Resolver
    participant AUTH as AuthService

    UI->>ORCH: query + context
    ORCH-->>UI: typing phase
    par DB/Recents
        ORCH->>DB: fetch db-address + db-content + recents
        DB-->>ORCH: db candidates
    and Geocoder
        ORCH->>GEO: fetch geocoder candidates
        alt geocoder 401 Invalid JWT
            GEO-->>ORCH: 401
            ORCH->>AUTH: refreshSession()
            alt refresh succeeds
                AUTH-->>ORCH: fresh session
                ORCH->>GEO: retry geocoder once
                GEO-->>ORCH: geocoder candidates or timeout
            else refresh fails
                AUTH-->>ORCH: refresh failed
                ORCH->>AUTH: signOut()
            end
        else geocoder success/timeout/non-401 error
            GEO-->>ORCH: geocoder candidates or timeout
        end
    end
    ORCH-->>UI: results-partial (DB/recents)
    ORCH-->>UI: results-complete (with geocoder if available)
```

### Fallback Widening Order

```mermaid
flowchart LR
    S0[Stage 0 Strict: viewport+country] --> S1[Stage 1 Project Region]
    S1 --> S2[Stage 2 User Priors]
    S2 --> S3[Stage 3 Global Open]
    S0 --> STOP[Stop When Criteria Met]
    S1 --> STOP
    S2 --> STOP
    S3 --> STOP
```

### Dedup Decision Tree

```mermaid
flowchart TD
    A[Incoming Candidate] --> B{Same normalized label?}
    B -- No --> C[Keep Candidate]
    B -- Yes --> D{Within 30m?}
    D -- Yes --> E[Merge Semantic + Spatial Duplicate]
    D -- No --> F{Same admin area?}
    F -- Yes --> G[Merge Semantic Duplicate]
    F -- No --> C
```

### Ranking Tie-Break Chain

```mermaid
flowchart TD
    A[Equal totalScore] --> B[Compare confidence rank]
    B --> C{Still tied?}
    C -- Yes --> D[Compare source priority]
    D --> E{Still tied?}
    E -- Yes --> F[Compare nearest geo distance]
    F --> G{Still tied?}
    G -- Yes --> H[Compare normalized label]
    H --> I{Still tied?}
    I -- Yes --> J[Compare stable id]
    I -- No --> K[Final Order]
```

## Component Hierarchy

```
Search Data Orchestration V2
├── SearchOrchestratorService
│   ├── TypingPhaseEmitter
│   ├── PartialPhaseEmitter
│   ├── CompletePhaseEmitter
│   └── StableOrderingReducer
├── SearchContextBuilderService
│   ├── ActiveMarkerContextBuilder
│   ├── ActiveProjectContextBuilder
│   ├── UserLocationContextBuilder
│   ├── ViewportContextBuilder
│   └── PriorsBuilder
├── SearchCandidateRetrievalService
│   ├── DbAddressRetriever
│   ├── DbContentRetriever
│   ├── GeocoderRetriever
│   └── RecentRetriever
├── SearchScoringServiceV2
│   ├── TextRelevanceScorer
│   ├── GeoPersonalizationScorer
│   ├── PriorScorer
│   └── AntiNoisePenaltyScorer
├── SearchDedupServiceV2
│   ├── SpatialDeduper
│   └── SemanticDeduper
└── SearchExplanationServiceV2
    ├── ConfidenceLabeler
    └── ExplanationTagBuilder
```

## Data

### Data Flow (Mermaid)

```mermaid
flowchart LR
  UI[UI Component] --> S[Service Layer]
  S --> DB[(Supabase Tables)]
  DB --> S
  S --> UI
```

### SearchQueryContextV2 Contract

```typescript
export interface SearchQueryContextV2 {
  organizationId?: string;
  activeProjectId?: string;
  activeMarkerCentroid?: { lat: number; lng: number };
  activeProjectCentroid?: { lat: number; lng: number };
  viewportBounds?: { north: number; east: number; south: number; west: number };
  currentLocation?: { lat: number; lng: number };
  countryCodes?: string[];
  userLocationPriors?: Array<{
    key: string;
    lat: number;
    lng: number;
    weight: number;
  }>;
  projectLocationPriors?: Array<{
    key: string;
    lat: number;
    lng: number;
    weight: number;
  }>;
  recencySignals?: {
    last24hWeight?: number;
    last30dWeight?: number;
    last180dWeight?: number;
  };
  activeFilterCount?: number;
  commandMode?: boolean;
  selectedGroupId?: string;
}
```

### Candidate Schema Additions

| Field                | Type                          | Purpose                        |
| -------------------- | ----------------------------- | ------------------------------ |
| `stableId`           | `string`                      | Final deterministic tie-break  |
| `textScore`          | `number`                      | Query match quality            |
| `geoScore`           | `number`                      | Personalized geo relevance     |
| `projectScore`       | `number`                      | Active project affinity        |
| `recencyScore`       | `number`                      | Recency prior contribution     |
| `sourceUtilityScore` | `number`                      | Source reliability utility     |
| `qualityScore`       | `number`                      | Candidate quality prior        |
| `noisePenalty`       | `number`                      | Short-prefix noise suppression |
| `totalScore`         | `number`                      | Final ranking score            |
| `confidenceLabel`    | `'high' \| 'medium' \| 'low'` | Confidence bucket              |
| `explanationTags`    | `string[]`                    | Human-readable ranking reasons |

## State

| Name                       | Type                                  | Default     | Controls                                |
| -------------------------- | ------------------------------------- | ----------- | --------------------------------------- |
| `phase`                    | `'typing' \| 'partial' \| 'complete'` | `'typing'`  | Progressive rendering stage             |
| `geoStatus`                | `'loading' \| 'loaded' \| 'error'`    | `'loading'` | Geocoder visibility                     |
| `geoAuthRecoveryAttempted` | `boolean`                             | `false`     | Single geocoder auth-refresh retry gate |
| `fallbackStage`            | `0 \| 1 \| 2 \| 3`                    | `0`         | Widening stage                          |
| `contextVersion`           | `number`                              | `0`         | Snapshot freshness                      |
| `stableRankingFingerprint` | `string`                              | `''`        | Stability assertions                    |
| `cacheTtlMs`               | `number`                              | `300000`    | Search cache lifetime                   |

## File Map

| File                                                           | Purpose                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| `docs/specs/ui/search-bar/search-bar-data-and-service.md` | Data and service contract for v2 personalized geosearch |

## Wiring

### Injected Services

- `SearchOrchestratorService` owns phase emission and final ordering.
- `SearchBarService` handles recents persistence and retrieval adapters.
- `GeocodingService` proxies all external geocoder access via edge function.
- `AuthService` performs session refresh and controlled sign-out when geocoder returns persistent `401`.
- `MapShellComponent` supplies live context signals via query context snapshot.

### Inputs / Outputs

None.

### Subscriptions

- Query stream: debounced stage entry.
- Context stream: re-score on context changes.
- Geocoder stream: cancellable (`switchMap`) and merged non-blockingly.

### Supabase Calls

- `media_items` table: address candidate retrieval.
- `projects` and share-set membership context (`share_sets`, `share_set_items`): content candidate retrieval.
- Edge function `geocode`: forward geocoder retrieval with bias params.
- Supabase Auth: `refreshSession()` on first geocoder `401`, then single retry.
- Supabase Auth: `signOut()` when retry also returns `401` or refresh fails.

### Sequence: Strict Then Widened Retrieval

```mermaid
sequenceDiagram
    participant ORCH as SearchOrchestrator
    participant RET as CandidateRetrieval
    participant SCORE as ScoringV2
    participant POL as FallbackPolicy

    ORCH->>RET: strict retrieval
    RET-->>ORCH: strict candidates
    ORCH->>SCORE: score strict candidates
    SCORE-->>ORCH: scored strict list
    ORCH->>POL: evaluate strict quality
    alt stop
        ORCH-->>ORCH: finalize deterministic ranking
    else continue
        ORCH->>RET: widened retrieval stage n+1
        RET-->>ORCH: widened candidates
        ORCH->>SCORE: rescore merged candidates
        SCORE-->>ORCH: scored merged list
    end
```

### Sequence: Commit And Priors Update

```mermaid
sequenceDiagram
    participant UI as SearchBarComponent
    participant ORCH as SearchOrchestrator
    participant SB as SearchBarService
    participant CTX as ContextBuilder

    UI->>ORCH: commit(candidate)
    ORCH->>SB: addRecentSearch(candidate.label)
    ORCH->>CTX: updateUserAndProjectPriors(candidate)
    CTX-->>ORCH: new prior snapshot version
    ORCH-->>UI: commit action result
```

Ranking math, fallback policy, and quality metrics (before Acceptance Criteria): **[search-bar-data-and-service.ranking-metrics.supplement.md](./search-bar-data-and-service.ranking-metrics.supplement.md)**.

## Acceptance Criteria

### Architecture Boundaries

- [ ] Normalization, retrieval, scoring, deduplication, fallback policy, and explanation are defined as separate service boundaries.
- [ ] Component layer contains no direct scoring or fallback logic.
- [x] Geocoder access remains proxy-only via service adapters.

### Context And Personalization

- [x] Context includes active marker geography, active project geography, current location geography, and viewport geography.
- [ ] Context includes user and project location priors with recency decay windows.
- [x] Missing context signals use neutral defaults and do not throw.

### Scoring, Dedup, And Determinism

- [ ] Final ranking uses explicit weighted scoring terms and anti-noise penalty.
- [ ] Dedup uses semantic and spatial checks, with deterministic representative selection.
- [ ] Deterministic tie-break chain is applied exactly as specified.
- [ ] Global fallback candidates include explicit explanation labels.

### Fallback And Suggestions

- [x] Strict stage is always executed before widening stages.
- [ ] Widening proceeds only in the specified order and stops at first valid stage.
- [ ] Suggestion row appears only when confidence and score-lift thresholds are met.

### Progressive UX And Performance

- [x] Typing/partial/complete phases remain non-blocking.
- [x] Geocoder timeout or error never suppresses DB partial output.
- [ ] Geocoder `401` triggers exactly one silent auth refresh and exactly one retry (no retry loop).
- [ ] Geocoder `401` with failed refresh or failed retry triggers controlled sign-out without requiring manual storage clearing.
- [ ] Latency and stability quality gates pass before full rollout.

## Rollout Plan Contract

1. `search_v2_shadow`: compute v2 scores in shadow mode.
2. `search_v2_rank_10pct`: enable ranked output for canary users.
3. `search_v2_prefix_guard`: apply v2 logic for ambiguous prefixes first.
4. `search_v2_full`: full v2 rollout.
5. Remove v1 path only after 14 consecutive days of gate compliance.

