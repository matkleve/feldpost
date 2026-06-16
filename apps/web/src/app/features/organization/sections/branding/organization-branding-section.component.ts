import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  applyOrgBrandingToDocument,
  clearOrgBrandingFromDocument,
  FELDPOST_BRAND_DEFAULTS,
} from '../../../../core/organization/organization.helpers';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { OrganizationService } from '../../../../core/organization/organization.service';
import { ToastService } from '../../../../core/toast/toast.service';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';
import { HLM_INPUT_IMPORTS } from '../../../../shared/ui/input';

type BrandColorField = 'primaryColor' | 'accentColor' | 'backgroundColor';

@Component({
  selector: 'app-organization-branding-section',
  standalone: true,
  imports: [FormsModule, ...HLM_BUTTON_IMPORTS, ...HLM_INPUT_IMPORTS],
  templateUrl: './organization-branding-section.component.html',
  styleUrl: './organization-branding-section.component.scss',
})
export class OrganizationBrandingSectionComponent {
  private readonly i18nService = inject(I18nService);
  private readonly organizationService = inject(OrganizationService);
  private readonly toastService = inject(ToastService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly canEdit = input(true);
  readonly feldpostDefaults = FELDPOST_BRAND_DEFAULTS;

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly logoUploading = signal(false);
  readonly organizationName = signal('');
  readonly logoUrl = signal<string | null>(null);
  readonly primaryColor = signal('');
  readonly accentColor = signal('');
  readonly backgroundColor = signal('');

  readonly previewPrimary = computed(() => this.primaryColor() || this.feldpostDefaults.primaryColor);
  readonly previewAccent = computed(() => this.accentColor() || this.feldpostDefaults.accentColor);
  readonly previewBackground = computed(() => this.backgroundColor() || this.feldpostDefaults.backgroundColor);

  constructor() {
    effect(() => {
      void this.load();
    });
  }

  colorValue(field: BrandColorField): string {
    const value = this[field]();
    return value || this.feldpostDefaults[field];
  }

  onColorHexChange(field: BrandColorField, value: string): void {
    const normalized = value.trim();
    if (!normalized) {
      this[field].set('');
      return;
    }
    const hex = normalized.startsWith('#') ? normalized : `#${normalized}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      this[field].set(hex);
    }
  }

  onColorPickerChange(field: BrandColorField, value: string): void {
    this[field].set(value);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);

    const [brandingResult, profileResult] = await Promise.all([
      this.organizationService.loadBranding(),
      this.organizationService.loadProfile(),
    ]);

    this.loading.set(false);

    if (brandingResult.error) {
      this.loadError.set(brandingResult.error.message);
      return;
    }
    if (profileResult.error) {
      this.loadError.set(profileResult.error.message);
      return;
    }

    if (brandingResult.data) {
      this.primaryColor.set(brandingResult.data.primaryColor ?? '');
      this.accentColor.set(brandingResult.data.accentColor ?? '');
      this.backgroundColor.set(brandingResult.data.backgroundColor ?? '');
    }

    if (profileResult.data) {
      this.organizationName.set(profileResult.data.name);
      this.logoUrl.set(profileResult.data.logoUrl);
    }
  }

  async onLogoSelected(event: Event): Promise<void> {
    if (!this.canEdit()) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.logoUploading.set(true);
    const result = await this.organizationService.uploadOrganizationLogo(file);
    this.logoUploading.set(false);

    if (result.error) {
      this.toastService.show({ message: result.error.message, type: 'error' });
      return;
    }

    this.logoUrl.set(result.data);
    this.toastService.show({
      message: this.t('organization.branding.logo_uploaded', 'Logo uploaded.'),
      type: 'success',
    });
  }

  async onRemoveLogo(): Promise<void> {
    if (!this.canEdit()) return;
    this.logoUploading.set(true);
    const result = await this.organizationService.removeOrganizationLogo();
    this.logoUploading.set(false);

    if (result.error) {
      this.toastService.show({ message: result.error.message, type: 'error' });
      return;
    }

    this.logoUrl.set(null);
    this.toastService.show({
      message: this.t('organization.branding.logo_removed', 'Logo removed.'),
      type: 'success',
    });
  }

  async onSave(): Promise<void> {
    const result = await this.organizationService.saveBranding({
      primaryColor: this.primaryColor() || null,
      accentColor: this.accentColor() || null,
      backgroundColor: this.backgroundColor() || null,
    });
    if (result.error) {
      this.toastService.show({ message: result.error.message, type: 'error' });
      return;
    }
    applyOrgBrandingToDocument({
      primaryColor: this.primaryColor() || null,
      accentColor: this.accentColor() || null,
      backgroundColor: this.backgroundColor() || null,
    });
    this.toastService.show({
      message: this.t('organization.branding.saved', 'Branding saved.'),
      type: 'success',
    });
  }

  async onReset(): Promise<void> {
    this.primaryColor.set('');
    this.accentColor.set('');
    this.backgroundColor.set('');

    const result = await this.organizationService.saveBranding({
      primaryColor: null,
      accentColor: null,
      backgroundColor: null,
    });
    if (result.error) {
      this.toastService.show({ message: result.error.message, type: 'error' });
      return;
    }

    clearOrgBrandingFromDocument();
    this.toastService.show({
      message: this.t('organization.branding.reset_done', 'Feldpost default colors restored.'),
      type: 'success',
    });
  }
}
