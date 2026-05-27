import { Component, computed, effect, ElementRef, inject, input, output, signal } from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { ProjectsService } from '../../../../core/projects/projects.service';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { filterByToolbarDropdownSearch } from '../../../../shared/dropdown-trigger/dropdown-search-filter.helpers';
import { StandardDropdownComponent } from '../../../../shared/dropdown-trigger/standard-dropdown.component';
import { HlmMenuItemDirective } from '../../../../shared/ui/menu';

export interface ProjectsDropdownProject {
  id: string;
  name: string;
  imageCount: number;
}

export type ProjectsDropdownVariant = 'workspace' | 'media-detail';

@Component({
  selector: 'app-projects-dropdown',
  host: {
    '[class.projects-dropdown--media-detail]': 'variant() === "media-detail"',
  },
  template: `
    <app-standard-dropdown
      class="projects-dropdown"
      [class.projects-dropdown__shell--media-detail]="variant() === 'media-detail'"
      [style.--std-dropdown-min-height]="minPanelHeight()"
      [scrollMode]="'delegate'"
      [showSearch]="showSearch()"
      [searchTerm]="searchTerm()"
      [searchPlaceholder]="searchPlaceholder()"
      [actionLabel]="newProjectActionLabel()"
      (searchTermChange)="searchTerm.set($event)"
      (clearRequested)="searchTerm.set('')"
      (actionRequested)="isCreating.set(true)"
    >
      <div
        dropdown-items
        class="projects-list w-full min-w-0"
        [class.projects-list--picker]="variant() === 'media-detail'"
      >
        @if (variant() === 'media-detail') {
          <p class="projects-picker__hint">
            {{ t('workspace.imageDetail.projects.hint', 'Select an option or create one') }}
          </p>
          @for (project of filteredProjects(); track project.id) {
            <button
              hlmMenuItem
              type="button"
              class="projects-picker__option"
              [class.projects-picker__option--selected]="selectedIds().has(project.id)"
              (click)="toggleProject(project.id)"
            >
              <span class="projects-picker__chip">{{ project.name }}</span>
            </button>
          }
        } @else {
          @if (showAllProjectsRow()) {
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
          }
          @for (project of filteredProjects(); track project.id) {
            <label hlmMenuItem class="ui-choice-row gap-2">
              <input
                type="checkbox"
                class="projects-checkbox ui-choice-control"
                [checked]="selectedIds().has(project.id)"
                (change)="toggleProject(project.id)"
              />
              <span class="min-w-0 flex-1 break-words">{{ project.name }}</span>
              @if (showCounts()) {
                <span class="ml-auto shrink-0 projects-count">{{ project.imageCount }}</span>
              }
            </label>
          }
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

  /** Workspace toolbar filter vs media-detail membership picker (no all / new in detail). */
  readonly variant = input<ProjectsDropdownVariant>('workspace');
  /** When set, list comes from parent (media detail) instead of ProjectsService.loadProjects(). */
  readonly projectsInput = input<readonly ProjectsDropdownProject[] | null>(null);
  /** When set, selection is controlled by parent (media detail). */
  readonly selectedIdsInput = input<Set<string> | null>(null);

  private readonly hostRef = inject(ElementRef<HTMLElement>);

  readonly projects = signal<ProjectsDropdownProject[]>([]);
  readonly searchTerm = signal('');
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly isCreating = signal(false);

  readonly projectsChanged = output<Set<string>>();

  readonly showSearch = computed(() => true);
  readonly showAllProjectsRow = computed(() => this.variant() === 'workspace');
  readonly showCounts = computed(() => this.variant() === 'workspace');
  readonly newProjectActionLabel = computed(() =>
    this.variant() === 'workspace' ? this.t('workspace.projects.action.new', 'New project') : null,
  );
  readonly searchPlaceholder = computed(() =>
    this.variant() === 'media-detail'
      ? this.t('workspace.imageDetail.projects.search.placeholder', 'Search projects…')
      : this.t('workspace.projects.search.placeholder', 'Search projects…'),
  );
  readonly minPanelHeight = computed(() =>
    this.variant() === 'workspace'
      ? 'calc(18rem + 3rem + 3.5rem)'
      : 'calc(12rem + 2.5rem)',
  );

  readonly filteredProjects = computed(() =>
    filterByToolbarDropdownSearch(this.projects(), this.searchTerm(), (p) => p.name),
  );

  readonly allSelected = computed(() => {
    const all = this.projects();
    return all.length > 0 && this.selectedIds().size === all.length;
  });

  readonly someSelected = computed(() => {
    const size = this.selectedIds().size;
    return size > 0 && size < this.projects().length;
  });

  constructor() {
    effect(() => {
      const external = this.selectedIdsInput();
      if (this.variant() === 'media-detail' && external) {
        this.selectedIds.set(new Set(external));
      }
    });

    effect(() => {
      const inputProjects = this.projectsInput();
      if (inputProjects) {
        this.projects.set([...inputProjects]);
        return;
      }
      if (this.variant() === 'workspace') {
        void this.loadProjects();
      }
    });

    effect(() => {
      if (this.variant() === 'workspace') {
        this.selectedIds.set(new Set(this.viewService.selectedProjectIds()));
      }
    });
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

  /** Clears panel search when media-detail row opens (search lives inside dropdown). */
  prepareForOpen(): void {
    this.searchTerm.set('');
  }

  focusSearchField(): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.requestAnimationFrame(() => {
      const field = this.hostRef.nativeElement.querySelector(
        '.standard-dropdown__search-field',
      ) as HTMLInputElement | null;
      field?.focus();
    });
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
