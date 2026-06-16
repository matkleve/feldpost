import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { OrganizationService } from '../../../../core/organization/organization.service';
import type { OrgApiKey } from '../../../../core/organization/organization.types';
import { ConfirmDialogComponent } from '../../../../shared/confirm-dialog/confirm-dialog.component';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';
import { HLM_FORM_FIELD_IMPORTS } from '../../../../shared/ui/form-field';
import { HLM_INPUT_IMPORTS } from '../../../../shared/ui/input';
import { HLM_LABEL_IMPORTS } from '../../../../shared/ui/label';

@Component({
  selector: 'app-organization-integrations-section',
  standalone: true,
  imports: [
    FormsModule,
    ConfirmDialogComponent,
    ...HLM_BUTTON_IMPORTS,
    ...HLM_FORM_FIELD_IMPORTS,
    ...HLM_INPUT_IMPORTS,
    ...HLM_LABEL_IMPORTS,
  ],
  templateUrl: './organization-integrations-section.component.html',
  styleUrl: './organization-integrations-section.component.scss',
})
export class OrganizationIntegrationsSectionComponent {
  private readonly i18nService = inject(I18nService);
  private readonly organizationService = inject(OrganizationService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly canEdit = input(true);

  readonly apiKeys = signal<OrgApiKey[]>([]);
  readonly newKeyName = signal('');
  readonly revealedKey = signal<string | null>(null);
  readonly revokeDialogOpen = signal(false);
  readonly pendingRevokeKeyId = signal<string | null>(null);

  constructor() {
    effect(() => {
      void this.load();
    });
  }

  private async load(): Promise<void> {
    const result = await this.organizationService.loadApiKeys();
    this.apiKeys.set(result.data);
  }

  async onCreateKey(): Promise<void> {
    if (!this.canEdit()) return;
    const name = this.newKeyName().trim();
    if (!name) return;
    const result = await this.organizationService.createApiKey(name);
    if (result.data) {
      this.revealedKey.set(result.data.key);
      this.newKeyName.set('');
      await this.load();
    }
  }

  onRevokeClick(keyId: string): void {
    if (!this.canEdit()) return;
    this.pendingRevokeKeyId.set(keyId);
    this.revokeDialogOpen.set(true);
  }

  async onRevokeConfirmed(): Promise<void> {
    const keyId = this.pendingRevokeKeyId();
    if (!keyId) return;
    this.revokeDialogOpen.set(false);
    this.pendingRevokeKeyId.set(null);
    await this.organizationService.revokeApiKey(keyId);
    await this.load();
  }

  onRevokeCancelled(): void {
    this.revokeDialogOpen.set(false);
    this.pendingRevokeKeyId.set(null);
  }
}
