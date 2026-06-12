import {
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { DateSaveEvent } from '../captured-date-editor.component';
import { CapturedDateEditorComponent } from '../captured-date-editor.component';
import { I18nService } from '../../../../core/i18n/i18n.service';
import type { DetailEditingField, MediaRecord, SelectOption } from '../media-detail-view.types';
import { formatCoordinate } from '../media-detail-view.utils';
import type { ExifLocationAddState } from '../media-detail-exif-location-add.state';
import { DropdownShellComponent } from '../../../dropdown-trigger/shell/dropdown-shell.component';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';
import {
  ProjectsDropdownComponent,
  type ProjectsDropdownProject,
} from '../../toolbar/workspace-toolbar/projects-dropdown.component';

@Component({
  selector: 'app-media-detail-inline-section',
  standalone: true,
  imports: [
    CapturedDateEditorComponent,
    DropdownShellComponent,
    ProjectsDropdownComponent,
    ...HLM_BUTTON_IMPORTS,
  ],
  templateUrl: './media-detail-inline-section.component.html',
  styleUrl: './media-detail-inline-section.component.scss',
})
export class MediaDetailInlineSectionComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);
  private readonly projectsDropdownRef = viewChild(ProjectsDropdownComponent);
  private readonly projectsCenterRef = viewChild<ElementRef<HTMLElement>>('projectsCenter');
  readonly projectsAnchorEl = computed(() => this.projectsCenterRef()?.nativeElement ?? null);
  readonly projectsCenterWidth = computed(() => this.projectsCenterRef()?.nativeElement.offsetWidth ?? null);

  readonly media = input<MediaRecord>({} as MediaRecord);
  readonly detailViewLabel = input('');
  readonly fileFormatLabel = input('');
  readonly editingField = input<DetailEditingField>(null);
  readonly editDate = input('');
  readonly editTime = input('');
  readonly captureDate = input<string | null>(null);
  readonly uploadDate = input<string | null>(null);
  readonly projectName = input('');
  readonly projectOptions = input<SelectOption[]>([]);
  readonly selectedProjectIds = input<Set<string>>(new Set());
  readonly isImageLike = input(false);
  readonly saving = input(false);
  readonly exifLocationAddState = input<ExifLocationAddState>('hidden');

  readonly projectsForDropdown = computed((): readonly ProjectsDropdownProject[] =>
    this.projectOptions().map((opt) => ({
      id: opt.id,
      name: opt.label,
      imageCount: 0,
    })),
  );

  readonly selectedProjectOptions = computed(() => {
    const ids = this.selectedProjectIds();
    return this.projectOptions().filter((opt) => ids.has(opt.id));
  });

  readonly hasExifCoordinates = computed(
    () =>
      this.media().exif_latitude != null &&
      this.media().exif_longitude != null,
  );

  readonly exifAddDisabled = computed(
    () =>
      !this.hasExifCoordinates() ||
      this.saving() ||
      this.exifLocationAddState() === 'resolving',
  );

  readonly fieldEditRequested = output<Exclude<DetailEditingField, null>>();
  readonly exifToLocationRequested = output<void>();
  readonly fieldSaveRequested = output<{ field: string; value: string }>();
  readonly editingCancelled = output<void>();
  readonly capturedAtEditRequested = output<void>();
  readonly capturedAtSaved = output<DateSaveEvent>();
  readonly projectsChanged = output<Set<string>>();

  formatCoord(value: number | null | undefined): string {
    return formatCoordinate(value ?? null);
  }

  constructor() {
    effect(() => {
      if (this.editingField() === 'project_ids') {
        this.projectsDropdownRef()?.prepareForOpen();
        this.focusProjectsDropdownSearchInternal();
      }
    });
  }

  removeProject(projectId: string): void {
    const next = new Set(this.selectedProjectIds());
    next.delete(projectId);
    this.projectsChanged.emit(next);
  }

  focusProjectsDropdownSearch(): void {
    this.projectsDropdownRef()?.prepareForOpen();
    this.focusProjectsDropdownSearchInternal();
  }

  private focusProjectsDropdownSearchInternal(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      this.projectsDropdownRef()?.focusSearchField();
    });
  }

  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    const field = this.editingField();
    if (field === 'captured_at' || field === 'project_ids') {
      this.editingCancelled.emit();
    }
  }
}
