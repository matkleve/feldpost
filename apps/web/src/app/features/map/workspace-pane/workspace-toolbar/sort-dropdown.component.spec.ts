/**
 * SortDropdownComponent — sort + grouping sync tests (WV-3b).
 *
 * Strategy:
 *  - WorkspaceViewService is faked with signal stubs.
 *  - Tests verify the dropdown correctly splits options into grouped/ungrouped,
 *    reflects the effective sort state, and emits proper SortConfig[] on toggle.
 */

import { TestBed } from '@angular/core/testing';
import { SortDropdownComponent } from './sort-dropdown.component';
import { WorkspaceViewService } from '../../../../core/workspace-view.service';
import { PropertyRegistryService } from '../../../../core/property-registry.service';
import { signal } from '@angular/core';
import type { SortConfig, PropertyRef } from '../../../../core/workspace-view.types';

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
      PropertyRegistryService,
      { provide: WorkspaceViewService, useValue: fakeViewService },
    ],
  });

  const component = TestBed.createComponent(SortDropdownComponent).componentInstance;
  return { component, fakeViewService };
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
    it('activates with ascending on first click (deactivated → ↑)', () => {
      const { component } = setup();
      let emitted: SortConfig[] = [];
      component.sortChanged.subscribe((v: SortConfig[]) => (emitted = v));

      component.toggleSort('city');

      expect(emitted).toContainEqual({ key: 'city', direction: 'asc' });
    });

    it('flips to descending on second click (↑ → ↓)', () => {
      const { component } = setup();
      let emitted: SortConfig[] = [];
      component.sortChanged.subscribe((v: SortConfig[]) => (emitted = v));

      component.toggleSort('city'); // → asc
      component.toggleSort('city'); // → desc

      const citySort = emitted.find((s) => s.key === 'city');
      expect(citySort?.direction).toBe('desc');
    });

    it('deactivates on third click (↓ → —)', () => {
      const { component } = setup();
      let emitted: SortConfig[] = [];
      component.sortChanged.subscribe((v: SortConfig[]) => (emitted = v));

      component.toggleSort('city'); // → asc
      component.toggleSort('city'); // → desc
      component.toggleSort('city'); // → deactivated

      expect(emitted.some((s) => s.key === 'city')).toBe(false);
    });
  });

  describe('direction symbols', () => {
    it('shows – for inactive sort', () => {
      const { component } = setup();
      expect(component.getDirectionSymbol('city')).toBe('–');
    });

    it('shows ↑ for ascending sort', () => {
      const { component } = setup();
      component.toggleSort('city');
      expect(component.getDirectionSymbol('city')).toBe('↑');
    });

    it('shows ↓ for descending sort', () => {
      const { component } = setup();
      component.toggleSort('city');
      component.toggleSort('city');
      expect(component.getDirectionSymbol('city')).toBe('↓');
    });

    it('shows next state symbol on hover (↑ for inactive, ↓ for asc, – for desc)', () => {
      const { component } = setup();
      expect(component.getNextDirectionSymbol('city')).toBe('↑');

      component.toggleSort('city');
      expect(component.getNextDirectionSymbol('city')).toBe('↓');

      component.toggleSort('city');
      expect(component.getNextDirectionSymbol('city')).toBe('–');
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
