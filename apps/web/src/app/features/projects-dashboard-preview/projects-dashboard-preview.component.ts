import { Component, computed, signal } from '@angular/core';

interface PreviewProject {
  id: string;
  name: string;
  colorVar: string;
  status: 'active' | 'archived' | 'draft';
  imageCount: number;
  city: string;
  lastActivity: string;
}

interface DashboardWidget {
  id: string;
  title: string;
  icon: string;
  hint: string;
}

const PREVIEW_PROJECTS: PreviewProject[] = [
  { id: 'a1', name: 'Bahnhofstrasse Refit', colorVar: 'var(--chart-2)', status: 'active', imageCount: 184, city: 'Vienna', lastActivity: '2h ago' },
  { id: 'a2', name: 'Donaukanal Bridge', colorVar: 'var(--chart-1)', status: 'active', imageCount: 92, city: 'Vienna', lastActivity: '5h ago' },
  { id: 'a3', name: 'Linz Logistics Hall', colorVar: 'var(--success)', status: 'active', imageCount: 311, city: 'Linz', lastActivity: '1d ago' },
  { id: 'a4', name: 'Graz Substation', colorVar: 'var(--app-violet-accent)', status: 'draft', imageCount: 6, city: 'Graz', lastActivity: '3d ago' },
  { id: 'a5', name: 'Salzburg Tunnel North', colorVar: 'var(--chart-3)', status: 'active', imageCount: 145, city: 'Salzburg', lastActivity: '6h ago' },
  { id: 'a6', name: 'Innsbruck Depot', colorVar: 'var(--filetype-document)', status: 'archived', imageCount: 58, city: 'Innsbruck', lastActivity: '2w ago' },
  { id: 'a7', name: 'Wels Site Prep', colorVar: 'var(--chart-4)', status: 'active', imageCount: 37, city: 'Wels', lastActivity: '4h ago' },
  { id: 'a8', name: 'Klagenfurt Renovation', colorVar: 'var(--chart-5)', status: 'archived', imageCount: 203, city: 'Klagenfurt', lastActivity: '1mo ago' },
];

const DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'activity', title: 'Activity', icon: 'history', hint: 'Recent uploads, geocoding, and location updates' },
  { id: 'file-types', title: 'File types', icon: 'donut_large', hint: 'Photo / video / document breakdown' },
  { id: 'map', title: 'Map preview', icon: 'map', hint: 'Bounding box of all media locations' },
  { id: 'upload-timeline', title: 'Upload timeline', icon: 'show_chart', hint: 'Uploads per day over the last 30 days' },
  { id: 'storage', title: 'Storage', icon: 'cloud', hint: 'Total storage used by this project' },
  { id: 'team', title: 'Team', icon: 'group', hint: 'Members with access to this project' },
];

@Component({
  selector: 'app-projects-dashboard-preview',
  standalone: true,
  templateUrl: './projects-dashboard-preview.component.html',
  styleUrl: './projects-dashboard-preview.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-1',
  },
})
export class ProjectsDashboardPreviewComponent {
  readonly widgets = DASHBOARD_WIDGETS;
  readonly searchQuery = signal('');
  readonly selectedProjectId = signal<string>(PREVIEW_PROJECTS[0].id);

  private readonly projects = PREVIEW_PROJECTS;

  readonly filteredProjects = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return this.projects;
    }
    return this.projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) || project.city.toLowerCase().includes(query),
    );
  });

  readonly selectedProject = computed(
    () => this.projects.find((project) => project.id === this.selectedProjectId()) ?? this.projects[0],
  );

  onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  selectProject(id: string): void {
    this.selectedProjectId.set(id);
  }
}
