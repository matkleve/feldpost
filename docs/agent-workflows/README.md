# Agent Workflows & Instructions

Guides for working with AI coding agents on GeoSite effectively.

## Contents

| File                                                       | Purpose                                                     |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| [how-to-use-agents.md](how-to-use-agents.md)               | All available tools, common pitfalls, step-by-step workflow |
| [element-spec-format.md](element-spec-format.md)           | Template for writing element specs agents can implement     |
| [implementation-checklist.md](implementation-checklist.md) | Post-generation verification checklist                      |

## Core Problem

**Agents implement what they're told, not what you imagine.**

When we asked the agent to build search, it failed because the spec described _concepts_ (ranking, state machines, merge rules) but not _structure_ (what components exist, what they render, how they nest). The agent guessed the structure and got it wrong.

## Solution: Element Specs

Every UI element gets a structured spec in `docs/element-specs/` before agent implementation. The spec is:

- **Concrete** — what it looks like, what it does, what it connects to
- **Structured** — pseudo-HTML hierarchy maps directly to Angular components
- **Testable** — acceptance criteria with specific expected behaviors

The agent reads the spec and implements exactly that. No guessing.

## Quick Start

1. Write or review the element spec: `docs/element-specs/[element].md`
2. Ask agent to **plan first**: use `#plan-before-build` prompt
3. Review the plan, then ask agent to **implement**: use `#implement-element` prompt
4. Verify: use `#review-against-spec` prompt or run through `implementation-checklist.md`
