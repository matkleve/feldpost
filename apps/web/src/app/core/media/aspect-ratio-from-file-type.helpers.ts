import type { FileTypeDefinition } from './media-renderer.types';

/**
 * Registry aspect hint for slot geometry before network (photos use 1 until onload).
 * @see docs/specs/component/media/media-item.md
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
