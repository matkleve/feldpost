import { Injectable, inject } from '@angular/core';
import { UserProfileService } from '../user-profile/user-profile.service';
import { WidgetsService } from '../widgets/widgets.service';
import { OrganizationWidgetsAdapter } from './adapters/organization-widgets.adapter';
import { installRow } from './organization-widgets.helpers';

/**
 * Installs a catalog widget for the signed-in member's organization.
 * A second install of the same widget is a no-op. There is no terminal state.
 * @see docs/specs/service/organization-widgets/organization-widgets.md
 */
@Injectable({ providedIn: 'root' })
export class OrganizationWidgetsService {
  private readonly profiles = inject(UserProfileService);
  private readonly widgets = inject(WidgetsService);
  private readonly store = inject(OrganizationWidgetsAdapter);

  async install(widgetId: string): Promise<void> {
    const profile = await this.profiles.getOwnProfile();
    const organizationId = profile.data?.organizationId ?? '';
    if (profile.error || !organizationId) {
      throw new Error(profile.error?.message ?? 'Organization context not loaded');
    }
    const row = installRow(organizationId, widgetId, this.widgets.entries());
    if (!row) {
      throw new Error('Widget is not installable');
    }
    await this.store.upsert(row);
  }
}
