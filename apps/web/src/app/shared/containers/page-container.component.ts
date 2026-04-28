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
  styleUrl: './page-container.component.scss',
})
export class PageContainerComponent {
  /** Optionally constrain width to max-width with centering */
  readonly constrained = input(false);
}
