/**
 * MediaDetailViewComponent — captured date editor (DateSaveEvent + has_time).
 * Shared setup: media-detail-view.spec-setup.ts
 */

import { setup, MOCK_MEDIA } from './media-detail-view.spec-setup';

describe('MediaDetailViewComponent – captured date editor', () => {
  it('openCapturedAtEditor parses date and time when has_time=true', () => {
    const { component } = setup();
    component.media.set({
      ...MOCK_MEDIA,
      captured_at: '2025-06-15T10:30:00Z',
      has_time: true,
    });

    component.openCapturedAtEditor();

    expect(component.editingField()).toBe('captured_at');
    expect(component.editDate()).toBe('2025-06-15');
    expect(component.editTime()).toMatch(/^\d{2}:\d{2}$/);
  });

  it('openCapturedAtEditor sets empty time when has_time=false', () => {
    const { component } = setup();
    component.media.set({
      ...MOCK_MEDIA,
      captured_at: '2025-06-15T00:00:00Z',
      has_time: false,
    });

    component.openCapturedAtEditor();

    expect(component.editDate()).toBe('2025-06-15');
    expect(component.editTime()).toBe('');
  });

  it('openCapturedAtEditor sets empty fields when no captured_at', () => {
    const { component } = setup();
    component.media.set({ ...MOCK_MEDIA, captured_at: null, has_time: false });

    component.openCapturedAtEditor();

    expect(component.editDate()).toBe('');
    expect(component.editTime()).toBe('');
    expect(component.editingField()).toBe('captured_at');
  });

  it('saveCapturedAt with date+time saves combined with has_time=true', async () => {
    const { component, fake } = setup();
    component.media.set({ ...MOCK_MEDIA });

    await component.saveCapturedAt({ date: '2025-07-20', time: '14:30' });

    const expectedIso = new Date('2025-07-20T14:30:00').toISOString();
    expect(fake.updateFn).toHaveBeenCalledWith({ captured_at: expectedIso });
    expect(component.media()!.has_time).toBe(true);
  });

  it('saveCapturedAt with date-only saves with has_time=false', async () => {
    const { component, fake } = setup();
    component.media.set({ ...MOCK_MEDIA });

    await component.saveCapturedAt({ date: '2025-07-20', time: null });

    const expectedIso = new Date('2025-07-20T00:00:00').toISOString();
    expect(fake.updateFn).toHaveBeenCalledWith({ captured_at: expectedIso });
    expect(component.media()!.has_time).toBe(false);
  });

  it('saveCapturedAt with 00:00 time saves with has_time=true', async () => {
    const { component, fake } = setup();
    component.media.set({ ...MOCK_MEDIA });

    await component.saveCapturedAt({ date: '2025-07-20', time: '00:00' });

    const expectedIso = new Date('2025-07-20T00:00:00').toISOString();
    expect(fake.updateFn).toHaveBeenCalledWith({ captured_at: expectedIso });
    expect(component.media()!.has_time).toBe(true);
  });

  it('saveCapturedAt with null date clears captured_at', async () => {
    const { component, fake } = setup();
    component.media.set({ ...MOCK_MEDIA });

    await component.saveCapturedAt({ date: null, time: null });

    expect(component.media()!.captured_at).toBeNull();
    expect(component.media()!.has_time).toBe(false);
    expect(fake.updateFn).toHaveBeenCalledWith({ captured_at: null });
  });

  it('saveCapturedAt closes editor', async () => {
    const { component } = setup();
    component.media.set({ ...MOCK_MEDIA });
    component.editingField.set('captured_at');

    await component.saveCapturedAt({ date: '2025-07-20', time: '09:00' });

    expect(component.editingField()).toBeNull();
  });

  it('saveCapturedAt rolls back on Supabase error', async () => {
    const { component, fake } = setup();
    const original = '2025-06-15T10:30:00Z';
    component.media.set({ ...MOCK_MEDIA, captured_at: original, has_time: true });
    fake.updateEqFn.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });

    await component.saveCapturedAt({ date: '2026-01-01', time: '08:00' });

    expect(component.media()!.captured_at).toBe(original);
    expect(component.media()!.has_time).toBe(true);
  });

  it('saveCapturedAt does nothing when image is null', async () => {
    const { component, fake } = setup();
    component.media.set(null);
    fake.client.from.mockClear();

    await component.saveCapturedAt({ date: '2025-07-20', time: '14:30' });

    expect(fake.updateFn).not.toHaveBeenCalled();
  });

  it('captureDate shows date+time when has_time=true', () => {
    const { component } = setup();
    component.media.set({
      ...MOCK_MEDIA,
      captured_at: '2025-06-15T10:30:00',
      has_time: true,
    });

    const display = component.captureDate();
    expect(display).toContain('2025');
    expect(display).toContain('10:30');
  });

  it('captureDate shows date-only when has_time=false', () => {
    const { component } = setup();
    component.media.set({
      ...MOCK_MEDIA,
      captured_at: '2025-06-15T00:00:00',
      has_time: false,
    });

    const display = component.captureDate();
    expect(display).toContain('2025');
    expect(display).not.toContain('00:00');
  });

  it('captureDate returns null when captured_at is null', () => {
    const { component } = setup();
    component.media.set({ ...MOCK_MEDIA, captured_at: null });
    expect(component.captureDate()).toBeNull();
  });
});
