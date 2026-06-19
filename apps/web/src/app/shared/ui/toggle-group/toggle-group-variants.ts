// TODO(spartan-v4): Replace with @spartan-ng/ui-toggle-group-helm when available for Tailwind v4.
import { cva, type VariantProps } from 'class-variance-authority';

/** Density tokens for inactive preview strips (e.g. projects toolbar) mirroring segment padding. */
// @see docs/migration/phase-8-global-scss-elimination.md §6
export type PillToggleSize = 'sm' | 'md' | 'lg';

/** Inline `--hlm-toggle-item-*` for caller SCSS that mirrors toggle segment geometry. */
// @see docs/migration/phase-8-global-scss-elimination.md §6
export const pillToggleSizeStyle: Record<PillToggleSize, string> = {
  sm: '--hlm-toggle-item-padding-y:0.25rem;--hlm-toggle-item-padding-x:0.5rem;--hlm-toggle-icon-only-min:1.75rem',
  md: '--hlm-toggle-item-padding-y:0.375rem;--hlm-toggle-item-padding-x:0.75rem;--hlm-toggle-icon-only-min:1.75rem',
  lg: '--hlm-toggle-item-padding-y:0.5rem;--hlm-toggle-item-padding-x:1rem;--hlm-toggle-icon-only-min:2rem',
};

const pillVerticalChrome = [
  'flex-col',
  '[--hlm-pill-vertical-item-radius:calc(var(--radius-full)-var(--spacing-1))]',
  '[&_[hlmToggleGroup]]:flex-col [&_[hlmToggleGroup]]:items-stretch',
  '[&_[hlmToggleGroupItem]:first-child:last-child]:[border-radius:var(--hlm-pill-vertical-item-radius)]',
  '[&_[hlmToggleGroupItem]:first-child:not(:last-child)]:[border-top-left-radius:var(--hlm-pill-vertical-item-radius)]',
  '[&_[hlmToggleGroupItem]:first-child:not(:last-child)]:[border-top-right-radius:var(--hlm-pill-vertical-item-radius)]',
  '[&_[hlmToggleGroupItem]:first-child:not(:last-child)]:[border-bottom-left-radius:0]',
  '[&_[hlmToggleGroupItem]:first-child:not(:last-child)]:[border-bottom-right-radius:0]',
  '[&_[hlmToggleGroupItem]:last-child:not(:first-child)]:[border-bottom-left-radius:var(--hlm-pill-vertical-item-radius)]',
  '[&_[hlmToggleGroupItem]:last-child:not(:first-child)]:[border-bottom-right-radius:var(--hlm-pill-vertical-item-radius)]',
  '[&_[hlmToggleGroupItem]:last-child:not(:first-child)]:[border-top-left-radius:0]',
  '[&_[hlmToggleGroupItem]:last-child:not(:first-child)]:[border-top-right-radius:0]',
  '[&_[hlmToggleGroupItem]:not(:first-child):not(:last-child)]:rounded-none',
].join(' ');

/** Row / column shell around `hlmToggleGroup` (replaces global `hlm-toggle-group.scss` pill track). */
// @see docs/migration/phase-8-global-scss-elimination.md §6
export const pillToggleVariants = cva(
  [
    'inline-flex max-w-full items-center w-[var(--hlm-pill-toggle-width,auto)]',
    'motion-reduce:[animation-duration:1ms] motion-reduce:[transition-duration:1ms]',
    'motion-reduce:transition-none motion-reduce:duration-0',
  ].join(' '),
  {
    variants: {
      // Horizontal track height is set via compoundVariants; vertical stacks use h-auto.
      // @see docs/design/components/action-interaction-kernel.md#button-policy
      size: {
        sm: '',
        md: '',
        lg: '',
      },
      fill: {
        true: [
          'w-full',
          '[&_[hlmToggleGroup]]:w-full [&_[hlmToggleGroup]]:inline-flex',
          '[&_[hlmToggleGroupItem]]:min-w-0 [&_[hlmToggleGroupItem]]:flex-[1_1_0]',
        ].join(' '),
        false: '',
      },
      hasInactive: {
        true: 'gap-4',
        false: 'gap-2 max-md:gap-3',
      },
      vertical: {
        true: pillVerticalChrome,
        false: '',
      },
    },
    compoundVariants: [
      {
        vertical: false,
        size: 'sm',
        class: '[&_[hlmToggleGroup]]:h-9',
      },
      {
        vertical: false,
        size: 'md',
        class: '[&_[hlmToggleGroup]]:h-9',
      },
      {
        vertical: false,
        size: 'lg',
        class: '[&_[hlmToggleGroup]]:h-10',
      },
      {
        vertical: true,
        size: 'sm',
        class: '[&_[hlmToggleGroup]]:h-auto [&_[hlmToggleGroup]]:min-h-0',
      },
      {
        vertical: true,
        size: 'md',
        class: '[&_[hlmToggleGroup]]:h-auto [&_[hlmToggleGroup]]:min-h-0',
      },
      {
        vertical: true,
        size: 'lg',
        class: '[&_[hlmToggleGroup]]:h-auto [&_[hlmToggleGroup]]:min-h-0',
      },
    ],
    defaultVariants: {
      size: 'md',
      fill: false,
      hasInactive: false,
      vertical: false,
    },
  },
);

export type PillToggleVariantProps = VariantProps<typeof pillToggleVariants>;

// Toggle group track — fixed button row height; p-1 inset; segments shrink inside
// @see docs/design/components/action-interaction-kernel.md#button-policy
export const toggleGroupVariants = cva(
  [
    'box-border inline-flex items-center justify-center rounded-md bg-muted gap-1 p-1',
    'motion-reduce:transition-none motion-reduce:duration-0 motion-reduce:[animation-duration:1ms] motion-reduce:[transition-duration:1ms]',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-9',
        md: 'h-9',
        lg: 'h-10',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/** Gold quiet-row hover/focus for inactive toggle segments (@see docs/design/state-visuals.md). */
const toggleOffEmphasis =
  'data-[state=off]:hover:bg-[color:color-mix(in_srgb,var(--brand-gold)_10%,transparent)] data-[state=off]:hover:text-[color:var(--brand-gold)] data-[state=off]:hover:[&_.material-icons]:text-inherit data-[state=off]:focus-visible:bg-[color:color-mix(in_srgb,var(--brand-gold)_10%,transparent)] data-[state=off]:focus-visible:text-[color:var(--brand-gold)] data-[state=off]:focus-visible:[&_.material-icons]:text-inherit';

/** Selected segment + hover — primary wins over gold (@see interaction-emphasis-ink-contract). */
const toggleOnSelectedHover =
  'data-[state=on]:hover:bg-[color:color-mix(in_srgb,var(--primary)_10%,transparent)] data-[state=on]:hover:text-primary data-[state=on]:hover:[&_.material-icons]:text-inherit data-[state=on]:focus-visible:bg-[color:color-mix(in_srgb,var(--primary)_10%,transparent)] data-[state=on]:focus-visible:text-primary data-[state=on]:focus-visible:[&_.material-icons]:text-inherit';

// Individual toggle item
// @see docs/MIGRATION_PLAN.md
export const toggleGroupItemVariants = cva(
  [
    // Horizontal padding lives on size variants only (`ps-*` / `pe-*`): icon+label rows need slightly larger inline-start than end for optical balance (matches action-interaction kernel intent; `icon` uses `p-0`).
    // @see docs/design/components/action-interaction-kernel.md#button-policy
    'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium text-muted-foreground ring-offset-background transition-all',
    '[&_.material-icons]:text-[1.125rem] [&_.material-icons]:leading-none [&_.material-icons]:text-inherit',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'data-[state=on]:bg-[color:color-mix(in_srgb,var(--interaction-selected-ink)_10%,transparent)] data-[state=on]:text-[color:var(--interaction-selected-ink)] data-[state=on]:shadow-none',
    toggleOnSelectedHover,
    toggleOffEmphasis,
    'data-[attention=true]:data-[state=off]:text-[color:var(--warning)] data-[attention=true]:data-[state=off]:shadow-[0_0_0_1px_color-mix(in_srgb,var(--warning)_38%,transparent)]',
  // Issues lane (and similar): keep destructive tone when selected — must follow generic `data-[state=on]` primary rules.
  // @see upload-panel.component.scss — &__area--switch.upload-panel__segmented
    'data-[destructive-hint=true]:text-destructive data-[destructive-hint=true]:[&_.material-icons]:text-destructive',
    'data-[destructive-hint=true]:data-[state=off]:hover:bg-[color:color-mix(in_srgb,var(--destructive)_10%,transparent)] data-[destructive-hint=true]:data-[state=off]:hover:text-destructive',
    'data-[destructive-hint=true]:data-[state=on]:bg-[color:color-mix(in_srgb,var(--destructive)_10%,transparent)] data-[destructive-hint=true]:data-[state=on]:text-destructive data-[destructive-hint=true]:data-[state=on]:shadow-none',
    'data-[destructive-hint=true]:data-[state=on]:hover:bg-[color:color-mix(in_srgb,var(--destructive)_14%,transparent)] data-[destructive-hint=true]:data-[state=on]:hover:text-destructive data-[destructive-hint=true]:data-[state=on]:hover:[&_.material-icons]:text-destructive',
    'motion-reduce:transition-none motion-reduce:duration-0',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-7 min-h-0 shrink-0 ps-2 pe-1.5 text-xs',
        md: 'h-7 min-h-0 shrink-0 ps-2.5 pe-2 text-xs',
        lg: 'h-8 min-h-0 shrink-0 ps-3 pe-2 text-xs',
        icon: 'h-7 w-7 min-h-7 min-w-7 shrink-0 p-0',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export type ToggleGroupItemVariantProps = VariantProps<typeof toggleGroupItemVariants>;
