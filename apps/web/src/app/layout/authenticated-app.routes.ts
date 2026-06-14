/**
 * Authenticated shell routes — layout uses `component` (not `loadComponent`) so child
 * `loadComponent` routes activate into the layout's `<router-outlet>`.
 * One UrlMatcher per shell keeps the same component instance for `/{shell}/settings/...`.
 * @see docs/migration/reports/authenticated-layout-sidebar-mount-2026-05-18.md
 * @see docs/specs/page/settings-routes.md
 */
import type { Routes } from '@angular/router';
import { AuthenticatedAppLayoutComponent } from './authenticated-app-layout.component';
import {
  mapShellMatcher,
  mediaShellMatcher,
  projectsShellMatcher,
} from './authenticated-shell-matchers';

const loadShellRoutePlaceholder = () =>
  import('./shell-route-placeholder.component').then((m) => m.ShellRoutePlaceholderComponent);

const loadMedia = () =>
  import('../features/media/media.component').then((m) => m.MediaComponent);

const loadProjects = () =>
  import('../features/projects/page/projects-page.component').then((m) => m.ProjectsPageComponent);

const loadProjectsDashboardPreview = () =>
  import('../features/projects-dashboard-preview/projects-dashboard-preview.component').then(
    (m) => m.ProjectsDashboardPreviewComponent,
  );

export const AUTHENTICATED_APP_ROUTES: Routes = [
  {
    path: '',
    component: AuthenticatedAppLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: loadShellRoutePlaceholder,
        pathMatch: 'full',
      },
      {
        matcher: mapShellMatcher,
        loadComponent: loadShellRoutePlaceholder,
      },
      {
        matcher: mediaShellMatcher,
        loadComponent: loadMedia,
      },
      {
        matcher: projectsShellMatcher,
        loadComponent: loadProjects,
      },
      {
        // Throwaway design check-in route for the projects list + dashboard layout idea.
        path: 'projects-dashboard-preview',
        loadComponent: loadProjectsDashboardPreview,
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
