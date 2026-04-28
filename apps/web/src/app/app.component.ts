import type { OnInit } from '@angular/core';
import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { NavComponent } from './features/nav/nav.component';
import { ToastContainerComponent } from './shared/toast/toast-container.component';
import { LocationResolverService } from './core/location-resolver/location-resolver.service';
import { AuthService } from './core/auth/auth.service';
import { SettingsOverlayComponent } from './features/settings-overlay/settings-overlay.component';
import { SettingsPaneService } from './core/settings-pane/settings-pane.service';
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

type SettingsSectionId =
  | 'general'
  | 'appearance'
  | 'notifications'
  | 'map'
  | 'search'
  | 'data'
  | 'account'
  | 'invite-management';

declare global {
  interface Window {
    __feldpostI18n?: I18nDevCommands;
  }
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavComponent, SettingsOverlayComponent, ToastContainerComponent],
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
  private lastNonSettingsUrl = '/';

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
      const settingsTarget = this.parseSettingsUrl(url);

      if (settingsTarget) {
        this.settingsPaneService.openFromRoute(settingsTarget.section, settingsTarget.subsection);
        return;
      }

      if (!url.startsWith('/auth')) {
        this.lastNonSettingsUrl = url;
      }
    });

    effect(() => {
      const onSettingsRoute = this.parseSettingsUrl(this.currentUrl()) !== null;
      const overlayOpen = this.settingsOverlayOpen();

      if (onSettingsRoute && !overlayOpen) {
        void this.router.navigateByUrl(this.lastNonSettingsUrl || '/');
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

  private parseSettingsUrl(
    url: string,
  ): { section: SettingsSectionId | null; subsection: string | null } | null {
    const parsedUrl = this.router.parseUrl(url);
    const segments =
      parsedUrl.root.children['primary']?.segments.map((segment) => segment.path) ?? [];

    if (segments[0] !== 'settings') {
      return null;
    }

    const section = this.normalizeSettingsSection(segments[1] ?? null);
    const subsection = this.normalizeSubsection(segments[2] ?? null);

    return { section, subsection };
  }

  private normalizeSettingsSection(section: string | null): SettingsSectionId | null {
    if (!section) {
      return null;
    }

    if (
      section === 'general' ||
      section === 'appearance' ||
      section === 'notifications' ||
      section === 'map' ||
      section === 'search' ||
      section === 'data' ||
      section === 'account' ||
      section === 'invite-management'
    ) {
      return section;
    }

    return null;
  }

  private normalizeSubsection(subsection: string | null): string | null {
    if (!subsection) {
      return null;
    }

    const normalized = subsection.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }
}
