// TODO(spartan-v4): Replace with @spartan-ng/ui-toggle-group-helm when available for Tailwind v4.
import { cva, type VariantProps } from 'class-variance-authority';

/** Density tokens for inactive preview strips (e.g. projects toolbar) mirroring segment padding. */
// @see docs/migration/phase-8-global-scss-elimination.md §6
export type PillToggleSize = 'sm' | 'md' | 'lg';

/** Inline `--hlm-toggle-item-*` for caller SCSS that mirrors toggle segment geometry. */
// @see docs/migration/phase-8-global-scss-elimination.md §6
export const pillToggleSizeStyle: Record<PillToggleSize, string> = {
  sm: '--hlm-toggle-item-padding-y:0.25rem;--hlm-toggle-item-padding-x:0.5rem;--hlm-toggle-icon-only-min:2.25rem',
  md: '--hlm-toggle-item-padding-y:0.375rem;--hlm-toggle-item-padding-x:0.75rem;--hlm-toggle-icon-only-min:2.25rem',
  lg: '--hlm-toggle-item-padding-y:0.5rem;--hlm-toggle-item-padding-x:1rem;--hlm-toggle-icon-only-min:2.5rem',
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
      // Keeps nested track height aligned with `hlmBtn size="sm"` (h-9) per pill density.
      // @see docs/design/components/action-interaction-kernel.md#button-policy
      size: {
        sm: '[&_[hlmToggleGroup]]:h-9 [&_[hlmToggleGroup]]:px-1 [&_[hlmToggleGroup]]:py-0',
        md: '[&_[hlmToggleGroup]]:h-9 [&_[hlmToggleGroup]]:px-1 [&_[hlmToggleGroup]]:py-0',
        lg: '[&_[hlmToggleGroup]]:h-10 [&_[hlmToggleGroup]]:px-1 [&_[hlmToggleGroup]]:py-0',
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
    defaultVariants: {
      size: 'md',
      fill: false,
      hasInactive: false,
      vertical: false,
    },
  },
);

export type PillToggleVariantProps = VariantProps<typeof pillToggleVariants>;

// Toggle group track — height locked to toolbar `hlmBtn size="sm"` (h-9); horizontal inset only.
// @see docs/design/components/action-interaction-kernel.md#button-policy
export const toggleGroupVariants = cva(
  [
    'inline-flex items-center justify-center rounded-md bg-muted gap-1',
    'motion-reduce:transition-none motion-reduce:duration-0 motion-reduce:[animation-duration:1ms] motion-reduce:[transition-duration:1ms]',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-9 px-1 py-0',
        md: 'h-9 px-1 py-0',
        lg: 'h-10 px-1 py-0',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

// Individual toggle item
// @see docs/MIGRATION_PLAN.md
export const toggleGroupItemVariants = cva(
  [
    // Horizontal padding lives on size variants only (`ps-*` / `pe-*`): icon+label rows need slightly larger inline-start than end for optical balance (matches action-interaction kernel intent; `icon` uses `p-0`).
    // @see docs/design/components/action-interaction-kernel.md#button-policy
    'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium text-muted-foreground ring-offset-background transition-all',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'data-[state=on]:bg-[color:color-mix(in_srgb,var(--primary)_10%,transparent)] data-[state=on]:text-[color:var(--primary)] data-[state=on]:shadow-none',
    'data-[state=on]:hover:bg-[color:color-mix(in_srgb,var(--primary)_14%,transparent)] data-[state=on]:hover:text-foreground',
    'data-[state=off]:hover:text-foreground data-[state=off]:hover:bg-foreground/6',
    'data-[attention=true]:data-[state=off]:text-[color:var(--warning)] data-[attention=true]:data-[state=off]:shadow-[0_0_0_1px_color-mix(in_srgb,var(--warning)_38%,transparent)]',
    'motion-reduce:transition-none motion-reduce:duration-0',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-9 ps-2.5 pe-2 text-xs',
        md: 'h-9 ps-2.5 pe-2 text-sm',
        lg: 'h-10 ps-4 pe-3',
        icon: 'h-9 w-9 min-h-9 min-w-9 p-0',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export type ToggleGroupItemVariantProps = VariantProps<typeof toggleGroupItemVariants>;
