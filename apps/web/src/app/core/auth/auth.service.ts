/**
 * AuthService — single source of truth for authentication state.
 *
 * Ground rules:
 *  - This service owns the session signal. Nothing else reads auth.users directly.
 *  - All Supabase auth calls go through this service. Components never call
 *    supabase.client.auth directly.
 *  - Session state is loaded once at startup via initialize(), which is called
 *    by APP_INITIALIZER before the first route renders.
 *  - The session signal is null until initialize() resolves — guards wait for it.
 *  - Errors are returned as { error } objects; this service never throws.
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';

export type AuthResult = { error: AuthError | Error | null };

export interface AuthAssuranceResult {
  currentLevel: 'aal1' | 'aal2' | null;
  nextLevel: 'aal1' | 'aal2' | null;
  error: AuthError | Error | null;
}

export interface MfaFactorViewModel {
  id: string;
  factorType: string;
  status: string;
  friendlyName: string;
}

export interface MfaListResult {
  factors: MfaFactorViewModel[];
  error: AuthError | Error | null;
}

export interface MfaEnrollResult {
  factorId: string | null;
  qrCode: string | null;
  secret: string | null;
  error: AuthError | Error | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  // ─── Reactive state ────────────────────────────────────────────────────────

  /** Current Supabase session. null = unauthenticated or not yet loaded. */
  readonly session = signal<Session | null>(null);

  /** Shortcut: the authenticated user from the current session. */
  readonly user = computed<User | null>(() => this.session()?.user ?? null);

  /** True while initialize() is still resolving. Guards use this to wait. */
  readonly loading = signal<boolean>(true);

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Called once at app startup (via APP_INITIALIZER).
   * Loads the persisted session and subscribes to future auth state changes.
   * Must resolve before any route guard runs.
   */
  async initialize(): Promise<void> {
    // Load any existing session from storage
    const { data } = await this.supabase.client.auth.getSession();
    this.session.set(data.session);

    // Subscribe to auth state changes for the lifetime of the app.
    // This fires on: sign-in, sign-out, token refresh, password recovery.
    this.supabase.client.auth.onAuthStateChange((event, session) => {
      this.session.set(session);

      // After a PASSWORD_RECOVERY link is clicked, Supabase fires SIGNED_IN
      // with type 'recovery'. Route the user to the update-password form.
      if (event === 'PASSWORD_RECOVERY') {
        this.router.navigate(['/auth/update-password']);
      }
    });

    this.loading.set(false);
  }

  // ─── Auth actions ───────────────────────────────────────────────────────────

  /**
   * Sign in with email + password.
   * On success the session signal updates automatically via onAuthStateChange.
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    const { error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }

  /**
   * Register a new user.
   * Supabase sends a confirmation email by default.
   * The handle_new_user trigger fires on the server side to create the profile row.
   *
   * full_name is passed via raw_user_meta_data so the trigger can pick it up.
   */
  async signUp(
    email: string,
    password: string,
    fullName: string,
    inviteCode: string,
  ): Promise<AuthResult> {
    const normalizedInviteCode = inviteCode.trim();
    if (!normalizedInviteCode) {
      return { error: new Error('Invite code is required.') };
    }

    const inviteTokenHash = await this.sha256(normalizedInviteCode);

    const { error } = await this.supabase.client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          invite_token_hash: inviteTokenHash,
        },
      },
    });
    return { error };
  }

  /**
   * Sign out the current user.
   * Clears the Supabase session from storage and updates the session signal.
   * Redirects to /auth/login after sign-out.
   */
  async signOut(): Promise<void> {
    await this.supabase.client.auth.signOut();
    // session signal is set to null by onAuthStateChange
    this.router.navigate(['/auth/login']);
  }

  /**
   * Update the account email.
   * Supabase may require out-of-band verification before the new email becomes active.
   */
  async updateEmail(email: string): Promise<AuthResult> {
    const { error } = await this.supabase.client.auth.updateUser({ email });
    return { error };
  }

  /**
   * Send a password reset email.
   * The email contains a magic link pointing to the app's /auth/update-password route.
   * The redirectTo URL must be in the Supabase allowed-redirects list.
   */
  async resetPasswordForEmail(email: string): Promise<AuthResult> {
    const { error } = await this.supabase.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    return { error };
  }

  /**
   * Set a new password after the user has clicked their reset link.
   * Only works when the user has an active recovery session.
   */
  async updatePassword(newPassword: string, nonce?: string): Promise<AuthResult> {
    const { error } = await this.supabase.client.auth.updateUser({
      password: newPassword,
      nonce,
    });
    return { error };
  }

  /**
   * Request a re-authentication challenge for secure account updates.
   */
  async reauthenticate(): Promise<AuthResult> {
    const { error } = await this.supabase.client.auth.reauthenticate();
    return { error };
  }

  /**
   * Return current and next authenticator assurance level (AAL).
   */
  async getAuthenticatorAssuranceLevel(): Promise<AuthAssuranceResult> {
    const { data, error } = await this.supabase.client.auth.mfa.getAuthenticatorAssuranceLevel();

    if (error) {
      return {
        currentLevel: null,
        nextLevel: null,
        error,
      };
    }

    return {
      currentLevel: data.currentLevel ?? null,
      nextLevel: data.nextLevel ?? null,
      error: null,
    };
  }

  /**
   * Return all enrolled factors for the active user.
   */
  async mfaListFactors(): Promise<MfaListResult> {
    const { data, error } = await this.supabase.client.auth.mfa.listFactors();

    if (error) {
      return { factors: [], error };
    }

    const factors = (data.all ?? []).map((factor) => ({
      id: factor.id,
      factorType: factor.factor_type,
      status: factor.status,
      friendlyName: factor.friendly_name ?? factor.factor_type,
    }));

    return { factors, error: null };
  }

  /**
   * Start TOTP enrollment. The caller renders QR code and confirmation input.
   */
  async mfaEnrollTotp(friendlyName: string): Promise<MfaEnrollResult> {
    const { data, error } = await this.supabase.client.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName,
    });

    if (error) {
      return {
        factorId: null,
        qrCode: null,
        secret: null,
        error,
      };
    }

    return {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      error: null,
    };
  }

  /**
   * Verify a TOTP factor by challenge + verify in one call.
   */
  async mfaChallengeAndVerifyTotp(factorId: string, code: string): Promise<AuthResult> {
    const { error } = await this.supabase.client.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    return { error };
  }

  /**
   * Remove an enrolled MFA factor.
   */
  async mfaUnenroll(factorId: string): Promise<AuthResult> {
    const { error } = await this.supabase.client.auth.mfa.unenroll({ factorId });
    return { error };
  }

  /**
   * Delete the currently authenticated account via secured DB RPC.
   */
  async deleteOwnAccount(): Promise<AuthResult> {
    const { error } = await this.supabase.client.rpc('delete_own_account');
    if (error) {
      return { error: new Error(error.message) };
    }
    return { error: null };
  }

  private async sha256(value: string): Promise<string> {
    if (typeof crypto === 'undefined' || typeof crypto.subtle === 'undefined') {
      return value;
    }

    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
    const digestBytes = new Uint8Array(digest);
    return Array.from(digestBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
}
