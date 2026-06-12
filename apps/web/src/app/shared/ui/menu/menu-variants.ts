// TODO(spartan-v4): Replace with @spartan-ng/ui-menu-helm when Tailwind v4 peers allow.
// @see docs/MIGRATION_PLAN.md
// TODO(brn-menu): `@spartan-ng/brain` alpha.691 has no `./menu` — only navigation-menu / command / popover.
// Local CVA mirrors spartan menu chrome until `BrnMenu` ships.

import { cva } from 'class-variance-authority';

/** Host class for global menu-row styles (`styles/_option-menu-list.scss`). */
export const OPTION_MENU_ITEM_CLASS = 'option-menu-item';

/** Host class for section labels in menu lists. */
export const OPTION_MENU_LABEL_CLASS = 'option-menu-label';

/** Leading icon class on menu rows (token size + alignment). */
export const OPTION_MENU_ITEM_ICON_CLASS = 'option-menu-item__icon';

/** Menu panel surface (positioning remains caller-owned, e.g. DropdownShell). */
export const menuContentVariants = cva(
  'z-50 min-w-[8rem] overflow-hidden rounded-lg text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
);

/** Single selectable row inside a menu / dropdown list. */
export const menuItemVariants = cva(
  [
    `${OPTION_MENU_ITEM_CLASS} relative flex w-full min-w-0 cursor-pointer select-none items-center gap-1 rounded-sm min-h-8 p-1 text-xs leading-[1.4] outline-none`,
    // Row hover/focus/active colors: `styles/_option-menu-item-states.scss` (unlayered).
    // @see docs/design/motion.md
    'transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)]',
    // Disabled: no hover/press fill (canonical — @see docs/design/state-visuals.md#disabled-canonical)
    'data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
    'data-[disabled]:hover:bg-transparent data-[disabled]:hover:text-inherit data-[disabled]:active:bg-transparent',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
    'disabled:hover:bg-transparent disabled:hover:text-inherit disabled:active:bg-transparent',
  ].join(' '),
);

export const menuSeparatorVariants = cva('my-1 h-px bg-muted');

export const menuLabelVariants = cva(
  `${OPTION_MENU_LABEL_CLASS} p-1 pb-0 text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground`,
);
