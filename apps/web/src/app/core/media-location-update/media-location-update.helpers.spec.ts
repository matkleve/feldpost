import { describe, expect, it } from 'vitest';
import {
  formatLocationUpdateFailureMessage,
  locationUpdateFailureMessageToToastText,
  LOCATION_UPDATE_NOT_FOUND_ERROR,
} from './media-location-update.helpers';

describe('media-location-update.helpers', () => {
  it('maps ambiguous RPC overload errors', () => {
    const parts = formatLocationUpdateFailureMessage(
      'Could not choose the best candidate function between: public.resolve_media_location(uuid, numeric, numeric, text, text, text, text, text) and public.resolve_media_location(uuid, numeric, numeric, text, text, text, text, text, text)',
    );
    expect(parts.title).toBe('Location update failed');
    expect(parts.summary).toContain('conflicting');
    expect(parts.hint).toContain('db reset');
  });

  it('maps profile missing errors', () => {
    const parts = formatLocationUpdateFailureMessage(
      'User profile or organization not found',
    );
    expect(parts.summary).toContain('profile');
    expect(parts.hint).toContain('create-local-dev-user');
  });

  it('maps org-not-found sentinel', () => {
    const parts = formatLocationUpdateFailureMessage(LOCATION_UPDATE_NOT_FOUND_ERROR);
    expect(parts.summary).toContain('not found');
  });

  it('builds toast text with hint', () => {
    const text = locationUpdateFailureMessageToToastText(
      formatLocationUpdateFailureMessage('GPS assignment is disabled for this media item type'),
    );
    expect(text).toContain('GPS is locked');
    expect(text).toContain('supabase db reset');
  });
});
