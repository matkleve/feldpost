/**
 * WorkspaceViewService — sort + grouping sync (WV-3b).
 * Shared setup: workspace-view.spec-setup.ts
 */

import { setup, makeImage } from './workspace-view.spec-setup';

describe('WorkspaceViewService â€" sort + grouping sync', () => {
  function setupSortGrouping() {
    const { service } = setup();

    // Seed images with diverse cities, projects, and dates for meaningful sorting.
    const images = [
      makeImage({
        id: 'z1',
        city: 'ZÃ¼rich',
        projectName: 'Alpha',
        capturedAt: '2026-01-01T00:00:00Z',
      }),
      makeImage({
        id: 'b1',
        city: 'Berlin',
        projectName: 'Beta',
        capturedAt: '2026-03-01T00:00:00Z',
      }),
      makeImage({
        id: 'w1',
        city: 'Wien',
        projectName: 'Alpha',
        capturedAt: '2026-02-01T00:00:00Z',
      }),
      makeImage({
        id: 'b2',
        city: 'Berlin',
        projectName: 'Alpha',
        capturedAt: '2026-01-15T00:00:00Z',
      }),
      makeImage({
        id: 'z2',
        city: 'ZÃ¼rich',
        projectName: 'Beta',
        capturedAt: '2026-02-15T00:00:00Z',
      }),
    ];
    service.setActiveSelectionImages(images);
    return service;
  }

  it('auto-prepends grouping keys to effectiveSorts', () => {
    const service = setupSortGrouping();

    service.setActiveGroupings([{ id: 'city', label: 'City', icon: 'location_city' }]);

    const effective = service.effectiveSorts();
    expect(effective[0]).toEqual({ key: 'city', direction: 'asc' });
    // Default user sort should follow
    expect(effective[1]).toEqual({ key: 'date-captured', direction: 'desc' });
  });

  it('groups are sorted alphabetically when grouping direction is asc', () => {
    const service = setupSortGrouping();

    service.setActiveGroupings([{ id: 'city', label: 'City', icon: 'location_city' }]);

    const sections = service.groupedSections();
    const headings = sections.map((s) => s.heading);
    expect(headings).toEqual(['Berlin', 'Wien', 'ZÃ¼rich']);
  });

  it('groups are sorted reverse-alphabetically when grouping direction is desc', () => {
    const service = setupSortGrouping();

    service.setActiveGroupings([{ id: 'city', label: 'City', icon: 'location_city' }]);
    // Change city sort direction to descending
    service.setActiveSorts([
      { key: 'city', direction: 'desc' },
      { key: 'date-captured', direction: 'desc' },
    ]);

    const sections = service.groupedSections();
    const headings = sections.map((s) => s.heading);
    expect(headings).toEqual(['ZÃ¼rich', 'Wien', 'Berlin']);
  });

  it('multi-level grouping respects sort directions for both levels', () => {
    const service = setupSortGrouping();

    service.setActiveGroupings([
      { id: 'city', label: 'City', icon: 'location_city' },
      { id: 'project', label: 'Project', icon: 'folder' },
    ]);

    const sections = service.groupedSections();
    // Top level should be city Aâ†'Z (default asc)
    expect(sections.map((s) => s.heading)).toEqual(['Berlin', 'Wien', 'ZÃ¼rich']);

    // Berlin subgroups: Alpha, Beta (Aâ†'Z)
    const berlinSubs = sections[0].subGroups!;
    expect(berlinSubs.map((s) => s.heading)).toEqual(['Alpha', 'Beta']);
  });

  it('retains user sort direction when a property is added as grouping', () => {
    const service = setupSortGrouping();

    // User first activates city sort as descending
    service.setActiveSorts([
      { key: 'date-captured', direction: 'desc' },
      { key: 'city', direction: 'desc' },
    ]);

    // Then city is added as a grouping
    service.setActiveGroupings([{ id: 'city', label: 'City', icon: 'location_city' }]);

    const effective = service.effectiveSorts();
    // City should be first (grouping position) and retain desc direction
    expect(effective[0]).toEqual({ key: 'city', direction: 'desc' });
  });

  it('removes grouping-only sort key when grouping is removed', () => {
    const service = setupSortGrouping();

    // Activate grouping â€" city gets auto-added to sorts
    service.setActiveGroupings([{ id: 'city', label: 'City', icon: 'location_city' }]);
    expect(service.effectiveSorts().some((s) => s.key === 'city')).toBe(true);

    // Remove the grouping
    service.setActiveGroupings([]);

    const effective = service.effectiveSorts();
    // City was grouping-only â€" should be gone
    expect(effective.some((s) => s.key === 'city')).toBe(false);
    // Default sort remains
    expect(effective).toEqual([{ key: 'date-captured', direction: 'desc' }]);
  });

  it('keeps user-defined sort when grouping of same key is removed', () => {
    const service = setupSortGrouping();

    // User explicitly adds city sort first
    service.setActiveSorts([
      { key: 'date-captured', direction: 'desc' },
      { key: 'city', direction: 'asc' },
    ]);

    // Then grouping is added for city
    service.setActiveGroupings([{ id: 'city', label: 'City', icon: 'location_city' }]);

    // Then grouping is removed
    service.setActiveGroupings([]);

    const effective = service.effectiveSorts();
    // City was in user sorts before grouping â€" should remain
    expect(effective.some((s) => s.key === 'city')).toBe(true);
  });

  it('effectiveSorts deduplicates grouping keys already in user sorts', () => {
    const service = setupSortGrouping();

    // User has city in their sorts
    service.setActiveSorts([
      { key: 'date-captured', direction: 'desc' },
      { key: 'city', direction: 'desc' },
    ]);

    // Add city as grouping
    service.setActiveGroupings([{ id: 'city', label: 'City', icon: 'location_city' }]);

    const effective = service.effectiveSorts();
    // City should appear exactly once (at grouping position)
    const cityEntries = effective.filter((s) => s.key === 'city');
    expect(cityEntries.length).toBe(1);
    expect(effective[0].key).toBe('city');
  });

  it('images within a group are sorted by remaining sort keys', () => {
    const service = setupSortGrouping();

    service.setActiveGroupings([{ id: 'city', label: 'City', icon: 'location_city' }]);
    // Default: date-captured desc â€" within Berlin group, b1 (March) should come before b2 (Jan)

    const sections = service.groupedSections();
    const berlin = sections.find((s) => s.heading === 'Berlin')!;
    expect(berlin.images[0].id).toBe('b1'); // March â€" newest first
    expect(berlin.images[1].id).toBe('b2'); // January
  });

  it('changing sort direction on grouped property reorders groups', () => {
    const service = setupSortGrouping();

    service.setActiveGroupings([{ id: 'city', label: 'City', icon: 'location_city' }]);

    // Verify initial Aâ†'Z order
    let sections = service.groupedSections();
    expect(sections[0].heading).toBe('Berlin');

    // Change city to descending
    service.setActiveSorts([
      { key: 'city', direction: 'desc' },
      { key: 'date-captured', direction: 'desc' },
    ]);

    sections = service.groupedSections();
    expect(sections[0].heading).toBe('ZÃ¼rich');
    expect(sections[2].heading).toBe('Berlin');
  });
});
