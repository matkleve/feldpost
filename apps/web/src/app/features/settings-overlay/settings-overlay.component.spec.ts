import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { SettingsPaneService } from '../../core/settings-pane.service';
import { SettingsOverlayComponent } from './settings-overlay.component';

describe('SettingsOverlayComponent', () => {
  const signOutMock = vi.fn<() => Promise<void>>();
  const setSelectedSectionMock = vi.fn<(section: string) => void>();

  beforeEach(async () => {
    signOutMock.mockReset();
    signOutMock.mockResolvedValue(undefined);
    setSelectedSectionMock.mockReset();

    await TestBed.configureTestingModule({
      imports: [SettingsOverlayComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            user: signal({
              email: 'matthias@example.com',
              user_metadata: { full_name: 'Matthias' },
            }),
            signOut: signOutMock,
          },
        },
        {
          provide: I18nService,
          useValue: {
            t: (_key: string, fallback = '') => fallback,
            language: signal<'de' | 'en'>('de'),
            setLanguage: vi.fn(),
          },
        },
        {
          provide: SettingsPaneService,
          useValue: {
            selectedSectionId: signal<string | null>(null),
            subsectionRequest: signal({ id: null, requestToken: 0 }),
            inviteSectionRequest: signal({
              requestToken: 0,
              openContext: 'settings',
              preselectedRole: 'worker',
            }),
            setSelectedSection: setSelectedSectionMock,
          },
        },
      ],
    }).compileComponents();
  });

  it('does not show a "Close settings" action in account section', () => {
    const fixture = TestBed.createComponent(SettingsOverlayComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentInstance.loadState.set('populated');
    fixture.componentInstance.selectSection('account');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text.includes('Close settings')).toBe(false);
    expect(text.includes('Logout')).toBe(true);
  });

  it('opens and closes logout confirmation', () => {
    const fixture = TestBed.createComponent(SettingsOverlayComponent);
    fixture.componentInstance.loadState.set('populated');
    fixture.componentInstance.selectSection('account');
    fixture.detectChanges();

    fixture.componentInstance.openLogoutConfirm();
    fixture.detectChanges();
    expect(fixture.componentInstance.logoutConfirmOpen()).toBe(true);

    fixture.componentInstance.cancelLogoutConfirm();
    fixture.detectChanges();
    expect(fixture.componentInstance.logoutConfirmOpen()).toBe(false);
  });

  it('signs out and emits close on confirm', async () => {
    const fixture = TestBed.createComponent(SettingsOverlayComponent);
    const emitted: boolean[] = [];
    fixture.componentInstance.openChange.subscribe((value) => emitted.push(value));

    fixture.componentInstance.openLogoutConfirm();
    await fixture.componentInstance.confirmLogout();

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.logoutError()).toBeNull();
    expect(emitted).toContain(false);
  });

  it('keeps dialog open and surfaces error when logout fails', async () => {
    signOutMock.mockRejectedValueOnce(new Error('Network down'));
    const fixture = TestBed.createComponent(SettingsOverlayComponent);

    fixture.componentInstance.openLogoutConfirm();
    await fixture.componentInstance.confirmLogout();

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.logoutConfirmOpen()).toBe(true);
    expect(fixture.componentInstance.logoutError()).toBe('Network down');
    expect(fixture.componentInstance.logoutPending()).toBe(false);
  });
});
