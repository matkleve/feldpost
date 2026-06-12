import { Injectable, signal } from '@angular/core';

type SettingsSectionId =
  | 'general'
  | 'appearance'
  | 'notifications'
  | 'map'
  | 'search'
  | 'data'
  | 'account'
  | 'invite-management';

type InviteOpenContext = 'settings' | 'command';
type InviteTargetRole = 'clerk' | 'worker';

interface InviteSectionRequest {
  requestToken: number;
  openContext: InviteOpenContext;
  preselectedRole: InviteTargetRole;
}

interface SettingsSubsectionRequest {
  id: string | null;
  requestToken: number;
}

@Injectable({ providedIn: 'root' })
export class SettingsPaneService {
  private readonly _open = signal(false);
  private readonly _selectedSectionId = signal<SettingsSectionId | null>(null);
  private readonly _subsectionRequest = signal<SettingsSubsectionRequest>({
    id: null,
    requestToken: 0,
  });
  private readonly _inviteSectionRequest = signal<InviteSectionRequest>({
    requestToken: 0,
    openContext: 'settings',
    preselectedRole: 'worker',
  });

  readonly open = this._open.asReadonly();
  readonly selectedSectionId = this._selectedSectionId.asReadonly();
  readonly subsectionRequest = this._subsectionRequest.asReadonly();
  readonly inviteSectionRequest = this._inviteSectionRequest.asReadonly();

  setOpen(open: boolean): void {
    this._open.set(open);
  }

  setSelectedSection(sectionId: SettingsSectionId): void {
    this._selectedSectionId.set(sectionId);
    this.clearSubsectionTarget();

    if (sectionId === 'invite-management') {
      this._inviteSectionRequest.update((current) => ({
        ...current,
        requestToken: current.requestToken + 1,
        openContext: 'settings',
      }));
    }
  }

  openInviteManagementFromCommand(preselectedRole: InviteTargetRole = 'worker'): void {
    this._inviteSectionRequest.update((current) => ({
      requestToken: current.requestToken + 1,
      openContext: 'command',
      preselectedRole,
    }));
    this._selectedSectionId.set('invite-management');
    this.clearSubsectionTarget();
    this._open.set(true);
  }

  openFromRoute(sectionId: SettingsSectionId | null, subsectionId: string | null): void {
    this._selectedSectionId.set(sectionId ?? 'general');

    const normalizedSubsection = subsectionId && subsectionId.length > 0 ? subsectionId : null;
    this._subsectionRequest.update((current) => ({
      id: normalizedSubsection,
      requestToken: current.requestToken + 1,
    }));

    this._open.set(true);
  }

  toggle(): void {
    this._open.update((current) => !current);
  }

  close(): void {
    this._open.set(false);
  }

  private clearSubsectionTarget(): void {
    this._subsectionRequest.update((current) => ({
      id: null,
      requestToken: current.requestToken + 1,
    }));
  }
}
