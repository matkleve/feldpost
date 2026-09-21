/**
 * The question-kind predictor, pinned against the real pipeline (#229).
 *
 * #229 needs tray questions counted **by kind** at 10 000 files. Driving the whole Angular stack at
 * that size is not viable, so the scale harness predicts the kind a group would produce from its
 * Search Object and its geocoder hits. That prediction is a second implementation of a decision the
 * pipeline already makes across five services, and a second implementation drifts.
 *
 * This is the gate that stops it. The real harness runs the curated corpus through the actual
 * pipeline and registers actual `disambiguationKind`s; the predictor runs over the same corpus; the
 * two histograms must match. If someone changes the tray routing and not the predictor, the
 * measurement stops agreeing with the thing it claims to measure, and this fails.
 *
 * @see docs/playbooks/upload-pipeline-trace.md
 * @see https://github.com/matkleve/feldpost/issues/229
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { clearInflightDedupRegistryForTests } from '../support/upload-inflight-dedup.registry';
import { clearHeicConversionRegistryForTests } from '../support/upload-heic-prepare.util';
import { TRACE_SCENARIOS } from './upload-trace-fixtures';
import { buildGeneratedScenarios } from './upload-trace-generator';
import { UploadTraceRecorder } from './upload-trace-recorder';
import { loadRealGeo, runTraceBatch, waitForBatchSettled } from './upload-trace-harness';
import { predictTrayQuestionsForCorpus } from './upload-trace-question-kind';
import type { UploadDisambiguationKind } from '../upload-manager.types';

const TIMEOUT_MS = 300_000;

function histogram(kinds: readonly UploadDisambiguationKind[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const kind of kinds) {
    out[kind] = (out[kind] ?? 0) + 1;
  }
  return out;
}

describe('tray question kind predictor', () => {
  beforeEach(() => {
    clearInflightDedupRegistryForTests();
    clearHeicConversionRegistryForTests();
  });

  it(
    'predicts the same kinds the real pipeline registers, over the curated corpus',
    async () => {
      const recorder = new UploadTraceRecorder();
      const run = await runTraceBatch([...TRACE_SCENARIOS], recorder, {
        locationRequirementMode: 'required',
      });
      await waitForBatchSettled(run.harness.manager);

      const actual = run.harness.locationResolution
        .disambiguationGroups()
        .map((group) => group.disambiguationKind ?? 'geocode');

      const predicted = predictTrayQuestionsForCorpus(
        TRACE_SCENARIOS.map(({ relativePath, exifCoords }) => ({ relativePath, exifCoords })),
        loadRealGeo(),
      );

      // A histogram, not a per-group match: grouping order is not part of the contract, but how
      // many questions of each kind a corpus produces is exactly what #229 measures.
      expect(histogram(predicted.kinds)).toEqual(histogram(actual));
    },
    TIMEOUT_MS,
  );

  it(
    'predicts the same kinds over a generated corpus, which reaches the geocode branches',
    async () => {
      // The curated corpus only produces admin_level_conflict, city_step and layer_package. The
      // generated one reaches street_only and street_locality, so `geocode` and `house_step` are
      // covered too — without this the scale numbers rest on two unpinned branches.
      const scenarios = buildGeneratedScenarios(120, 11, { naming: 'camera' });
      const recorder = new UploadTraceRecorder();
      const run = await runTraceBatch(scenarios, recorder, {
        locationRequirementMode: 'required',
      });
      await waitForBatchSettled(run.harness.manager);

      const actual = run.harness.locationResolution
        .disambiguationGroups()
        .map((group) => group.disambiguationKind ?? 'geocode');
      const predicted = predictTrayQuestionsForCorpus(
        scenarios.map(({ relativePath, exifCoords }) => ({ relativePath, exifCoords })),
        loadRealGeo(),
      );

      expect(histogram(predicted.kinds)).toEqual(histogram(actual));
    },
    TIMEOUT_MS,
  );

});

describe('tray question kind predictor — merge behaviour', () => {
  it('asks nothing for a corpus that resolves cleanly', () => {
    // One address, complete chain, three files. Group merge makes it one group, and a complete
    // address needs no question at all.
    const predicted = predictTrayQuestionsForCorpus(
      [
        'AT/Wien/1090/Währinger Straße 12/IMG_1274.jpg',
        'AT/Wien/1090/Währinger Straße 12/IMG_1275.jpg',
        'AT/Wien/1090/Währinger Straße 12/IMG_1276.jpg',
      ],
      loadRealGeo(),
    );

    expect(predicted.groups).toBe(1);
    expect(predicted.kinds).toEqual([]);
  });

  it('counts one question per group, not per file — the study’s Correction 1', () => {
    // 10 files, one address. If this ever returns 10, the budget would be sized off file count.
    const paths = Array.from(
      { length: 10 },
      (_, i) => `Baustelle Nord/Wien/1010/Thalistraße 4/IMG_${1000 + i}.jpg`,
    );

    const predicted = predictTrayQuestionsForCorpus(paths, loadRealGeo());

    expect(predicted.files).toBe(10);
    expect(predicted.groups).toBe(1);
    expect(predicted.kinds.length).toBeLessThanOrEqual(1);
  });
});
