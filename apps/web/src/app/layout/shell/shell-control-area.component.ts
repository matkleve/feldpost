import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { I18nService } from '../../core/i18n/i18n.service';
import {
  buildSettingsUrl,
  resolveShellSegmentsFromUrl,
} from '../../core/settings-pane/settings-url.helpers';
import { ShellLayoutService } from '../../core/shell-layout/shell-layout.service';
import { resolveAuthenticatedActiveShell } from '../authenticated-shell-active.helpers';
import { ShellControlContainerComponent } from './shell-control-container.component';
import {
  shellControlGroups,
  type ShellControlOptionModel,
  type ShellControlSide,
} from './shell-control.types';

/** Backgroundless rail. Left changes the canvas. Right toggles panels. */
@Component({
  selector: 'app-shell-control-area',
  standalone: true,
  imports: [ShellControlContainerComponent],
  templateUrl: './shell-control-area.component.html',
  styleUrl: './shell-control-area.component.scss',
  host: {
    '[attr.data-side]': 'side()',
  },
})
export class ShellControlAreaComponent {
  private readonly router = inject(Router);
  private readonly shellLayout = inject(ShellLayoutService);
  private readonly i18n = inject(I18nService);

  readonly side = input.required<ShellControlSide>();
  readonly logoOptions: readonly ShellControlOptionModel[] = [];

  readonly t = (key: string, fallback = ''): string => this.i18n.t(key, fallback);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly groups = computed(() => shellControlGroups(this.side()));
  readonly openIds = computed(() => this.shellLayout.openPanels().map((panel) => panel.id));
  readonly activeId = computed(() => {
    if (this.side() !== 'left') return null;
    return resolveAuthenticatedActiveShell(this.url());
  });

  onChosen(option: ShellControlOptionModel): void {
    if (option.kind === 'panel' && option.panelId) {
      this.shellLayout.setOpen(option.panelId, !this.shellLayout.isOpen(option.panelId));
      return;
    }
    if (option.kind === 'canvas' && option.route) {
      void this.router.navigateByUrl(option.route);
      return;
    }
    if (option.kind === 'account' || option.kind === 'settings') {
      const segments = resolveShellSegmentsFromUrl(this.router.url);
      const section = option.kind === 'account' ? 'account' : null;
      void this.router.navigateByUrl(buildSettingsUrl(segments, section));
    }
  }
}
