import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../supabase/supabase.service';
import type { OrganizationWidgetRow } from '../organization-widgets.types';

/**
 * Writes organization_widgets. A second insert of the same pair is a no-op.
 * @see docs/specs/service/organization-widgets/organization-widgets.md
 */
@Injectable({ providedIn: 'root' })
export class OrganizationWidgetsAdapter {
  private readonly supabase = inject(SupabaseService);

  async upsert(row: OrganizationWidgetRow): Promise<void> {
    const { error } = await this.supabase.client.from('organization_widgets').upsert(
      { organization_id: row.organization_id, widget_id: row.widget_id },
      { onConflict: 'organization_id,widget_id', ignoreDuplicates: true },
    );
    if (error) throw new Error(error.message);
  }
}
