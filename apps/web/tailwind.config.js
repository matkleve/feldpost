/**
 * Tailwind CSS configuration — Feldpost Angular app.
 *
 * Design token source of truth. All tokens defined here become the
 * canonical reference for every component; arbitrary values are only
 * permitted when no token covers the use case.
 *
 * Dark mode strategy: ['class', '[data-theme="dark"]']
 *   Tailwind dark: utilities activate when a [data-theme="dark"] attribute
 *   is present on an ancestor element (typically <html>). This mirrors the
 *   existing CSS custom-property toggle already in styles.scss — no changes
 *   to theme-toggle logic are required.
 *
 * Color tokens reference CSS custom properties so Tailwind utilities and
 * component SCSS stay in sync automatically. The CSS custom properties are
 * the single definition point; Tailwind wraps them as named utilities.
 *
 * Primitive color utilities (`bg-primary`, `text-foreground`, `border-border`, …)
 * are defined in `styles.scss` `@theme inline` (tweakcn). This file keeps only
 * additive extensions still referenced under `apps/web/src`.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  // ── Content paths ──────────────────────────────────────────────────────────
  // JIT compiler scans these files to tree-shake unused utilities.
  content: ['./src/**/*.{html,ts,scss}'],

  // ── Dark mode ──────────────────────────────────────────────────────────────
  // ['class', selector] variant: Tailwind generates dark: utilities that
  // activate when the given selector is present on an ancestor.
  // Matches [data-theme="dark"] set by ThemeService (future) or the OS
  // @media fallback already in styles.scss.
  darkMode: ['class', '[data-theme="dark"]'],

  theme: {
    // ── Extend (additive) — don't override Tailwind defaults wholesale ───────
    extend: {
      // ── Color palette (legacy name aliases removed 2026-05-19 — Phase 5) ───
      // Semantic primitives: use `bg-card`, `bg-background`, `text-foreground`, etc. from `@theme inline`.
      colors: {
        // Borders — `border-border` used in menu/dialog/toast CVA strings
        border: 'var(--border)',

        // Brand / semantic — `bg-success`, `bg-warning` in badge/toast CVA
        success: 'var(--success)',
        warning: 'var(--warning)',
        accent: 'var(--accent)',
      },

      // ── Minimum height for interactive tap targets ─────────────────────────
      // `docs/design/constitution.md` (Sizes and Touch): desktop floor 2.75rem (44px), mobile 3rem (48px).
      // Use `min-h-tap` / `min-w-tap` for desktop-aligned controls; pair with `min-h-tap-lg md:min-h-tap` when a row is touch-first on small viewports.
      minHeight: {
        tap: '2.75rem', // 44px — desktop minimum touch target
        'tap-lg': '3rem', // 48px — mobile / touch-first minimum
      },
    },
  },

  plugins: [],
};
