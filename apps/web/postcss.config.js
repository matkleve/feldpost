/**
 * PostCSS configuration — Feldpost Angular app.
 *
 * Angular's @angular/build:application (esbuild) builder automatically
 * picks up this file when it is present in the project root (apps/web/).
 * No changes to angular.json are required.
 *
 * Tailwind v4: uses @tailwindcss/postcss instead of the bare tailwindcss plugin.
 */

module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};
