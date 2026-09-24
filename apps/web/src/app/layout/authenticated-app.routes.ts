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
  organizationShellMatcher,
  colleaguesShellMatcher,
} from './authenticated-shell-matchers';

const loadShellRoutePlaceholder = () =>
  import('./shell-route-placeholder.component').then((m) => m.ShellRoutePlaceholderComponent);

const loadMedia = () =>
  import('../features/media/media.component').then((m) => m.MediaComponent);

const loadProjects = () =>
  import('../features/projects/page/projects-page.component').then((m) => m.ProjectsPageComponent);

const loadOrganization = () =>
  import('../features/organization/page/organization-page.component').then((m) => m.OrganizationPageComponent);

const loadColleagues = () =>
  import('../features/colleagues/page/colleagues-page.component').then((m) => m.ColleaguesPageComponent);

const loadOverview = () =>
  import('../features/widgets/widget-overview.page').then((m) => m.WidgetOverviewPage);

const loadWidgetDirectory = () =>
  import('../features/widgets/widget-directory.page').then((m) => m.WidgetDirectoryPage);

const loadWidgetExplanation = () =>
  import('../features/widgets/widget-explanation.page').then((m) => m.WidgetExplanationPage);

export const AUTHENTICATED_APP_ROUTES: Routes = [
  {
    path: '',
    component: AuthenticatedAppLayoutComponent,
    children: [
      {
        path: 'join',
        loadComponent: () =>
          import('../features/account-join/account-join.component').then((m) => m.AccountJoinComponent),
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('../features/account-chat/account-chat.component').then((m) => m.AccountChatComponent),
      },
      {
        path: 'projects/receive',
        loadComponent: () =>
          import('../features/projects/receive/project-receive.component').then((m) => m.ProjectReceiveComponent),
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
        matcher: colleaguesShellMatcher,
        loadComponent: loadColleagues,
      },
      {
        matcher: organizationShellMatcher,
        loadComponent: loadOrganization,
      },
      {
        path: 'overview',
        loadComponent: loadOverview,
      },
      {
        path: 'widgets',
        loadComponent: loadWidgetDirectory,
      },
      {
        path: 'widgets/:widgetId',
        loadComponent: loadWidgetExplanation,
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
