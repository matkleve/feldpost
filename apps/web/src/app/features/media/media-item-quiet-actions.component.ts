import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  UiButtonDirective,
  UiButtonIconOnlyDirective,
  UiButtonSecondaryDirective,
  UiButtonSizeSmDirective,
} from '../../shared/ui-primitives/ui-primitives.directive';

@Component({
  selector: 'app-media-item-quiet-actions',
  imports: [
    UiButtonDirective,
    UiButtonSizeSmDirective,
    UiButtonSecondaryDirective,
    UiButtonIconOnlyDirective,
  ],
  templateUrl: './media-item-quiet-actions.component.html',
  styleUrl: './media-item-quiet-actions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaItemQuietActionsComponent {
  readonly selected = input(false);
  readonly disabled = input(false);
  readonly mapDisabled = input(false);
  readonly selectLabel = input('');
  readonly mapLabel = input('');

  readonly selectRequested = output<void>();
  readonly mapRequested = output<void>();

  onSelectClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) {
      return;
    }
    this.selectRequested.emit();
  }

  onMapClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled() || this.mapDisabled()) {
      return;
    }
    this.mapRequested.emit();
  }
}
