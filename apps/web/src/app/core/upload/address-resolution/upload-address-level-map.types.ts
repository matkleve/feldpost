/**
 * Admin field level-map types for upload Search Object conflict detection.
 * @see docs/specs/service/media-upload-service/upload-search-object.md#admin-level-map
 */

export type AdminFieldKey = 'country' | 'state' | 'city' | 'postcode';

export interface FieldLevelEntry {
  /** 0 = filename; 1 = direct parent folder; higher = ancestors. */
  level: number;
  value: string;
  source: 'folder' | 'filename';
  field: AdminFieldKey;
}

export interface AdminLevelConflict {
  /** Primary field shown in tray copy. */
  field: AdminFieldKey;
  /** At least two entries with incompatible values (may span fields for gazetteer checks). */
  entries: FieldLevelEntry[];
}
