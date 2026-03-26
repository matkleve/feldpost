import type { ExifCoords } from './upload.service';

type RunAttachEnrichmentArgs = {
  isAttachKeep: boolean;
  finalCoords: ExifCoords | undefined;
  titleAddress: string | undefined;
  targetImageId: string;
  setPhase: (phase: 'resolving_address' | 'resolving_coordinates') => void;
  enrichWithReverseGeocode: (imageId: string) => Promise<void>;
  enrichWithForwardGeocode: (
    imageId: string,
    titleAddress: string,
  ) => Promise<{ coords: ExifCoords } | undefined>;
  updateCoords: (coords: ExifCoords) => void;
};

export async function runAttachEnrichment(args: RunAttachEnrichmentArgs): Promise<void> {
  const {
    isAttachKeep,
    finalCoords,
    titleAddress,
    targetImageId,
    setPhase,
    enrichWithReverseGeocode,
    enrichWithForwardGeocode,
    updateCoords,
  } = args;

  if (isAttachKeep) {
    return;
  }

  if (finalCoords && !titleAddress) {
    setPhase('resolving_address');
    await enrichWithReverseGeocode(targetImageId);
    return;
  }

  if (titleAddress && !finalCoords) {
    setPhase('resolving_coordinates');
    const result = await enrichWithForwardGeocode(targetImageId, titleAddress);
    if (result) {
      updateCoords(result.coords);
    }
  }
}
