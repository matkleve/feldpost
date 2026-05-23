/**
 * Locked column values for v2 async preview generation (migration pending ADR merge).
 * @see docs/architecture/media-preview-converter.md
 */
export type PreviewGenerationStatus = 'idle' | 'pending' | 'ready' | 'failed';

export const PREVIEW_GENERATION_STATUSES: readonly PreviewGenerationStatus[] = [
  'idle',
  'pending',
  'ready',
  'failed',
] as const;
