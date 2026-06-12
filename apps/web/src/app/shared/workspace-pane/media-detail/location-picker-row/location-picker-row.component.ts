/**
 * Two-line picker row content (format D) — icon + primary + optional secondary.
 *
 * @see docs/specs/ui/media-detail/media-detail-location-section.md
 */
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-location-picker-row',
  standalone: true,
  templateUrl: './location-picker-row.component.html',
  styleUrls: ['./location-picker-row.component.scss'],
})
export class LocationPickerRowComponent {
  readonly primary = input.required<string>();
  readonly secondary = input('');
  readonly icon = input.required<string>();
}
