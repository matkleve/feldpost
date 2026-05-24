/**
 * Authenticated shell routes — layout uses `component` (not `loadComponent`) so child
 * `loadComponent` routes activate into the layout's `<router-outlet>`.
 * Settings uses `/{shell}/settings/...` suffixes on the active shell (overlay is global).
 * @see docs/migration/reports/authenticated-layout-sidebar-mount-2026-05-18.md
 * @see docs/specs/page/settings-routes.md
 */
import type { Routes } from '@angular/router';
import { AuthenticatedAppLayoutComponent } from './authenticated-app-layout.component';

const loadMapShell = () =>
  import('../features/map/map-shell/map-shell.component').then((m) => m.MapShellComponent);

const loadMedia = () =>
  import('../features/media/media.component').then((m) => m.MediaComponent);

const loadProjects = () =>
  import('../features/projects/projects-page.component').then((m) => m.ProjectsPageComponent);

export const AUTHENTICATED_APP_ROUTES: Routes = [
  {
    path: '',
    component: AuthenticatedAppLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: loadMapShell,
        pathMatch: 'full',
      },
      {
        path: 'map',
        loadComponent: loadMapShell,
      },
      {
        path: 'map/settings',
        loadComponent: loadMapShell,
      },
      {
        path: 'map/settings/:section',
        loadComponent: loadMapShell,
      },
      {
        path: 'map/settings/:section/:subsection',
        loadComponent: loadMapShell,
      },
      {
        path: 'media',
        loadComponent: loadMedia,
      },
      {
        path: 'media/settings',
        loadComponent: loadMedia,
      },
      {
        path: 'media/settings/:section',
        loadComponent: loadMedia,
      },
      {
        path: 'media/settings/:section/:subsection',
        loadComponent: loadMedia,
      },
      {
        path: 'projects',
        loadComponent: loadProjects,
      },
      {
        path: 'projects/settings',
        loadComponent: loadProjects,
      },
      {
        path: 'projects/settings/:section',
        loadComponent: loadProjects,
      },
      {
        path: 'projects/settings/:section/:subsection',
        loadComponent: loadProjects,
      },
      {
        path: 'projects/:projectId',
        loadComponent: loadProjects,
      },
      {
        path: 'projects/:projectId/settings',
        loadComponent: loadProjects,
      },
      {
        path: 'projects/:projectId/settings/:section',
        loadComponent: loadProjects,
      },
      {
        path: 'projects/:projectId/settings/:section/:subsection',
        loadComponent: loadProjects,
      },
      {
        path: 'settings/:section/:subsection',
        redirectTo: 'map/settings/:section/:subsection',
        pathMatch: 'full',
      },
      {
        path: 'settings/:section',
        redirectTo: 'map/settings/:section',
        pathMatch: 'full',
      },
      {
        path: 'settings',
        redirectTo: 'map/settings',
        pathMatch: 'full',
      },
    ],
  },
];
