import { describe, expect, it } from 'vitest';
import {
  TERMINAL_PHASES,
  canTransition,
  isIdempotentPhaseTransition,
} from './upload-phase-transitions';

describe('upload-phase-transitions', () => {
  it('rejects illegal pipeline transitions', () => {
    expect(canTransition('complete', 'uploading', 'pipeline')).toBe(false);
    expect(canTransition('queued', 'uploading', 'pipeline')).toBe(false);
    expect(canTransition('validating', 'complete', 'pipeline')).toBe(false);
  });

  it('blocks pipeline transitions from terminal phases', () => {
    for (const terminal of TERMINAL_PHASES) {
      expect(canTransition(terminal, 'queued', 'pipeline')).toBe(false);
      expect(canTransition(terminal, 'validating', 'pipeline')).toBe(false);
    }
  });

  it('allows user-channel resurrection from terminal error and skipped', () => {
    expect(canTransition('error', 'queued', 'user')).toBe(true);
    expect(canTransition('skipped', 'queued', 'user')).toBe(true);
  });

  it('allows user-channel resurrection from missing_data', () => {
    expect(canTransition('missing_data', 'queued', 'user')).toBe(true);
    expect(canTransition('missing_data', 'complete', 'user')).toBe(true);
    expect(canTransition('missing_data', 'error', 'user')).toBe(true);
  });

  it('allows user cancel from active phases to error', () => {
    expect(canTransition('uploading', 'error', 'user')).toBe(true);
    expect(canTransition('awaiting_disambiguation', 'error', 'user')).toBe(true);
  });

  it('allows system-channel sign-out cancel to error', () => {
    expect(canTransition('uploading', 'error', 'system')).toBe(true);
    expect(canTransition('parsing_exif', 'error', 'system')).toBe(true);
  });

  it('allows post-save geocode failure route saving_record → missing_data', () => {
    expect(canTransition('saving_record', 'missing_data', 'pipeline')).toBe(true);
  });

  it('allows dedup no-match fall-through dedup_check → uploading', () => {
    expect(canTransition('dedup_check', 'uploading', 'pipeline')).toBe(true);
    expect(canTransition('dedup_check', 'converting_format', 'pipeline')).toBe(true);
  });

  it('allows queued → complete mediaId shortcut', () => {
    expect(canTransition('queued', 'complete', 'pipeline')).toBe(true);
  });

  it('treats same-phase transitions as idempotent', () => {
    expect(isIdempotentPhaseTransition('uploading', 'uploading')).toBe(true);
    expect(canTransition('complete', 'complete', 'pipeline')).toBe(true);
    expect(canTransition('error', 'error', 'user')).toBe(true);
  });
});
