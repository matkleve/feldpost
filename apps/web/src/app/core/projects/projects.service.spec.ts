import { TestBed } from '@angular/core/testing';

import { ProjectsService } from './projects.service';
import { SupabaseService } from '../supabase.service';
import type { ProjectStatusFilter } from './projects.types';

type QueryResult = { data: unknown; error: unknown };

interface FakeSupabaseData {
  titleAddressRows?: Array<{ id: string; project_id: string | null }>;
  metadataRows?: Array<{
    image_id: string;
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
      if (column !== 'source_image_id') {
        return Promise.resolve({ data: [], error: null });
      }

      const filtered = mediaItemRows.filter(
        (row) => !!row.source_image_id && values.includes(row.source_image_id),
      );
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
      if (table === 'image_metadata') return metadataChain;
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
          image_id: 'img-2',
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
          image_id: 'img-3',
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
