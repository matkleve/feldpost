import { Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { HLM_BUTTON_IMPORTS } from '../ui/button';
import type {
  InlineConfirmDetailRowSlot,
  InlineConfirmRevealParent,
  InlineConfirmSize,
  InlineConfirmTone,
} from './inline-confirm-action.types';

/**
 * Row/sidebar wrapper around `hlmBtn` + `twoStepConfirm` for layout-specific chrome.
 * @see docs/specs/component/inline-confirm-action/inline-confirm-action.md
 */
@Component({
  selector: 'app-inline-confirm-action',
  standalone: true,
  imports: [...HLM_BUTTON_IMPORTS],
  host: {
    '[attr.data-layout]': 'layout()',
    '[attr.data-reveal]': 'revealOnParentHover() ?? null',
  },
  templateUrl: './inline-confirm-action.component.html',
  styleUrls: [
    './inline-confirm-action.component.scss',
    './inline-confirm-action-detail-row.bridge.scss',
  ],
})
export class InlineConfirmActionComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly disabled = input(false);
  readonly enabled = input(true);
  readonly size = input<InlineConfirmSize>('md');
  readonly tone = input<InlineConfirmTone>('remove');
  readonly detailRowSlot = input<InlineConfirmDetailRowSlot | null>(null);
  readonly revealOnParentHover = input<InlineConfirmRevealParent | null>(null);

  readonly initialAriaKey = input.required<string>();
  readonly initialAriaFallback = input.required<string>();
  readonly initialTitleKey = input<string | null>(null);
  readonly initialTitleFallback = input<string | null>(null);
  readonly confirmAriaKey = input('common.inlineConfirm.confirmAria');
  readonly confirmAriaFallback = input('Confirm');
  readonly confirmTitleKey = input('common.inlineConfirm.confirmTitle');
  readonly confirmTitleFallback = input('Click again to confirm');
  readonly idleIcon = input('close');
  readonly armedIcon = input('delete');

  readonly confirmed = output<void>();

  readonly layout = computed(() => (this.detailRowSlot() ? 'detail-row' : 'standalone'));

  readonly buttonVariant = computed(() => (this.tone() === 'danger' ? 'destructive' : 'ghost'));

  readonly buttonSize = computed(() => (this.size() === 'sm' ? 'icon-sm' : 'icon'));

  readonly buttonClasses = computed(() => {
    const classes = ['inline-confirm-action__button'];
    const slot = this.detailRowSlot();
    if (slot) {
      classes.push('detail-row-action', `detail-row-action--${slot}`);
      classes.push(
        this.tone() === 'danger' ? 'detail-row-action--danger' : 'detail-row-action--remove',
      );
    }
    return classes.join(' ');
  });

  ariaLabel(armed: boolean): string {
    if (armed) {
      return this.t(this.confirmAriaKey(), this.confirmAriaFallback());
    }
    return this.t(this.initialAriaKey(), this.initialAriaFallback());
  }

  title(armed: boolean): string | null {
    if (armed) {
      return this.t(this.confirmTitleKey(), this.confirmTitleFallback());
    }
    const key = this.initialTitleKey();
    const fallback = this.initialTitleFallback();
    if (key && fallback) {
      return this.t(key, fallback);
    }
    return null;
  }
}
