// TODO(spartan-v4): Replace with @spartan-ng/ui-toggle-group-helm when available for Tailwind v4.
import { cva, type VariantProps } from 'class-variance-authority';

// Toggle group container
// @see docs/MIGRATION_PLAN.md
export const toggleGroupVariants = cva(
  'inline-flex items-center justify-center rounded-md bg-muted p-1 gap-1',
);

// Individual toggle item
// @see docs/MIGRATION_PLAN.md
export const toggleGroupItemVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm',
  {
    variants: {
      size: {
        sm: 'h-7 px-2 text-xs',
        md: 'h-9 px-3 text-sm',
        lg: 'h-10 px-4',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export type ToggleGroupItemVariantProps = VariantProps<typeof toggleGroupItemVariants>;
