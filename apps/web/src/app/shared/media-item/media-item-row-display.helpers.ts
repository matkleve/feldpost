import type { MediaRecord } from '../../core/media-query/media-query.types';
import { fileTypeBadge } from '../../core/media/file-type-registry';
import { mediaFileIdentityFromRecord } from '../../core/media/media-file-identity.helpers';

/** Primary row label: address, then filename. @see media-item.row-mode.supplement.md */
export function resolveMediaItemRowPrimaryLabel(record: MediaRecord): string {
  const address = record.address_label?.trim();
  if (address) {
    return address;
  }

  const filename = record.original_filename?.trim();
  if (filename) {
    return filename;
  }

  return '';
}

/** Location snippet for secondary line (city/district/address when not redundant). */
export function resolveMediaItemRowLocationSnippet(record: MediaRecord): string {
  const city = record.city?.trim();
  const district = record.district?.trim();

  if (city && district) {
    return `${city}, ${district}`;
  }

  if (city) {
    return city;
  }

  if (district) {
    return district;
  }

  return record.address_label?.trim() ?? '';
}

export function resolveMediaItemRowFileTypeLabel(record: MediaRecord): string {
  const identity = mediaFileIdentityFromRecord({
    storage_path: record.storage_path,
    original_filename: record.original_filename ?? null,
  });
  return fileTypeBadge(identity)?.trim() ?? '';
}

export function formatMediaItemRowCapturedAt(
  capturedAt: string | null,
  hasTime: boolean,
  locale: string,
): string {
  if (!capturedAt) {
    return '';
  }

  try {
    const options: Intl.DateTimeFormatOptions = hasTime
      ? { dateStyle: 'medium', timeStyle: 'short' }
      : { dateStyle: 'medium' };
    return new Intl.DateTimeFormat(locale, options).format(new Date(capturedAt));
  } catch {
    return '';
  }
}

/** Secondary row line segments joined with middle dot. @see media-item.row-mode.supplement.md */
export function resolveMediaItemRowSecondaryLine(
  record: MediaRecord,
  locale: string,
): string {
  const primary = resolveMediaItemRowPrimaryLabel(record);
  const parts: string[] = [];

  const captured = formatMediaItemRowCapturedAt(record.captured_at, record.has_time, locale);
  if (captured) {
    parts.push(captured);
  }

  const fileType = resolveMediaItemRowFileTypeLabel(record);
  if (fileType) {
    parts.push(fileType);
  }

  const location = resolveMediaItemRowLocationSnippet(record);
  if (location && location !== primary && !primary.includes(location)) {
    parts.push(location);
  }

  return parts.join(' · ');
}
