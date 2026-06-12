# System Specs

Folder index for cross-cutting orchestration contracts.

Folder-specific rules:

- Files in this folder define multi-surface orchestration and cross-module behavior matrices.
- System specs may reference page/ui/component/service contracts but must not duplicate module-local ownership details.
- Cross-context action contracts belong here when they span more than one UI surface.
- **Declarative menu resolution:** [action-engine-system.md](action-engine-system.md) (pairs with [action-context-matrix.md](action-context-matrix.md)).
- **General authorization (RLS + roles):** [authorization-model.md](authorization-model.md)
- **Security analyses:** [security/README.md](security/README.md)

Global governance references:

- ../README.md
- ../GOVERNANCE-MATRIX.md
