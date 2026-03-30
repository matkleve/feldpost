import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import {
  SegmentedSwitchComponent,
  type SegmentedSwitchOption,
} from '../segmented-switch/segmented-switch.component';
import { CARD_VARIANTS, type CardVariant } from './card-variant.types';

@Component({
  selector: 'app-card-variant-switch',
  standalone: true,
  imports: [SegmentedSwitchComponent],
  templateUrl: './card-variant-switch.component.html',
  styleUrl: './card-variant-switch.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardVariantSwitchComponent {
  private readonly i18nService = inject(I18nService);

  readonly value = input.required<CardVariant>();
  readonly allowed = input<ReadonlyArray<CardVariant>>(CARD_VARIANTS);
  readonly ariaLabel = input('');
  readonly iconOnly = input(true);
  readonly size = input<'sm' | 'md' | 'lg'>('sm');

  readonly valueChange = output<CardVariant>();

  readonly options = computed<ReadonlyArray<SegmentedSwitchOption>>(() => {
    const t = (key: string, fallback: string): string => {
      const value = this.i18nService.t(key, fallback);
      return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
    };

    return this.allowed().map((variant) => ({
      id: variant,
      type: this.iconOnly() ? 'icon-only' : 'icon-with-text',
      label: t(`workspace.toolbar.size.${variant}`, variant),
      icon: this.iconFor(variant),
      title: t(`workspace.toolbar.size.${variant}`, variant),
      ariaLabel: t(`workspace.toolbar.size.${variant}`, variant),
    }));
  });

  readonly resolvedAriaLabel = computed(() => {
    if (this.ariaLabel().trim().length > 0) {
      return this.ariaLabel();
    }

    const fallback = 'Thumbnail size';
    const value = this.i18nService.t('workspace.toolbar.size.aria', fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  });

  onValueChange(value: string | null): void {
    if (value === 'row' || value === 'small' || value === 'medium' || value === 'large') {
      this.valueChange.emit(value);
    }
  }

  private iconFor(variant: CardVariant): string {
    switch (variant) {
      case 'row':
        return 'view_headline';
      case 'small':
        return 'grid_view';
      case 'medium':
        return 'apps';
      case 'large':
        return 'view_agenda';
      default:
        return 'apps';
    }
  }
}
