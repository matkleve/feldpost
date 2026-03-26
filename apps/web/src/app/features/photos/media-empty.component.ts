import { Component } from '@angular/core';
import { inject } from '@angular/core';
import { input } from '@angular/core';
import { output } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import {
  UiButtonDirective,
  UiButtonSecondaryDirective,
} from '../../shared/ui-primitives/ui-primitives.directive';

@Component({
  selector: 'app-media-empty',
  standalone: true,
  imports: [UiButtonDirective, UiButtonSecondaryDirective],
  templateUrl: './media-empty.component.html',
  styleUrl: './media-empty.component.scss',
})
export class MediaEmptyComponent {
  readonly reason = input<'auth-required' | 'no-results'>('no-results');
  readonly retry = output<void>();

  private readonly router = inject(Router);
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback: string): string => {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  };

  titleText(): string {
    if (this.reason() === 'auth-required') {
      return this.t('media.page.empty.authRequired.title', 'Sign in required');
    }

    return this.t('media.page.empty', 'No media found');
  }

  bodyText(): string {
    if (this.reason() === 'auth-required') {
      return this.t('media.page.empty.authRequired.body', 'You need to sign in to view media.');
    }

    return this.t('media.page.empty.org.body', 'No media is available for your organization yet.');
  }

  actionLabel(): string {
    if (this.reason() === 'auth-required') {
      return this.t('auth.login.action.signIn', 'Sign in');
    }

    return this.t('media.page.retry', 'Retry');
  }

  onPrimaryAction(): void {
    if (this.reason() === 'auth-required') {
      void this.router.navigate(['/auth/login']);
      return;
    }

    this.retry.emit();
  }
}
