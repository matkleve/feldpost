import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import type { ProjectListItem } from '../../core/projects/projects.types';
import type { ItemDisplayMode } from '../../shared/item-grid/item.component';
import { projectItemColorStyle } from './project-item.utils';

export type ProjectItemState = 'idle' | 'selected' | 'loading';

@Component({
  selector: 'app-project-item',
  imports: [],
  templateUrl: './project-item.component.html',
  styleUrl: './project-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'article',
    '[attr.data-state]': 'state()',
    '[attr.data-has-item]': "project() ? 'true' : 'false'",
    '[attr.data-mode]': 'mode()',
    '[class.project-item]': 'true',
    '[class.project-item--selected]': 'selected()',
    '[class.project-item--archived]': 'isArchived()',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class ProjectItemComponent {
  private readonly i18nService = inject(I18nService);

  readonly itemId = input.required<string>();
  readonly mode = input<ItemDisplayMode>('grid-md');
  readonly state = input<ProjectItemState>('idle');
  readonly project = input<ProjectListItem | null>(null);

  readonly opened = output<string>();
  readonly contextMenuRequested = output<MouseEvent>();

  readonly selected = computed(() => this.state() === 'selected');
  readonly isRowMode = computed(() => this.mode() === 'row');
  readonly isArchived = computed(() => this.project()?.status === 'archived');

  readonly colorStyle = computed(() => {
    const project = this.project();
    if (!project) return 'var(--muted)';
    return projectItemColorStyle(project.colorKey);
  });

  readonly mediaCountLabel = computed(() => {
    const count = this.project()?.totalImageCount ?? 0;
    return String(count);
  });

  protected readonly t = (key: string, fallback = ''): string =>
    this.i18nService.t(key, fallback);

  onOpenClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.project()) return;
    this.opened.emit(this.itemId());
  }

  onContextMenu(event: MouseEvent): void {
    if (!this.project()) return;
    this.contextMenuRequested.emit(event);
  }
}
