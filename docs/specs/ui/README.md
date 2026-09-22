# UI Specs

Folder index for feature UI system contracts.

Folder-specific rules:

- UI spec folders own feature-level integration contracts across related components.
- UI specs may link to page/component/service/system docs for dependencies and boundaries.
- UI specs must avoid owning service adapter internals.

**App nav:** [nav/nav-system.md](nav/nav-system.md)

**Workspace Pane (split host, `photoPanelOpen` interim):** [workspace/workspace-pane.md](workspace/workspace-pane.md) — [layout priorities backlog](../../backlog/workspace-pane-layout-and-spec-priorities.md).

**Upload panel (UI over `core/upload`):** [upload/upload-panel-system.md](upload/upload-panel-system.md) — component detail under [../component/upload/](../component/upload/).

Global governance references:

- ../README.md
- ../GOVERNANCE-MATRIX.md
