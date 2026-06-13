import {
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { HLM_BUTTON_IMPORTS } from '../ui/button';
import { HlmMenuItemDirective, HlmMenuSeparatorDirective } from '../ui/menu';
import { I18nService } from '../../core/i18n/i18n.service';
import type { ResolvedAction } from '../../core/action/action-types';

export type ContextActionBarVariant = 'footer' | 'section';

const DESTRUCTIVE_CONFIRM_REVERT_MS = 5000;

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
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly actions = input<ReadonlyArray<ResolvedAction<TActionId>>>([]);
  readonly variant = input<ContextActionBarVariant>('section');
  readonly pending = input(false);
  readonly actionSelected = output<TActionId>();

  readonly armedDestructiveId = signal<TActionId | null>(null);

  private revertTimer: ReturnType<typeof setTimeout> | null = null;
  private ignoreOutsideUntil = 0;

  ngOnDestroy(): void {
    this.clearRevertTimer();
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
      this.onDestructiveSectionClick(actionId);
      return;
    }

    this.actionSelected.emit(actionId);
  }

  isDestructiveArmed(actionId: TActionId): boolean {
    return this.armedDestructiveId() === actionId;
  }

  destructiveIcon(action: ResolvedAction<TActionId>): string {
    return this.isDestructiveArmed(action.id) ? 'warning' : action.icon;
  }

  destructiveLabel(action: ResolvedAction<TActionId>): string {
    if (this.isDestructiveArmed(action.id)) {
      return this.t(
        'workspace.imageDetail.action.inlineConfirm.title',
        'Click again to confirm',
      );
    }
    return action.label;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.armedDestructiveId() || Date.now() < this.ignoreOutsideUntil) {
      return;
    }

    const target = event.target as Node | null;
    if (!target || this.elementRef.nativeElement.contains(target)) {
      return;
    }

    this.disarmDestructive();
  }

  private onDestructiveSectionClick(actionId: TActionId): void {
    if (!this.isDestructiveArmed(actionId)) {
      this.armDestructive(actionId);
      return;
    }

    this.disarmDestructive();
    this.actionSelected.emit(actionId);
  }

  private isDestructiveAction(actionId: TActionId): boolean {
    return this.destructiveActions().some((action) => action.id === actionId);
  }

  private armDestructive(actionId: TActionId): void {
    this.armedDestructiveId.set(actionId);
    this.ignoreOutsideUntil = Date.now() + 200;
    this.scheduleRevert();
  }

  private disarmDestructive(): void {
    this.armedDestructiveId.set(null);
    this.clearRevertTimer();
  }

  private scheduleRevert(): void {
    this.clearRevertTimer();
    this.revertTimer = setTimeout(() => this.disarmDestructive(), DESTRUCTIVE_CONFIRM_REVERT_MS);
  }

  private clearRevertTimer(): void {
    if (this.revertTimer !== null) {
      clearTimeout(this.revertTimer);
      this.revertTimer = null;
    }
  }
}
