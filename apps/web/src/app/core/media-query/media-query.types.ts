import type { AddressFieldMeta } from '../address-field-suggest/address-field-suggest.types';
import type { PreviewGenerationStatus } from '../media/preview-generation-status.types';

/**
 * Canonical media row / list-query DTO for gallery-style surfaces.
 * @see docs/specs/service/media-query/media-query-service.md
 */
export interface MediaRecord {
  id: string;
  user_id: string;
  organization_id: string | null;
  project_id: string | null;
  project_ids?: string[];
  storage_path: string | null;
  thumbnail_path: string | null;
  preview_generation_status?: PreviewGenerationStatus | null;
  /** Client-side name at upload (immutable display label). */
  original_filename?: string | null;
  /**
   * Folder path the file arrived with, from the folder scan. Immutable after insert and the source
   * of truth for "original folder" — `original_filename` is a leaf name and carries no folder for a
   * directory upload. Present only on reads that select it (media detail), not on list reads.
   * @see docs/specs/system/deferred-location-resolution.md
   */
  relative_path?: string | null;
  /**
   * Full EXIF payload captured at ingest, immutable after insert. Selected on the single-row detail
   * read only — it is a jsonb blob and does not belong in list queries.
   */
  exif_raw?: Record<string, unknown> | null;
  latitude: number | null;
  longitude: number | null;
  exif_latitude: number | null;
  exif_longitude: number | null;
  captured_at: string | null;
  has_time: boolean;
  created_at: string;
  address_label: string | null;
  street: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  direction: number | null;
  location_unresolved: boolean | null;
  /** Canonical location lifecycle: pending | resolved | unresolvable. */
  location_status?: string | null;
  /** When false, map/GPS assignment is blocked for this item. */
  gps_assignment_allowed?: boolean | null;
  /** Per-field address verification metadata. @see AddressFieldMeta */
  address_field_meta?: AddressFieldMeta | null;
  /** Count of linked locations with paired GPS (gallery map icon). */
  zoomable_location_count?: number | null;
  /**
   * Low-confidence or residual address fragments preserved from filename/folder parsing.
   * @see upload-manager-pipeline.md § Action 11c
   */
  address_notes?: string[] | null;
  /**
   * Distance in metres between EXIF GPS and title-derived coordinates when both were present.
   * Null = no mismatch detected.
   * @see upload-manager-pipeline.md § Action 6
   */
  location_mismatch_meters?: number | null;
}
