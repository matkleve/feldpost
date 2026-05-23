import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MediaClusterService } from './media-cluster.service';
import { OrgSearchTuningService } from '../search/org-search-tuning.service';
import { provideOrgSearchTuningTestDouble } from '../search/search-test.providers';
import { SupabaseService } from '../supabase/supabase.service';
import { WorkspaceViewService } from '../workspace-view/workspace-view.service';

describe('MediaClusterService', () => {
  it('caches clusters per project and radius key', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          cluster_id: 0,
          lon_min: 16.2,
          lat_min: 48.1,
          lon_max: 16.5,
          lat_max: 48.3,
          media_count: 4,
        },
      ],
      error: null,
    });

    const selectedProjectIds = signal(new Set(['project-a']));

    TestBed.configureTestingModule({
      providers: [
        MediaClusterService,
        provideOrgSearchTuningTestDouble(),
        {
          provide: SupabaseService,
          useValue: { client: { rpc } },
        },
        {
          provide: WorkspaceViewService,
          useValue: { selectedProjectIds: selectedProjectIds.asReadonly() },
        },
      ],
    });

    const service = TestBed.inject(MediaClusterService);
    await service.ensureLoaded();
    await service.ensureLoaded();

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('get_media_clusters', {
      p_project_id: 'project-a',
      p_radius_km: 120,
    });
    expect(service.clusters()).toEqual([
      {
        clusterId: 0,
        viewbox: '16.2,48.3,16.5,48.1',
        mediaCount: 4,
      },
    ]);
  });

  it('returns empty clusters when no project is selected', async () => {
    const rpc = vi.fn();
    const selectedProjectIds = signal(new Set<string>());

    TestBed.configureTestingModule({
      providers: [
        MediaClusterService,
        provideOrgSearchTuningTestDouble(),
        {
          provide: SupabaseService,
          useValue: { client: { rpc } },
        },
        {
          provide: WorkspaceViewService,
          useValue: { selectedProjectIds: selectedProjectIds.asReadonly() },
        },
      ],
    });

    const service = TestBed.inject(MediaClusterService);
    await service.ensureLoaded();

    expect(rpc).not.toHaveBeenCalled();
    expect(service.clusters()).toEqual([]);
  });
});
