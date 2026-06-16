import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { OrganizationService } from '../../../../core/organization/organization.service';
import type { OrgApiKey } from '../../../../core/organization/organization.types';
import { ToastService } from '../../../../core/toast/toast.service';
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
  private readonly toastService = inject(ToastService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly canEdit = input(true);

  readonly apiKeys = signal<OrgApiKey[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly newKeyName = signal('');
  readonly revealedKey = signal<string | null>(null);
  readonly revokeDialogOpen = signal(false);
  readonly pendingRevokeKeyId = signal<string | null>(null);

  constructor() {
    effect(() => {
      void this.load();
    });
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    const result = await this.organizationService.loadApiKeys();
    this.loading.set(false);
    if (result.error) {
      this.loadError.set(result.error.message);
      return;
    }
    this.apiKeys.set(result.data);
  }

  async onCreateKey(): Promise<void> {
    if (!this.canEdit()) return;
    const name = this.newKeyName().trim();
    if (!name) return;
    const result = await this.organizationService.createApiKey(name);
    if (result.error) {
      this.toastService.show({ message: result.error.message, type: 'error' });
      return;
    }
    if (result.data) {
      this.revealedKey.set(result.data.key);
      this.newKeyName.set('');
      this.toastService.show({
        message: this.t('organization.integrations.created', 'API key created.'),
        type: 'success',
      });
      await this.load();
    }
  }

  async onCopyRevealedKey(): Promise<void> {
    const key = this.revealedKey();
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      this.toastService.show({
        message: this.t('organization.integrations.copied', 'API key copied to clipboard.'),
        type: 'success',
      });
    } catch {
      this.toastService.show({
        message: this.t('organization.integrations.copy_failed', 'Could not copy API key.'),
        type: 'error',
      });
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
    const result = await this.organizationService.revokeApiKey(keyId);
    if (result.error) {
      this.toastService.show({ message: result.error.message, type: 'error' });
      return;
    }
    this.toastService.show({
      message: this.t('organization.integrations.revoked', 'API key revoked.'),
      type: 'success',
    });
    await this.load();
  }

  onRevokeCancelled(): void {
    this.revokeDialogOpen.set(false);
    this.pendingRevokeKeyId.set(null);
  }
}
