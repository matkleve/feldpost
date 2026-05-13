// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-card-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Root card surface; tweakcn semantic tokens for border/background/text/shadow.
 * @see docs/MIGRATION_PLAN.md
 */
export const cardVariants = cva(
  'rounded-lg border border-border bg-card text-card-foreground shadow-sm',
  { variants: {}, defaultVariants: {} },
);

/**
 * Card header stack: vertical rhythm and padding.
 * @see docs/MIGRATION_PLAN.md
 */
export const cardHeaderVariants = cva('flex flex-col space-y-1.5 p-6', {
  variants: {},
  defaultVariants: {},
});

/**
 * Card main body padding; top padding cleared against header.
 * @see docs/MIGRATION_PLAN.md
 */
export const cardContentVariants = cva('p-6 pt-0', { variants: {}, defaultVariants: {} });

/**
 * Card footer row: horizontal alignment and padding.
 * @see docs/MIGRATION_PLAN.md
 */
export const cardFooterVariants = cva('flex items-center p-6 pt-0', {
  variants: {},
  defaultVariants: {},
});

/**
 * Card title typography (semantic heading should be chosen by the template author).
 * @see docs/MIGRATION_PLAN.md
 */
export const cardTitleVariants = cva('text-2xl font-semibold leading-none tracking-tight', {
  variants: {},
  defaultVariants: {},
});

/**
 * Card supporting description text.
 * @see docs/MIGRATION_PLAN.md
 */
export const cardDescriptionVariants = cva('text-sm text-muted-foreground', {
  variants: {},
  defaultVariants: {},
});

export type CardVariants = VariantProps<typeof cardVariants>;
export type CardHeaderVariants = VariantProps<typeof cardHeaderVariants>;
export type CardContentVariants = VariantProps<typeof cardContentVariants>;
export type CardFooterVariants = VariantProps<typeof cardFooterVariants>;
export type CardTitleVariants = VariantProps<typeof cardTitleVariants>;
export type CardDescriptionVariants = VariantProps<typeof cardDescriptionVariants>;
