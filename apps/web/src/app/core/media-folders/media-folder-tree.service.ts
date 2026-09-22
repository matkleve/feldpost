/**
 * Folder tree over uploaded media (STUDY-006 Phase 5.5).
 *
 * Children are fetched **one level at a time**, on expand. The tree is derived from
 * `media_items.relative_path`, which is written once at upload and immutable afterwards — so a node
 * is a path prefix of existing rows, not a stored entity. Nothing here renames, moves or creates a
 * folder, and the immutability trigger would reject it if it tried.
 *
 * Counts come from the RPC, never from counting rows client-side: a subtree count that way means
 * fetching every row, which at 100 000 items reintroduces the per-row cost Phase 3 removed.
 *
 * @see docs/specs/page/files-page.md
 */

import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';

export interface MediaFolderNode {
  /** Path segment, e.g. `Thalistraße 4`. */
  segment: string;
  /** Full path from the root, e.g. `Wien/Thalistraße 4`. */
  path: string;
  /** Files in this folder and everything below it. */
  fileCount: number;
  /** How many of those a folder-level answer could still place. */
  unresolvedCount: number;
}

export interface MediaFolderFile {
  id: string;
  relativePath: string | null;
  originalFilename: string | null;
  storagePath: string | null;
  thumbnailPath: string | null;
  capturedAt: string | null;
  locationStatus: string | null;
}

interface FolderChildRow {
  segment: string;
  file_count: number;
  unresolved_count: number;
}

interface FolderFileRow {
  id: string;
  relative_path: string | null;
  original_filename: string | null;
  storage_path: string | null;
  thumbnail_path: string | null;
  captured_at: string | null;
  location_status: string | null;
}

/** Join a parent path and a segment without producing a leading slash at the root. */
export function joinFolderPath(parentPath: string, segment: string): string {
  return parentPath ? `${parentPath}/${segment}` : segment;
}

@Injectable({ providedIn: 'root' })
export class MediaFolderTreeService {
  private readonly supabase = inject(SupabaseService);

  /** Children already fetched, keyed by parent path. Lazily filled; never walked eagerly. */
  private readonly childrenByPath = signal(new Map<string, MediaFolderNode[]>());

  /** Cached children for a path, or `undefined` when that node has not been expanded yet. */
  childrenOf(path: string): MediaFolderNode[] | undefined {
    return this.childrenByPath().get(path);
  }

  /**
   * Load one level. Cached per path, so re-expanding a node costs nothing and collapsing does not
   * discard work.
   */
  async loadChildren(path = ''): Promise<MediaFolderNode[]> {
    const cached = this.childrenByPath().get(path);
    if (cached) {
      return cached;
    }

    const { data, error } = await this.supabase.client.rpc('list_media_folder_children', {
      p_prefix: path,
    });
    if (error) {
      throw new Error(error.message);
    }

    const nodes: MediaFolderNode[] = (Array.isArray(data) ? (data as FolderChildRow[]) : []).map(
      (row) => ({
        segment: row.segment,
        path: joinFolderPath(path, row.segment),
        fileCount: Number(row.file_count ?? 0),
        unresolvedCount: Number(row.unresolved_count ?? 0),
      }),
    );

    this.childrenByPath.update((map) => new Map(map).set(path, nodes));
    return nodes;
  }

  /** Files in a folder. `recursive` includes descendants. */
  async listFiles(
    path = '',
    options: { recursive?: boolean; limit?: number; offset?: number } = {},
  ): Promise<MediaFolderFile[]> {
    const { data, error } = await this.supabase.client.rpc('list_media_in_folder', {
      p_prefix: path,
      p_recursive: options.recursive ?? false,
      p_limit: options.limit ?? 200,
      p_offset: options.offset ?? 0,
    });
    if (error) {
      throw new Error(error.message);
    }

    return (Array.isArray(data) ? (data as FolderFileRow[]) : []).map((row) => ({
      id: row.id,
      relativePath: row.relative_path,
      originalFilename: row.original_filename,
      storagePath: row.storage_path,
      thumbnailPath: row.thumbnail_path,
      capturedAt: row.captured_at,
      locationStatus: row.location_status,
    }));
  }

  /** Drop cached children, e.g. after a bulk run changed unresolved counts. */
  invalidate(): void {
    this.childrenByPath.set(new Map());
  }
}
