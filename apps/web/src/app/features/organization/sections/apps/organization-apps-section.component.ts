import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccountContextService } from '../../../../core/account-context/account-context.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { WidgetInstallService } from '../../../../core/widget-install/widget-install.service';
import { WIDGET_IDS } from '../../../../core/widget-install/widget-install.helpers';
import type { WidgetId, WidgetPolicyRow } from '../../../../core/widget-install/widget-install.types';

@Component({
  selector: 'app-organization-apps-section',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './organization-apps-section.component.html',
  styleUrl: './organization-apps-section.component.scss',
})
export class OrganizationAppsSectionComponent {
  private readonly i18n = inject(I18nService);
  private readonly widgets = inject(WidgetInstallService);
  private readonly account = inject(AccountContextService);
  readonly t = (key: string, fallback = '') => this.i18n.t(key, fallback);
  readonly widgetIds = WIDGET_IDS;
  readonly errorMessage = signal<string | null>(null);
  organizationName = '';

  constructor() {
    void this.widgets.load();
  }

  policy(widgetId: WidgetId): WidgetPolicyRow {
    return (
      this.widgets.policies().find((row) => row.widgetId === widgetId) ?? {
        widgetId,
        allowed: true,
        preinstalled: widgetId === 'map' || widgetId === 'media',
        locked: false,
      }
    );
  }

  async save(widgetId: WidgetId, patch: Partial<WidgetPolicyRow>): Promise<void> {
    const organizationId = this.account.organizationId();
    if (!organizationId) {
      return;
    }
    const next = { ...this.policy(widgetId), ...patch };
    if (patch.locked) {
      next.preinstalled = true;
      next.allowed = true;
    }
    if (!next.allowed || !next.preinstalled) {
      next.locked = false;
    }
    const error = await this.widgets.savePolicy(organizationId, next);
    this.errorMessage.set(error);
    if (!error) {
      await this.widgets.load();
    }
  }

  async createOrganization(): Promise<void> {
    const name = this.organizationName.trim();
    if (!name) {
      return;
    }
    await this.account.createOrganization(name);
    this.organizationName = '';
    this.errorMessage.set(this.account.errorMessage());
  }

  async push(widgetId: WidgetId): Promise<void> {
    this.errorMessage.set(await this.widgets.push(widgetId));
  }
}
