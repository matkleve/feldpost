# Element Spec Format

Practical writing template for specs in `docs/element-specs/`.
Governance, required section policy, split rules, and lint expectations live in `docs/element-specs/README.md`.

---

## How To Use This File

- Use this file when creating a new spec or rewriting an existing one.
- Treat `docs/element-specs/README.md` as the authority for what is required.
- Use this document for structure examples and writing guidance only.

## Template Structure

Each spec has these sections in this order. **Order matters** — agents read top-down and the short sections at the top prevent hallucination.

### 1. Title + "What It Is" (1–2 sentences)

Plain English. What is this thing? What does the user do with it?

### 2. What It Looks Like (3–5 sentences)

Visual appearance in plain words. Reference design tokens, sizes, rough layout. Enough for an agent to set up the right Tailwind classes.

### 3. Where It Lives

Route, parent component, and trigger condition. The agent needs to know where to wire it in.

### 4. Actions & Interactions (table)

Every user action and system response. If it's not in this table, the agent won't build it.

| #   | User Action | System Response | Triggers        |
| --- | ----------- | --------------- | --------------- |
| 1   | Clicks X    | Y happens       | navigates to /z |

### 5. Component Hierarchy (tree diagram)

The most important section. Shows what nests inside what, using a simple ASCII tree (not real HTML or Angular template code). Each node = a component or visual area. Include:

- Position/sizing hints as inline notes
- Conditional visibility in `[brackets]`
- Short description of what each node renders

Keep it readable — this is a structural guideline, not copy-pasteable code.

When a panel or list row matches an existing shared primitive, name it directly in the hierarchy (`.ui-container`, `.ui-item`, `.ui-item-media`, `.ui-item-label`, `.ui-spacer`) instead of describing new bespoke geometry.

In addition to the hierarchy tree, include the Mermaid diagrams required by `docs/element-specs/README.md`.

### 6. Data (table)

Where does data come from? Which Supabase tables, which columns, which service methods. Heading: `## Data`.

### 7. State (table)

Every piece of state: name, TypeScript type, default value, what it controls.

### 8. File Map (table)

Every file to create, with a 1-phrase purpose. Agent creates exactly these files.

### 9. Wiring

How this element connects to its parent. Route config, component imports, service injections.

### 10. Acceptance Criteria (checklist)

Checkbox list. Each item is testable. Used for verification after implementation.

---

## Why This Format Works

| Section             | What it prevents                                        |
| ------------------- | ------------------------------------------------------- |
| What It Is          | Agent misunderstanding the element's purpose            |
| What It Looks Like  | Agent guessing visual dimensions, colors, or layout     |
| Where It Lives      | Agent placing the component in the wrong parent or zone |
| Actions table       | Agent skipping unlisted behaviors                       |
| Hierarchy tree      | Agent guessing the component nesting                    |
| Data table          | Agent inventing fake APIs or queries                    |
| State table         | Agent adding extra unnecessary state                    |
| File Map            | Agent putting files in wrong places                     |
| Wiring              | Agent forgetting to connect the component to its parent |
| Acceptance Criteria | Unchecked bugs after generation                         |

## Writing Notes

- Keep `What It Is` and `What It Looks Like` short; move detail into `Actions`, `Component Hierarchy`, and optional deep-dive sections.
- Prefer shared layout primitives in the spec before inventing bespoke panel or row patterns.
- Use `rem` as the primary unit for accessibility-sensitive UI dimensions and annotate px equivalents only when exact size matters.
- Use `em` only for component-internal spacing that should scale with font size.
- Use `px` only for precision details that should not scale with font size.
- Use `vh` / `vw` only for viewport-relative layout behavior.
