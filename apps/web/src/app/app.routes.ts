/**
 * Application route table.
 *
 * Ground rules:
 *  - All routes under /auth use guestGuard (redirect if already logged in).
 *  - All routes outside /auth use authGuard (redirect if not logged in).
 *  - Lazy-load every feature route — never eagerly import page components here.
 *  - The root redirect sends unauthenticated users through authGuard → /auth/login.
 */

import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  // ── Auth routes (unauthenticated only) ────────────────────────────────────
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password.component').then(
            (m) => m.ResetPasswordComponent,
          ),
      },
      {
        // Password recovery link lands here — no guestGuard needed
        // (user arrives with a temporary recovery session, not a full session)
        path: 'update-password',
        loadComponent: () =>
          import('./features/auth/update-password/update-password.component').then(
            (m) => m.UpdatePasswordComponent,
          ),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // ── Protected app routes ──────────────────────────────────────────────────
  {
    path: '',
    canActivate: [authGuard],
    children: [
      // M-IMPL3: map shell — the main authenticated view
      {
        path: '',
        loadComponent: () =>
          import('./features/map/map-shell/map-shell.component').then((m) => m.MapShellComponent),
        pathMatch: 'full',
      },
      {
        path: 'map',
        loadComponent: () =>
          import('./features/map/map-shell/map-shell.component').then((m) => m.MapShellComponent),
      },

      // M-UI2: placeholder routes — full pages implemented in M-UI6–9
      {
        path: 'photos',
        loadComponent: () =>
          import('./features/photos/photos.component').then((m) => m.PhotosComponent),
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./features/projects/projects-page.component').then(
            (m) => m.ProjectsPageComponent,
          ),
      },
      {
        path: 'projects/:projectId',
        loadComponent: () =>
          import('./features/projects/projects-page.component').then(
            (m) => m.ProjectsPageComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/map/map-shell/map-shell.component').then((m) => m.MapShellComponent),
      },
      {
        path: 'settings/:section',
        loadComponent: () =>
          import('./features/map/map-shell/map-shell.component').then((m) => m.MapShellComponent),
      },
      {
        path: 'settings/:section/:subsection',
        loadComponent: () =>
          import('./features/map/map-shell/map-shell.component').then((m) => m.MapShellComponent),
      },
    ],
  },

  // ── Fallback ──────────────────────────────────────────────────────────────
  { path: '**', redirectTo: 'auth/login' },
];
