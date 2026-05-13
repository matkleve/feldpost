// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-skeleton-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// No `@spartan-ng/brain/skeleton` entry in the current `@spartan-ng/brain` pin — host-only CVA until brain/skeleton exists.

import { cva } from 'class-variance-authority';

export const skeletonVariants = cva('animate-pulse rounded-md bg-muted');
