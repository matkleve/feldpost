# Layout Containers (shared)

## What It Is

Structural layout helpers (`CenteredLayout`, `MaxWidthContainer`, `PageContainer`, `Stack`) that establish page-level width constraints, vertical stacking, and centered content regions without domain logic.

## What It Looks Like

`CenteredLayout` centers children within the viewport width; `MaxWidthContainer` clamps content to a token max width; `PageContainer` composes page chrome padding; `Stack` applies vertical rhythm between siblings. Surfaces are neutral—no semantic colors beyond tokens.

## Where It Lives

- **Code:** `apps/web/src/app/shared/containers/`
- **Consumers:** Auth pages, settings, marketing shells, and any route needing consistent width and vertical stacking.

## Actions

| #   | User Action | System Response | Notes |
| --- | ----------- | --------------- | ----- |
| 1   | Parent nests content | Layout directives/classes apply | projection only |
| 2   | Resize viewport | Max-width and centering reflow | CSS-driven |

## Component Hierarchy

```text
app-centered-layout
app-max-width-container
app-page-container
app-stack
```

(Each is a standalone host; exact inner nodes are implementation details documented in source.)

## Data

| Source | Contract | Operation |
| ------ | -------- | --------- |
| Parent | projected content | Render inside layout hosts |

## File Map

| File | Purpose |
| ---- | ------- |
| `apps/web/src/app/shared/containers/centered-layout.component.ts` | Centering host |
| `apps/web/src/app/shared/containers/max-width-container.component.ts` | Max width clamp |
| `apps/web/src/app/shared/containers/page-container.component.ts` | Page padding shell |
| `apps/web/src/app/shared/containers/stack.component.ts` | Vertical stack spacing |
| `apps/web/src/app/shared/containers/index.ts` | Barrel exports |

## Wiring

- Import individual container components from `containers/index.ts` or direct paths.
- Do not import feature modules from these layout hosts.

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer (z-index/token) | Test Oracle |
| -------- | --------------------- | ---------------------- | --------------------------- | ------------- | ---------------------- | ----------- |
| Width clamp | max-width host | same host | projected content | host root class | content | content never exceeds token max |
| Vertical stack | stack host | same host | children | stack child gap | content | consistent gap between children |

### Ownership Triad Declaration

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| -------- | -------------- | ----------- | ------------ | ------------- |
| Neutral layout | respective host | N/A | host classes | ✅ |

## Acceptance Criteria

- [ ] No container component imports from `features/*`.
- [ ] Layout geometry is stable without JavaScript state toggles.
- [ ] Intermediate wrappers inside each component obey the repository intermediate-wrapper styling rule (zero styling unless documented exception).
