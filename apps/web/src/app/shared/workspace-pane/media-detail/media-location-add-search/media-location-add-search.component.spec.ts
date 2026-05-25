import { TestBed } from '@angular/core/testing';
import { MediaLocationAddSearchComponent } from './media-location-add-search.component';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { MediaLocationsService } from '../../../../core/media-locations/media-locations.service';
import { SearchBarService } from '../../../../core/search/search-bar.service';
import { SearchOrchestratorService } from '../../../../core/search/search-orchestrator.service';
import { formatLocationDisplayLine } from '../../../../core/media-locations/media-locations.helpers';
import type { OrgLocationSearchRow } from '../../../../core/media-locations/media-locations.types';

const ORG_ROW: OrgLocationSearchRow = {
  id: 'loc-1',
  media_item_id: null,
  organization_id: 'org-1',
  street: 'Skodagasse',
  house_number: null,
  staircase: null,
  door: null,
  floor: null,
  postcode: '1080',
  extra_information: null,
  city: 'Wien',
  district: null,
  country: 'AT',
  latitude: 48.2,
  longitude: 16.37,
  address_label: null,
  sort_order: 0,
  staircase_sort_key: '~~',
  door_sort_key: '~~',
  created_at: '',
  updated_at: '',
  is_linked_to_media: false,
};

describe('MediaLocationAddSearchComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MediaLocationAddSearchComponent],
      providers: [
        {
          provide: I18nService,
          useValue: { t: (_k: string, fb: string) => fb, language: () => 'en' },
        },
        {
          provide: MediaLocationsService,
          useValue: { searchLocations: vi.fn().mockResolvedValue({ ok: true, rows: [] }) },
        },
        {
          provide: SearchBarService,
          useValue: {
            orchestratorOptionsFromOrg: () => ({ debounceMs: 0, cacheTtlMs: 0, recentMaxItems: 0, geocoderDedupMeters: 0 }),
            resolveDbAddressCandidates: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
            resolveGeocoderCandidates: () => ({ pipe: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) }),
          },
        },
        {
          provide: SearchOrchestratorService,
          useValue: {
            configureOptions: vi.fn(),
            configureSources: vi.fn(),
            searchInput: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
          },
        },
      ],
    });
  });

  it('onOrgLocationClick sets input and pick snapshot to formatLocationDisplayLine', () => {
    const fixture = TestBed.createComponent(MediaLocationAddSearchComponent);
    fixture.componentRef.setInput('mediaItemId', 'media-1');
    fixture.componentInstance.active.set(true);
    fixture.detectChanges();

    const expected = formatLocationDisplayLine(ORG_ROW, 'Top');
    fixture.componentInstance.onOrgLocationClick(ORG_ROW, new Event('click'));
    fixture.detectChanges();

    expect(fixture.componentInstance.query()).toBe(expected);
    expect(fixture.componentInstance['pickQuerySnapshot']).toBe(expected);
  });
});
