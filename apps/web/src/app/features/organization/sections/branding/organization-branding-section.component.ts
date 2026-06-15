import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { OrganizationService } from '../../../../core/organization/organization.service';
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
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly primaryColor = signal('#b45309');
  readonly accentColor = signal('#2563eb');
  readonly backgroundColor = signal('#faf7f2');

  constructor() {
    effect(() => {
      void this.load();
    });
  }

  private async load(): Promise<void> {
    const result = await this.organizationService.loadBranding();
    if (result.data) {
      this.primaryColor.set(result.data.primaryColor ?? '#b45309');
      this.accentColor.set(result.data.accentColor ?? '#2563eb');
      this.backgroundColor.set(result.data.backgroundColor ?? '#faf7f2');
    }
  }

  async onSave(): Promise<void> {
    await this.organizationService.saveBranding({
      primaryColor: this.primaryColor(),
      accentColor: this.accentColor(),
      backgroundColor: this.backgroundColor(),
    });
  }
}
