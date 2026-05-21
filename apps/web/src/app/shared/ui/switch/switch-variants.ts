// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-switch-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Switch track (Radix-style `data-state` on the same node as the thumb’s sibling layout).
 * @see docs/MIGRATION_PLAN.md
 */
export const switchVariants = cva(
  'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
);

/**
 * Switch thumb; pair with {@link switchVariants} on the track (`data-state` mirrored on thumb).
 * @see docs/MIGRATION_PLAN.md
 */
export const switchThumbVariants = cva(
  // shadcn h-5/w-5 thumb; travel + easing in styles/switch-thumb-hover.scss.
  'pointer-events-none block h-5 w-5 shrink-0 rounded-full bg-background shadow-lg ring-0',
);

/**
 * Legacy `span[uiToggleSwitch]` keeps pseudo-thumb sizing in `toggle.scss`; this shell adds token focus/disabled + checked bg without fixed `h-6 w-11`.
 * @see docs/MIGRATION_PLAN.md
 */
export const switchLegacyShimTrackVariants = cva(
  'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
);

/**
 * Toggle row shell CVA (token focus + error/loading tone); geometry stays on `.ui-toggle-row` SCSS until callsites migrate to `BrnSwitch`.
 * @see docs/MIGRATION_PLAN.md
 */
export const toggleRowVariants = cva('', {
  variants: {
    tone: {
      default:
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      error:
        'border-destructive/50 bg-destructive/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      loading: 'pointer-events-none opacity-[0.72]',
    },
  },
  defaultVariants: { tone: 'default' },
});

export type ToggleRowVariants = VariantProps<typeof toggleRowVariants>;
