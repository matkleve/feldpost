import { Component, inject, input, output } from '@angular/core';
import { CapturedDateEditorComponent, DateSaveEvent } from '../captured-date-editor.component';
import { AddressSearchComponent } from '../address-search/address-search.component';
import { ClickOutsideDirective } from '../../../../shared/click-outside.directive';
import { ForwardGeocodeResult } from '../../../../core/geocoding.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { formatCoordinate } from '../image-detail-view.utils';
import { DetailEditingField, ImageRecord, SelectOption } from '../image-detail-view.types';

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
  imports: [CapturedDateEditorComponent, AddressSearchComponent, ClickOutsideDirective],
  templateUrl: './image-detail-inline-section.component.html',
  styleUrl: '../image-detail-view.component.scss',
})
export class ImageDetailInlineSectionComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly image = input.required<ImageRecord>();
  readonly detailViewLabel = input.required<string>();
  readonly mediaTypeLabel = input.required<string>();
  readonly editingField = input<DetailEditingField>(null);
  readonly editDate = input('');
  readonly editTime = input('');
  readonly captureDate = input<string | null>(null);
  readonly uploadDate = input<string | null>(null);
  readonly projectName = input('');
  readonly fullAddress = input('');
  readonly projectOptions = input<SelectOption[]>([]);
  readonly selectedProjectIds = input<Set<string>>(new Set());
  readonly primaryProjectId = input<string | null>(null);
  readonly projectSearch = input('');
  readonly filteredProjectOptions = input<SelectOption[]>([]);
  readonly projectCanCreate = input(false);
  readonly canAssignMultipleProjects = input(false);
  readonly primarySelectorVisible = input(false);
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
  readonly primaryProjectSelected = output<string>();
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

  isPrimaryProject(projectId: string): boolean {
    return this.primaryProjectId() === projectId;
  }

  formatCoord(value: number | null): string {
    return formatCoordinate(value);
  }

  fieldValue(field: AddressFieldDefinition['name']): string {
    const image = this.image();
    return image[field] ?? '';
  }
}
