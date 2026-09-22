import { describe, expect, it } from 'vitest';
import { WidgetsCatalogAdapter } from '../widgets/adapters/widgets-catalog.adapter';
import { installRow } from './organization-widgets.helpers';

describe('installRow', () => {
  const entries = new WidgetsCatalogAdapter().entries();

  it('builds a row only for an allowed installable widget', () => {
    expect(installRow('org-1', 'buildings', entries)).toEqual({
      organization_id: 'org-1',
      widget_id: 'buildings',
    });
    expect(installRow('org-1', 'media', entries)).toBeNull();
    expect(installRow('', 'buildings', entries)).toBeNull();
    expect(installRow('org-1', 'buildings', [{ ...entries[9], allowed: false }])).toBeNull();
  });
});
