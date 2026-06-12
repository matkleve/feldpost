/**
 * Root application configuration.
 *
 * Ground rules:
 *  - AuthService.initialize() MUST run via APP_INITIALIZER before any route
 *    guard executes. This ensures the session signal is populated from Supabase
 *    storage before guards make allow/redirect decisions.
 *  - provideRouter uses withComponentInputBinding so route params can be bound
 *    directly as component inputs in the future.
 *  - Add new global providers here, not in individual feature modules.
 */

import type {
  ApplicationConfig} from '@angular/core';
import {
  APP_INITIALIZER,
  Injector,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  PreloadAllModules,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
} from '@angular/router';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { OrgSearchTuningService } from './core/search/org-search-tuning.service';
import { resolveSupabaseRuntimeConfig } from './core/supabase/supabase-runtime-config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    // Router with component-input binding and background preloading enabled.
    provideRouter(
      routes,
      withComponentInputBinding(),
      withPreloading(PreloadAllModules),
    ),

    // Resolve Supabase endpoint, then auth — single initializer so AuthService (and
    // SupabaseService) are not constructed before runtime config exists.
    {
      provide: APP_INITIALIZER,
      useFactory: (injector: Injector) => async () => {
        await resolveSupabaseRuntimeConfig();
        // injector.get — inject() is invalid after await (loses injection context).
        const auth = injector.get(AuthService);
        await auth.initialize();
        if (auth.session()) {
          await injector.get(OrgSearchTuningService).bootstrapFromSession();
        }
      },
      deps: [Injector],
      multi: true,
    },
  ],
};
