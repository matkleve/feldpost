/**
 * NavComponent unit tests — M-UI2 (LeftSidebar redesign).
 *
 * Tests:
 *  1.  Component creates
 *  2.  Renders all four nav items
 *  3.  Active route is highlighted (routerLinkActive adds nav__link--active)
 *  4.  Inactive route does not get nav__link--active
 *  5.  Disabled nav items carry aria-disabled="true"
 *  6.  Disabled nav items have .nav__link--disabled and tabindex="-1"
 *  7.  Avatar displays the correct email initial
 *  8.  Avatar shows '?' when no user is signed in
 *  9.  nav element has aria-label="Main navigation"
 * 10.  Icons are rendered as span.material-icons elements
 * 11.  Each nav item renders a .nav__label element (visible on expand)
 * 12.  Sidebar panel has .sidebar__panel class
 */

import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { NavComponent } from './nav.component';
import { AuthService } from '../../core/auth.service';

function buildTestBed(emailOverride: string | null = null) {
    const mockUser = signal(
        emailOverride ? { email: emailOverride } : null as any,
    );

    return TestBed.configureTestingModule({
        imports: [NavComponent],
        providers: [
            provideRouter([
                { path: '', component: NavComponent },
                { path: 'photos', component: NavComponent },
                { path: 'groups', component: NavComponent },
                { path: 'settings', component: NavComponent },
                { path: 'account', component: NavComponent },
            ]),
            {
                provide: AuthService,
                useValue: {
                    user: mockUser,
                    session: signal(null),
                    loading: signal(false),
                    initialize: vi.fn().mockResolvedValue(undefined),
                },
            },
        ],
    }).compileComponents();
}

describe('NavComponent', () => {
    beforeEach(async () => {
        await buildTestBed('test@example.com');
    });

    it('creates', () => {
        const fixture = TestBed.createComponent(NavComponent);
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('renders all four nav items', () => {
        const fixture = TestBed.createComponent(NavComponent);
        fixture.detectChanges();
        const links = Array.from<HTMLElement>(
            fixture.nativeElement.querySelectorAll('.nav__link:not(.nav__link--disabled)'),
        );
        // 4 nav links (Map, Photos, Groups, Settings) + avatar link = 5 total
        // The 4 are rendered by navItems loop
        expect(links.length).toBeGreaterThanOrEqual(4);
    });

    it('highlights Map nav item when router is at root route', async () => {
        const router = TestBed.inject(Router);
        const fixture = TestBed.createComponent(NavComponent);
        fixture.detectChanges();

        await router.navigate(['/']);
        await fixture.whenStable();
        fixture.detectChanges();

        const allLinks = Array.from<HTMLAnchorElement>(
            fixture.nativeElement.querySelectorAll('a.nav__link'),
        );
        const mapLink = allLinks.find(l => l.getAttribute('href') === '/');
        expect(mapLink).not.toBeNull();
        expect(mapLink?.classList).toContain('nav__link--active');
    });

    it('does not highlight Map when router is at /photos', async () => {
        const router = TestBed.inject(Router);
        const fixture = TestBed.createComponent(NavComponent);
        fixture.detectChanges();

        await router.navigate(['/photos']);
        await fixture.whenStable();
        fixture.detectChanges();

        const allLinks = Array.from<HTMLAnchorElement>(
            fixture.nativeElement.querySelectorAll('a.nav__link'),
        );
        const mapLink = allLinks.find(l => l.getAttribute('href') === '/');
        expect(mapLink?.classList).not.toContain('nav__link--active');
    });

    it('disabled items have aria-disabled="true"', () => {
        const fixture = TestBed.createComponent(NavComponent);
        // Add a disabled item to navItems for this test
        fixture.componentInstance.navItems = [
            ...fixture.componentInstance.navItems,
            { icon: 'bar_chart', label: 'Reports', route: '/reports', disabled: true },
        ];
        fixture.detectChanges();

        const disabledEl = fixture.nativeElement.querySelector(
            '[aria-disabled="true"]',
        ) as HTMLElement;
        expect(disabledEl).not.toBeNull();
        expect(disabledEl.getAttribute('aria-disabled')).toBe('true');
    });

    it('disabled items have pointer-events: none style class', () => {
        const fixture = TestBed.createComponent(NavComponent);
        fixture.componentInstance.navItems = [
            { icon: 'bar_chart', label: 'Reports', route: '/reports', disabled: true },
        ];
        fixture.detectChanges();

        const disabledEl = fixture.nativeElement.querySelector(
            '.nav__link--disabled',
        ) as HTMLElement;
        expect(disabledEl).not.toBeNull();
        expect(disabledEl.getAttribute('tabindex')).toBe('-1');
    });

    it('avatar shows correct initial from user email', async () => {
        // Rebuild TestBed with a specific email
        TestBed.resetTestingModule();
        await buildTestBed('john@example.com');

        const fixture = TestBed.createComponent(NavComponent);
        fixture.detectChanges();

        const avatar = fixture.nativeElement.querySelector('.nav__avatar') as HTMLElement;
        expect(avatar?.textContent?.trim()).toBe('J');
    });

    it('avatar shows ? when no user is signed in', async () => {
        TestBed.resetTestingModule();
        await buildTestBed(null);

        const fixture = TestBed.createComponent(NavComponent);
        fixture.detectChanges();

        const avatar = fixture.nativeElement.querySelector('.nav__avatar') as HTMLElement;
        expect(avatar?.textContent?.trim()).toBe('?');
    });

    it('nav has aria-label "Main navigation"', () => {
        const fixture = TestBed.createComponent(NavComponent);
        fixture.detectChanges();
        const nav = fixture.nativeElement.querySelector('nav') as HTMLElement;
        expect(nav?.getAttribute('aria-label')).toBe('Main navigation');
    });

    // ── LeftSidebar-specific tests ─────────────────────────────────────────────

    it('icons are rendered as span.material-icons elements', () => {
        const fixture = TestBed.createComponent(NavComponent);
        fixture.detectChanges();
        const icons = Array.from<HTMLElement>(
            fixture.nativeElement.querySelectorAll('.nav__icon.material-icons'),
        );
        // One icon per nav item (4 items minimum).
        expect(icons.length).toBeGreaterThanOrEqual(4);
        // Icon text content matches a Material Icon name (no emoji).
        const firstIcon = icons[0];
        expect(firstIcon.textContent?.trim()).toBe('map');
    });

    it('each nav item has a .nav__label element for the expand animation', () => {
        const fixture = TestBed.createComponent(NavComponent);
        fixture.detectChanges();
        const labels = Array.from<HTMLElement>(
            fixture.nativeElement.querySelectorAll('.nav__label'),
        );
        // 4 base nav items → 4 labels.
        expect(labels.length).toBeGreaterThanOrEqual(4);
    });

    it('sidebar container has .sidebar__panel class', () => {
        const fixture = TestBed.createComponent(NavComponent);
        fixture.detectChanges();
        const panel = fixture.nativeElement.querySelector('.sidebar__panel') as HTMLElement;
        expect(panel).not.toBeNull();
    });
});
