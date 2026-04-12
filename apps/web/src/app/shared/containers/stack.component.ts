/**
 * VStack — Vertical Stack Layout Utility
 *
 * Provides consistent vertical spacing between elements using flexbox.
 * Respects design system spacing tokens via CSS custom properties.
 *
 * Usage:
 *   <app-vstack spacing="4">
 *     <h2>Title</h2>
 *     <p>Content</p>
 *   </app-vstack>
 *
 * Spacing values map to CSS custom properties:
 * - 1: var(--spacing-1) = 0.25rem
 * - 2: var(--spacing-2) = 0.5rem
 * - 3: var(--spacing-3) = 0.75rem
 * - 4: var(--spacing-4) = 1rem
 * - 6: var(--spacing-6) = 1.5rem
 * - 8: var(--spacing-8) = 2rem
 */
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-vstack',
  standalone: true,
  template: `<ng-content />`,
  host: {
    '[style.--stack-spacing]': "'var(--spacing-' + (spacing() || 4) + ')'",
  },
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--stack-spacing);
      }
    `,
  ],
})
export class VStackComponent {
  spacing = input<number>(4);
}

/**
 * HStack — Horizontal Stack Layout Utility
 *
 * Provides consistent horizontal spacing between elements using flexbox.
 * Respects design system spacing tokens via CSS custom properties.
 *
 * Usage:
 *   <app-hstack spacing="2" align="center">
 *     <button>Save</button>
 *     <button>Cancel</button>
 *   </app-hstack>
 */
@Component({
  selector: 'app-hstack',
  standalone: true,
  template: `<ng-content />`,
  host: {
    '[style.--stack-spacing]': "'var(--spacing-' + (spacing() || 4) + ')'",
    '[style.--stack-align]': 'align() || "stretch"',
  },
  styles: [
    `
      :host {
        display: flex;
        flex-direction: row;
        gap: var(--stack-spacing);
        align-items: var(--stack-align);
      }
    `,
  ],
})
export class HStackComponent {
  spacing = input<number>(4);
  align = input<'center' | 'start' | 'end' | 'stretch'>('stretch');
}
