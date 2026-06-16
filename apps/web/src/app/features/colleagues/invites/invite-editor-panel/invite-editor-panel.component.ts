import { CommonModule } from '@angular/common';
import type { ElementRef, OnDestroy, OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toCanvas } from 'qrcode';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { InvitesService } from '../../../../core/invites/invites.service';
import {
  DISPLAY_NAME_MAX_LENGTH,
  buildValidityPresets,
} from '../../../../core/invites/invites.helpers';
import type {
  CreateReusableInvitePayload,
  InviteComposeKind,
  InviteEditorMode,
  InviteOpenContext,
  InvitePanelMode,
  InviteStatus,
  InviteTargetRole,
  QrInviteViewModel,
  ReusableInviteEditDraft,
  UpdateReusableInvitePayload,
  ValidityPreset,
} from '../../../../core/invites/invites.types';
import type { ChipVariant } from '../../../../shared/components/chip/chip.component';
import { ChipComponent } from '../../../../shared/components/chip/chip.component';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';
import { HLM_FORM_FIELD_IMPORTS } from '../../../../shared/ui/form-field';
import { HLM_INPUT_IMPORTS } from '../../../../shared/ui/input';
import { HLM_LABEL_IMPORTS } from '../../../../shared/ui/label';
import { HLM_SELECT_IMPORTS } from '../../../../shared/ui/select';
import { HLM_SWITCH_IMPORTS } from '../../../../shared/ui/switch';
import { BrnToggleGroupImports, type ToggleValue } from '@spartan-ng/brain/toggle-group';
import { HLM_TOGGLE_GROUP_IMPORTS } from '../../../../shared/ui/toggle-group';
import { toggleSingleStringValue } from '../../../../shared/ui/toggle-group/toggle-group-option.helpers';

@Component({
  selector: 'app-invite-editor-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChipComponent,
    ...HLM_BUTTON_IMPORTS,
    ...HLM_FORM_FIELD_IMPORTS,
    ...HLM_INPUT_IMPORTS,
    ...HLM_LABEL_IMPORTS,
    ...HLM_SELECT_IMPORTS,
    ...HLM_SWITCH_IMPORTS,
    BrnToggleGroupImports,
    ...HLM_TOGGLE_GROUP_IMPORTS,
  ],
  templateUrl: './invite-editor-panel.component.html',
  styleUrl: './invite-editor-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex min-h-0 min-w-0 flex-col',
  },
})
export class InviteEditorPanelComponent implements OnInit, OnDestroy {
  private readonly inviteService = inject(InvitesService);
  private readonly i18nService = inject(I18nService);

  private expirationTimer: ReturnType<typeof setInterval> | null = null;
  private qrRenderSequence = 0;

  readonly roleSelect = viewChild<ElementRef<HTMLSelectElement>>('roleSelect');
  readonly qrCanvas = viewChild<ElementRef<HTMLCanvasElement>>('qrCanvas');
  readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  readonly mode = input<InviteEditorMode>('quickDraft');
  readonly invite = input<QrInviteViewModel | null>(null);
  readonly editDraft = input<ReusableInviteEditDraft | null>(null);
  readonly validityFocus = input(false);
  readonly manageOwnDraft = input(false);
  readonly openContext = input<InviteOpenContext>('settings');
  readonly preselectedRole = input<InviteTargetRole>('worker');
  readonly requestToken = input(0);
  readonly saveInFlight = input(false);

  readonly inviteCreated = output<string>();
  readonly inviteRevoked = output<string>();
  readonly roleRegenerated = output<QrInviteViewModel>();
  readonly saveAsReusable = output<CreateReusableInvitePayload>();
  readonly saveReusable = output<UpdateReusableInvitePayload>();
  readonly cancelEdit = output<void>();
  readonly editDraftChange = output<ReusableInviteEditDraft>();

  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly panelMode = signal<InvitePanelMode>('ready');
  readonly targetRole = signal<InviteTargetRole>('worker');
  readonly ownDraft = signal<QrInviteViewModel | null>(null);
  readonly qrLoading = signal(false);
  readonly qrVisible = signal(false);
  readonly shareInFlight = signal(false);
  readonly lastError = signal<string | null>(null);
  readonly inviteKind = signal<InviteComposeKind>('oneTime');
  readonly reusableName = signal('');
  readonly selectedPresetId = signal('now-30d');
  readonly displayNameMaxLength = DISPLAY_NAME_MAX_LENGTH;

  readonly validityPresets = signal<ValidityPreset[]>(buildValidityPresets());

  constructor() {
    effect(() => {
      if (!this.manageOwnDraft()) {
        return;
      }
      this.requestToken();
      this.targetRole.set(this.preselectedRole());
      void this.initializeOwnDraft(this.targetRole());
    });

    effect(() => {
      const displayInvite = this.displayInvite();
      const canvasRef = this.qrCanvas();
      if (!displayInvite || !canvasRef) {
        return;
      }
      void this.renderQrCanvas(canvasRef.nativeElement, displayInvite.qrPayload);
    });

    effect(() => {
      if (this.validityFocus() && this.mode() === 'editReusable') {
        queueMicrotask(() => this.nameInput()?.nativeElement.focus());
      }
    });
  }

  ngOnInit(): void {
    this.expirationTimer = setInterval(() => {
      void this.syncInviteExpiration();
    }, 60_000);
  }

  ngOnDestroy(): void {
    if (this.expirationTimer) {
      clearInterval(this.expirationTimer);
      this.expirationTimer = null;
    }
  }

  displayInvite(): QrInviteViewModel | null {
    if (this.mode() === 'editReusable') {
      const draft = this.editDraft();
      if (!draft) {
        return null;
      }
      return {
        inviteId: draft.inviteId,
        organizationId: '',
        createdBy: '',
        targetRole: draft.targetRole,
        inviteUrl: draft.inviteUrl,
        qrPayload: draft.qrPayload,
        tokenHash: '',
        status: draft.status,
        expiresAt: draft.expiresAt,
        acceptedAt: null,
        acceptedUserId: null,
        reusable: true,
        validFrom: draft.validFrom,
        displayName: draft.displayName,
        createdAt: '',
      };
    }

    return this.manageOwnDraft() ? this.ownDraft() : this.invite();
  }

  currentRole(): InviteTargetRole {
    if (this.mode() === 'editReusable') {
      return this.editDraft()?.targetRole ?? 'worker';
    }
    if (this.mode() === 'quickDraft' && this.inviteKind() === 'reusable') {
      return this.targetRole();
    }
    return this.manageOwnDraft() ? this.targetRole() : (this.invite()?.targetRole ?? 'worker');
  }

  inviteStatusChipVariant(status: InviteStatus): ChipVariant {
    switch (status) {
      case 'active':
        return 'status-success';
      case 'expired':
        return 'status-warning';
      case 'revoked':
        return 'status-danger';
      case 'accepted':
        return 'info';
    }
  }

  derivedStatusLabel(): string {
    const draft = this.editDraft();
    if (!draft) {
      return '';
    }
    switch (draft.derivedStatus) {
      case 'active':
        return this.t('colleagues.invites.status.active', 'Active');
      case 'scheduled':
        return this.t('colleagues.invites.status.scheduled', 'Scheduled');
      case 'paused':
        return this.t('colleagues.invites.status.paused', 'Paused');
      case 'expired':
        return this.t('colleagues.invites.status.expired', 'Expired');
    }
    return '';
  }

  derivedStatusVariant(): ChipVariant {
    const draft = this.editDraft();
    switch (draft?.derivedStatus) {
      case 'active':
        return 'status-success';
      case 'scheduled':
      case 'expired':
        return 'status-warning';
      case 'paused':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  statusLabel(): string {
    const status = this.displayInvite()?.status;
    switch (status) {
      case 'active':
        return this.t('settings.inviteManagement.status.active', 'Active');
      case 'expired':
        return this.t('settings.inviteManagement.status.expired', 'Expired');
      case 'revoked':
        return this.t('settings.inviteManagement.status.revoked', 'Revoked');
      case 'accepted':
        return this.t('settings.inviteManagement.status.accepted', 'Accepted');
      default:
        return this.t('settings.inviteManagement.status.pending', 'Pending');
    }
  }

  statusIcon(): string {
    const status = this.displayInvite()?.status;
    switch (status) {
      case 'active':
        return 'check_circle';
      case 'expired':
        return 'schedule';
      case 'revoked':
        return 'cancel';
      case 'accepted':
        return 'task_alt';
      default:
        return 'hourglass_top';
    }
  }

  isShareDisabled(): boolean {
    if (!this.showShareActions()) {
      return true;
    }

    const invite = this.displayInvite();
    if (!invite) {
      return true;
    }
    return this.shareInFlight() || this.qrLoading() || invite.status !== 'active';
  }

  showTypeToggle(): boolean {
    return this.mode() === 'quickDraft';
  }

  showReusableFields(): boolean {
    return this.mode() === 'editReusable' || this.inviteKind() === 'reusable';
  }

  showLiveQr(): boolean {
    return this.mode() === 'editReusable' || this.inviteKind() === 'oneTime';
  }

  showShareActions(): boolean {
    if (this.mode() === 'editReusable') {
      return true;
    }
    return this.inviteKind() === 'oneTime';
  }

  showCreateReusableFooter(): boolean {
    return this.mode() === 'quickDraft' && this.inviteKind() === 'reusable';
  }

  onInviteKindChange(raw: ToggleValue<string>): void {
    const next = toggleSingleStringValue(raw);
    if (next !== 'oneTime' && next !== 'reusable') {
      return;
    }

    this.inviteKind.set(next);
    this.lastError.set(null);

    if (next === 'oneTime') {
      this.reusableName.set('');
      return;
    }

    this.targetRole.set(this.invite()?.targetRole ?? this.targetRole());
  }

  isRegenerateDisabled(): boolean {
    const invite = this.displayInvite();
    return (
      this.panelMode() !== 'ready' ||
      this.qrLoading() ||
      (invite !== null && invite.status === 'accepted')
    );
  }

  isPauseDisabled(): boolean {
    return this.editDraft()?.derivedStatus === 'expired';
  }

  async onRoleChange(event: Event): Promise<void> {
    const nextRole = (event.target as HTMLSelectElement).value as InviteTargetRole;

    if (this.mode() === 'editReusable') {
      const draft = this.editDraft();
      if (draft) {
        this.editDraftChange.emit({ ...draft, targetRole: nextRole });
      }
      return;
    }

    if (this.mode() === 'quickDraft' && this.inviteKind() === 'reusable') {
      this.targetRole.set(nextRole);
      return;
    }

    this.targetRole.set(nextRole);

    if (this.manageOwnDraft()) {
      await this.regenerateOwnDraft(nextRole);
      return;
    }

    const current = this.invite();
    if (current) {
      try {
        const invite = await this.inviteService.regenerateInvite(current.inviteId, nextRole);
        this.roleRegenerated.emit(invite);
      } catch (error) {
        this.lastError.set(error instanceof Error ? error.message : 'Unable to regenerate invite.');
      }
    }
  }

  async onRegenerate(): Promise<void> {
    if (this.manageOwnDraft()) {
      await this.regenerateOwnDraft(this.targetRole());
    }
  }

  async onRevoke(): Promise<void> {
    const invite = this.displayInvite();
    if (!invite) {
      return;
    }

    this.lastError.set(null);

    try {
      await this.inviteService.revokeInvite(invite.inviteId);
      if (this.manageOwnDraft()) {
        this.ownDraft.update((current) =>
          current ? { ...current, status: 'revoked' } : null,
        );
      }
      this.inviteRevoked.emit(invite.inviteId);
    } catch (error) {
      this.lastError.set(
        error instanceof Error
          ? error.message
          : this.t('settings.inviteManagement.error.revoke', 'Unable to revoke invite.'),
      );
    }
  }

  onCreateReusable(): void {
    const name = this.reusableName().trim();
    if (!name) {
      this.lastError.set(
        this.t('colleagues.invites.editor.nameRequired', 'Enter a link label to continue.'),
      );
      queueMicrotask(() => this.nameInput()?.nativeElement.focus());
      return;
    }

    const preset = this.validityPresets().find((p) => p.id === this.selectedPresetId());
    if (!preset) {
      return;
    }

    this.saveAsReusable.emit({
      displayName: name,
      targetRole: this.currentRole(),
      validFrom: preset.validFrom,
      expiresAt: preset.expiresAt,
    });
  }

  onSaveReusable(): void {
    const draft = this.editDraft();
    if (!draft) {
      return;
    }

    this.saveReusable.emit({
      displayName: draft.displayName,
      targetRole: draft.targetRole,
      validFrom: draft.validFrom,
      expiresAt: draft.expiresAt,
      paused: draft.paused,
    });
  }

  onCancelEdit(): void {
    this.inviteKind.set('oneTime');
    this.reusableName.set('');
    this.cancelEdit.emit();
  }

  onNameChange(value: string): void {
    if (this.mode() === 'editReusable') {
      const draft = this.editDraft();
      if (draft) {
        this.editDraftChange.emit({ ...draft, displayName: value });
      }
      return;
    }
    this.reusableName.set(value);
  }

  nameValue(): string {
    if (this.mode() === 'editReusable') {
      return this.editDraft()?.displayName ?? '';
    }
    return this.reusableName();
  }

  onPresetChange(event: Event): void {
    const presetId = (event.target as HTMLSelectElement).value;
    this.selectedPresetId.set(presetId);

    if (this.mode() !== 'editReusable') {
      return;
    }

    const preset = this.validityPresets().find((p) => p.id === presetId);
    const draft = this.editDraft();
    if (preset && draft) {
      this.editDraftChange.emit({
        ...draft,
        validFrom: preset.validFrom,
        expiresAt: preset.expiresAt,
      });
    }
  }

  selectedPresetIdValue(): string {
    if (this.mode() === 'editReusable') {
      const draft = this.editDraft();
      if (!draft) {
        return 'now-30d';
      }
      const match = this.validityPresets().find(
        (p) => p.validFrom === draft.validFrom && p.expiresAt === draft.expiresAt,
      );
      return match?.id ?? 'custom';
    }
    return this.selectedPresetId();
  }

  onPauseToggle(): void {
    const draft = this.editDraft();
    if (!draft) {
      return;
    }
    this.editDraftChange.emit({ ...draft, paused: !draft.paused });
  }

  pauseChecked(): boolean {
    return !(this.editDraft()?.paused ?? false);
  }

  async onCopyLink(): Promise<void> {
    await this.withShareAction(async (invite) => {
      await navigator.clipboard.writeText(invite.inviteUrl);
      await this.inviteService.logShareEvent(invite.inviteId, 'copy-link');
    });
  }

  async onShareEmail(): Promise<void> {
    await this.withShareAction(async (invite) => {
      const subject = encodeURIComponent(
        this.t('settings.inviteManagement.share.email.subject', 'Join my organization'),
      );
      const bodyTemplate = this.t(
        'settings.inviteManagement.share.email.body',
        'Use this invite link: {inviteUrl}',
      );
      const body = encodeURIComponent(bodyTemplate.replace('{inviteUrl}', invite.inviteUrl));

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: this.t('settings.inviteManagement.share.native.title', 'Organization invite'),
          text: this.t(
            'settings.inviteManagement.share.native.text',
            'Use this invite link to join.',
          ),
          url: invite.inviteUrl,
        });
      } else if (typeof window !== 'undefined') {
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
      }

      await this.inviteService.logShareEvent(invite.inviteId, 'email');
    });
  }

  async onShareWhatsApp(): Promise<void> {
    await this.withShareAction(async (invite) => {
      if (typeof window !== 'undefined') {
        const textTemplate = this.t(
          'settings.inviteManagement.share.whatsapp.text',
          'Join my organization: {inviteUrl}',
        );
        const text = encodeURIComponent(textTemplate.replace('{inviteUrl}', invite.inviteUrl));
        window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
      }

      await this.inviteService.logShareEvent(invite.inviteId, 'whatsapp');
    });
  }

  async retry(): Promise<void> {
    if (this.manageOwnDraft()) {
      await this.initializeOwnDraft(this.targetRole());
    }
  }

  presetLabel(preset: ValidityPreset): string {
    return this.t(preset.labelKey, preset.labelFallback);
  }

  private async initializeOwnDraft(targetRole: InviteTargetRole): Promise<void> {
    this.panelMode.set('ready');
    this.lastError.set(null);
    this.qrLoading.set(true);
    this.qrVisible.set(false);

    try {
      const invite = await this.inviteService.createInviteDraft(targetRole);
      this.ownDraft.set(invite);
      this.panelMode.set('ready');
      this.inviteCreated.emit(invite.inviteId);
      await this.syncInviteExpiration();

      if (this.openContext() === 'command') {
        queueMicrotask(() => {
          this.roleSelect()?.nativeElement.focus();
        });
      }
    } catch (error) {
      this.ownDraft.set(null);
      this.qrLoading.set(false);
      this.panelMode.set('error');
      this.lastError.set(
        error instanceof Error
          ? error.message
          : this.t('settings.inviteManagement.error.create', 'Unable to create invite.'),
      );
    }
  }

  private async regenerateOwnDraft(targetRole: InviteTargetRole): Promise<void> {
    const current = this.ownDraft();
    this.lastError.set(null);

    try {
      const invite = current
        ? await this.inviteService.regenerateInvite(current.inviteId, targetRole)
        : await this.inviteService.createInviteDraft(targetRole);
      this.ownDraft.set(invite);
      this.inviteCreated.emit(invite.inviteId);
      this.roleRegenerated.emit(invite);
      await this.syncInviteExpiration();
    } catch (error) {
      this.lastError.set(
        error instanceof Error
          ? error.message
          : this.t('settings.inviteManagement.error.regenerate', 'Unable to regenerate invite.'),
      );
    }
  }

  private isDarkThemeActive(): boolean {
    if (typeof document === 'undefined') {
      return false;
    }
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'dark') {
      return true;
    }
    if (theme === 'light' || theme === 'sandstone') {
      return false;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private async renderQrCanvas(canvas: HTMLCanvasElement, payload: string): Promise<void> {
    const currentSequence = ++this.qrRenderSequence;
    this.qrVisible.set(false);
    this.qrLoading.set(true);

    try {
      const darkTheme = this.isDarkThemeActive();
      await toCanvas(canvas, payload, {
        width: 192,
        margin: 1,
        color: darkTheme
          ? { dark: '#ffffff', light: '#000000' }
          : { dark: '#000000', light: '#ffffff' },
      });

      if (currentSequence !== this.qrRenderSequence) {
        return;
      }

      this.qrLoading.set(false);
      requestAnimationFrame(() => {
        if (currentSequence === this.qrRenderSequence) {
          this.qrVisible.set(true);
        }
      });
    } catch {
      if (currentSequence !== this.qrRenderSequence) {
        return;
      }

      this.qrLoading.set(false);
      this.qrVisible.set(false);
      this.lastError.set(
        this.t('settings.inviteManagement.error.renderQr', 'Unable to render QR code.'),
      );
    }
  }

  private async syncInviteExpiration(): Promise<void> {
    const invite = this.manageOwnDraft() ? this.ownDraft() : this.invite();
    if (!invite || invite.status !== 'active') {
      return;
    }

    const expired = Date.now() > new Date(invite.expiresAt).getTime();
    if (!expired) {
      return;
    }

    if (this.manageOwnDraft()) {
      this.ownDraft.update((current) => (current ? { ...current, status: 'expired' } : null));
    }

    try {
      await this.inviteService.expireInvite(invite.inviteId);
    } catch {
      // Keep UI state expired even if persistence fails.
    }
  }

  private async withShareAction(
    action: (invite: QrInviteViewModel) => Promise<void>,
  ): Promise<void> {
    const invite = this.displayInvite();
    if (!invite || invite.status !== 'active' || this.shareInFlight()) {
      return;
    }

    this.shareInFlight.set(true);
    this.lastError.set(null);

    try {
      await action(invite);
    } catch (error) {
      this.lastError.set(
        error instanceof Error
          ? error.message
          : this.t('settings.inviteManagement.error.share', 'Unable to share invite.'),
      );
    } finally {
      this.shareInFlight.set(false);
    }
  }
}
