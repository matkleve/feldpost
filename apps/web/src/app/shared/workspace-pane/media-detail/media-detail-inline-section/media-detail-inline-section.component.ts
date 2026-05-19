import {
  Component,
  ElementRef,
  HostListener,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { DateSaveEvent } from '../captured-date-editor.component';
import { CapturedDateEditorComponent } from '../captured-date-editor.component';
import { I18nService } from '../../../../core/i18n/i18n.service';
import type { DetailEditingField, ImageRecord, SelectOption } from '../media-detail-view.types';
import { DropdownShellComponent } from '../../../../shared/dropdown-trigger/dropdown-shell.component';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';
import { HLM_INPUT_IMPORTS } from '../../../../shared/ui/input';

@Component({
  selector: 'app-media-detail-inline-section',
  standalone: true,
  imports: [
    CapturedDateEditorComponent,
    DropdownShellComponent,
    ...HLM_BUTTON_IMPORTS,
    ...HLM_INPUT_IMPORTS,
  ],
  templateUrl: './media-detail-inline-section.component.html',
  styleUrl: './media-detail-inline-section.component.scss',
})
export class MediaDetailInlineSectionComponent {
  private static readonly PROJECT_DROPDOWN_GAP_PX = 8;
  private static readonly PROJECT_DROPDOWN_MARGIN_PX = 8;
  private static readonly PROJECT_DROPDOWN_MAX_WIDTH_PX = 320;

  private readonly i18nService = inject(I18nService);
  private readonly elementRef = inject(ElementRef);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);
  private readonly projectEditorRef = viewChild<ElementRef<HTMLElement>>('projectEditor');
  private readonly projectDropdownRef = viewChild('projectDropdown', {
    read: ElementRef<HTMLElement>,
  });
  private readonly projectSearchInputRef =
    viewChild<ElementRef<HTMLInputElement>>('projectSearchInput');
  readonly projectDropdownTop = signal(0);
  readonly projectDropdownLeft = signal(0);
  readonly projectDropdownWidth = signal<number | null>(null);

  readonly image = input<ImageRecord>({} as ImageRecord);
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
  readonly projectSearch = input('');
  readonly filteredProjectOptions = input<SelectOption[]>([]);
  readonly projectCanCreate = input(false);
  readonly canAssignMultipleProjects = input(false);
  readonly isGpsAssignmentLocked = input(false);

  readonly fieldEditRequested = output<Exclude<DetailEditingField, null>>();
  readonly fieldSaveRequested = output<{ field: string; value: string }>();
  readonly editingCancelled = output<void>();
  readonly capturedAtEditRequested = output<void>();
  readonly capturedAtSaved = output<DateSaveEvent>();
  readonly projectSearchChanged = output<string>();
  readonly projectCreateRequested = output<void>();
  readonly projectMembershipToggled = output<string>();
  readonly deleteRequested = output<void>();

  constructor() {
    effect(() => {
      if (this.editingField() === 'project_ids') {
        this.focusProjectSearchInput();
        this.positionProjectDropdown();
      }
    });
  }

  onProjectDropdownCloseRequested(): void {
    this.editingCancelled.emit();
  }

  onProjectSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.editingCancelled.emit();
      return;
    }

    if (!this.isProjectDropdownNavigationKey(event.key)) {
      return;
    }

    const focusableItems = this.getProjectDropdownFocusableItems();
    if (focusableItems.length === 0) {
      return;
    }

    event.preventDefault();

    if (event.key === 'End') {
      focusableItems[focusableItems.length - 1]?.focus();
      return;
    }

    focusableItems[0]?.focus();
  }

  onProjectDropdownKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.editingCancelled.emit();
      this.focusProjectSearchInput();
      return;
    }

    if (!this.isProjectDropdownNavigationKey(event.key)) {
      return;
    }

    const focusableItems = this.getProjectDropdownFocusableItems();
    if (focusableItems.length === 0) {
      return;
    }

    event.preventDefault();

    if (this.focusProjectDropdownBoundaryItem(event.key, focusableItems)) {
      return;
    }

    this.focusAdjacentProjectDropdownItem(event.key, focusableItems);
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onViewportChanged(): void {
    if (this.editingField() !== 'project_ids') {
      return;
    }

    this.positionProjectDropdown();
  }

  private focusProjectSearchInput(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      this.positionProjectDropdown();
      this.projectSearchInputRef()?.nativeElement.focus();
    });
  }

  private positionProjectDropdown(): void {
    const editor = this.projectEditorRef()?.nativeElement;
    if (!editor || typeof window === 'undefined') {
      return;
    }

    const editorRect = editor.getBoundingClientRect();
    const panelRect = this.projectDropdownRef()?.nativeElement.getBoundingClientRect();
    const margin = MediaDetailInlineSectionComponent.PROJECT_DROPDOWN_MARGIN_PX;
    const gap = MediaDetailInlineSectionComponent.PROJECT_DROPDOWN_GAP_PX;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const availableWidth = Math.max(240, viewportWidth - margin * 2);
    const preferredWidth = Math.min(
      editorRect.width,
      availableWidth,
      MediaDetailInlineSectionComponent.PROJECT_DROPDOWN_MAX_WIDTH_PX,
    );
    const dropdownHeight = panelRect?.height ?? 0;
    const preferredLeft = editorRect.left;
    const maxLeft = Math.max(margin, viewportWidth - preferredWidth - margin);
    const clampedLeft = Math.min(Math.max(preferredLeft, margin), maxLeft);
    const belowTop = editorRect.bottom + gap;
    const aboveTop = editorRect.top - gap - dropdownHeight;
    const shouldOpenAbove =
      dropdownHeight > 0 && belowTop + dropdownHeight > viewportHeight - margin;
    const preferredTop = shouldOpenAbove ? aboveTop : belowTop;
    const maxTop = Math.max(margin, viewportHeight - dropdownHeight - margin);
    const clampedTop = Math.min(Math.max(preferredTop, margin), maxTop);

    this.projectDropdownWidth.set(Math.round(preferredWidth));
    this.projectDropdownLeft.set(Math.round(clampedLeft));
    this.projectDropdownTop.set(Math.round(clampedTop));
  }

  private isProjectDropdownNavigationKey(key: string): boolean {
    return key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End';
  }

  private focusProjectDropdownBoundaryItem(
    key: string,
    focusableItems: HTMLButtonElement[],
  ): boolean {
    if (key === 'Home') {
      focusableItems[0]?.focus();
      return true;
    }

    if (key === 'End') {
      focusableItems[focusableItems.length - 1]?.focus();
      return true;
    }

    return false;
  }

  private focusAdjacentProjectDropdownItem(key: string, focusableItems: HTMLButtonElement[]): void {
    const activeIndex = focusableItems.findIndex((item) => item === document.activeElement);
    const fallbackIndex = key === 'ArrowDown' ? -1 : 0;
    const currentIndex = activeIndex >= 0 ? activeIndex : fallbackIndex;
    const delta = key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (currentIndex + delta + focusableItems.length) % focusableItems.length;
    focusableItems[nextIndex]?.focus();
  }

  private getProjectDropdownFocusableItems(): HTMLButtonElement[] {
    const container = this.projectDropdownRef()?.nativeElement;
    if (!container) {
      return [];
    }

    return Array.from(
      container.querySelectorAll(
        '.detail-tags__create:not(:disabled), .detail-tags__option:not(:disabled)',
      ),
    ) as HTMLButtonElement[];
  }
}
