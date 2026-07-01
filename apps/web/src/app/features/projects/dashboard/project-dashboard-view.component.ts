import { Component, inject, input } from '@angular/core';
import type { ProjectListItem } from '../../../core/projects/projects.types';
import { I18nService } from '../../../core/i18n/i18n.service';

interface DashboardWidget {
  id: string;
  titleKey: string;
  titleFallback: string;
  icon: string;
  hintKey: string;
  hintFallback: string;
  hero?: boolean;
}

const DASHBOARD_WIDGETS: DashboardWidget[] = [
  {
    id: 'map',
    titleKey: 'projects.dashboard.widget.map.title',
    titleFallback: 'Map preview',
    icon: 'map',
    hintKey: 'projects.dashboard.widget.map.hint',
    hintFallback: 'Bounding box of all media locations',
    hero: true,
  },
  {
    id: 'activity',
    titleKey: 'projects.dashboard.widget.activity.title',
    titleFallback: 'Activity',
    icon: 'history',
    hintKey: 'projects.dashboard.widget.activity.hint',
    hintFallback: 'Recent uploads, geocoding, and location updates',
  },
  {
    id: 'file-types',
    titleKey: 'projects.dashboard.widget.fileTypes.title',
    titleFallback: 'File types',
    icon: 'donut_large',
    hintKey: 'projects.dashboard.widget.fileTypes.hint',
    hintFallback: 'Photo / video / document breakdown',
  },
  {
    id: 'upload-timeline',
    titleKey: 'projects.dashboard.widget.uploadTimeline.title',
    titleFallback: 'Upload timeline',
    icon: 'show_chart',
    hintKey: 'projects.dashboard.widget.uploadTimeline.hint',
    hintFallback: 'Uploads per day over the last 30 days',
  },
  {
    id: 'storage',
    titleKey: 'projects.dashboard.widget.storage.title',
    titleFallback: 'Storage',
    icon: 'cloud',
    hintKey: 'projects.dashboard.widget.storage.hint',
    hintFallback: 'Total storage used across projects',
  },
  {
    id: 'team',
    titleKey: 'projects.dashboard.widget.team.title',
    titleFallback: 'Team',
    icon: 'group',
    hintKey: 'projects.dashboard.widget.team.hint',
    hintFallback: 'Members with access to projects',
  },
];

@Component({
  selector: 'app-project-dashboard-view',
  standalone: true,
  templateUrl: './project-dashboard-view.component.html',
  styleUrl: './project-dashboard-view.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-1 flex-col h-full overflow-hidden',
  },
})
export class ProjectDashboardViewComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly projects = input<ProjectListItem[]>([]);

  readonly heroWidget = DASHBOARD_WIDGETS.find((widget) => widget.hero) ?? DASHBOARD_WIDGETS[0];
  readonly secondaryWidgets = DASHBOARD_WIDGETS.filter((widget) => !widget.hero);

  projectCountLabel(): string {
    return this.t('projects.dashboard.subtitle', '{count} projects in your organization').replace(
      '{count}',
      String(this.projects().length),
    );
  }
}
