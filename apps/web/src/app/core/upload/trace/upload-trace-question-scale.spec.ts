/**
 * Invariants of the question curve (#229).
 *
 * The curve's headline numbers live in STUDY-009; these are the properties that must hold whatever
 * the numbers are, so a change that breaks them is caught rather than silently re-measured.
 *
 * @see https://github.com/matkleve/feldpost/issues/229
 */

import { describe, expect, it } from 'vitest';
import { loadRealGeo } from './upload-trace-harness';
import {
  QUESTION_SHAPES,
  measureQuestionsForShape,
  type QuestionShape,
} from './upload-trace-question-scale';

const SEED = 7;
const shape = (id: string): QuestionShape => {
  const found = QUESTION_SHAPES.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`no shape ${id}`);
  }
  return found;
};

describe('question curve', () => {
  it('collapses one address to one group and no question, at any size', () => {
    // STUDY-009's Company A. 10 000 files photographed at one site must not cost 10 000 questions,
    // and a budget triggered on file count would suppress the cheapest batch there is.
    const geo = loadRealGeo();

    for (const files of [100, 1000]) {
      const sample = measureQuestionsForShape(shape('deep_uniform'), files, SEED, geo);
      expect(sample.groups, `${files} files`).toBe(1);
      expect(sample.questions, `${files} files`).toBe(0);
    }
  }, 600_000);

  it('never reports more questions than groups — a question is per group, not per file', () => {
    const geo = loadRealGeo();

    for (const candidate of QUESTION_SHAPES) {
      const sample = measureQuestionsForShape(candidate, 1000, SEED, geo);
      expect(sample.questions, candidate.id).toBeLessThanOrEqual(sample.groups);
      expect(sample.questions, candidate.id).toBeLessThanOrEqual(sample.files);
    }
  }, 600_000);

  it('a corpus with no GPS anywhere asks no more than the same corpus with GPS', () => {
    // #229's sanity check. It passes, and it proves less than it looks: the generator gives a file
    // EXIF for the city its own folder names, so text and GPS agree by construction and no
    // question depends on EXIF either way. Recorded so the control is not read as evidence that
    // EXIF-derived questions are rare in the field.
    const geo = loadRealGeo();

    const withGps = measureQuestionsForShape(shape('wide_flat'), 1000, SEED, geo);
    const without = measureQuestionsForShape(shape('no_gps'), 1000, SEED, geo);

    expect(without.questions).toBeLessThanOrEqual(withGps.questions);
  }, 600_000);
});
