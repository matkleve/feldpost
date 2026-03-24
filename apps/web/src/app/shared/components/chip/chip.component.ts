import { Component, computed, input, output } from '@angular/core';

export type ChipSize = 'sm' | 'md' | 'lg';

export type ChipVariant =
  | 'default'
  | 'primary'
  | 'status-success'
  | 'status-warning'
  | 'status-danger'
  | 'filetype-image'
  | 'filetype-video'
  | 'filetype-document'
  | 'filetype-spreadsheet'
  | 'filetype-presentation'
  | 'custom';

@Component({
  selector: 'app-chip',
  standalone: true,
  templateUrl: './chip.component.html',
  styleUrl: './chip.component.scss',
})
export class ChipComponent {
  readonly icon = input<string | undefined>(undefined);
  readonly text = input<string | undefined>(undefined);
  readonly dismissible = input(false);
  readonly size = input<ChipSize>('sm');
  readonly variant = input<ChipVariant>('default');
  readonly color = input<string | undefined>(undefined);
  readonly maxWidth = input('auto');
  readonly dismissAriaLabel = input<string | undefined>(undefined);

  readonly chipDismissed = output<void>();

  readonly isIconOnly = computed(() => !!this.icon() && !this.text());

  readonly chipClass = computed(() => {
    const classes = ['chip', `chip--${this.size()}`, `chip--${this.variant()}`];
    if (this.isIconOnly()) {
      classes.push('chip--icon-only');
    }
    if (this.dismissible()) {
      classes.push('chip--dismissible');
    }
    return classes.join(' ');
  });

  readonly chipColorValue = computed(() => {
    const variant = this.variant();
    if (variant === 'default') {
      return null;
    }

    if (variant === 'custom') {
      return this.asCssColor(this.color() ?? '--color-primary');
    }

    return this.asCssColor(this.variantToColorToken(variant));
  });

  readonly computedDismissAriaLabel = computed(() => {
    const override = this.dismissAriaLabel();
    if (override) {
      return override;
    }

    const labelText = this.text();
    return labelText ? `Dismiss ${labelText}` : 'Dismiss chip';
  });

  onDismiss(event: MouseEvent): void {
    event.stopPropagation();
    this.chipDismissed.emit();
  }

  private variantToColorToken(variant: Exclude<ChipVariant, 'default' | 'custom'>): string {
    switch (variant) {
      case 'primary':
        return '--color-primary';
      case 'status-success':
        return '--color-success';
      case 'status-warning':
        return '--color-warning';
      case 'status-danger':
        return '--color-danger';
      case 'filetype-image':
        return '--filetype-image';
      case 'filetype-video':
        return '--filetype-video';
      case 'filetype-document':
        return '--filetype-document';
      case 'filetype-spreadsheet':
        return '--filetype-spreadsheet';
      case 'filetype-presentation':
        return '--filetype-presentation';
    }
  }

  private asCssColor(value: string): string {
    return value.startsWith('--') ? `var(${value})` : value;
  }
}
