# Registry Format Decision

Back to master: [master-spec.md](./master-spec.md)

## Purpose

Record the mandatory decision for machine-readable design-system registry format before Wave 2 starts.

Decision date: 2026-03-20
Decision owner: Design System Owner
Status: implemented

## Decision Summary

Selected format: JSON

Rationale:

- Strong schema validation support for automation
- Better fit for AI-assisted checks and lint pipelines
- Easy mapping from component family -> variant axes -> state model

## Scope of Registry

The registry includes at minimum:

- Component family catalog
- Lifecycle status (`planned`, `draft`, `stable`, `deprecated`, `replaced`)
- Variant axes per component
- State model per component
- Responsive behavior contract
- Accessibility requirements
- Migration metadata (`replacement`, `owner`, `targetWave`, `impact`)

## Minimal JSON Schema (v1)

```json
{
  "version": "1.0.0",
  "updatedAt": "2026-03-20",
  "families": [
    {
      "id": "inputs-selection",
      "status": "draft",
      "components": [
        {
          "id": "segmented-switch",
          "status": "stable",
          "variants": {
            "size": ["compact", "default", "large"],
            "orientation": ["horizontal", "vertical"]
          },
          "states": ["default", "hover", "active", "focus-visible", "disabled"],
          "responsiveBehavior": ["fixed", "collapse"],
          "a11y": {
            "focusVisible": true,
            "keyboard": true,
            "minTouchTargetDesktop": "44x44",
            "minTouchTargetMobile": "48x48"
          },
          "migration": {
            "impact": "medium",
            "targetWave": 3
          }
        }
      ]
    }
  ]
}
```

## Target Files

- Registry file: `docs/design-system/registry.json`
- JSON schema: `docs/design-system/registry.schema.json`
- Validator script: `scripts/validate-design-system-registry.mjs`

Current implementation:

- [registry.json](./registry.json)
- [registry.schema.json](./registry.schema.json)
- [scripts/validate-design-system-registry.mjs](../../scripts/validate-design-system-registry.mjs)

## Validation Command

Run from repository root:

`node scripts/validate-design-system-registry.mjs`

Expected result:

- Exit code 0 when registry is valid
- Clear error path for invalid entries (family/component/field)

## Rollout Gate

No Wave 2 implementation PR may merge unless:

- registry file exists
- schema exists
- validator script exists
- CI runs the validator successfully

## Follow-up Tasks

1. Create initial `registry.json` from [component-inventory.md](./component-inventory.md).
2. Map variant axes from [component-variants-matrix.md](./component-variants-matrix.md).
3. Add migration metadata from [governance-adoption.md](./governance-adoption.md).
4. Add CI step for registry validation.
