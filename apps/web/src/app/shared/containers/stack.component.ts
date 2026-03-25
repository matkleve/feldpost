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
  template: `<div class="vstack" [style.--spacing]="'var(--spacing-' + (spacing() || 4) + ')'">
    <ng-content></ng-content>
  </div>`,
  styles: [
    `
      .vstack {
        display: flex;
        flex-direction: column;
        gap: var(--spacing);
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
  template: `<div
    class="hstack"
    [style.--spacing]="'var(--spacing-' + (spacing() || 4) + ')'"
    [style.--align]="align() || 'stretch'"
  >
    <ng-content></ng-content>
  </div>`,
  styles: [
    `
      .hstack {
        display: flex;
        flex-direction: row;
        gap: var(--spacing);
        align-items: var(--align);
      }
    `,
  ],
})
export class HStackComponent {
  spacing = input<number>(4);
  align = input<'center' | 'start' | 'end' | 'stretch'>('stretch');
}
