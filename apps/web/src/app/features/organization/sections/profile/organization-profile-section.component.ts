import { Component, effect, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../../../core/i18n/i18n.service';
import type { OrganizationProfile } from '../../../../core/organization/organization.types';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';
import { HLM_FORM_FIELD_IMPORTS } from '../../../../shared/ui/form-field';
import { HLM_INPUT_IMPORTS } from '../../../../shared/ui/input';
import { HLM_LABEL_IMPORTS } from '../../../../shared/ui/label';

@Component({
  selector: 'app-organization-profile-section',
  standalone: true,
  imports: [FormsModule, ...HLM_BUTTON_IMPORTS, ...HLM_FORM_FIELD_IMPORTS, ...HLM_INPUT_IMPORTS, ...HLM_LABEL_IMPORTS],
  templateUrl: './organization-profile-section.component.html',
  styleUrl: './organization-profile-section.component.scss',
})
export class OrganizationProfileSectionComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly profile = input<OrganizationProfile | null>(null);
  readonly canEdit = input(true);
  readonly saved = output<Partial<OrganizationProfile>>();

  draftName = '';
  draftDescription = '';
  draftIndustry = '';
  draftEmail = '';
  draftPhone = '';
  draftWebsite = '';
  draftAddressLine1 = '';
  draftAddressLine2 = '';
  draftCity = '';
  draftPostalCode = '';
  draftCountry = '';

  constructor() {
    effect(() => {
      const profile = this.profile();
      if (!profile) return;
      this.draftName = profile.name;
      this.draftDescription = profile.description ?? '';
      this.draftIndustry = profile.industry ?? '';
      this.draftEmail = profile.email ?? '';
      this.draftPhone = profile.phone ?? '';
      this.draftWebsite = profile.website ?? '';
      this.draftAddressLine1 = profile.addressLine1 ?? '';
      this.draftAddressLine2 = profile.addressLine2 ?? '';
      this.draftCity = profile.city ?? '';
      this.draftPostalCode = profile.postalCode ?? '';
      this.draftCountry = profile.country ?? '';
    });
  }

  onSave(): void {
    this.saved.emit({
      name: this.draftName.trim(),
      description: this.draftDescription.trim() || null,
      industry: this.draftIndustry.trim() || null,
      email: this.draftEmail.trim() || null,
      phone: this.draftPhone.trim() || null,
      website: this.draftWebsite.trim() || null,
      addressLine1: this.draftAddressLine1.trim() || null,
      addressLine2: this.draftAddressLine2.trim() || null,
      city: this.draftCity.trim() || null,
      postalCode: this.draftPostalCode.trim() || null,
      country: this.draftCountry.trim() || null,
    });
  }
}
