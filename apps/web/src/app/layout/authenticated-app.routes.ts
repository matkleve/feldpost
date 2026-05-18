/**
 * Authenticated shell routes — layout uses `component` (not `loadComponent`) so child
 * `loadComponent` routes activate into the layout's `<router-outlet>`.
 * @see docs/migration/reports/authenticated-layout-sidebar-mount-2026-05-18.md
 */
import type { Routes } from '@angular/router';
import { AuthenticatedAppLayoutComponent } from './authenticated-app-layout.component';

export const AUTHENTICATED_APP_ROUTES: Routes = [
  {
    path: '',
    component: AuthenticatedAppLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('../features/map/map-shell/map-shell.component').then((m) => m.MapShellComponent),
        pathMatch: 'full',
      },
      {
        path: 'map',
        loadComponent: () =>
          import('../features/map/map-shell/map-shell.component').then((m) => m.MapShellComponent),
      },
      {
        path: 'media',
        loadComponent: () =>
          import('../features/media/media.component').then((m) => m.MediaComponent),
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('../features/projects/projects-page.component').then(
            (m) => m.ProjectsPageComponent,
          ),
      },
      {
        path: 'projects/:projectId',
        loadComponent: () =>
          import('../features/projects/projects-page.component').then(
            (m) => m.ProjectsPageComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('../features/map/map-shell/map-shell.component').then((m) => m.MapShellComponent),
      },
      {
        path: 'settings/:section',
        loadComponent: () =>
          import('../features/map/map-shell/map-shell.component').then((m) => m.MapShellComponent),
      },
      {
        path: 'settings/:section/:subsection',
        loadComponent: () =>
          import('../features/map/map-shell/map-shell.component').then((m) => m.MapShellComponent),
      },
    ],
  },
];
