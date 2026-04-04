import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SortDropdownComponent } from './sort-dropdown.component';
import { WorkspaceViewService } from '../../core/workspace-view/workspace-view.service';
import { MetadataService } from '../../core/metadata/metadata.service';
import type { SortConfig, PropertyRef } from '../../core/workspace-view/workspace-view.types';

function buildFakeViewService() {
  return {
    activeSorts: signal<SortConfig[]>([{ key: 'date-captured', direction: 'desc' as const }]),
    activeGroupings: signal<PropertyRef[]>([]),
    effectiveSorts: signal<SortConfig[]>([{ key: 'date-captured', direction: 'desc' as const }]),
  };
}

function setup(overrides?: Partial<ReturnType<typeof buildFakeViewService>>) {
  const fakeViewService = { ...buildFakeViewService(), ...overrides };

  TestBed.configureTestingModule({
    providers: [
      MetadataService,
      { provide: WorkspaceViewService, useValue: fakeViewService },
    ],
  });

  const fixture = TestBed.createComponent(SortDropdownComponent);
  fixture.detectChanges();
  return { component: fixture.componentInstance, fixture, fakeViewService };
}

describe('SortDropdownComponent', () => {
  describe('grouping sync display', () => {
    it('shows no grouped section when no groupings active', () => {
      const { component } = setup();
      expect(component.groupedOptions()).toEqual([]);
    });

    it('shows grouped properties in grouping order when groupings active', () => {
      const { component, fakeViewService } = setup();

      fakeViewService.activeGroupings.set([
        { id: 'city', label: 'City', icon: 'location_city' },
        { id: 'project', label: 'Project', icon: 'folder' },
      ]);

      const grouped = component.groupedOptions();
      expect(grouped.length).toBe(2);
      expect(grouped[0].id).toBe('city');
      expect(grouped[1].id).toBe('project');
    });

    it('excludes grouped properties from the main options list', () => {
      const { component, fakeViewService } = setup();

      fakeViewService.activeGroupings.set([{ id: 'city', label: 'City', icon: 'location_city' }]);

      const filtered = component.filteredOptions();
      expect(filtered.some((o) => o.id === 'city')).toBe(false);
    });

    it('filters grouped options by search term', () => {
      const { component, fakeViewService } = setup();

      fakeViewService.activeGroupings.set([
        { id: 'city', label: 'City', icon: 'location_city' },
        { id: 'project', label: 'Project', icon: 'folder' },
      ]);

      component.searchTerm.set('proj');
      const grouped = component.groupedOptions();
      expect(grouped.length).toBe(1);
      expect(grouped[0].id).toBe('project');
    });
  });

  describe('tri-state toggle', () => {
    it('activates with ascending on first click', () => {
      const { component } = setup();
      let emitted: SortConfig[] = [];
      component.sortChanged.subscribe((v: SortConfig[]) => (emitted = v));

      component.toggleSort('city');

      expect(emitted).toContainEqual({ key: 'city', direction: 'asc' });
    });

    it('flips to descending on second click', () => {
      const { component } = setup();
      let emitted: SortConfig[] = [];
      component.sortChanged.subscribe((v: SortConfig[]) => (emitted = v));

      component.toggleSort('city');
      component.toggleSort('city');

      const citySort = emitted.find((s) => s.key === 'city');
      expect(citySort?.direction).toBe('desc');
    });

    it('deactivates on third click', () => {
      const { component } = setup();
      let emitted: SortConfig[] = [];
      component.sortChanged.subscribe((v: SortConfig[]) => (emitted = v));

      component.toggleSort('city');
      component.toggleSort('city');
      component.toggleSort('city');

      expect(emitted.some((s) => s.key === 'city')).toBe(false);
    });

    it('activates inactive rows with the option default direction', () => {
      const { component, fixture } = setup();
      fixture.componentRef.setInput('optionsInput', [
        {
          id: 'date-uploaded',
          label: 'Date uploaded',
          icon: 'cloud_upload',
          defaultDirection: 'desc',
        },
      ]);
      fixture.detectChanges();

      component.toggleSort('date-uploaded');

      expect(component.activeSorts()).toContainEqual({ key: 'date-uploaded', direction: 'desc' });
    });
  });

  describe('direction symbols', () => {
    it('shows en dash for inactive sort', () => {
      const { component } = setup();
      expect(component.getDirectionSymbol('city')).toBe('\u2013');
    });

    it('shows up arrow for ascending sort', () => {
      const { component } = setup();
      component.toggleSort('city');
      expect(component.getDirectionSymbol('city')).toBe('\u2191');
    });

    it('shows down arrow for descending sort', () => {
      const { component } = setup();
      component.toggleSort('city');
      component.toggleSort('city');
      expect(component.getDirectionSymbol('city')).toBe('\u2193');
    });

    it('shows the next state symbol for the next click target', () => {
      const { component } = setup();
      expect(component.getNextDirectionSymbol('city')).toBe('\u2191');

      component.toggleSort('city');
      expect(component.getNextDirectionSymbol('city')).toBe('\u2193');

      component.toggleSort('city');
      expect(component.getNextDirectionSymbol('city')).toBe('\u2013');
    });

    it('shows the current state at rest and the next state on hover', () => {
      const { component } = setup();

      expect(component.getDisplayedDirectionSymbol('city')).toBe('\u2013');

      component.setHoveredSort('city');
      expect(component.getDisplayedDirectionSymbol('city')).toBe('\u2191');

      component.toggleSort('city');
      expect(component.getDisplayedDirectionSymbol('city')).toBe('\u2193');

      component.clearHoveredSort('city');
      expect(component.getDisplayedDirectionSymbol('city')).toBe('\u2191');
    });
  });

  describe('reset', () => {
    it('resets to default sort on resetSort()', () => {
      const { component } = setup();
      let emitted: SortConfig[] = [];
      component.sortChanged.subscribe((v: SortConfig[]) => (emitted = v));

      component.toggleSort('city');
      component.resetSort();

      expect(emitted).toEqual([{ key: 'date-captured', direction: 'desc' }]);
    });

    it('hasCustomSort is false at default state', () => {
      const { component } = setup();
      expect(component.hasCustomSort()).toBe(false);
    });

    it('hasCustomSort is true when user adds a sort', () => {
      const { component } = setup();
      component.toggleSort('city');
      expect(component.hasCustomSort()).toBe(true);
    });
  });

  describe('empty search state', () => {
    it('returns empty filtered when search matches nothing', () => {
      const { component } = setup();
      component.searchTerm.set('zzzznonexistent');
      expect(component.filteredOptions().length).toBe(0);
      expect(component.groupedOptions().length).toBe(0);
    });
  });

  describe('reads effective sorts on init', () => {
    it('initializes activeSorts from the service effectiveSorts', () => {
      const fakeViewService = buildFakeViewService();
      fakeViewService.effectiveSorts.set([
        { key: 'city', direction: 'asc' },
        { key: 'date-captured', direction: 'desc' },
      ]);
      const { component } = setup(fakeViewService);

      expect(component.activeSorts()).toEqual([
        { key: 'city', direction: 'asc' },
        { key: 'date-captured', direction: 'desc' },
      ]);
    });
  });
});

