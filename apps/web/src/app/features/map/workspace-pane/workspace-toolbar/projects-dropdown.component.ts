import { Component, computed, inject, output, signal } from '@angular/core';
import { SupabaseService } from '../../../../core/supabase.service';
import { WorkspaceViewService } from '../../../../core/workspace-view.service';
import { StandardDropdownComponent } from '../../../../shared/standard-dropdown.component';

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
      [searchTerm]="searchTerm()"
      searchPlaceholder="Search projects…"
      actionLabel="New project"
      (searchTermChange)="searchTerm.set($event)"
      (clearRequested)="searchTerm.set('')"
      (actionRequested)="isCreating.set(true)"
    >
      <div dropdown-items class="projects-list">
        <label class="dd-item projects-row--all">
          <input
            type="checkbox"
            class="projects-checkbox"
            [checked]="allSelected()"
            [indeterminate]="someSelected()"
            (change)="toggleAll()"
          />
          <span class="dd-item__label">All projects</span>
        </label>
        @for (project of filteredProjects(); track project.id) {
          <label class="dd-item">
            <input
              type="checkbox"
              class="projects-checkbox"
              [checked]="selectedIds().has(project.id)"
              (change)="toggleProject(project.id)"
            />
            <span class="dd-item__label">{{ project.name }}</span>
            <span class="dd-item__trailing projects-count">{{ project.imageCount }}</span>
          </label>
        }
      </div>
    </app-standard-dropdown>
  `,
  styleUrl: './projects-dropdown.component.scss',
  imports: [StandardDropdownComponent],
})
export class ProjectsDropdownComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly viewService = inject(WorkspaceViewService);

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
    const { data, error } = await this.supabase.client.from('projects').select('id, name');
    if (error || !data) return;
    this.projects.set(
      data.map((p: { id: string; name: string }) => ({
        id: p.id,
        name: p.name,
        imageCount: 0,
      })),
    );
  }
}
