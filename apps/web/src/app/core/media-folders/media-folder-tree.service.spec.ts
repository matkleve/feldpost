import { describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MediaFolderTreeService, joinFolderPath } from './media-folder-tree.service';
import { SupabaseService } from '../supabase/supabase.service';

/** @see docs/specs/page/files-page.md */

function setup(rpc = vi.fn(async () => ({ data: [], error: null }))) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: SupabaseService, useValue: { client: { rpc } } }],
  });
  return { service: TestBed.inject(MediaFolderTreeService), rpc };
}

const CHILDREN = [
  { segment: 'Thalistraße 4', file_count: 12, unresolved_count: 3 },
  { segment: 'Kirchengasse 11', file_count: 5, unresolved_count: 0 },
];

describe('joinFolderPath', () => {
  it('does not produce a leading slash at the root', () => {
    expect(joinFolderPath('', 'Wien')).toBe('Wien');
  });

  it('joins below the root', () => {
    expect(joinFolderPath('Wien', 'Thalistraße 4')).toBe('Wien/Thalistraße 4');
  });
});

describe('MediaFolderTreeService', () => {
  it('asks the RPC for one level and builds full paths for the children', async () => {
    const rpc = vi.fn(async () => ({ data: CHILDREN, error: null }));
    const { service } = setup(rpc);

    const nodes = await service.loadChildren('Wien');

    expect(rpc).toHaveBeenCalledWith('list_media_folder_children', { p_prefix: 'Wien' });
    expect(nodes.map((n) => n.path)).toEqual(['Wien/Thalistraße 4', 'Wien/Kirchengasse 11']);
  });

  it('carries the aggregate counts through rather than recomputing them', async () => {
    // The counts must come from SQL: counting a subtree client-side means fetching every row,
    // which is the per-row cost Phase 3 removed.
    const { service } = setup(vi.fn(async () => ({ data: CHILDREN, error: null })));

    const [first] = await service.loadChildren('Wien');

    expect(first.fileCount).toBe(12);
    expect(first.unresolvedCount).toBe(3);
  });

  it('opens at the root with an empty prefix, not a slash', async () => {
    const rpc = vi.fn(async () => ({ data: [], error: null }));
    const { service } = setup(rpc);

    await service.loadChildren();

    expect(rpc).toHaveBeenCalledWith('list_media_folder_children', { p_prefix: '' });
  });

  it('caches a level, so re-expanding a node costs no query', async () => {
    const rpc = vi.fn(async () => ({ data: CHILDREN, error: null }));
    const { service } = setup(rpc);

    await service.loadChildren('Wien');
    await service.loadChildren('Wien');

    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('does not eagerly walk the tree — an unexpanded node has no children cached', async () => {
    const { service } = setup(vi.fn(async () => ({ data: CHILDREN, error: null })));

    await service.loadChildren('Wien');

    expect(service.childrenOf('Wien')).toHaveLength(2);
    expect(service.childrenOf('Wien/Thalistraße 4')).toBeUndefined();
  });

  it('invalidate clears the cache, so counts refresh after a bulk run', async () => {
    const rpc = vi.fn(async () => ({ data: CHILDREN, error: null }));
    const { service } = setup(rpc);

    await service.loadChildren('Wien');
    service.invalidate();
    await service.loadChildren('Wien');

    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it('surfaces an RPC error instead of returning an empty tree', async () => {
    // An empty tree and a failed query look identical to a user; only one is worth retrying.
    const { service } = setup(
      vi.fn(async () => ({ data: null, error: { message: 'permission denied' } })),
    );

    await expect(service.loadChildren('Wien')).rejects.toThrow('permission denied');
  });

  it('lists files non-recursively by default', async () => {
    const rpc = vi.fn(async () => ({ data: [], error: null }));
    const { service } = setup(rpc);

    await service.listFiles('Wien/Thalistraße 4');

    expect(rpc).toHaveBeenCalledWith('list_media_in_folder', {
      p_prefix: 'Wien/Thalistraße 4',
      p_recursive: false,
      p_limit: 200,
      p_offset: 0,
    });
  });

  it('maps file rows to camelCase without dropping the location status', async () => {
    const { service } = setup(
      vi.fn(async () => ({
        data: [
          {
            id: 'm-1',
            relative_path: 'Wien/Thalistraße 4/a.jpg',
            original_filename: 'a.jpg',
            storage_path: 'org/u/a.jpg',
            thumbnail_path: null,
            captured_at: null,
            location_status: 'pending',
          },
        ],
        error: null,
      })),
    );

    const [file] = await service.listFiles('Wien/Thalistraße 4');

    expect(file).toMatchObject({
      id: 'm-1',
      relativePath: 'Wien/Thalistraße 4/a.jpg',
      locationStatus: 'pending',
    });
  });
});
