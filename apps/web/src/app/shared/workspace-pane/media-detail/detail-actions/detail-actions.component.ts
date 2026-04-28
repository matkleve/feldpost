import { Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';
import type { ResolvedAction } from '../../../../core/action/action-types';
import type { WorkspaceSingleActionId } from '../../footer/workspace-detail-actions.types';

@Component({
  selector: 'app-detail-actions',
  standalone: true,
  templateUrl: './detail-actions.component.html',
  styleUrl: './detail-actions.component.scss',
})
export class DetailActionsComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly actions = input<ReadonlyArray<ResolvedAction<WorkspaceSingleActionId>>>([]);
  readonly actionSelected = output<WorkspaceSingleActionId>();

  hasDestructiveActions(): boolean {
    return this.actions().some((action) => action.section === 'destructive');
  }
}
