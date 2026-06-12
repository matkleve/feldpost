/**
 * MaxWidthContainer — Responsive width wrapper with centering.
 *
 * Provides consistent max-width constraint (clamp between 280px–640px) and
 * automatic horizontal centering across the application.
 *
 * Usage:
 *   <app-max-width-container>
 *     <p>Centered content bounded by responsive clamp</p>
 *   </app-max-width-container>
 */
import { Component } from '@angular/core';

@Component({
  selector: 'app-max-width-container',
  standalone: true,
  template: `<div class="max-width-container"><ng-content></ng-content></div>`,
  styles: [
    `
      .max-width-container {
        width: 100%;
        max-width: clamp(280px, 35vw, 640px);
        margin-inline: auto;
      }
    `,
  ],
})
export class MaxWidthContainerComponent {}
