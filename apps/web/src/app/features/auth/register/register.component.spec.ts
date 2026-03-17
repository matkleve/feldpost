/**
 * RegisterComponent unit tests.
 *
 * Strategy:
 *  - AuthService.signUp is faked and controllable per test.
 *  - Tests cover form validation (password match), success state, and error display.
 */

import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
  withNavigationErrorHandler,
} from '@angular/router';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../../core/auth.service';

function buildFakeAuth(signUpError: Error | null = null) {
  return {
    signUp: vi.fn().mockResolvedValue({ error: signUpError }),
  };
}

function setup(signUpError: Error | null = null, inviteFromQuery?: string | null) {
  const fakeAuth = buildFakeAuth(signUpError);

  TestBed.configureTestingModule({
    imports: [RegisterComponent],
    providers: [
      { provide: AuthService, useValue: fakeAuth },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap(inviteFromQuery ? { invite: inviteFromQuery } : {}),
          },
        },
      },
      provideRouter(
        [],
        withNavigationErrorHandler(() => {}),
      ),
    ],
  });

  const fixture = TestBed.createComponent(RegisterComponent);
  fixture.detectChanges();

  return { fixture, fakeAuth };
}

function fillForm(
  fixture: ReturnType<typeof setup>['fixture'],
  fullName: string,
  email: string,
  inviteCode: string,
  password: string,
  confirmPassword: string,
) {
  const el: HTMLElement = fixture.nativeElement;

  const set = (selector: string, value: string) => {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  set('#fullName', fullName);
  set('#email', email);
  set('#inviteCode', inviteCode);
  set('#password', password);
  set('#confirmPassword', confirmPassword);
  fixture.detectChanges();
}

describe('RegisterComponent', () => {
  it('creates', () => {
    const { fixture } = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the Create account heading', () => {
    const { fixture } = setup();
    const h1 = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(h1?.textContent).toContain('Create account');
  });

  it('renders map background and form scroll region', () => {
    const { fixture } = setup();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.auth-shell--map')).toBeTruthy();
    expect(host.querySelector('.auth-map-frame')).toBeTruthy();
    expect(host.querySelector('.auth-card-scroll')).toBeTruthy();
  });

  it('form is invalid when empty', () => {
    const { fixture } = setup();
    expect(fixture.componentInstance['form'].invalid).toBe(true);
  });

  it('form is invalid when passwords do not match', () => {
    const { fixture } = setup();
    fillForm(fixture, 'Alice', 'alice@example.com', 'ab'.repeat(24), 'StrongPass1!', 'different');
    expect(fixture.componentInstance['form'].invalid).toBe(true);
    expect(fixture.componentInstance['form'].hasError('passwordsMismatch')).toBe(true);
  });

  it('form is valid when all fields correct and passwords match', () => {
    const { fixture } = setup();
    fillForm(
      fixture,
      'Alice',
      'alice@example.com',
      'ab'.repeat(24),
      'StrongPass1!',
      'StrongPass1!',
    );
    expect(fixture.componentInstance['form'].valid).toBe(true);
  });

  it('prefills invite code from query parameter', () => {
    const invite = 'ab'.repeat(24);
    const { fixture } = setup(null, invite);
    expect(fixture.componentInstance['form'].controls.inviteCode.value).toBe(invite);
  });

  it('calls signUp with correct args', async () => {
    const { fixture, fakeAuth } = setup();
    fillForm(
      fixture,
      'Alice',
      'alice@example.com',
      'ab'.repeat(24),
      'StrongPass1!',
      'StrongPass1!',
    );
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(fakeAuth.signUp).toHaveBeenCalledWith(
      'alice@example.com',
      'StrongPass1!',
      'Alice',
      'ab'.repeat(24),
    );
  });

  it('shows success state after successful registration', async () => {
    const { fixture } = setup();
    fillForm(
      fixture,
      'Alice',
      'alice@example.com',
      'ab'.repeat(24),
      'StrongPass1!',
      'StrongPass1!',
    );
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
    const heading = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(heading?.textContent).toContain('Check your email');
  });

  it('displays error message when signUp fails', async () => {
    const err = new Error('User already registered');
    const { fixture } = setup(err);
    fillForm(
      fixture,
      'Alice',
      'alice@example.com',
      'ab'.repeat(24),
      'StrongPass1!',
      'StrongPass1!',
    );
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
    const alert = (fixture.nativeElement as HTMLElement).querySelector('.alert-error');
    expect(alert?.textContent).toContain('User already registered');
  });
});
