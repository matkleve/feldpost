// TODO(spartan-v4): Replace with @spartan-ng/ui-menu-helm when Tailwind v4 peers allow.
// @see docs/MIGRATION_PLAN.md
// TODO(brn-menu): `@spartan-ng/brain` alpha.691 has no `./menu` — only navigation-menu / command / popover.
// Local CVA mirrors spartan menu chrome until `BrnMenu` ships.

import { cva } from 'class-variance-authority';

/** Menu panel surface (positioning remains caller-owned, e.g. DropdownShell). */
export const menuContentVariants = cva(
  'z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-0 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
);

/** Single selectable row inside a menu / dropdown list. */
export const menuItemVariants = cva(
  [
    'relative flex w-full min-w-0 cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
    // Row chrome: primary-tinted hover / pressed / keyboard highlight (token timing — @see docs/design/motion.md)
    'transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)]',
    'hover:bg-primary/10 active:bg-primary/15',
    'focus-visible:bg-primary/10 data-[highlighted]:bg-primary/10',
    // Disabled: no hover/press fill (canonical — @see docs/design/state-visuals.md#disabled-canonical)
    'data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
    'data-[disabled]:hover:bg-transparent data-[disabled]:active:bg-transparent',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
    'disabled:hover:bg-transparent disabled:active:bg-transparent',
  ].join(' '),
);

export const menuSeparatorVariants = cva('my-1 h-px bg-muted');

export const menuLabelVariants = cva('px-2 py-1.5 text-xs font-semibold text-muted-foreground');
