import { Component, computed, inject, output, signal } from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { ProjectsService } from '../../../../core/projects/projects.service';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { StandardDropdownComponent } from '../../../../shared/dropdown-trigger/standard-dropdown.component';
import { HlmMenuItemDirective } from '../../../../shared/ui/menu';

interface Project {
  id: string;
  name: string;
  imageCount: number;
}

@Component({
  selector: 'app-projects-dropdown',
  template: `
    <app-standard-dropdown
      class="projects-dropdown"
      [style.--std-dropdown-min-height]="'calc(18rem + 3rem + 3.5rem)'"
      [searchTerm]="searchTerm()"
      [searchPlaceholder]="t('workspace.projects.search.placeholder', 'Search projects…')"
      [actionLabel]="t('workspace.projects.action.new', 'New project')"
      (searchTermChange)="searchTerm.set($event)"
      (clearRequested)="searchTerm.set('')"
      (actionRequested)="isCreating.set(true)"
    >
      <div dropdown-items class="projects-list w-full min-w-0">
        <label hlmMenuItem class="projects-row--all ui-choice-row gap-2">
          <input
            type="checkbox"
            class="projects-checkbox ui-choice-control"
            [checked]="allSelected()"
            [indeterminate]="someSelected()"
            (change)="toggleAll()"
          />
          <span class="min-w-0 flex-1">{{ t('workspace.projects.all', 'All projects') }}</span>
        </label>
        @for (project of filteredProjects(); track project.id) {
          <label hlmMenuItem class="ui-choice-row gap-2">
            <input
              type="checkbox"
              class="projects-checkbox ui-choice-control"
              [checked]="selectedIds().has(project.id)"
              (change)="toggleProject(project.id)"
            />
            <span class="min-w-0 flex-1 break-words">{{ project.name }}</span>
            <span class="ml-auto shrink-0 projects-count">{{ project.imageCount }}</span>
          </label>
        }
      </div>
    </app-standard-dropdown>
  `,
  styleUrl: './projects-dropdown.component.scss',
  imports: [StandardDropdownComponent, HlmMenuItemDirective],
})
export class ProjectsDropdownComponent {
  private readonly i18nService = inject(I18nService);
  private readonly projectsService = inject(ProjectsService);
  private readonly viewService = inject(WorkspaceViewService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly projects = signal<Project[]>([]);
  readonly searchTerm = signal('');
  readonly selectedIds = signal<Set<string>>(new Set(this.viewService.selectedProjectIds()));
  readonly isCreating = signal(false);

  readonly projectsChanged = output<Set<string>>();

  readonly filteredProjects = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const all = this.projects();
    if (!term) return all;
    return all.filter((p) => p.name.toLowerCase().includes(term));
  });

  readonly allSelected = computed(() => {
    const all = this.projects();
    return all.length > 0 && this.selectedIds().size === all.length;
  });

  readonly someSelected = computed(() => {
    const size = this.selectedIds().size;
    return size > 0 && size < this.projects().length;
  });

  constructor() {
    void this.loadProjects();
  }

  toggleProject(id: string): void {
    this.selectedIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    this.projectsChanged.emit(this.selectedIds());
  }

  toggleAll(): void {
    const all = this.projects();
    if (this.selectedIds().size === all.length) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(all.map((p) => p.id)));
    }
    this.projectsChanged.emit(this.selectedIds());
  }

  private async loadProjects(): Promise<void> {
    const projects = await this.projectsService.loadProjects();
    this.projects.set(
      projects.map((project) => ({
        id: project.id,
        name: project.name,
        imageCount: project.totalImageCount,
      })),
    );
  }
}

