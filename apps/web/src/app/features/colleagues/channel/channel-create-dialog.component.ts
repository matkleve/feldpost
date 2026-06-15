import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../../core/i18n/i18n.service';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import { HLM_INPUT_IMPORTS } from '../../../shared/ui/input';

@Component({
  selector: 'app-channel-create-dialog',
  standalone: true,
  imports: [FormsModule, ...HLM_BUTTON_IMPORTS, ...HLM_INPUT_IMPORTS],
  templateUrl: './channel-create-dialog.component.html',
  styleUrl: './channel-create-dialog.component.scss',
})
export class ChannelCreateDialogComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly confirmed = output<{ name: string; type: 'public' | 'private' }>();
  readonly cancelled = output<void>();

  readonly name = signal('');
  readonly isPrivate = signal(false);
  readonly open = signal(false);

  show(): void {
    this.name.set('');
    this.isPrivate.set(false);
    this.open.set(true);
  }

  hide(): void {
    this.open.set(false);
    this.cancelled.emit();
  }

  onConfirm(): void {
    const value = this.name().trim();
    if (!value) return;
    this.confirmed.emit({ name: value, type: this.isPrivate() ? 'private' : 'public' });
    this.open.set(false);
  }
}
