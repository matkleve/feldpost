/**
 * CenteredLayout — Flexbox-based centering wrapper.
 *
 * Centers content both horizontally and vertically using flexbox.
 * Useful for empty states, error screens, loading placeholders.
 *
 * Usage:
 *   <app-centered-layout>
 *     <div class="empty-state">
 *       <p>No items found</p>
 *     </div>
 *   </app-centered-layout>
 */
import { Component } from '@angular/core';

@Component({
  selector: 'app-centered-layout',
  standalone: true,
  template: `<div class="centered-layout"><ng-content></ng-content></div>`,
  styles: [
    `
      .centered-layout {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        min-height: 200px;
      }
    `,
  ],
})
export class CenteredLayoutComponent {}
