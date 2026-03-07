# Agent Workflows & Instructions

> **Source of truth has moved to `.github/`.**
> Custom agents, prompts, skills, instructions, and hooks now live in `.github/` where VS Code Copilot auto-discovers them. This folder retains the original design rationale and is linked from the skills as reference material.

## New Structure (in `.github/`)

| Location                                 | What                                                       |
| ---------------------------------------- | ---------------------------------------------------------- |
| `AGENTS.md` (root + nested)              | Workspace-level instructions, loaded automatically         |
| `.github/instructions/*.instructions.md` | File-pattern–scoped coding conventions                     |
| `.github/agents/*.agent.md`              | Custom agents: planner, implementer, reviewer, spec-writer |
| `.github/prompts/*.prompt.md`            | Slash-command prompts (5 total)                            |
| `.github/skills/*/SKILL.md`              | Reusable skills: implement-from-spec, write-element-spec   |
| `.github/hooks/post-edit.json`           | Auto-format hook (prettier)                                |

## Quick Start

1. Write or review the element spec: `docs/element-specs/[element].md`
2. Ask agent to **plan first**: use `/plan-before-build` prompt
3. Review the plan, then **implement**: use `/implement-element` prompt
4. Verify: use `/review-against-spec` prompt
5. Or invoke a custom agent directly: `@planner`, `@implementer`, `@reviewer`, `@spec-writer`

## Original Design Rationale

These files document _why_ we use structured specs and agent workflows:

| File                                                       | Purpose                                |
| ---------------------------------------------------------- | -------------------------------------- |
| [how-to-use-agents.md](how-to-use-agents.md)               | Workflow guide, tips, common pitfalls  |
| [element-spec-format.md](element-spec-format.md)           | Template rationale for element specs   |
| [implementation-checklist.md](implementation-checklist.md) | Post-generation verification checklist |

## Core Principle

**Agents implement what they're told, not what you imagine.**

Every UI element gets a structured spec in `docs/element-specs/` before agent implementation. The spec is concrete, structured, and testable. The agent reads the spec and implements exactly that.
