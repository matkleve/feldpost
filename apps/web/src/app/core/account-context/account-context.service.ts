import { Injectable, computed, inject, signal } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { WidgetInstallService } from '../widget-install/widget-install.service';

export interface AccountMembership {
  organizationId: string;
  name: string;
}

/**
 * Personal context or one organization on screen.
 * Creating an organization does not move existing rows.
 * @see docs/specs/system/account-context.md
 */
@Injectable({ providedIn: 'root' })
export class AccountContextService {
  private readonly supabase = inject(SupabaseService);
  private readonly widgetInstall = inject(WidgetInstallService);

  readonly organizationId = signal<string | null>(null);
  readonly memberships = signal<AccountMembership[]>([]);
  readonly confirmOpen = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly personal = computed(() => this.organizationId() === null);

  async load(): Promise<void> {
    const { data: profile, error } = await this.supabase.client
      .from('profiles')
      .select('active_organization_id')
      .maybeSingle();

    if (error) {
      return;
    }

    this.organizationId.set(
      (profile as { active_organization_id: string | null } | null)?.active_organization_id ?? null,
    );

    const { data: rows } = await this.supabase.client.rpc('list_account_memberships');

    const memberships: AccountMembership[] = [];
    for (const row of rows ?? []) {
      const typed = row as { organization_id: string; name: string };
      memberships.push({
        organizationId: typed.organization_id,
        name: typed.name,
      });
    }
    this.memberships.set(memberships);
  }

  async setContext(organizationId: string | null): Promise<void> {
    this.errorMessage.set(null);
    const { error } = await this.supabase.client.rpc('set_account_context', {
      p_organization_id: organizationId,
    });
    if (error) {
      this.errorMessage.set(error.message);
      return;
    }
    this.organizationId.set(organizationId);
    await this.widgetInstall.load();
  }

  async createOrganization(name: string): Promise<void> {
    this.errorMessage.set(null);
    const { data, error } = await this.supabase.client.rpc('create_organization', {
      p_name: name,
    });
    if (error) {
      this.errorMessage.set(error.message);
      return;
    }
    this.confirmOpen.set(false);
    this.organizationId.set(typeof data === 'string' ? data : null);
    await this.load();
    await this.widgetInstall.load();
  }
}
