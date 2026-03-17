import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService, MfaFactorViewModel } from '../../core/auth.service';
import { UserProfileService } from '../../core/user-profile.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
    selector: 'app-account',
    standalone: true,
    imports: [ConfirmDialogComponent],
    templateUrl: './account.component.html',
    styleUrl: './account.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly userProfileService = inject(UserProfileService);
    private readonly toastService = inject(ToastService);

    readonly loading = signal(true);
    readonly savingProfile = signal(false);
    readonly updatingEmail = signal(false);
    readonly updatingPassword = signal(false);
    readonly sendingReset = signal(false);
    readonly mfaBusy = signal(false);
    readonly deletingAccount = signal(false);

    readonly fullName = signal('');
    readonly roleNames = signal<string[]>([]);
    readonly organizationId = signal<string | null>(null);
    readonly pendingDisplayName = signal('');
    readonly pendingEmail = signal('');
    readonly currentPassword = signal('');
    readonly nextPassword = signal('');
    readonly confirmPassword = signal('');

    readonly mfaFactors = signal<MfaFactorViewModel[]>([]);
    readonly assuranceLevel = signal<'aal1' | 'aal2' | null>(null);
    readonly mfaEnrollFactorId = signal<string | null>(null);
    readonly mfaQrCode = signal<string | null>(null);
    readonly mfaSecret = signal<string | null>(null);
    readonly mfaCode = signal('');

    readonly logoutConfirmOpen = signal(false);
    readonly deleteConfirmOpen = signal(false);
    readonly deletePhrase = signal('');

    readonly userEmail = computed(() => this.authService.user()?.email ?? '');
    readonly roleBadgeLabel = computed(() => this.roleNames()[0] ?? 'User');
    readonly displayName = computed(() => {
        const value = this.fullName().trim();
        if (value.length > 0) return value;
        const email = this.userEmail().trim();
        if (email.length > 0) return email;
        return 'Unknown user';
    });
    readonly canConfirmDelete = computed(() => this.deletePhrase().trim().toUpperCase() === 'DELETE');

    async ngOnInit(): Promise<void> {
        await this.reloadAccountData();
    }

    async saveDisplayName(): Promise<void> {
        const nextName = this.pendingDisplayName().trim();
        if (nextName.length < 2) {
            this.toastService.show({ message: 'Name muss mindestens 2 Zeichen haben.', type: 'error' });
            return;
        }

        this.savingProfile.set(true);
        const { error } = await this.userProfileService.updateDisplayName(nextName);
        this.savingProfile.set(false);

        if (error) {
            this.toastService.show({ message: error.message, type: 'error' });
            return;
        }

        this.fullName.set(nextName);
        this.toastService.show({ message: 'Name gespeichert.', type: 'success', dedupe: true });
    }

    async updateEmail(): Promise<void> {
        const email = this.pendingEmail().trim();
        if (!this.isValidEmail(email)) {
            this.toastService.show({ message: 'Bitte gültige E-Mail eingeben.', type: 'error' });
            return;
        }

        this.updatingEmail.set(true);
        const result = await this.authService.updateEmail(email);
        this.updatingEmail.set(false);

        if (result.error) {
            this.toastService.show({ message: result.error.message, type: 'error' });
            return;
        }

        this.toastService.show({
            message: 'Bestätigung für die neue E-Mail wurde versendet.',
            type: 'success',
            dedupe: true,
        });
    }

    async updatePassword(): Promise<void> {
        const current = this.currentPassword().trim();
        const next = this.nextPassword().trim();
        const confirm = this.confirmPassword().trim();

        if (current.length === 0) {
            this.toastService.show({ message: 'Bitte aktuelles Passwort eingeben.', type: 'error' });
            return;
        }

        if (next.length < 6) {
            this.toastService.show({ message: 'Neues Passwort muss mindestens 6 Zeichen haben.', type: 'error' });
            return;
        }

        if (next !== confirm) {
            this.toastService.show({ message: 'Neue Passwörter stimmen nicht überein.', type: 'error' });
            return;
        }

        this.updatingPassword.set(true);
        const reauthResult = await this.authService.reauthenticate();
        if (reauthResult.error) {
            this.updatingPassword.set(false);
            this.toastService.show({
                message: 'Re-Authentifizierung erforderlich. Prüfe deine E-Mails und versuche es erneut.',
                type: 'error',
            });
            return;
        }

        const result = await this.authService.updatePassword(next);
        this.updatingPassword.set(false);

        if (result.error) {
            this.toastService.show({ message: result.error.message, type: 'error' });
            return;
        }

        this.currentPassword.set('');
        this.nextPassword.set('');
        this.confirmPassword.set('');
        this.toastService.show({ message: 'Passwort aktualisiert.', type: 'success', dedupe: true });
    }

    async sendPasswordReset(): Promise<void> {
        const email = this.userEmail();
        if (!email) {
            this.toastService.show({ message: 'Keine E-Mail im Konto verfügbar.', type: 'error' });
            return;
        }

        this.sendingReset.set(true);
        const result = await this.authService.resetPasswordForEmail(email);
        this.sendingReset.set(false);

        if (result.error) {
            this.toastService.show({ message: result.error.message, type: 'error' });
            return;
        }

        this.toastService.show({
            message: 'Wenn das Konto existiert, wurde eine Reset-Mail versendet.',
            type: 'info',
            dedupe: true,
        });
    }

    async startTotpEnrollment(): Promise<void> {
        this.mfaBusy.set(true);
        const result = await this.authService.mfaEnrollTotp('Feldpost Authenticator');
        this.mfaBusy.set(false);

        if (result.error) {
            this.toastService.show({ message: result.error.message, type: 'error' });
            return;
        }

        this.mfaEnrollFactorId.set(result.factorId);
        this.mfaQrCode.set(result.qrCode);
        this.mfaSecret.set(result.secret);
        this.mfaCode.set('');
    }

    async verifyTotpEnrollment(): Promise<void> {
        const factorId = this.mfaEnrollFactorId();
        const code = this.mfaCode().trim();
        if (!factorId || code.length < 6) {
            this.toastService.show({ message: 'Bitte gültigen 2FA-Code eingeben.', type: 'error' });
            return;
        }

        this.mfaBusy.set(true);
        const result = await this.authService.mfaChallengeAndVerifyTotp(factorId, code);
        this.mfaBusy.set(false);

        if (result.error) {
            this.toastService.show({ message: result.error.message, type: 'error' });
            return;
        }

        this.mfaEnrollFactorId.set(null);
        this.mfaQrCode.set(null);
        this.mfaSecret.set(null);
        this.mfaCode.set('');
        await this.reloadSecurityState();
        this.toastService.show({ message: '2FA erfolgreich aktiviert.', type: 'success', dedupe: true });
    }

    async removeFactor(factorId: string): Promise<void> {
        this.mfaBusy.set(true);
        const result = await this.authService.mfaUnenroll(factorId);
        this.mfaBusy.set(false);

        if (result.error) {
            this.toastService.show({ message: result.error.message, type: 'error' });
            return;
        }

        await this.reloadSecurityState();
        this.toastService.show({ message: '2FA-Faktor entfernt.', type: 'success', dedupe: true });
    }

    openLogoutConfirm(): void {
        this.logoutConfirmOpen.set(true);
    }

    closeLogoutConfirm(): void {
        this.logoutConfirmOpen.set(false);
    }

    async confirmLogout(): Promise<void> {
        this.logoutConfirmOpen.set(false);
        await this.authService.signOut();
    }

    openDeleteConfirm(): void {
        this.deletePhrase.set('');
        this.deleteConfirmOpen.set(true);
    }

    closeDeleteConfirm(): void {
        this.deleteConfirmOpen.set(false);
    }

    async confirmDeleteAccount(): Promise<void> {
        if (!this.canConfirmDelete()) return;

        this.deletingAccount.set(true);
        const result = await this.authService.deleteOwnAccount();
        this.deletingAccount.set(false);

        if (result.error) {
            this.toastService.show({ message: result.error.message, type: 'error' });
            return;
        }

        this.deleteConfirmOpen.set(false);
        this.toastService.show({
            message: 'Konto wurde gelöscht. Du wirst abgemeldet.',
            type: 'success',
            dedupe: true,
        });

        try {
            await this.authService.signOut();
        } catch {
            // Session may already be invalidated after account deletion.
        }
    }

    asQrDataUrl(qrSvg: string | null): string | null {
        if (!qrSvg) return null;
        return `data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}`;
    }

    private async reloadAccountData(): Promise<void> {
        this.loading.set(true);

        const profileResult = await this.userProfileService.getOwnProfile();
        if (profileResult.error) {
            this.toastService.show({ message: profileResult.error.message, type: 'error' });
        } else if (profileResult.data) {
            this.fullName.set(profileResult.data.fullName);
            this.pendingDisplayName.set(profileResult.data.fullName);
            this.roleNames.set(profileResult.data.roles);
            this.organizationId.set(profileResult.data.organizationId);
        }

        this.pendingEmail.set(this.userEmail());
        await this.reloadSecurityState();

        this.loading.set(false);
    }

    private async reloadSecurityState(): Promise<void> {
        const [factorResult, assuranceResult] = await Promise.all([
            this.authService.mfaListFactors(),
            this.authService.getAuthenticatorAssuranceLevel(),
        ]);

        if (factorResult.error) {
            this.toastService.show({ message: factorResult.error.message, type: 'error', dedupe: true });
        } else {
            this.mfaFactors.set(factorResult.factors);
        }

        if (assuranceResult.error) {
            this.assuranceLevel.set(null);
        } else {
            this.assuranceLevel.set(assuranceResult.currentLevel);
        }
    }

    private isValidEmail(value: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
}
