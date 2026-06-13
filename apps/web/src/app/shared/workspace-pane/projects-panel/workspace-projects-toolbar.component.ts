import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrnToggleGroupImports, type ToggleValue } from '@spartan-ng/brain/toggle-group';
import { I18nService } from '../../../core/i18n/i18n.service';
import { HLM_BUTTON_IMPORTS } from '../../ui/button';
import { HLM_TOGGLE_GROUP_IMPORTS } from '../../ui/toggle-group';
import {
  buildCardVariantToggleOptions,
  buildCompactCardVariantSwitchTitle,
  getNextCardVariantToggleOption,
} from '../../ui-primitives/card-variant-toggle.helpers';
import { CardVariantSettingsService } from '../../ui-primitives/card-variant-settings.service';
import {
  CARD_VARIANTS,
  type CardVariant,
} from '../../ui-primitives/card-variant.types';
import { toggleSingleStringValue } from '../../ui/toggle-group/toggle-group-option.helpers';

@Component({
  selector: 'app-workspace-projects-toolbar',
  imports: [FormsModule, ...HLM_BUTTON_IMPORTS, ...BrnToggleGroupImports, ...HLM_TOGGLE_GROUP_IMPORTS],
  templateUrl: './workspace-projects-toolbar.component.html',
  styleUrl: './workspace-projects-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceProjectsToolbarComponent {
  private readonly i18nService = inject(I18nService);
  private readonly cardVariantSettings = inject(CardVariantSettingsService);

  readonly searchTerm = input('');
  readonly showArchived = input(false);
  readonly cardVariant = input<CardVariant>(
    this.cardVariantSettings.getVariant('projects'),
  );

  readonly searchTermChange = output<string>();
  readonly showArchivedChange = output<boolean>();
  readonly cardVariantChange = output<CardVariant>();

  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  readonly allowedCardVariants = CARD_VARIANTS;
  readonly cardVariantToggleOptions = computed(() =>
    buildCardVariantToggleOptions(this.t, this.allowedCardVariants, true),
  );
  readonly currentCardVariantToggleOption = computed(() => {
    const options = this.cardVariantToggleOptions();
    if (options.length === 0) return null;
    const current = this.cardVariant();
    return options.find((opt) => opt.id === current) ?? options[0];
  });
  readonly nextCardVariantToggleOption = computed(() =>
    getNextCardVariantToggleOption(this.cardVariantToggleOptions(), this.cardVariant()),
  );
  readonly compactCardVariantToggleTitle = computed(() =>
    buildCompactCardVariantSwitchTitle(this.t, this.nextCardVariantToggleOption()),
  );

  onSearchTermChange(value: string): void {
    this.searchTermChange.emit(value);
  }

  toggleShowArchived(): void {
    this.showArchivedChange.emit(!this.showArchived());
  }

  onCardVariantToggleChange(value: ToggleValue<string>): void {
    const next = toggleSingleStringValue(value);
    if (
      next !== 'row' &&
      next !== 'small' &&
      next !== 'medium' &&
      next !== 'large'
    ) {
      return;
    }
    this.cardVariantChange.emit(next);
  }

  cycleCardVariant(): void {
    const next = this.nextCardVariantToggleOption();
    if (!next) return;
    const value = next.id;
    if (value !== 'row' && value !== 'small' && value !== 'medium' && value !== 'large') {
      return;
    }
    this.cardVariantChange.emit(value);
  }
}
