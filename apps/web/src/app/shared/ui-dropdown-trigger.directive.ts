import { Directive, Input, computed, signal, HostBinding, effect } from '@angular/core';

@Directive({
  selector: 'button[uiDropdownTrigger], a[uiDropdownTrigger]',
  standalone: true,
  host: {
    'class': 'ui-button ui-dropdown-trigger',
    '[class.ui-button--sm]': 'size === "sm"',
    '[class.ui-button--md]': 'size === "md"',
    '[class.ui-button--lg]': 'size === "lg"',
    '[class.ui-dropdown-trigger--open]': 'open',
    '[class.ui-dropdown-trigger--compact]': 'collapse === "compact"',
    '[class.ui-dropdown-trigger--icon-only]': 'collapse === "icon-only"'
  }
})
export class UiDropdownTriggerDirective {
  @Input() size: 'sm' | 'md' | 'lg' = 'sm';
  @Input() open: boolean = false;
  @Input() collapse: 'compact' | 'icon-only' | null = null;
}
