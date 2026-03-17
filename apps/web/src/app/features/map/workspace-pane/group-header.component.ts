import { Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-group-header',
  template: `
    <button
      class="group-header"
      type="button"
      [style.padding-left.rem]="1.5 * level()"
      [attr.aria-expanded]="!collapsed()"
      (click)="toggle.emit()"
    >
      <span
        class="group-header__chevron material-icons"
        [class.group-header__chevron--collapsed]="collapsed()"
        aria-hidden="true"
        >expand_more</span
      >
      <span class="group-header__name">{{ heading() }}</span>
      <span class="group-header__count"
        >{{ imageCount() }} {{ t('workspace.groupHeader.count.photos', 'photos') }}</span
      >
      <span class="ui-spacer"></span>
    </button>
  `,
  styleUrl: './group-header.component.scss',
})
export class GroupHeaderComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly heading = input.required<string>();
  readonly imageCount = input.required<number>();
  readonly level = input(0);
  readonly collapsed = input(false);
  readonly toggle = output<void>();
}
