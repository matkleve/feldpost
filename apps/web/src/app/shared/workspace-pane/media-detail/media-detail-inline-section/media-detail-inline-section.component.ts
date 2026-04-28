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
import { AddressSearchComponent } from '../address-search/address-search.component';
import type { ForwardGeocodeResult } from '../../../../core/geocoding/geocoding.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { formatCoordinate } from '../media-detail-view.utils';
import type { DetailEditingField, ImageRecord, SelectOption } from '../media-detail-view.types';
import { DropdownShellComponent } from '../../../../shared/dropdown-trigger/dropdown-shell.component';
import {
  UiIconButtonGhostDirective,
  UiInputControlDirective,
  UiRowShellDirective,
  UiRowShellSizeSmDirective,
  UiStatusBadgeDirective,
  UiStatusBadgeInfoDirective,
  UiStatusBadgeSizeSmDirective,
} from '../../../../shared/ui-primitives/ui-primitives.directive';

interface AddressFieldDefinition {
  name: 'street' | 'city' | 'district' | 'country';
  icon: string;
  labelKey: string;
  labelFallback: string;
  editAriaKey: string;
  editAriaFallback: string;
  editTitleKey: string;
  editTitleFallback: string;
  saveAriaKey: string;
  saveAriaFallback: string;
  saveTitleKey: string;
  saveTitleFallback: string;
}

@Component({
  selector: 'app-image-detail-inline-section',
  standalone: true,
  imports: [
    CapturedDateEditorComponent,
    AddressSearchComponent,
    DropdownShellComponent,
    UiIconButtonGhostDirective,
    UiInputControlDirective,
    UiRowShellDirective,
    UiRowShellSizeSmDirective,
    UiStatusBadgeDirective,
    UiStatusBadgeSizeSmDirective,
    UiStatusBadgeInfoDirective,
  ],
  templateUrl: './media-detail-inline-section.component.html',
  styleUrl: '../media-detail-view.component.scss',
})
export class ImageDetailInlineSectionComponent {
  private static readonly PROJECT_DROPDOWN_GAP_PX = 8;
  private static readonly PROJECT_DROPDOWN_MARGIN_PX = 8;

  private readonly i18nService = inject(I18nService);
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
  readonly mediaTypeLabel = input('');
  readonly editingField = input<DetailEditingField>(null);
  readonly editDate = input('');
  readonly editTime = input('');
  readonly captureDate = input<string | null>(null);
  readonly uploadDate = input<string | null>(null);
  readonly projectName = input('');
  readonly fullAddress = input('');
  readonly projectOptions = input<SelectOption[]>([]);
  readonly selectedProjectIds = input<Set<string>>(new Set());
  readonly projectSearch = input('');
  readonly filteredProjectOptions = input<SelectOption[]>([]);
  readonly projectCanCreate = input(false);
  readonly canAssignMultipleProjects = input(false);
  readonly isGpsAssignmentLocked = input(false);
  readonly isCorrected = input(false);
  readonly saving = input(false);

  readonly fieldEditRequested = output<Exclude<DetailEditingField, null>>();
  readonly fieldSaveRequested = output<{ field: string; value: string }>();
  readonly editingCancelled = output<void>();
  readonly capturedAtEditRequested = output<void>();
  readonly capturedAtSaved = output<DateSaveEvent>();
  readonly projectSearchChanged = output<string>();
  readonly projectCreateRequested = output<void>();
  readonly projectMembershipToggled = output<string>();
  readonly addressSuggestionApplied = output<ForwardGeocodeResult>();
  readonly copyCoordinatesRequested = output<void>();
  readonly zoomToLocationRequested = output<void>();
  readonly revertCoordinatesRequested = output<void>();
  readonly deleteRequested = output<void>();

  readonly addressFields: AddressFieldDefinition[] = [
    {
      name: 'street',
      icon: 'signpost',
      labelKey: 'workspace.imageDetail.field.street',
      labelFallback: 'Street',
      editAriaKey: 'workspace.imageDetail.action.editStreet.aria',
      editAriaFallback: 'Edit street',
      editTitleKey: 'workspace.imageDetail.action.editStreet.title',
      editTitleFallback: 'Edit street',
      saveAriaKey: 'workspace.imageDetail.action.saveStreet.aria',
      saveAriaFallback: 'Save street',
      saveTitleKey: 'workspace.imageDetail.action.saveStreet.title',
      saveTitleFallback: 'Save street',
    },
    {
      name: 'city',
      icon: 'location_city',
      labelKey: 'workspace.imageDetail.field.city',
      labelFallback: 'City',
      editAriaKey: 'workspace.imageDetail.action.editCity.aria',
      editAriaFallback: 'Edit city',
      editTitleKey: 'workspace.imageDetail.action.editCity.title',
      editTitleFallback: 'Edit city',
      saveAriaKey: 'workspace.imageDetail.action.saveCity.aria',
      saveAriaFallback: 'Save city',
      saveTitleKey: 'workspace.imageDetail.action.saveCity.title',
      saveTitleFallback: 'Save city',
    },
    {
      name: 'district',
      icon: 'map',
      labelKey: 'workspace.imageDetail.field.district',
      labelFallback: 'District',
      editAriaKey: 'workspace.imageDetail.action.editDistrict.aria',
      editAriaFallback: 'Edit district',
      editTitleKey: 'workspace.imageDetail.action.editDistrict.title',
      editTitleFallback: 'Edit district',
      saveAriaKey: 'workspace.imageDetail.action.saveDistrict.aria',
      saveAriaFallback: 'Save district',
      saveTitleKey: 'workspace.imageDetail.action.saveDistrict.title',
      saveTitleFallback: 'Save district',
    },
    {
      name: 'country',
      icon: 'public',
      labelKey: 'workspace.imageDetail.field.country',
      labelFallback: 'Country',
      editAriaKey: 'workspace.imageDetail.action.editCountry.aria',
      editAriaFallback: 'Edit country',
      editTitleKey: 'workspace.imageDetail.action.editCountry.title',
      editTitleFallback: 'Edit country',
      saveAriaKey: 'workspace.imageDetail.action.saveCountry.aria',
      saveAriaFallback: 'Save country',
      saveTitleKey: 'workspace.imageDetail.action.saveCountry.title',
      saveTitleFallback: 'Save country',
    },
  ];

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

  formatCoord(value: number | null): string {
    return formatCoordinate(value);
  }

  fieldValue(field: AddressFieldDefinition['name']): string {
    const image = this.image();
    return image[field] ?? '';
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
    const margin = ImageDetailInlineSectionComponent.PROJECT_DROPDOWN_MARGIN_PX;
    const gap = ImageDetailInlineSectionComponent.PROJECT_DROPDOWN_GAP_PX;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const availableWidth = Math.max(240, viewportWidth - margin * 2);
    const preferredWidth = Math.min(editorRect.width, availableWidth);
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
