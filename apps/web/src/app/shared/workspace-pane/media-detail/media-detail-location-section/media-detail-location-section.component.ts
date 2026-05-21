import { Component, computed, inject, input, output } from '@angular/core';
import { AddressSearchComponent } from '../address-search/address-search.component';
import { AddressFieldComboboxComponent } from '../address-field-combobox/address-field-combobox.component';
import { CoordinatesFieldEditorComponent } from '../coordinates-field-editor/coordinates-field-editor.component';
import { DetailRowInlineConfirmActionComponent } from '../detail-row-inline-confirm-action/detail-row-inline-confirm-action.component';
import type { ForwardGeocodeResult } from '../../../../core/geocoding/geocoding.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import {
  formatCoordinate,
  hasValidGpsCoordinates,
} from '../media-detail-view.utils';
import type { SearchQueryContext } from '../../../../core/search/search.models';
import type { DetailEditingField, ImageRecord } from '../media-detail-view.types';
import type { AddressFieldContext, AddressFieldSuggestion } from '../../../../core/address-field-suggest/address-field-suggest.types';
import { AddressFieldSuggestService } from '../../../../core/address-field-suggest/address-field-suggest.service';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';
import { HlmSpinnerComponent } from '../../../../shared/ui/spinner';

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

export interface AddressFieldSaveEvent {
  field: string;
  value: string;
  /** Set when user picked a suggestion (geocoder-verified). */
  suggestion?: AddressFieldSuggestion;
}

@Component({
  selector: 'app-media-detail-location-section',
  standalone: true,
  imports: [
    AddressSearchComponent,
    AddressFieldComboboxComponent,
    CoordinatesFieldEditorComponent,
    DetailRowInlineConfirmActionComponent,
    ...HLM_BUTTON_IMPORTS,
    HlmSpinnerComponent,
  ],
  templateUrl: './media-detail-location-section.component.html',
  styleUrls: ['./media-detail-location-section.component.scss', '../_detail-row-slots.scss'],
})
export class MediaDetailLocationSectionComponent {
  private readonly i18nService = inject(I18nService);
  private readonly addressFieldSuggest = inject(AddressFieldSuggestService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly media = input.required<ImageRecord>();
  readonly fullAddress = input('');
  readonly editingField = input<DetailEditingField>(null);
  readonly isCorrected = input(false);
  readonly saving = input(false);
  readonly addressFieldsResolving = input(false);
  readonly coordinatesResolving = input(false);

  readonly fieldEditRequested = output<Exclude<DetailEditingField, null>>();
  /** Extended save event includes optional suggestion for meta persistence. */
  readonly fieldSaveRequested = output<AddressFieldSaveEvent>();
  readonly editingCancelled = output<void>();
  readonly fieldResolveRequested = output<{ field: string }>();
  readonly addressSuggestionApplied = output<ForwardGeocodeResult>();
  readonly addressClearRequested = output<void>();
  readonly copyCoordinatesRequested = output<void>();
  readonly mapLocationPickRequested = output<void>();
  readonly revertCoordinatesRequested = output<void>();
  readonly coordinatesClearRequested = output<void>();
  readonly coordinatesSaveRequested = output<string>();

  readonly addressSearchContext = computed<SearchQueryContext>(() => {
    const img = this.media();
    const lat = img.latitude ?? img.exif_latitude;
    const lng = img.longitude ?? img.exif_longitude;
    if (lat == null || lng == null) return {};
    return { activeMarkerCentroid: { lat, lng } };
  });

  /** Context passed to AddressFieldComboboxComponent for hierarchical suggestion constraints. */
  readonly addressFieldContext = computed<AddressFieldContext>(() => {
    const img = this.media();
    return {
      country: img.country,
      countryCode: this.addressFieldSuggest.countryCodeFromName(img.country),
      city: img.city,
      district: img.district,
      latitude: img.latitude ?? img.exif_latitude,
      longitude: img.longitude ?? img.exif_longitude,
      organizationId: img.organization_id,
    };
  });

  fieldVerification(field: AddressFieldDefinition['name']): 'verified' | 'unverified' | 'unknown' {
    const img = this.media();
    const meta = img.address_field_meta;
    const fieldMeta = meta?.[field];
    if (fieldMeta) {
      return fieldMeta.verified ? 'verified' : 'unverified';
    }
    // Legacy rows: address came from GPS/address-search before address_field_meta existed.
    if (this.fieldValue(field) && !img.location_unresolved) {
      return 'verified';
    }
    return 'unknown';
  }

  onSuggestionSelected(field: AddressFieldDefinition['name'], suggestion: AddressFieldSuggestion): void {
    this.fieldSaveRequested.emit({ field, value: suggestion.value, suggestion });
  }

  onFreeTextSave(field: AddressFieldDefinition['name'], value: string): void {
    this.fieldSaveRequested.emit({ field, value });
  }

  onFieldClear(field: AddressFieldDefinition['name']): void {
    this.fieldSaveRequested.emit({ field, value: '' });
  }

  onResolveRequested(field: AddressFieldDefinition['name']): void {
    this.fieldResolveRequested.emit({ field });
  }

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

  formatCoord(value: number | null): string {
    return formatCoordinate(value);
  }

  readonly hasResolvableCoordinates = computed(() => hasValidGpsCoordinates(this.media()));

  readonly coordinatesDisplayValue = computed(() => {
    const img = this.media();
    if (!hasValidGpsCoordinates(img)) {
      return '';
    }
    return `${this.formatCoord(img.latitude)}°, ${this.formatCoord(img.longitude)}°`;
  });

  readonly coordinatesEditInitialValue = computed(() => {
    const img = this.media();
    if (!hasValidGpsCoordinates(img)) {
      return '';
    }
    return `${img.latitude!.toFixed(6)}, ${img.longitude!.toFixed(6)}`;
  });

  readonly coordinatesRowIcon = computed(() =>
    this.hasResolvableCoordinates() ? 'gps_fixed' : 'gps_off',
  );

  readonly showCoordinatesResolving = computed(
    () => this.coordinatesResolving() || (this.addressFieldsResolving() && !this.hasResolvableCoordinates()),
  );

  readonly fieldValues = computed(() => {
    const img = this.media();
    return {
      street: img.street ?? '',
      city: img.city ?? '',
      district: img.district ?? '',
      country: img.country ?? '',
    } as const;
  });

  fieldValue(field: AddressFieldDefinition['name']): string {
    return this.fieldValues()[field];
  }
}
