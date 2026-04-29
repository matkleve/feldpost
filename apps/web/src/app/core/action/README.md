# action service module

Facade: ./action-engine.service.ts
Shared types: ./action-types.ts
Context IDs: ./action-context-ids.ts

Declarative action resolution for feature menus. Feature modules define action
contexts and action definitions; this core module resolves visibility, disabled
state, translated labels, and ordering.

- **System contract:** [action-engine-system.md](../../../../../../docs/specs/system/action-engine-system.md)
- **Cross-surface action matrix:** [action-context-matrix.md](../../../../../../docs/specs/system/action-context-matrix.md)
