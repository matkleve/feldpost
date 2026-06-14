import type { FileTypeCategory } from '../media/media-renderer.types';
import type { WorkspaceImage } from '../workspace-view/workspace-view.types';

export interface ProjectFileTypeCount {
  category: FileTypeCategory;
  count: number;
}

export type ProjectStatusFilter = 'all' | 'active' | 'archived';
export type ProjectsSortMode = 'name' | 'updated' | 'image-count';
export type ProjectColorKey = 'clay' | 'accent' | 'success' | 'warning' | `brand-hue-${number}`;

export interface ProjectRecord {
  id: string;
  name: string;
  colorKey: ProjectColorKey;
  /** @deprecated Always false; DB column unused — see docs/architecture/deprecated-schema.md */
  locationRequired: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListItem extends ProjectRecord {
  status: 'active' | 'archived';
  totalImageCount: number;
  matchingImageCount: number;
  lastActivity: string | null;
  city: string | null;
  district: string | null;
  street: string | null;
  country: string | null;
  fileTypeCounts: ProjectFileTypeCount[];
}

// Card view model — @see docs/specs/component/project/project-card.md
export interface ProjectSummary {
  id: string;
  name: string;
  colorKey: ProjectColorKey;
  status: 'active' | 'archived' | 'draft';
  mediaCount: number;
  location?: { label: string; lat: number; lng: number } | null;
  thumbnailUrls?: string[];
  lastActivityAt?: string | null;
  // Preserved from ProjectListItem for context menu actions
  fileTypeCounts: ProjectFileTypeCount[];
}

export interface ProjectSelectOption {
  id: string;
  name: string;
}

export interface ProjectMutationResult {
  ok: boolean;
  errorMessage: string | null;
}

export interface ProjectsSnapshot {
  projects: ProjectListItem[];
}

export interface ProjectSearchCounts {
  [projectId: string]: number;
}

export interface ProjectsWorkspaceContext {
  detailImageId: string | null;
  scrollTop: number;
}

export interface ProjectsImageRow {
  id: string;
  project_id: string | null;
  latitude: number | null;
  longitude: number | null;
  thumbnail_path: string | null;
  storage_path: string | null;
  captured_at: string | null;
  created_at: string;
  direction: number | null;
  exif_latitude: number | null;
  exif_longitude: number | null;
  address_label: string | null;
  city: string | null;
  district: string | null;
  street: string | null;
  country: string | null;
}

export interface ProjectsImageMetadataRow {
  media_item_id: string;
  value_text: string;
  images: { project_id: string | null } | Array<{ project_id: string | null }> | null;
}

export type ProjectScopedWorkspaceImage = WorkspaceImage;

/** Media row for project detail exclusive/shared sections — @see docs/specs/page/projects-dashboard.md */
export interface ProjectMediaListItem {
  id: string;
  thumbnailPath: string | null;
  storagePath: string | null;
  capturedAt: string | null;
  createdAt: string;
  projectMembershipCount: number;
}

export interface ProjectMediaSections {
  exclusive: ProjectMediaListItem[];
  shared: ProjectMediaListItem[];
}
