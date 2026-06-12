import { Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { getResolvedSupabaseConfig } from './supabase-runtime-config';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private _client: SupabaseClient | null = null;

  get client(): SupabaseClient {
    if (!this._client) {
      const { url, anonKey } = getResolvedSupabaseConfig();
      this._client = createClient(url, anonKey);
    }
    return this._client;
  }
}
