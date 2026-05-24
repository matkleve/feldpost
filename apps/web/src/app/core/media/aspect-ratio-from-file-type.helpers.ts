import type { FileTypeDefinition } from './media-renderer.types';

/**
 * Target aspect ratio from registry (deferred until preview load; slot starts square).
 * @see docs/specs/component/media/media-item.md#file-type-aspect-ratio-policy
 */
export function aspectRatioHintFromFileType(
  definition: FileTypeDefinition,
): number | null {
  const policy = definition.aspectRatio;
  if (policy.type === 'fixed') {
    return policy.width / policy.height;
  }
  if (policy.type === 'free' || definition.category === 'unknown') {
    return 1;
  }
  return null;
}

export function usesNativeAspectRatio(definition: FileTypeDefinition): boolean {
  return definition.aspectRatio.type === 'native';
}
