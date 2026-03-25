/**
 * PageContainer — Full-page content wrapper with standardized padding and layout.
 *
 * Wraps page content with:
 * - Standard padding from design system
 * - Optional MaxWidthContainer for centered, constrained layout
 * - Flexbox column layout for stacking header/toolbar/content sections
 *
 * Usage:
 *   <app-page-container>
 *     <app-page-header title="Projects" />
 *     <app-page-toolbar ... />
 *     <div class="content">Grid or list</div>
 *   </app-page-container>
 */
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-container',
  standalone: true,
  template: `<main class="page-container" [class.page-container--constrained]="constrained()">
    <div class="page-container__content">
      <ng-content></ng-content>
    </div>
  </main>`,
  styles: [
    `
      .page-container {
        min-height: 100%;
        padding: var(--spacing-4);
      }

      .page-container__content {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-4);
      }

      /* Optional: constrained width for centered pages */
      .page-container--constrained {
        width: 100%;
        max-width: clamp(320px, 90vw, 1200px);
        margin-inline: auto;
      }
    `,
  ],
})
export class PageContainerComponent {
  /** Optionally constrain width to max-width with centering */
  constrained = input(false);
}
