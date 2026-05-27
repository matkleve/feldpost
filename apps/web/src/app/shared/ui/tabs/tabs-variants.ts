// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-tabs-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.
// @see docs/MIGRATION_PLAN.md

import { cva, type VariantProps } from 'class-variance-authority';

export type TabsListVariantProps = VariantProps<typeof tabsListVariants>;

/** Tab list chrome (muted rail or line underline row). */
export const tabsListVariants = cva(
  'group/tabs-list inline-flex items-center text-muted-foreground',
  {
    variants: {
      variant: {
        default: 'h-10 justify-center rounded-md bg-muted p-1',
        line: 'h-10 w-full justify-start gap-1 rounded-none bg-transparent p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

/** Individual tab trigger surface; active state uses `data-[state=active]` from BrnTabs. */
export const tabsTriggerVariants = cva(
  'inline-flex cursor-pointer items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'rounded-sm px-3 py-1.5 text-muted-foreground hover:text-primary data-[state=active]:bg-[color-mix(in_srgb,var(--interaction-selected-ink)_10%,transparent)] data-[state=active]:text-[var(--interaction-selected-ink)] data-[state=active]:shadow-sm data-[state=active]:hover:text-primary',
        line:
          'relative rounded-none border border-transparent px-4 pb-3 pt-2 text-muted-foreground hover:text-primary data-[state=active]:bg-transparent data-[state=active]:text-[var(--interaction-selected-ink)] data-[state=active]:shadow-none data-[state=active]:hover:text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--interaction-selected-ink)] after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export type TabsTriggerVariantProps = VariantProps<typeof tabsTriggerVariants>;

/** Tab panel chrome below triggers. */
export const tabsContentVariants = cva(
  'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
);
