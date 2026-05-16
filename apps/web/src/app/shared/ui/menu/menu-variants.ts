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
  'relative flex cursor-default select-none items-center rounded-sm px-3 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
);

export const menuSeparatorVariants = cva('my-1 h-px bg-muted');

export const menuLabelVariants = cva('px-3 py-1.5 text-xs font-semibold text-muted-foreground');
