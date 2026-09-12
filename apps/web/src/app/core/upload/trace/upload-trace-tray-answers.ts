/**
 * Auto-answers resolver trays so a trace can run past the user gate and show the rest of the
 * pipeline (dedup → upload → media_items insert → address persist).
 *
 * It answers through the same service methods the tray UI's producer adapter calls
 * (`upload-location-tray-producer.adapter.ts`), and always picks the FIRST candidate. A real
 * user picks the right one; this picks the first, so coordinates past a tray are arbitrary —
 * what the trace is showing past this point is the *shape* of the remaining pipeline, not a
 * correct placement.
 *
 * @see docs/playbooks/upload-pipeline-trace.md § Real vs mock
 */

import {
  discriminatingFieldValue,
  pickDiscriminatingField,
} from '../location/upload-location-resolution.helpers';
import type { UploadDisambiguationGroup } from '../upload-manager.types';
import type { TraceHarness } from './upload-trace-harness';
import { waitForBatchSettled } from './upload-trace-harness';
import type { UploadTraceRecorder } from './upload-trace-recorder';

/** Bounded so a tray that never advances stops the loop instead of spinning. */
const MAX_TRAY_ROUNDS = 60;
/** Typed into the free-text city field when step 1A offers no candidates at all. */
const FALLBACK_CITY = 'Wien';
/** Short settle budget per answered tray — the batch may legitimately stay busy. */
const TRAY_SETTLE_POLLS = 100;

function openGroups(harness: TraceHarness): UploadDisambiguationGroup[] {
  return harness.locationResolution
    .disambiguationGroups()
    .filter((group) => group.resolutionGateOpen && group.resolutionStatus !== 'resolved');
}

function answerKey(group: UploadDisambiguationGroup): string {
  return `${group.id}:${group.disambiguationKind ?? 'geocode'}:${group.trayStep ?? '-'}`;
}

function cityForStep1a(group: UploadDisambiguationGroup): string | undefined {
  const picked = group.candidates[0];
  if (!picked) {
    return undefined;
  }
  const field = group.discriminatingField ?? pickDiscriminatingField(group.candidates);
  return (
    (field ? discriminatingFieldValue(picked, field) : undefined) ??
    picked.city ??
    picked.addressLabel
  );
}

function answerDetail(group: UploadDisambiguationGroup): Record<string, unknown> {
  return {
    kind: group.disambiguationKind ?? 'geocode',
    trayStep: group.trayStep,
    jobs: group.jobIds.length,
    candidates: group.candidates.length,
  };
}

function answerHouseStep(
  harness: TraceHarness,
  group: UploadDisambiguationGroup,
  recorder: UploadTraceRecorder,
): void {
  const houseId = group.houseNumberCandidates?.[0]?.id ?? null;
  recorder.record('tray', `answer 1b (house) → ${houseId ?? 'street centroid'}`, answerDetail(group));
  harness.locationResolution.applyTrayHouseSelection(group.id, houseId);
}

async function answerCityStep(
  harness: TraceHarness,
  group: UploadDisambiguationGroup,
  recorder: UploadTraceRecorder,
): Promise<void> {
  // A candidate-less 1A tray is the free-text city field; a real user types the city.
  const city = cityForStep1a(group) ?? FALLBACK_CITY;
  recorder.record('tray', `answer 1a (city) → ${city}`, {
    ...answerDetail(group),
    typed: group.candidates.length === 0,
  });
  await harness.locationResolution.confirmTrayCity(group.id, city);
}

function answerCandidatePick(
  harness: TraceHarness,
  group: UploadDisambiguationGroup,
  recorder: UploadTraceRecorder,
): void {
  const kind = group.disambiguationKind ?? 'geocode';
  const candidate = group.candidates[0];
  const jobId = group.jobIds[0];
  recorder.record(
    'tray',
    `answer ${kind} → ${candidate?.addressLabel ?? '(none)'}`,
    answerDetail(group),
    jobId,
  );
  if (!candidate) {
    return;
  }
  if (kind === 'containment_check') {
    harness.locationResolution.applyContainmentCheckChoice(group.id, candidate.id);
    return;
  }
  if (jobId) {
    harness.manager.selectAddressCandidate(jobId, candidate);
  }
}

async function answerGroup(
  harness: TraceHarness,
  group: UploadDisambiguationGroup,
  recorder: UploadTraceRecorder,
): Promise<void> {
  if (group.trayStep === '1b') {
    answerHouseStep(harness, group, recorder);
    return;
  }
  if (group.disambiguationKind === 'city_step' || group.trayStep === '1a') {
    await answerCityStep(harness, group, recorder);
    return;
  }
  answerCandidatePick(harness, group, recorder);
}

export interface TrayAnswerSummary {
  answered: number;
  /** Groups that stayed gated after being answered — the loop stopped rather than spin. */
  stalled: string[];
  /** True when the round cap was hit, i.e. answering kept producing new trays. */
  hitRoundCap: boolean;
}

/** Answer every open tray, first candidate each time, until nothing is gated. */
export async function autoAnswerTrays(
  harness: TraceHarness,
  recorder: UploadTraceRecorder,
): Promise<TrayAnswerSummary> {
  const seen = new Set<string>();
  const stalled: string[] = [];
  let answered = 0;
  let hitRoundCap = true;

  for (let round = 0; round < MAX_TRAY_ROUNDS; round += 1) {
    const open = openGroups(harness);
    const next = open.find((group) => !seen.has(answerKey(group)));
    if (!next) {
      for (const group of open) {
        stalled.push(`${group.disambiguationKind ?? 'geocode'}:${group.titleAddress}`);
      }
      hitRoundCap = false;
      break;
    }
    seen.add(answerKey(next));
    await answerGroup(harness, next, recorder);
    answered += 1;
    await waitForBatchSettled(harness.manager, TRAY_SETTLE_POLLS);
  }

  return { answered, stalled, hitRoundCap };
}
