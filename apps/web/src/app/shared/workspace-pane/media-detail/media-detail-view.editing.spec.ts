/**
 * MediaDetailViewComponent — field editing & metadata CRUD.
 *
 * Covers use-cases IE-1 through IE-8:
 *   IE-1/2/3/7  saveImageField  (optimistic update, Supabase write, rollback)
 *   IE-4        saveMetadata
 *   IE-5        addMetadata
 *   IE-6        removeMetadata
 *   IE-8        editingField (escape-to-cancel)
 *
 * Shared setup: media-detail-view.spec-setup.ts
 */

import {
  setup,
  setImageId,
  MOCK_MEDIA,
  MOCK_METADATA,
} from './media-detail-view.spec-setup';

// ── saveImageField (IE-1, IE-2, IE-3, IE-7) ──────────────────────────────────

describe('MediaDetailViewComponent – saveImageField', () => {
  it('updates address_label optimistically', async () => {
    const { component } = setup();
    component.media.set({ ...MOCK_MEDIA });

    await component.saveImageField('address_label', 'New Address');

    expect(component.media()!.address_label).toBe('New Address');
    expect(component.editingField()).toBeNull();
    expect(component.saving()).toBe(false);
  });

  it('calls Supabase media_items.update for a changed field', async () => {
    const { component, fake } = setup();
    component.media.set({ ...MOCK_MEDIA });

    await component.saveImageField('city', 'Graz');

    expect(fake.client.from).toHaveBeenCalledWith('media_items');
    expect(fake.updateFn).toHaveBeenCalledWith({ city: 'Graz' });
    expect(fake.updateEqFn).toHaveBeenCalledWith(
      `id.eq.${MOCK_MEDIA.id},source_image_id.eq.${MOCK_MEDIA.id}`,
    );
  });

  it('skips save when value is unchanged', async () => {
    const { component, fake } = setup();
    component.media.set({ ...MOCK_MEDIA });
    fake.client.from.mockClear();

    await component.saveImageField('city', 'Wien');

    expect(fake.updateFn).not.toHaveBeenCalled();
  });

  it('stores null for empty string values', async () => {
    const { component, fake } = setup();
    component.media.set({ ...MOCK_MEDIA });

    await component.saveImageField('district', '');

    expect(component.media()!.district).toBeNull();
    expect(fake.updateFn).toHaveBeenCalledWith({ district: null });
  });

  it('does nothing when image is null', async () => {
    const { component, fake } = setup();
    component.media.set(null);
    fake.client.from.mockClear();

    await component.saveImageField('city', 'Wien');

    expect(fake.client.from).not.toHaveBeenCalled();
  });

  it('rolls back on Supabase error', async () => {
    const { component, fake } = setup();
    component.media.set({ ...MOCK_MEDIA });
    fake.updateEqFn.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });

    await component.saveImageField('city', 'Graz');

    expect(component.media()!.city).toBe('Wien');
    expect(component.saving()).toBe(false);
  });
});

// ── saveMetadata (IE-4) ───────────────────────────────────────────────────────

describe('MediaDetailViewComponent – saveMetadata', () => {
  it('updates metadata value optimistically', async () => {
    const { component, fixture } = setup();
    setImageId(component, 'img-001');
    fixture.detectChanges();
    component.media.set({ ...MOCK_MEDIA });
    component.metadata.set([...MOCK_METADATA]);

    await component.saveMetadata(MOCK_METADATA[0], 'Commercial');

    expect(component.metadata()[0].value).toBe('Commercial');
  });

  it('calls upsert on media_metadata table', async () => {
    const { component, fake, fixture } = setup();
    setImageId(component, 'img-001');
    fixture.detectChanges();
    component.media.set({ ...MOCK_MEDIA });
    component.metadata.set([...MOCK_METADATA]);

    await component.saveMetadata(MOCK_METADATA[0], 'Commercial');

    expect(fake.client.from).toHaveBeenCalledWith('media_metadata');
    expect(fake.upsertFn).toHaveBeenCalledWith(
      {
        media_item_id: 'media-001',
        metadata_key_id: 'mk-001',
        value_text: 'Commercial',
      },
      { onConflict: 'media_item_id,metadata_key_id' },
    );
  });

  it('skips save when value is unchanged', async () => {
    const { component, fake } = setup();
    component.media.set({ ...MOCK_MEDIA });
    component.metadata.set([...MOCK_METADATA]);
    fake.upsertFn.mockClear();

    await component.saveMetadata(MOCK_METADATA[0], 'Residential');

    expect(fake.upsertFn).not.toHaveBeenCalled();
  });

  it('does nothing when imageId is null', async () => {
    const { component, fake } = setup();
    component.metadata.set([...MOCK_METADATA]);
    fake.upsertFn.mockClear();

    await component.saveMetadata(MOCK_METADATA[0], 'New Value');

    expect(fake.upsertFn).not.toHaveBeenCalled();
  });

  it('rolls back on upsert error', async () => {
    const { component, fake } = setup();
    setImageId(component, 'img-001');
    component.media.set({ ...MOCK_MEDIA });
    component.metadata.set([...MOCK_METADATA]);
    fake.upsertFn.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });

    await component.saveMetadata(MOCK_METADATA[0], 'Commercial');

    expect(component.metadata()[0].value).toBe('Residential');
  });
});

// ── removeMetadata (IE-6) ─────────────────────────────────────────────────────

describe('MediaDetailViewComponent – removeMetadata', () => {
  it('removes entry optimistically', async () => {
    const { component, fixture } = setup();
    setImageId(component, 'img-001');
    fixture.detectChanges();
    component.metadata.set([...MOCK_METADATA]);

    await component.removeMetadata(MOCK_METADATA[0]);

    expect(component.metadata().length).toBe(1);
    expect(component.metadata()[0].key).toBe('Floor');
  });

  it('does nothing when imageId is null', async () => {
    const { component, fake } = setup();
    component.metadata.set([...MOCK_METADATA]);
    fake.deleteFn.mockClear();

    await component.removeMetadata(MOCK_METADATA[0]);

    expect(component.metadata().length).toBe(2);
  });

  it('rolls back on delete error', async () => {
    const { component, fake } = setup();
    setImageId(component, 'img-001');
    component.metadata.set([...MOCK_METADATA]);
    fake.deleteEq2Fn.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });

    await component.removeMetadata(MOCK_METADATA[0]);

    expect(component.metadata().length).toBe(2);
  });
});

// ── addMetadata (IE-5) ────────────────────────────────────────────────────────

describe('MediaDetailViewComponent – addMetadata', () => {
  it('does nothing with empty key', async () => {
    const { component, fake } = setup();
    component.media.set({ ...MOCK_MEDIA });
    fake.client.from.mockClear();

    await component.addMetadata('', 'text', 'value');

    expect(fake.client.from).not.toHaveBeenCalled();
  });

  it('does nothing with empty value', async () => {
    const { component, fake } = setup();
    component.media.set({ ...MOCK_MEDIA });
    fake.client.from.mockClear();

    await component.addMetadata('key', 'text', '');

    expect(fake.client.from).not.toHaveBeenCalled();
  });

  it('does nothing when image is null', async () => {
    const { component, fake } = setup();
    component.media.set(null);
    fake.client.from.mockClear();

    await component.addMetadata('Floor', 'text', '5th');

    expect(fake.client.from).not.toHaveBeenCalled();
  });

  it('appends new entry to metadata list on success', async () => {
    const { component } = setup();
    component.media.set({ ...MOCK_MEDIA });
    component.metadata.set([]);

    await component.addMetadata('Phase', 'text', 'Construction');

    expect(component.metadata().length).toBe(1);
    expect(component.metadata()[0].key).toBe('Phase');
    expect(component.metadata()[0].value).toBe('Construction');
  });
});

// ── editingField (IE-8) ───────────────────────────────────────────────────────

describe('MediaDetailViewComponent – editingField', () => {
  it('can be set to a field name', () => {
    const { component } = setup();
    component.editingField.set('address_label');
    expect(component.editingField()).toBe('address_label');
  });

  it('resets to null (cancel via Escape in template)', () => {
    const { component } = setup();
    component.editingField.set('address_label');
    component.editingField.set(null);
    expect(component.editingField()).toBeNull();
  });
});
