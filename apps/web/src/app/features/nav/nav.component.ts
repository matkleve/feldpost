import { Component, HostListener, HostBinding, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { ThemeService } from '../../core/theme/theme.service';
import { SettingsPaneService } from '../../core/settings-pane/settings-pane.service';
import {
  buildSettingsUrl,
  parseSettingsUrl,
  resolveShellSegmentsFromUrl,
  stripSettingsSuffix,
} from '../../core/settings-pane/settings-url.helpers';
import { resolveAuthenticatedActiveShell } from '../../layout/authenticated-shell-active.helpers';
import { MapShellBasemapService } from '../map/map-shell/leaflet/map-shell-basemap.service';
import { MapShellInstanceService } from '../map/map-shell/component/map-shell-instance.service';

export interface NavItem {
  icon: string;
  label: string;
  route: string;
  disabled?: boolean;
}

const COLLAPSED_STORAGE_KEY = 'feldpost.ui.sidebarCollapsed';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
  host: {
    '[class.nav--collapsed]': 'sidebarCollapsed()',
  },
})
export class NavComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly i18nService = inject(I18nService);
  private readonly settingsPaneService = inject(SettingsPaneService);
  readonly themeService = inject(ThemeService);
  readonly basemapService = inject(MapShellBasemapService);
  private readonly mapShellInstance = inject(MapShellInstanceService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  private readonly activeShell = computed(() => resolveAuthenticatedActiveShell(this.currentUrl()));

  readonly sidebarCollapsed = signal<boolean>(
    typeof window !== 'undefined'
      ? window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true'
      : false,
  );

  toggleCollapse(): void {
    const next = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
    }
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  toggleBasemap(): void {
    this.basemapService.toggle(this.mapShellInstance.map);
  }

  readonly navItems = computed<NavItem[]>(() => [
    { icon: 'map', label: this.t('nav.item.map', 'Map'), route: '/' },
    { icon: 'perm_media', label: this.t('nav.item.media', 'Media'), route: '/media' },
    { icon: 'folder', label: this.t('nav.item.projects', 'Projects'), route: '/projects' },
    { icon: 'groups', label: this.t('nav.item.colleagues', 'Colleagues'), route: '/colleagues' },
    { icon: 'business', label: this.t('nav.item.organization', 'Organization'), route: '/organization' },
  ]);

  isNavItemActive(item: NavItem): boolean {
    const shell = this.activeShell();
    if (item.route === '/') return shell === 'map';
    if (item.route === '/media') return shell === 'media';
    if (item.route === '/projects') return shell === 'projects';
    if (item.route === '/colleagues') return shell === 'colleagues';
    if (item.route === '/organization') return shell === 'organization';
    return false;
  }

  readonly settingsOverlayOpen = this.settingsPaneService.open;

  readonly accountSidebarLabel = computed(() => this.t('nav.settings.label', 'Settings'));

  readonly avatarName = computed<string>(() => {
    const user = this.authService.user();
    const fullName = user?.user_metadata?.['full_name'];
    if (typeof fullName === 'string' && fullName.trim().length > 0) return fullName.trim();
    const email = user?.email;
    if (typeof email === 'string' && email.includes('@')) return email.split('@')[0];
    return '';
  });

  readonly avatarUrl = computed<string | null>(() => {
    const avatarUrl = this.authService.user()?.user_metadata?.['avatar_url'];
    return typeof avatarUrl === 'string' && avatarUrl.trim().length > 0 ? avatarUrl : null;
  });

  readonly avatarInitial = computed<string>(() => {
    const name = this.avatarName();
    return name.length === 0 ? '?' : name[0].toUpperCase();
  });

  toggleSettingsOverlay(): void {
    const url = this.router.url;
    if (this.settingsPaneService.open()) {
      this.settingsPaneService.close();
      if (parseSettingsUrl(url)) void this.router.navigateByUrl(stripSettingsSuffix(url));
      return;
    }
    const shellSegments = resolveShellSegmentsFromUrl(url);
    void this.router.navigateByUrl(buildSettingsUrl(shellSegments));
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.settingsOverlayOpen()) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const clickedInsideSidebar = target.closest('.sidebar') !== null;
    const clickedInsideSettingsPane = target.closest('.settings-overlay') !== null;
    if (!clickedInsideSidebar && !clickedInsideSettingsPane) {
      this.settingsPaneService.close();
      const url = this.router.url;
      if (parseSettingsUrl(url)) void this.router.navigateByUrl(stripSettingsSuffix(url));
    }
  }
}
