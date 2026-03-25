import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-card-grid',
  standalone: true,
  templateUrl: './card-grid.component.html',
  styleUrl: './card-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardGridComponent {
  readonly tag = input<'div' | 'ul'>('div');
  readonly minColumnWidth = input('16rem');
  readonly gap = input('var(--spacing-3)');
  readonly role = input<string | null>(null);
}
