# Segmented Switch Motion Resource

Status: Draft (2026-03-18)
Scope: transition behavior for `app-segmented-switch`

## Requested source

- Video link provided by product owner:
  - https://www.youtube.com/watch?v=EcbgbKtOELY

Note:

- Direct page retrieval in this environment was redirected to Google/YouTube login flow, so transcript-level extraction was not available automatically.

## External references used

1. Angular animations guidance (Context7, official angular.dev):
   - Prefer CSS-based state transitions for interactive controls.
   - For enter/leave transitions, Angular supports patterns via native CSS and structural rendering.
2. MDN transition reference:
   - Use explicit `transition-property` sets (not broad `all`) for predictable UI motion.
   - Use easing curves intentionally; `cubic-bezier(...)` for product-specific feel.
3. MDN transition-timing-function accessibility notes:
   - Respect `prefers-reduced-motion` and provide a less-animated fallback.
4. Material segmented-button guidance:
   - Keep states visually distinct with subtle motion and clear selected emphasis.

## Applied motion pattern

For `app-segmented-switch` we standardize:

1. State transitions on segmented buttons:
   - color
   - background-color
   - border-color
   - box-shadow
   - transform
   - opacity
2. Active state micro-lift:
   - selected option uses slight `translateY(-1px)` and orange-tinted shadow.
3. Detached inactive option animation:
   - enter animation (`opacity` + `translateX`) for inactive option group outside the pill.
4. Container spacing transition:
   - smooth gap change when inactive group appears/disappears.
5. Reduced motion support:
   - disable/near-disable transition/animation timing under `prefers-reduced-motion: reduce`.

## Current tokenized motion values

- Duration: `180ms`
- Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`
- Orange emphasis follows existing semantic clay/action tokens.

## Why this is the chosen default

1. Preserves current visual language (thin, calm, premium).
2. Keeps behavior stable while improving perceived responsiveness.
3. Avoids heavy animation frameworks for this primitive.
4. Stays compatible with the current token-layer strategy and theme contract.

## Follow-up (optional)

If a transcript or timestamp notes from the video are provided, append a section:

- "Video-derived refinements" with exact timing/easing/state notes and update the primitive accordingly.
