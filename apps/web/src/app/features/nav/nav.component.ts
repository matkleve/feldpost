/**
 * NavComponent — LeftSidebar: floating sidebar panel (desktop) or
 * bottom tab bar (mobile < 768 px).
 *
 * M-UI2: App Shell & Navigation
 *
 * Design: Claude-inspired frosted glass, vertically centred compact rail on the
 * left edge. At rest, nav items are square icon buttons. On hover, the rail
 * expands right and reveals labels without shifting icon alignment. Uses Google
 * Material Icons.
 *
 * Ground rules:
 *  - Standalone component; imports only what the template uses.
 *  - AuthService.user() provides the email initial for the avatar slot.
 *  - Disabled nav items are non-interactive (pointer-events: none) and carry
 *    aria-disabled="true" for accessibility.
 *  - routerLinkActive uses exact matching for '/' to avoid it always being active.
 */

import { Component, HostListener, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { SettingsPaneService } from '../../core/settings-pane/settings-pane.service';
import {
  buildSettingsUrl,
  parseSettingsUrl,
  resolveShellSegmentsFromUrl,
  stripSettingsSuffix,
} from '../../core/settings-pane/settings-url.helpers';
import {
  resolveAuthenticatedActiveShell,
} from '../../layout/authenticated-shell-active.helpers';

export interface NavItem {
  /** Google Material Icon ligature name (e.g. 'map', 'perm_media'). */
  icon: string;
  label: string;
  route: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
})
export class NavComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly i18nService = inject(I18nService);
  private readonly settingsPaneService = inject(SettingsPaneService);
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

  /** Nav items in display order. Items with disabled: true are visually greyed
   *  out and non-interactive — reserved for future features. */
  readonly navItems = computed<NavItem[]>(() => [
    { icon: 'map', label: this.t('nav.item.map', 'Map'), route: '/' },
    { icon: 'perm_media', label: this.t('nav.item.media', 'Media'), route: '/media' },
    { icon: 'folder', label: this.t('nav.item.projects', 'Projects'), route: '/projects' },
    { icon: 'groups', label: this.t('nav.item.colleagues', 'Colleagues'), route: '/colleagues' },
    { icon: 'business', label: this.t('nav.item.organization', 'Organization'), route: '/organization' },
  ]);

  /** Map shell uses `/`, `/map`, and `/map/settings/...` — not only `/`. */
  isNavItemActive(item: NavItem): boolean {
    const shell = this.activeShell();
    if (item.route === '/') {
      return shell === 'map';
    }
    if (item.route === '/media') {
      return shell === 'media';
    }
    if (item.route === '/projects') {
      return shell === 'projects';
    }
    if (item.route === '/colleagues') {
      return shell === 'colleagues';
    }
    if (item.route === '/organization') {
      return shell === 'organization';
    }
    return false;
  }

  readonly settingsOverlayOpen = this.settingsPaneService.open;

  /** Sidebar account row label — always Settings (avatar initial only shows identity). */
  readonly accountSidebarLabel = computed(() => this.t('nav.settings.label', 'Settings'));

  readonly avatarName = computed<string>(() => {
    const user = this.authService.user();
    const fullName = user?.user_metadata?.['full_name'];

    if (typeof fullName === 'string' && fullName.trim().length > 0) {
      return fullName.trim();
    }

    const email = user?.email;
    if (typeof email === 'string' && email.includes('@')) {
      return email.split('@')[0];
    }

    return '';
  });

  readonly avatarUrl = computed<string | null>(() => {
    const avatarUrl = this.authService.user()?.user_metadata?.['avatar_url'];
    return typeof avatarUrl === 'string' && avatarUrl.trim().length > 0 ? avatarUrl : null;
  });

  /** First letter of the authenticated user's display name, upper-cased.
   *  Falls back to '?' if no user is signed in. */
  readonly avatarInitial = computed<string>(() => {
    const name = this.avatarName();
    return name.length === 0 ? '?' : name[0].toUpperCase();
  });

  toggleSettingsOverlay(): void {
    const url = this.router.url;

    if (this.settingsPaneService.open()) {
      this.settingsPaneService.close();
      if (parseSettingsUrl(url)) {
        void this.router.navigateByUrl(stripSettingsSuffix(url));
      }
      return;
    }

    const shellSegments = resolveShellSegmentsFromUrl(url);
    void this.router.navigateByUrl(buildSettingsUrl(shellSegments));
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.settingsOverlayOpen()) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const clickedInsideSidebar = target.closest('.sidebar') !== null;
    const clickedInsideSettingsPane = target.closest('.settings-overlay') !== null;

    if (!clickedInsideSidebar && !clickedInsideSettingsPane) {
      this.settingsPaneService.close();
      const url = this.router.url;
      if (parseSettingsUrl(url)) {
        void this.router.navigateByUrl(stripSettingsSuffix(url));
      }
    }
  }
}
