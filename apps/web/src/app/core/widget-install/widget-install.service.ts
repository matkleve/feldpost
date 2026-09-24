import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { effectiveWidgetIds, WIDGET_IDS } from './widget-install.helpers';
import type { UserWidgetRow, WidgetId, WidgetPolicyRow } from './widget-install.types';

const NAV_FALLBACK: readonly WidgetId[] = WIDGET_IDS;

/**
 * Reads widget install rows. On a read failure the nav keeps today's five apps
 * so a database that has not applied the migration does not go blank.
 * @see docs/specs/system/widget-install.md
 */
@Injectable({ providedIn: 'root' })
export class WidgetInstallService {
  private readonly supabase = inject(SupabaseService);

  readonly installedIds = signal<readonly WidgetId[]>(NAV_FALLBACK);
  readonly policies = signal<readonly WidgetPolicyRow[]>([]);

  async load(): Promise<void> {
    const [policiesResult, userRowsResult] = await Promise.all([
      this.supabase.client
        .from('organization_widget_policies')
        .select('widget_id, allowed, preinstalled, locked'),
      this.supabase.client.from('user_widget_installs').select('widget_id, installed'),
    ]);

    if (policiesResult.error || userRowsResult.error) {
      this.installedIds.set(NAV_FALLBACK);
      return;
    }

    const policies = (policiesResult.data ?? [])
      .map(toPolicy)
      .filter((row): row is WidgetPolicyRow => row !== null);
    const userRows = (userRowsResult.data ?? [])
      .map(toUserRow)
      .filter((row): row is UserWidgetRow => row !== null);

    this.policies.set(policies);
    this.installedIds.set(effectiveWidgetIds({ policies, userRows }));
  }

  async setInstalled(widgetId: WidgetId, installed: boolean): Promise<void> {
    const { error } = await this.supabase.client.rpc('set_own_widget_installed', {
      p_widget_id: widgetId,
      p_installed: installed,
    });
    if (error) {
      return;
    }
    await this.load();
  }

  async push(widgetId: WidgetId): Promise<string | null> {
    const { error } = await this.supabase.client.rpc('push_organization_widget', {
      p_widget_id: widgetId,
    });
    if (error) {
      return error.message;
    }
    await this.load();
    return null;
  }

  async savePolicy(
    organizationId: string,
    policy: WidgetPolicyRow,
  ): Promise<string | null> {
    const { error } = await this.supabase.client.from('organization_widget_policies').upsert({
      organization_id: organizationId,
      widget_id: policy.widgetId,
      allowed: policy.allowed,
      preinstalled: policy.preinstalled,
      locked: policy.locked,
    });
    return error ? error.message : null;
  }
}

function toPolicy(row: {
  widget_id: string;
  allowed: boolean;
  preinstalled: boolean;
  locked: boolean;
}): WidgetPolicyRow | null {
  if (!isWidgetId(row.widget_id)) {
    return null;
  }
  return {
    widgetId: row.widget_id,
    allowed: row.allowed,
    preinstalled: row.preinstalled,
    locked: row.locked,
  };
}

function toUserRow(row: { widget_id: string; installed: boolean }): UserWidgetRow | null {
  if (!isWidgetId(row.widget_id)) {
    return null;
  }
  return { widgetId: row.widget_id, installed: row.installed };
}

function isWidgetId(value: string): value is WidgetId {
  return (WIDGET_IDS as readonly string[]).includes(value);
}
