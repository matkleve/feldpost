import { Component, computed, input, output } from '@angular/core';

export type ChipVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'neutral'
  | 'info'
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
  /** Leading circular image + label (Figma `avatar-text`). When set with `text()`, Material `icon` is not shown. */
  readonly avatarSrc = input<string | undefined>(undefined);
  /** Optional accessible name for the avatar image when it conveys meaning. */
  readonly avatarAlt = input<string | undefined>(undefined);
  readonly dismissible = input(false);
  readonly variant = input<ChipVariant>('default');
  readonly color = input<string | undefined>(undefined);
  readonly maxWidth = input('auto');
  readonly dismissAriaLabel = input<string | undefined>(undefined);

  readonly chipDismissed = output<void>();

  readonly isAvatarText = computed(
    () => !!this.avatarSrc()?.trim().length && !!this.text()?.trim().length,
  );

  readonly isIconOnly = computed(
    () => !!this.icon() && !this.text() && !this.avatarSrc()?.trim().length,
  );

  readonly chipClass = computed(() => {
    const classes = ['chip', `chip--${this.variant()}`];
    if (this.isAvatarText()) {
      classes.push('chip--avatar-text');
    } else if (this.isIconOnly()) {
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
      return this.asCssColor(this.color() ?? '--primary');
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
        return '--primary';
      case 'success':
        return '--success';
      case 'warning':
        return '--warning';
      case 'neutral':
        return '--muted-foreground';
      case 'info':
        return '--primary';
      case 'status-success':
        return '--success';
      case 'status-warning':
        return '--warning';
      case 'status-danger':
        return '--destructive';
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
