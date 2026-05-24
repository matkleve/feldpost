import type { OnInit } from '@angular/core';
import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { SettingsOverlayComponent } from './features/settings-overlay/settings-overlay.component';
import { ToastContainerComponent } from './shared/toast/toast-container.component';
import { LocationResolverService } from './core/location-resolver/location-resolver.service';
import { AuthService } from './core/auth/auth.service';
import { SettingsPaneService } from './core/settings-pane/settings-pane.service';
import {
  parseSettingsUrl,
  stripSettingsSuffix,
} from './core/settings-pane/settings-url.helpers';
import { UploadNotificationService } from './core/upload/upload-notification.service';
import { DbTranslationService } from './core/i18n/db-translation.service';
import { DomTranslationService } from './core/i18n/dom-translation.service';
import { environment } from '../environments/environment';

const LEGACY_I18N_FALLBACK_STORAGE_KEY = 'feldpost.i18n.enableLegacyFallback';

interface I18nDevCommands {
  enableLegacyFallback: () => void;
  disableLegacyFallback: () => void;
  clearLegacyFallbackOverride: () => void;
  status: () => {
    environmentDefault: boolean;
    localStorageOverride: 'true' | 'false' | null;
  };
}

declare global {
  interface Window {
    __feldpostI18n?: I18nDevCommands;
  }
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SettingsOverlayComponent, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly locationResolver = inject(LocationResolverService);
  private readonly auth = inject(AuthService);
  private readonly settingsPaneService = inject(SettingsPaneService);
  private readonly uploadNotifications = inject(UploadNotificationService);
  private readonly dbTranslationService = inject(DbTranslationService);
  private readonly domTranslationService = inject(DomTranslationService);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly showNav = computed(() => !this.currentUrl().startsWith('/auth'));
  readonly settingsOverlayOpen = this.settingsPaneService.open;

  constructor() {
    effect(() => {
      const url = this.currentUrl();
      const settingsTarget = parseSettingsUrl(url);

      if (settingsTarget) {
        this.settingsPaneService.openFromRoute(settingsTarget.section, settingsTarget.subsection);
        return;
      }

      if (this.settingsPaneService.open()) {
        this.settingsPaneService.close();
      }
    });

    effect(() => {
      const url = this.currentUrl();
      const onSettingsRoute = parseSettingsUrl(url) !== null;
      const overlayOpen = this.settingsPaneService.open();

      if (onSettingsRoute && !overlayOpen) {
        void this.router.navigateByUrl(stripSettingsSuffix(url));
      }
    });
  }

  onSettingsOverlayOpenChange(open: boolean): void {
    this.settingsPaneService.setOpen(open);
  }

  ngOnInit(): void {
    // Ensure root-level upload error notifications are active.
    void this.uploadNotifications;
    this.exposeI18nDevCommands();
    this.domTranslationService.start();
    void this.dbTranslationService.preload();

    // Start background location resolution once the user is authenticated.
    // Runs at ~1 req/sec through all unresolved images — non-blocking.
    if (this.auth.user()) {
      this.locationResolver.startBackgroundResolution();
    }
  }

  private exposeI18nDevCommands(): void {
    if (environment.production || typeof window === 'undefined') {
      return;
    }

    window.__feldpostI18n = {
      enableLegacyFallback: () => this.setLegacyFallbackOverride(true),
      disableLegacyFallback: () => this.setLegacyFallbackOverride(false),
      clearLegacyFallbackOverride: () => this.setLegacyFallbackOverride(null),
      status: () => ({
        environmentDefault: environment.i18n.enableLegacyDomFallback,
        localStorageOverride:
          (window.localStorage.getItem(LEGACY_I18N_FALLBACK_STORAGE_KEY) as
            | 'true'
            | 'false'
            | null) ?? null,
      }),
    };
  }

  private setLegacyFallbackOverride(value: boolean | null): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (value === null) {
      window.localStorage.removeItem(LEGACY_I18N_FALLBACK_STORAGE_KEY);
    } else {
      window.localStorage.setItem(LEGACY_I18N_FALLBACK_STORAGE_KEY, String(value));
    }

    window.location.reload();
  }
}
