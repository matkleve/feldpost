import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { applyOrgBrandingToDocument, clearOrgBrandingFromDocument, FELDPOST_BRAND_DEFAULTS } from '../../../../core/organization/organization.helpers';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { OrganizationService } from '../../../../core/organization/organization.service';
import { ToastService } from '../../../../core/toast/toast.service';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';
import { HLM_FORM_FIELD_IMPORTS } from '../../../../shared/ui/form-field';
import { HLM_INPUT_IMPORTS } from '../../../../shared/ui/input';
import { HLM_LABEL_IMPORTS } from '../../../../shared/ui/label';

@Component({
  selector: 'app-organization-branding-section',
  standalone: true,
  imports: [FormsModule, ...HLM_BUTTON_IMPORTS, ...HLM_FORM_FIELD_IMPORTS, ...HLM_INPUT_IMPORTS, ...HLM_LABEL_IMPORTS],
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

  readonly primaryColor = signal('');
  readonly accentColor = signal('');
  readonly backgroundColor = signal('');

  constructor() {
    effect(() => {
      void this.load();
    });
  }

  private async load(): Promise<void> {
    const result = await this.organizationService.loadBranding();
    if (result.data) {
      this.primaryColor.set(result.data.primaryColor ?? '');
      this.accentColor.set(result.data.accentColor ?? '');
      this.backgroundColor.set(result.data.backgroundColor ?? '');
    }
    applyOrgBrandingToDocument(result.data);
  }

  async onSave(): Promise<void> {
    const result = await this.organizationService.saveBranding({
      primaryColor: this.primaryColor() || null,
      accentColor: this.accentColor() || null,
      backgroundColor: this.backgroundColor() || null,
    });
    if (result.error) {
      this.toastService.show({
        message: result.error.message,
        type: 'error',
      });
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
      this.toastService.show({
        message: result.error.message,
        type: 'error',
      });
      return;
    }

    clearOrgBrandingFromDocument();
    this.toastService.show({
      message: this.t('organization.branding.reset_done', 'Feldpost default colors restored.'),
      type: 'success',
    });
  }
}
