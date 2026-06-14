import {
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  output,
} from '@angular/core';
import { HLM_BUTTON_IMPORTS, TwoStepConfirmGroup } from '../ui/button';
import { HlmMenuItemDirective, HlmMenuSeparatorDirective } from '../ui/menu';
import { I18nService } from '../../core/i18n/i18n.service';
import type { ResolvedAction } from '../../core/action/action-types';

export type ContextActionBarVariant = 'footer' | 'section';

@Component({
  selector: 'app-context-action-bar',
  standalone: true,
  imports: [HlmMenuItemDirective, HlmMenuSeparatorDirective, ...HLM_BUTTON_IMPORTS],
  templateUrl: './context-action-bar.component.html',
  styleUrl: './context-action-bar.component.scss',
})
export class ContextActionBarComponent<TActionId extends string = string> implements OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly i18nService = inject(I18nService);
  private readonly destructiveConfirm = new TwoStepConfirmGroup<TActionId>(this.elementRef);

  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly actions = input<ReadonlyArray<ResolvedAction<TActionId>>>([]);
  readonly variant = input<ContextActionBarVariant>('section');
  readonly pending = input(false);
  readonly actionSelected = output<TActionId>();

  ngOnDestroy(): void {
    this.destructiveConfirm.destroy();
  }

  readonly primaryActions = () =>
    this.actions().filter(
      (action) => action.section === 'primary' || action.section === 'secondary',
    );

  readonly destructiveActions = () =>
    this.actions().filter((action) => action.section === 'destructive');

  hasDestructiveActions(): boolean {
    return this.destructiveActions().length > 0;
  }

  onActionClick(actionId: TActionId): void {
    if (this.variant() === 'section' && this.isDestructiveAction(actionId)) {
      this.destructiveConfirm.handleClick(actionId, () => this.actionSelected.emit(actionId));
      return;
    }

    this.actionSelected.emit(actionId);
  }

  isDestructiveArmed(actionId: TActionId): boolean {
    return this.destructiveConfirm.isArmed(actionId);
  }

  destructiveIcon(action: ResolvedAction<TActionId>): string {
    return this.isDestructiveArmed(action.id) ? 'warning' : action.icon;
  }

  destructiveLabel(action: ResolvedAction<TActionId>): string {
    if (this.isDestructiveArmed(action.id)) {
      return this.t('common.inlineConfirm.confirmTitle', 'Click again to confirm');
    }
    return action.label;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    this.destructiveConfirm.handleDocumentClick(event);
  }

  private isDestructiveAction(actionId: TActionId): boolean {
    return this.destructiveActions().some((action) => action.id === actionId);
  }
}
