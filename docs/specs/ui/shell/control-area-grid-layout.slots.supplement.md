# Control-area grid — slot inventory

> **Parent:** [control-area-grid-layout.md](./control-area-grid-layout.md)  
> **Visual reference:** [reference-mock supplement](./control-area-grid-layout.reference-mock.supplement.md)

## Shell grid tracks (OQ-06-E)

```text
| left rail | map | content panel column | right rail |
```

## Left control area

| Container | Control options |
| --- | --- |
| Top | Logo · Map · Other pages |
| Bottom | **Profile** · **Settings** (separate panels — OQ-07) |

## Right control area

| Container | Control options |
| --- | --- |
| Top 1 | Notifications · Upload · Download · Shared media |
| *(gap)* | Explicit vertical gap (OQ-17) |
| Top 2 | Undo · Change history · Redo |
| Bottom | Tips · Help |

**Hover (OQ-02):** every option above — label expansion on ~1 s hover; overlays canvas.

## Content panel column (beside map)

Toggled by rail icons; large `.ui-container` panels per reference mock:

| Panel | Trigger | Status |
| --- | --- | --- |
| Upload | Right rail Upload (+ mock shows panel open) | Exists — re-home from upload shell |
| Help | Right rail Help | Mock / STUDY-011 |
| Settings | Left rail Settings | **Replaces settings overlay** |
| Profile | Left rail Profile | **Separate** from Settings — new panel |
| Shared media | Right rail | STUDY-010 |
| Workspace / selection | TBD | STUDY-007 — today’s workspace pane |

## Map zone floats

| Control | Placement |
| --- | --- |
| Search + filter | Top-left (OQ-18) |
| Theme cycle | **Bottom-right** (OQ-15) |
| Compass | Top-right (mock) |
| Scale | Bottom-left |
| Zoom ± | Bottom-right (with theme) |

## Migration from today

| Today | Target |
| --- | --- |
| Settings overlay | Settings **content panel** |
| Account row | Split → Profile panel + Settings panel |
| `app-upload-shell` absolute | Upload **content panel** + right rail icon |
| Workspace pane | Content panel column or STUDY-007 merge |
| Nav theme row | Theme float bottom-right on map |
| Search top-center | Search top-left |
