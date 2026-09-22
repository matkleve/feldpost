import { Component, inject, input } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { ShellLayoutService } from '../../core/shell-layout/shell-layout.service';
import type { ShellPanelId } from '../../core/shell-layout/shell-layout.types';

/** One frosted panel. The right rail chooses which ids are open. */
@Component({
  selector: 'app-shell-panel-surface',
  standalone: true,
  templateUrl: './shell-panel-surface.component.html',
  styleUrl: './shell-panel-surface.component.scss',
})
export class ShellPanelSurfaceComponent {
  private readonly shellLayout = inject(ShellLayoutService);
  private readonly i18n = inject(I18nService);

  readonly panelId = input.required<ShellPanelId>();

  readonly t = (key: string, fallback = ''): string => this.i18n.t(key, fallback);

  title(): string {
    const titles: Record<ShellPanelId, readonly [string, string]> = {
      notifications: ['shell.panel.notifications.title', 'Notifications'],
      upload: ['shell.panel.upload.title', 'Upload'],
      download: ['shell.panel.download.title', 'Download'],
      'shared-media': ['shell.panel.sharedMedia.title', 'Shared media'],
      tips: ['shell.panel.tips.title', 'Tips'],
      help: ['shell.panel.help.title', 'Help'],
    };
    const [key, fallback] = titles[this.panelId()];
    return this.t(key, fallback);
  }

  close(): void {
    this.shellLayout.close(this.panelId());
  }
}
