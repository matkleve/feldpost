/**
 * Which tray question a classified group would ask, and of what kind (#229).
 *
 * ## Why this exists
 *
 * STUDY-009's budget needs question counts **by kind** at 10 000 files. The real pipeline decides
 * the kind across five services, behind Angular DI, one geocode at a time — fine for the curated
 * corpus, not for 10 000 paths × five shapes × three sizes.
 *
 * So this predicts it. That makes it a **second implementation of a decision the pipeline already
 * makes**, which is the shape this repository loses most time to. Two things keep it honest:
 *
 * 1. Every decision below calls the production function rather than restating its rule —
 *    `resolveLayersForJob`, `evaluateLocalResolution`, `classifySearchHits`. What is encoded here is
 *    only the *routing* between them, which lives in service methods that cannot be called without
 *    a batch.
 * 2. `upload-trace-question-kind.spec.ts` runs the real pipeline over the same corpus and asserts
 *    the kind histograms match. Change the routing without changing this, and that test fails.
 *
 * ## The routing, and where each line comes from
 *
 * ```
 * areaConflicts present        → admin_level_conflict   tray-flow.service.ts registerAreaConflictGroup
 * packageConflict present      → layer_package          tray-flow.service.ts registerLayerPackageGroup
 * gate incomplete/postcode_blocked → no question        orchestrator: status 'partial', no geocode
 * gate area_only               → no question            orchestrator: status 'partial' (D-10)
 * gate street_only             → branch 'street_only'   orchestrator
 *     hits ambiguous           → city_step  (1a)        geocode-outcome.util.ts
 *     hits auto, no houseNumber→ house_step (1b)        geocode-group.service.ts resolveAutoGeocodeOutcome
 *     hits auto, houseNumber   → no question
 *     hits failed/none         → city_step  (1a)        geocode-outcome.util.ts fallback
 * gate street_locality/bias    → branch 'street_locality'
 *     hits ambiguous           → geocode    (step 3)    geocode-outcome.util.ts
 *     hits auto                → no question
 *     hits failed/none         → no question, partial   geocode-group.service.ts — only the
 *                                                       street-first branches get a fallback tray
 * ```
 *
 * **Not predicted: `source` and `containment_check`.** Both need inputs this pass does not have — a
 * per-file EXIF coordinate compared against the text geocode, and an area geometry to test a point
 * against. Counting them as zero would be a claim; `unpredictedKinds` names them instead, so a
 * report built on this can say what it does not cover.
 *
 * @see https://github.com/matkleve/feldpost/issues/229
 * @see docs/playbooks/upload-pipeline-trace.md
 */

import { resolveLayersForJob } from '../../location-path-parser/upload-search-object.layer-map';
import {
  buildStreetOnlyCity01Candidates,
  classifySearchHits,
  deriveFolderDisplayPath,
  evaluateLocalResolution,
  filterGeocodeHitsByContextDistance,
  shouldForceStreetOnlyCityTray,
} from '../location/upload-location-resolution.helpers';
import { SEARCH_TUNING_SYSTEM_DEFAULTS } from '../../search/search-tuning.defaults';
import { DEFAULT_UPLOAD_LOCATION_CONFIG } from '../location/upload-location-config';
import { stubReverse, stubStructuredForward } from './upload-trace-geocoder.stub';
import type { RealGeoData } from './upload-trace-harness';
import type { UploadDisambiguationKind } from '../upload-manager.types';
import type { UploadSearchObject } from '../address-resolution/upload-address-resolution.types';
import type { ClassifySearchOutcome } from '../location/upload-location-resolution.helpers';
import type { UploadGeocodeBranch } from '../address-resolution/upload-address-resolution.types';

/** Kinds this pass cannot reach. Named rather than silently counted as zero. */
export const UNPREDICTED_KINDS: readonly UploadDisambiguationKind[] = ['source', 'containment_check'];

export type NoQuestionReason =
  /** Complete enough to resolve without asking. */
  | 'resolved'
  /** Area precision is a deliberate result, not a failure (D-10). */
  | 'area_only'
  /** Nothing usable; the job goes to the Clarifications lane rather than to a tray. */
  | 'clarifications';

export type GroupQuestion =
  | { asks: false; reason: NoQuestionReason }
  | { asks: true; kind: UploadDisambiguationKind };

/** Which geocode branch the local gate routes a group to (orchestrator: `classifyBatch`). */
function branchForGate(gate: ReturnType<typeof evaluateLocalResolution>): UploadGeocodeBranch {
  if (gate === 'street_only') {
    return 'street_only' as const;
  }
  return gate === 'street_project_bias'
    ? ('street_project_bias' as const)
    : ('street_locality' as const);
}

/**
 * Run the group's geocode the way `runGeocodeForGroup` does: build the branch's request shape, drop
 * hits too far from where the camera stood, classify with EXIF available, then apply CITY-01.
 */
function geocodeOutcomeForGroup(
  so: UploadSearchObject,
  branch: UploadGeocodeBranch,
  exifCoords: { lat: number; lng: number } | undefined,
): ClassifySearchOutcome {
  const countryCode = so.country ?? 'AT';
  // `street_only` deliberately drops city and postcode — having them is what makes a group not
  // street_only in the first place.
  const hits = stubStructuredForward(
    branch === 'street_only'
      ? { street: so.street ?? '', countryCode }
      : {
          street: [so.street, so.houseNumber].filter(Boolean).join(' ').trim(),
          city: so.city ?? undefined,
          postcode: so.postcode ?? undefined,
          countryCode,
        },
  );

  const filtered = filterGeocodeHitsByContextDistance(
    hits,
    exifCoords,
    undefined,
    SEARCH_TUNING_SYSTEM_DEFAULTS.resolver.contextDistanceMaxMeters,
  );
  const outcome = classifySearchHits(filtered, DEFAULT_UPLOAD_LOCATION_CONFIG, exifCoords);

  if (outcome.kind !== 'auto' || !exifCoords) {
    return outcome;
  }
  const exifReverseCity = stubReverse(exifCoords.lat, exifCoords.lng)?.city ?? null;
  if (!shouldForceStreetOnlyCityTray({ geocodeBranch: branch, searchObject: so }, outcome, exifReverseCity)) {
    return outcome;
  }
  return {
    kind: 'ambiguous' as const,
    candidates: buildStreetOnlyCity01Candidates(outcome.candidate, exifReverseCity!, exifCoords),
  };
}

/**
 * One question decision for one already-merged group. Pure; the geocoder is the trace stub.
 *
 * `exifCoords` is the **first job's** EXIF, which is what the pipeline reads
 * (`geocode-group.service.ts`: `jobState.findJob(group.jobIds[0])`). It is not decoration — it
 * changes the answer twice over, and leaving it out under-counted by one on a 120-file corpus:
 * `Währinger Straße 10` geocodes to a single Wien hit and looks resolved, until the context-distance
 * filter drops that hit for being far from where the camera was, and the group falls back to 1a.
 */
export function classifyGroupQuestion(
  so: UploadSearchObject,
  exifCoords?: { lat: number; lng: number },
): GroupQuestion {
  if (so.areaConflicts?.length) {
    return { asks: true, kind: 'admin_level_conflict' };
  }

  const gate = evaluateLocalResolution(so, null);
  if (gate === 'incomplete' || gate === 'postcode_blocked') {
    return { asks: false, reason: 'clarifications' };
  }
  if (gate === 'area_only') {
    return { asks: false, reason: 'area_only' };
  }

  const branch = branchForGate(gate);
  const streetOnly = branch === 'street_only';
  const outcome = geocodeOutcomeForGroup(so, branch, exifCoords);

  if (outcome.kind === 'ambiguous') {
    return { asks: true, kind: streetOnly ? 'city_step' : 'geocode' };
  }
  if (outcome.kind === 'auto') {
    // A street_only group that geocoded to one place still has no house number to show for it.
    return streetOnly && !so.houseNumber?.trim()
      ? { asks: true, kind: 'house_step' }
      : { asks: false, reason: 'resolved' };
  }
  // failed / none. Only the street-first branches fall back to a tray; a `street_locality` group
  // whose geocode came back empty goes partial and asks nothing — the item lands in Clarifications.
  return branch === 'street_locality'
    ? { asks: false, reason: 'clarifications' }
    : { asks: true, kind: 'city_step' };
}

export interface PredictedQuestions {
  files: number;
  groups: number;
  kinds: UploadDisambiguationKind[];
  /** Groups that resolve without asking, by why. */
  silent: Record<NoQuestionReason, number>;
}

/**
 * Classify a corpus the way the pipeline does: merge to groups first, then ask once per group.
 *
 * The merge is the point. STUDY-009's Correction 1 is that file count and question count are only
 * loosely related, and this is where that becomes measurable: 10 000 files in one folder are one
 * group and at most one question.
 */
export interface CorpusItem {
  relativePath: string;
  /** Injected EXIF GPS, as the generator produces it. */
  exifCoords?: { lat: number; lng: number };
}

export function predictTrayQuestionsForCorpus(
  items: readonly (string | CorpusItem)[],
  geo: RealGeoData,
): PredictedQuestions {
  /** First file wins, mirroring `jobState.findJob(group.jobIds[0])`. */
  const groups = new Map<string, { so: UploadSearchObject; exifCoords?: { lat: number; lng: number } }>();

  for (const item of items) {
    const { relativePath, exifCoords } =
      typeof item === 'string' ? { relativePath: item, exifCoords: undefined } : item;
    const leaf = relativePath.split('/').pop() ?? '';
    const layers = resolveLayersForJob(
      relativePath,
      leaf,
      geo,
      deriveFolderDisplayPath(relativePath),
    );
    const so = layers.searchObject;
    // Keyed the way the pipeline keys its registrations, which is not the same rule for both:
    //  - layer_package uses `layerConflictQueryKey`, set during classification
    //    (tray-flow.service.ts registerLayerPackageGroup)
    //  - admin_level_conflict uses `areaConflictQueryKey ?? groupingKey`, and that key is only
    //    assigned later, while a tray is being answered — so at registration it is the grouping
    //    key (tray-flow.service.ts registerAreaConflictGroup)
    // Keying admin conflicts by their conflicting *field* instead merges two different addresses
    // that happen to disagree about the same field, and undercounts the questions.
    const key = layers.packageConflict
      ? `layer_conflict|${layers.packageConflict.layerConflictQueryKey}`
      : so.groupingKey;
    if (!groups.has(key)) {
      groups.set(key, { so, exifCoords });
    }
  }

  const kinds: UploadDisambiguationKind[] = [];
  const silent: Record<NoQuestionReason, number> = { resolved: 0, area_only: 0, clarifications: 0 };

  for (const [key, entry] of groups) {
    const question = key.startsWith('layer_conflict|')
      ? ({ asks: true, kind: 'layer_package' } as const)
      : classifyGroupQuestion(entry.so, entry.exifCoords);
    if (question.asks) {
      kinds.push(question.kind);
    } else {
      silent[question.reason] += 1;
    }
  }

  return { files: items.length, groups: groups.size, kinds, silent };
}
