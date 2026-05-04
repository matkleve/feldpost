import { Component, inject, output, signal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import type {
  ShareAudienceDialogResult,
  ShareLinkAudience,
} from '../../core/share-set/share-set.types';
import { parseRecipientUserIdsFromCommaSeparatedInput } from '../../core/share-set/share-set.helpers';
import {
  UiButtonDirective,
  UiButtonPrimaryDirective,
} from '../ui-primitives/ui-primitives.directive';

/**
 * Stable state: dialog open — user chooses share audience before link creation.
 * @see docs/specs/component/workspace/share-link-audience-dialog.md
 */
@Component({
  selector: 'app-share-link-audience-dialog',
  standalone: true,
  imports: [UiButtonDirective, UiButtonPrimaryDirective],
  templateUrl: './share-link-audience-dialog.component.html',
  styleUrl: './share-link-audience-dialog.component.scss',
})
export class ShareLinkAudienceDialogComponent {
  private readonly i18n = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18n.t(key, fallback);

  readonly confirmed = output<ShareAudienceDialogResult>();
  readonly cancelled = output<void>();

  readonly audience = signal<ShareLinkAudience>('public');
  readonly namedRecipientsRaw = signal('');
  readonly inlineError = signal<string | null>(null);

  setAudience(value: ShareLinkAudience): void {
    this.audience.set(value);
    this.inlineError.set(null);
  }

  onCancel(): void {
    this.inlineError.set(null);
    this.cancelled.emit();
  }

  onConfirm(): void {
    const aud = this.audience();
    if (aud === 'named') {
      const parsed = parseRecipientUserIdsFromCommaSeparatedInput(this.namedRecipientsRaw());
      if (!parsed.ok) {
        this.inlineError.set(
          this.t(
            'workspace.shareAudience.error.invalidRecipients',
            'Enter one or more valid user IDs separated by commas.',
          ),
        );
        return;
      }
      if (parsed.ids.length === 0) {
        this.inlineError.set(
          this.t(
            'workspace.shareAudience.error.namedRequiresRecipients',
            'Named links need at least one recipient user ID.',
          ),
        );
        return;
      }
      this.inlineError.set(null);
      this.confirmed.emit({
        audience: 'named',
        shareGrant: 'view',
        recipientUserIds: parsed.ids,
      });
      return;
    }

    this.inlineError.set(null);
    this.confirmed.emit({
      audience: aud,
      shareGrant: 'view',
      recipientUserIds: [],
    });
  }
}
