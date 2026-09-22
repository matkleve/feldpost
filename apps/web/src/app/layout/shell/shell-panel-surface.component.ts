import { Component, inject, input } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { ShellLayoutService } from '../../core/shell-layout/shell-layout.service';
import type { ShellPanelId } from '../../core/shell-layout/shell-layout.types';

/** One frosted panel. Upload and Help are the only ids in this window. */
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
    return this.panelId() === 'upload'
      ? this.t('shell.panel.upload.title', 'Upload')
      : this.t('shell.panel.help.title', 'Help');
  }

  close(): void {
    this.shellLayout.close(this.panelId());
  }
}
