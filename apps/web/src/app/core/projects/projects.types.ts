import type { WorkspaceImage } from '../workspace-view.types';

export type ProjectStatusFilter = 'all' | 'active' | 'archived';
export type ProjectsViewMode = 'list' | 'cards';
export type ProjectsSortMode = 'name' | 'updated' | 'image-count';
export type ProjectColorKey = 'clay' | 'accent' | 'success' | 'warning' | `brand-hue-${number}`;

export interface ProjectRecord {
  id: string;
  name: string;
  colorKey: ProjectColorKey;
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
