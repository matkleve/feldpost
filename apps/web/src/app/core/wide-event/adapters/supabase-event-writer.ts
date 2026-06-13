import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { SupabaseService } from '../../supabase/supabase.service';

interface ProfileOrgRow {
  organization_id: string | null;
}

@Injectable({ providedIn: 'root' })
export class SupabaseEventWriter {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);

  /**
   * Insert one wide-event row. Fire-and-forget: never throws to callers.
   */
  async write(event: Record<string, unknown>): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    const { data: profile, error: profileError } = await this.supabase.client
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle();

    const organizationId = (profile as ProfileOrgRow | null)?.organization_id ?? null;
    if (profileError || !organizationId) return;

    const { error } = await this.supabase.client.from('app_events').insert({
      org_id: organizationId,
      user_id: user.id,
      event,
    });

    if (error) {
      console.warn('[wide-event] failed to persist app_events row', {
        message: error.message,
        code: error.code,
      });
    }
  }
}
