/**
 * The question-per-file curve, by corpus shape and size (#229).
 *
 * STUDY-009 proposes a budget that suppresses low-priority tray questions on large batches, and
 * every threshold in it is guesswork until somebody counts. This counts: for each shape and size,
 * how many questions survive group merge, and of which kind.
 *
 * Questions come from `classifyGroupQuestion`, which is pinned against the real pipeline by
 * `upload-trace-question-kind.spec.ts`. Read that file's caveats before quoting these numbers —
 * in particular, `source` and `containment_check` are not predicted and are reported as absent
 * rather than as zero.
 *
 * @see https://github.com/matkleve/feldpost/issues/229
 */

import { buildGeneratedScenarios, type CorpusGenerateOptions } from './upload-trace-generator';
import { predictTrayQuestionsForCorpus } from './upload-trace-question-kind';
import type { RealGeoData } from './upload-trace-harness';
import type { UploadDisambiguationKind } from '../upload-manager.types';

/** The five shapes #229 names, mapped onto the generator's profiles. */
export interface QuestionShape {
  id: string;
  /** What this shape is, in the field. */
  intent: string;
  options: CorpusGenerateOptions;
  /** `filesPerLocation` equal to the corpus size — one address, however many files. */
  oneAddress?: boolean;
}

export const QUESTION_SHAPES: readonly QuestionShape[] = [
  {
    id: 'deep_uniform',
    intent: 'one site photographed exhaustively — every file under one address',
    options: { profile: 'company_street' },
    oneAddress: true,
  },
  {
    id: 'wide_flat',
    intent: 'a decade of scattered jobs — Archiv/<address>/ with ~25 files each',
    options: { profile: 'company_street', filesPerLocation: 25 },
  },
  {
    id: 'mixed_evidence',
    intent: 'half the folders named, half only IMG_*.jpg',
    options: { profile: 'mixed' },
  },
  {
    id: 'noisy_names',
    intent: 'owner-described company archive — copy suffixes, (N), stray folders',
    options: { profile: 'firma_at_archive' },
  },
  {
    id: 'no_gps',
    intent: 'scanned archive — same packing as wide_flat, no EXIF anywhere',
    options: { profile: 'company_street', filesPerLocation: 25, exifShare: 0 },
  },
];

export interface QuestionScaleSample {
  shape: string;
  files: number;
  groups: number;
  questions: number;
  byKind: Partial<Record<UploadDisambiguationKind, number>>;
  /** Files covered per question asked. The merge-effectiveness ratio #229 asks for. */
  filesPerQuestion: number;
  /** Groups that resolve without asking, by why. */
  silent: Record<string, number>;
}

export function measureQuestionsForShape(
  shape: QuestionShape,
  files: number,
  seed: number,
  geo: RealGeoData,
): QuestionScaleSample {
  const options: CorpusGenerateOptions = shape.oneAddress
    ? { ...shape.options, filesPerLocation: files }
    : shape.options;
  const scenarios = buildGeneratedScenarios(files, seed, options);
  const predicted = predictTrayQuestionsForCorpus(
    scenarios.map(({ relativePath, exifCoords }) => ({ relativePath, exifCoords })),
    geo,
  );

  const byKind: Partial<Record<UploadDisambiguationKind, number>> = {};
  for (const kind of predicted.kinds) {
    byKind[kind] = (byKind[kind] ?? 0) + 1;
  }

  return {
    shape: shape.id,
    files,
    groups: predicted.groups,
    questions: predicted.kinds.length,
    byKind,
    // Infinity would print badly and mean "no questions at all", which `questions: 0` already says.
    filesPerQuestion: predicted.kinds.length ? files / predicted.kinds.length : files,
    silent: predicted.silent,
  };
}

export function measureQuestionCurve(
  sizes: readonly number[],
  seed: number,
  geo: RealGeoData,
  shapes: readonly QuestionShape[] = QUESTION_SHAPES,
): QuestionScaleSample[] {
  const out: QuestionScaleSample[] = [];
  for (const shape of shapes) {
    for (const files of sizes) {
      out.push(measureQuestionsForShape(shape, files, seed, geo));
    }
  }
  return out;
}
