import { TestBed } from '@angular/core/testing';

import { ProjectsService } from './projects.service';
import { SupabaseService } from '../supabase/supabase.service';
import type { ProjectStatusFilter } from './projects.types';

type QueryResult = { data: unknown; error: unknown };

interface FakeSupabaseData {
  titleAddressRows?: Array<{ id: string; project_id: string | null }>;
  metadataRows?: Array<{
    media_item_id: string;
    value_text: string;
    images: { project_id: string | null } | Array<{ project_id: string | null }> | null;
  }>;
  mediaItemRows?: Array<{ id: string; source_image_id: string | null }>;
  mediaMembershipRows?: Array<{ media_item_id: string; project_id: string }>;
}

function buildFakeSupabase(data: FakeSupabaseData) {
  const titleAddressRows = data.titleAddressRows ?? [];
  const metadataRows = data.metadataRows ?? [];
  const mediaItemRows = data.mediaItemRows ?? [];
  const mediaMembershipRows = data.mediaMembershipRows ?? [];

  const imagesChain = {
    _select: '',
    select: vi.fn().mockImplementation(function (this: { _select: string }, selectExpr: string) {
      this._select = selectExpr;
      return this;
    }),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockImplementation((): Promise<QueryResult> => {
      return Promise.resolve({ data: titleAddressRows, error: null });
    }),
    ilike: vi.fn().mockImplementation((): Promise<QueryResult> => {
      return Promise.resolve({ data: titleAddressRows, error: null });
    }),
  };

  const metadataChain = {
    select: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockResolvedValue({ data: metadataRows, error: null }),
  };

  const mediaItemsChain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockImplementation((column: string, values: string[]): Promise<QueryResult> => {
      const filtered =
        column === 'source_image_id'
          ? mediaItemRows.filter(
              (row) => !!row.source_image_id && values.includes(row.source_image_id),
            )
          : column === 'id'
            ? mediaItemRows.filter((row) => values.includes(row.id))
            : [];
      return Promise.resolve({ data: filtered, error: null });
    }),
  };

  const mediaProjectsChain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockImplementation((column: string, values: string[]): Promise<QueryResult> => {
      if (column !== 'media_item_id') {
        return Promise.resolve({ data: [], error: null });
      }

      const filtered = mediaMembershipRows.filter((row) => values.includes(row.media_item_id));
      return Promise.resolve({ data: filtered, error: null });
    }),
  };

  const client = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'images') return imagesChain;
      if (table === 'media_metadata') return metadataChain;
      if (table === 'media_items') return mediaItemsChain;
      if (table === 'media_projects') return mediaProjectsChain;
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  };

  return {
    client,
    chains: {
      imagesChain,
      metadataChain,
      mediaItemsChain,
      mediaProjectsChain,
    },
  };
}

async function loadCountsWithStatus(
  service: ProjectsService,
  statusMap: Map<string, boolean>,
  statusFilter: ProjectStatusFilter = 'all',
): Promise<Record<string, number>> {
  vi.spyOn(
    service as object as { loadStatusByProjectId: () => Promise<Map<string, boolean>> },
    'loadStatusByProjectId',
  ).mockResolvedValue(statusMap);
  return service.loadGroupedSearchCounts('tower', statusFilter);
}

describe('ProjectsService', () => {
  it('includes membership projects for title/address matches', async () => {
    const fakeSupabase = buildFakeSupabase({
      titleAddressRows: [{ id: 'img-1', project_id: 'legacy-project' }],
      metadataRows: [],
      mediaItemRows: [{ id: 'media-1', source_image_id: 'img-1' }],
      mediaMembershipRows: [
        { media_item_id: 'media-1', project_id: 'project-alpha' },
        { media_item_id: 'media-1', project_id: 'project-beta' },
      ],
    });

    TestBed.configureTestingModule({
      providers: [ProjectsService, { provide: SupabaseService, useValue: fakeSupabase }],
    });

    const service = TestBed.inject(ProjectsService);
    const counts = await loadCountsWithStatus(
      service,
      new Map([
        ['legacy-project', false],
        ['project-alpha', false],
        ['project-beta', false],
      ]),
    );

    expect(counts['legacy-project']).toBe(1);
    expect(counts['project-alpha']).toBe(1);
    expect(counts['project-beta']).toBe(1);
  });

  it('includes membership projects for metadata matches without legacy project_id', async () => {
    const fakeSupabase = buildFakeSupabase({
      titleAddressRows: [],
      metadataRows: [
        {
          media_item_id: 'media-2',
          value_text: 'phase-2',
          images: { project_id: null },
        },
      ],
      mediaItemRows: [{ id: 'media-2', source_image_id: 'img-2' }],
      mediaMembershipRows: [{ media_item_id: 'media-2', project_id: 'project-gamma' }],
    });

    TestBed.configureTestingModule({
      providers: [ProjectsService, { provide: SupabaseService, useValue: fakeSupabase }],
    });

    const service = TestBed.inject(ProjectsService);
    const counts = await loadCountsWithStatus(service, new Map([['project-gamma', false]]));

    expect(counts['project-gamma']).toBe(1);
  });

  it('deduplicates same image per project and applies archived filter', async () => {
    const fakeSupabase = buildFakeSupabase({
      titleAddressRows: [{ id: 'img-3', project_id: null }],
      metadataRows: [
        {
          media_item_id: 'media-3',
          value_text: 'steel',
          images: { project_id: null },
        },
      ],
      mediaItemRows: [{ id: 'media-3', source_image_id: 'img-3' }],
      mediaMembershipRows: [
        { media_item_id: 'media-3', project_id: 'project-active' },
        { media_item_id: 'media-3', project_id: 'project-archived' },
      ],
    });

    TestBed.configureTestingModule({
      providers: [ProjectsService, { provide: SupabaseService, useValue: fakeSupabase }],
    });

    const service = TestBed.inject(ProjectsService);

    const activeCounts = await loadCountsWithStatus(
      service,
      new Map([
        ['project-active', false],
        ['project-archived', true],
      ]),
      'active',
    );

    const archivedCounts = await loadCountsWithStatus(
      service,
      new Map([
        ['project-active', false],
        ['project-archived', true],
      ]),
      'archived',
    );

    expect(activeCounts['project-active']).toBe(1);
    expect(activeCounts['project-archived']).toBeUndefined();

    expect(archivedCounts['project-active']).toBeUndefined();
    expect(archivedCounts['project-archived']).toBe(1);
  });
});

describe('ProjectsService.loadProjectMediaSections', () => {
  it('reuses cached sections on repeat load for the same project', async () => {
    const from = vi.fn();
    let mediaItemsQueryCount = 0;

    const mediaProjectsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ media_item_id: 'media-1' }],
        error: null,
      }),
      in: vi.fn().mockResolvedValue({
        data: [{ media_item_id: 'media-1', project_id: 'project-1' }],
        error: null,
      }),
    };

    const mediaItemsChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation((): Promise<QueryResult> => {
        mediaItemsQueryCount += 1;
        return Promise.resolve({
          data: [
            {
              id: 'media-1',
              thumbnail_path: 'thumb-1',
              storage_path: 'storage-1',
              captured_at: null,
              created_at: '2026-01-01T00:00:00.000Z',
            },
          ],
          error: null,
        });
      }),
    };

    from.mockImplementation((table: string) => {
      if (table === 'media_projects') return mediaProjectsChain;
      if (table === 'media_items') return mediaItemsChain;
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    TestBed.configureTestingModule({
      providers: [ProjectsService, { provide: SupabaseService, useValue: { client: { from } } }],
    });

    const service = TestBed.inject(ProjectsService);

    const first = await service.loadProjectMediaSections('project-1');
    const second = await service.loadProjectMediaSections('project-1');

    expect(first.exclusive).toHaveLength(1);
    expect(first.exclusive[0]?.id).toBe('media-1');
    expect(second).toBe(first);
    expect(mediaItemsQueryCount).toBe(1);
    expect(from).toHaveBeenCalledTimes(3);
  });
});
