/**
 * NavComponent — LeftSidebar: floating sidebar panel (desktop) or
 * bottom tab bar (mobile < 768 px).
 *
 * M-UI2: App Shell & Navigation
 *
 * Design: Claude-inspired frosted glass, vertically centred compact rail on the
 * left edge. At rest, nav items are square icon buttons. On hover, the rail
 * expands right and reveals labels without shifting icon alignment. Uses Google
 * Material Icons.
 *
 * Ground rules:
 *  - Standalone component; imports only what the template uses.
 *  - AuthService.user() provides the email initial for the avatar slot.
 *  - Disabled nav items are non-interactive (pointer-events: none) and carry
 *    aria-disabled="true" for accessibility.
 *  - routerLinkActive uses exact matching for '/' to avoid it always being active.
 */

import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';

export interface NavItem {
    /** Google Material Icon ligature name (e.g. 'map', 'photo_camera'). */
    icon: string;
    label: string;
    route: string;
    disabled?: boolean;
}

@Component({
    selector: 'app-nav',
    standalone: true,
    imports: [RouterLink, RouterLinkActive],
    templateUrl: './nav.component.html',
    styleUrl: './nav.component.scss',
})
export class NavComponent {
    private readonly authService = inject(AuthService);

    /** Nav items in display order. Items with disabled: true are visually greyed
     *  out and non-interactive — reserved for future features. */
    navItems: NavItem[] = [
        { icon: 'map', label: 'Map', route: '/' },
        { icon: 'photo_camera', label: 'Photos', route: '/photos' },
        { icon: 'folder', label: 'Groups', route: '/groups' },
        { icon: 'settings', label: 'Settings', route: '/settings' },
    ];

    /** First letter of the authenticated user's email, upper-cased.
     *  Falls back to '?' if no user is signed in. */
    readonly avatarInitial = computed<string>(() => {
        const email = this.authService.user()?.email;
        return email ? email[0].toUpperCase() : '?';
    });
}
