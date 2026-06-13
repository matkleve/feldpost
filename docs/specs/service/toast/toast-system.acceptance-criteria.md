# Toast System — Acceptance Criteria

Child of [`toast-system.md`](toast-system.md).

## Service / API

- [ ] `ToastService` is `providedIn: 'root'` singleton with signal-based `items()`
- [ ] `show()` accepts `ToastOptions` — flat `message` or structured `title`/`body`/`detail`/`codeRef`/`action`
- [ ] Structured form: `title` shown collapsed; `body` shown below title; `detail` behind "Show details" expand control
- [ ] `dedupe: true` skips show when a toast with matching `title`+`type` (or `message`+`type`) is already visible
- [ ] `duration: 0` disables auto-dismiss timer (toast stays until manually dismissed)
- [ ] Auto-dismiss after 4s (info/success/warning) or 6s (error) when no `duration` passed
- [ ] Rapid `show()` calls (same tick) correctly enforce max 3 limit
- [ ] Toasts persist across route changes (no `dismissAll()` on navigation)
- [ ] ID generation falls back to `Math.random()` if `crypto.randomUUID()` unavailable
- [ ] `ToastService` exposes `_testReset()` for test teardown (calls `dismissAll()` and clears all timers)

## Stack behaviour

- [ ] Maximum 3 toasts visible; 4th dismisses oldest
- [ ] Stacking: `flex-direction: column` + append order — newest closest to bottom anchor
- [ ] Gap between toasts collapses smoothly on exit (`transition: gap 200ms ease`)

## Animation

- [ ] Enter: **`toast-enter`** — `translateY(0.5rem)` + `scale(0.98)` → rest, opacity 0→1, 200ms ease-out on `[data-toast-surface]`
- [ ] Exit: **`toast-exit`** — `translateY(-0.5rem)` + opacity 0, 200ms ease-in
- [ ] `entering` → `visible` fires on `animationend`, not `setTimeout`
- [ ] `exiting` → removed fires on `animationend` via `afterExit()`
- [ ] `prefers-reduced-motion` disables transforms (opacity-only)

## Dismiss / pause

- [ ] Dismiss button (×) removes toast immediately
- [ ] Hover pauses auto-dismiss timer; mouseleave resumes
- [ ] Hover pause records `remainingMs = duration - (Date.now() - startedAt)` correctly; resume uses saved value

## Layout

- [ ] Toasts appear bottom-left: `left: 1rem`, `bottom: 1rem`, width `min(24rem, calc(100vw - 2rem))`
- [ ] Sidebar overlap / rail clearance is Phase 10 visual QA unless explicit layout rules are added
- [ ] Narrow (`max-width: 48rem`): no dedicated bottom-sheet clearance in current SCSS (defer to Phase 10)

## Accessibility

- [ ] Container has `role="region"`, `aria-label="Notifications"`, `aria-live="polite"`
- [ ] Error toasts set `aria-live="assertive"` to interrupt screen readers
- [ ] Dismiss button is Tab-focusable with `aria-label="Dismiss notification"`
- [ ] Message text wraps with `word-break: break-word`, clamped to 3 lines

## Styling

- [ ] `z-index: 400` on container — above dropdowns (300), below modals (500)
- [ ] Severity styling from `hlmToast` / `toastVariants` — no bespoke left-border strip in feature SCSS
- [ ] Works in light and dark themes via tweakcn semantic token ladder
- [ ] **Optional / not shipped:** error toasts forcing `duration: 0` on narrow viewports — add only with spec + product sign-off

## Consumer correctness

- [x] Legacy monolithic `toast.component.*` removed
- [ ] `MapShellComponent` upload-failed subscription shows structured error toast
- [ ] `MediaDetailViewComponent` shows success toast on replace/attach complete
- [ ] `MediaDetailViewComponent` shows info toast on coordinate copy
- [ ] `GpsButtonComponent` uses structured `show(ToastOptions)` API
- [ ] Hardcoded German strings in `map-shell.component.ts` replaced with `t(key, fallback)` — see [toast-authoring.supplement.md §Known copy debt](toast-authoring.supplement.md#8-known-copy-debt)
