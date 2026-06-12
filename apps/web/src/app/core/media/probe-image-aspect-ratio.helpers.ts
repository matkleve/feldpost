/**
 * Loads an image URL off-DOM and returns width/height ratio when decode succeeds.
 * @see docs/specs/ui/media-detail/media-detail-media-viewer.md
 */
export function probeImageAspectRatio(url: string): Promise<number | null> {
  if (!url.trim() || typeof Image === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const img = new Image();

    const finish = (ratio: number | null): void => {
      img.onload = null;
      img.onerror = null;
      resolve(ratio);
    };

    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        finish(img.naturalWidth / img.naturalHeight);
        return;
      }
      finish(null);
    };

    img.onerror = () => finish(null);
    img.src = url;
  });
}
