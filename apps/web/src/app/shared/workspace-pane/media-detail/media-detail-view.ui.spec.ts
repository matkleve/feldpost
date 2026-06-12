/**
 * MediaDetailViewComponent — delete flow, context menu, address search.
 * Shared setup: media-detail-view.spec-setup.ts
 */

import {
  setup,
  setImageId,
  MOCK_MEDIA,
} from './media-detail-view.spec-setup';

// ── Delete flow ───────────────────────────────────────────────────────────────

describe('MediaDetailViewComponent – delete flow', () => {
  it('confirmDelete shows dialog and hides context menu', () => {
    const { component } = setup();
    component.showContextMenu.set(true);

    component.confirmDelete();

    expect(component.destructiveConfirm()).toEqual({ kind: 'delete_media' });
    expect(component.showContextMenu()).toBe(false);
  });

  it('cancelDelete hides the dialog', () => {
    const { component } = setup();
    component.destructiveConfirm.set({ kind: 'delete_media' });

    component.cancelDelete();

    expect(component.destructiveConfirm()).toBeNull();
  });

  it('executeDelete calls Supabase delete and emits closed', async () => {
    const { component, fake, fixture } = setup();
    setImageId(component, 'img-001');
    fixture.detectChanges();
    let closedEmitted = false;
    component.closed.subscribe(() => (closedEmitted = true));

    await component.executeDelete();

    expect(fake.client.from).toHaveBeenCalledWith('media_items');
    expect(closedEmitted).toBe(true);
  });

  it('executeDelete does nothing when imageId is null', async () => {
    const { component, fake } = setup();
    fake.deleteFn.mockClear();
    let closedEmitted = false;
    component.closed.subscribe(() => (closedEmitted = true));

    await component.executeDelete();

    expect(closedEmitted).toBe(false);
  });
});

// ── Context menu ──────────────────────────────────────────────────────────────

describe('MediaDetailViewComponent – context menu', () => {
  it('toggleContextMenu toggles visibility', () => {
    const { component } = setup();

    component.toggleContextMenu();
    expect(component.showContextMenu()).toBe(true);

    component.toggleContextMenu();
    expect(component.showContextMenu()).toBe(false);
  });

  it('closeContextMenu sets false', () => {
    const { component } = setup();
    component.showContextMenu.set(true);

    component.closeContextMenu();

    expect(component.showContextMenu()).toBe(false);
  });
});

// ── Address search ────────────────────────────────────────────────────────────

describe('MediaDetailViewComponent – address search', () => {
  it('openAddressSearch sets editingField to address_search', () => {
    const { component } = setup();
    component.media.set({ ...MOCK_MEDIA });

    component.openAddressSearch();

    expect(component.editingField()).toBe('address_search');
  });

  it('applyAddressSuggestion updates image address fields', async () => {
    const { component } = setup();
    component.media.set({ ...MOCK_MEDIA });

    await component.applyAddressSuggestion({
      lat: 47.07,
      lng: 15.44,
      addressLabel: 'Hauptplatz 1, Graz',
      street: 'Hauptplatz',
      city: 'Graz',
      district: 'Innere Stadt',
      country: 'Austria',
      streetNumber: '',
      zip: '',
    });

    expect(component.media()!.street).toBe('Hauptplatz');
    expect(component.media()!.city).toBe('Graz');
    expect(component.media()!.address_label).toBe('Hauptplatz 1, Graz');
    expect(component.editingField()).toBeNull();
  });

  it('applyAddressSuggestion calls Supabase update', async () => {
    const { component, fake } = setup();
    component.media.set({ ...MOCK_MEDIA });

    await component.applyAddressSuggestion({
      lat: 47.07,
      lng: 15.44,
      addressLabel: 'Hauptplatz 1, Graz',
      street: 'Hauptplatz',
      city: 'Graz',
      district: 'Innere Stadt',
      country: 'Austria',
      streetNumber: '',
      zip: '',
    });

    expect(fake.client.from).toHaveBeenCalledWith('media_items');
    expect(fake.updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        street: 'Hauptplatz',
        city: 'Graz',
        country: 'Austria',
        address_label: 'Hauptplatz 1, Graz',
      }),
    );
  });
});
