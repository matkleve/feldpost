import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapAdapter } from '../../../core/map/map-adapter';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ToastService } from '../../../core/toast/toast.service';
import { truncateToastTechnicalDetail } from '../../../core/toast/toast.helpers';

/**
 * Floating GPS Button that centers the map on the user's current location.
 * States: idle | seeking | active
 */
@Component({
  selector: 'ss-gps-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gps-button.component.html',
  styleUrls: ['./gps-button.component.scss'],
  host: {
    '[class.seeking]': "gpsState() === 'seeking'",
    '[class.active]': "gpsState() === 'active'",
    '[class.idle]': "gpsState() === 'idle'",
    tabindex: '0',
    'aria-label': 'Center map on your location',
    role: 'button',
  },
})
export class GpsButtonComponent {
  /** 'idle' | 'seeking' | 'active' */
  readonly gpsState = signal<'idle' | 'seeking' | 'active'>('idle');

  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);
  private readonly map = inject(MapAdapter);

  async onClick() {
    if (this.gpsState() === 'idle') {
      this.gpsState.set('seeking');
      try {
        const coords = await this.map.getCurrentPosition();
        this.map.panTo(coords);
        // User Location Marker handled by MapAdapter
        this.gpsState.set('active');
      } catch (e: unknown) {
        const rawMessage = e instanceof Error && e.message ? e.message : undefined;
        this.toast.show({
          type: 'error',
          title: this.i18n.t('map.gps.toast.locationFailed.title', 'Could not get your location'),
          body: this.i18n.t(
            'map.gps.toast.locationFailed.body',
            'Check browser location permission and try again.',
          ),
          detail: rawMessage ? truncateToastTechnicalDetail(rawMessage) : undefined,
          codeRef: { file: 'gps-button.component.ts', fn: 'onClick' },
          dedupe: true,
        });
        this.gpsState.set('idle');
      }
    } else if (this.gpsState() === 'active') {
      // Stop tracking
      this.gpsState.set('idle');
    }
  }
}
