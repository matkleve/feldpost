/**
 * Shared types for the Workspace View system.
 * Used by WorkspaceViewService, FilterService, toolbar components, and the grid.
 */

/** Filename-oriented metadata attached to a media item. */
export interface WorkspaceMediaFileMetadata {
  originalFilename?: string | null;
  title?: string | null;
  filename?: string | null;
  name?: string | null;
  mimeType?: string | null;
  extension?: string | null;
}

/** Dynamic custom metadata values keyed by metadata_key UUID. */
export type WorkspaceMediaCustomMetadata = Record<string, string>;

/** A media record as returned by the cluster_images RPC. */
export interface WorkspaceMedia {
  id: string;
  latitude: number;
  longitude: number;
  thumbnailPath: string | null;
  storagePath: string | null;
  capturedAt: string | null;
  createdAt: string;
  projectId: string | null;
  projectName: string | null;
  projectIds?: string[];
  projectNames?: string[];
  direction: number | null;
  exifLatitude: number | null;
  exifLongitude: number | null;
  /** Human-readable aggregate address, typically: "Street Number, ZIP City". */
  addressLabel: string | null;
  /** City/locality extracted from geocoding; often paired with `zip` in labels. */
  city: string | null;
  district: string | null;
  /** Street value usually composed as "road + streetNumber" by geocoding. */
  street: string | null;
  /** Optional granular street number when available from geocoding payloads. */
  streetNumber?: string | null;
  /** Optional granular postal code when available from geocoding payloads. */
  zip?: string | null;
  country: string | null;
  userName: string | null;
  /** Signed thumbnail URL — populated lazily by batch signing. */
  signedThumbnailUrl?: string;
  /** True when batch signing was attempted but no URL could be produced. */
  thumbnailUnavailable?: boolean;
  /** Metadata values — maps metadata_key UUID -> stored value. */
  metadata?: WorkspaceMediaCustomMetadata;
  /** Structured filename metadata for export/label use. */
  fileMetadata?: WorkspaceMediaFileMetadata | null;
}

/** Backwards-compatible alias while codebase terminology migrates from image → media. */
export type WorkspaceImage = WorkspaceMedia;

/** A grouped section of images, produced by the WorkspaceViewService pipeline. */
export interface GroupedSection {
  heading: string;
  headingLevel: number;
  imageCount: number;
  images: WorkspaceMedia[];
  subGroups?: GroupedSection[];
}

/** Sort configuration: which property to sort by and in what direction. */
export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

/** A reference to a metadata field used for grouping. */
export interface MetadataFieldRef {
  id: string;
  label: string;
  icon: string;
}

/** A Notion-style filter rule. */
export interface FilterRule {
  id: string;
  conjunction: 'where' | 'and' | 'or';
  property: string;
  operator: string;
  value: string;
}

/** Discrete thumbnail size presets used by snap-slider controls. */
export type ThumbnailSizePreset = 'row' | 'small' | 'medium' | 'large';
