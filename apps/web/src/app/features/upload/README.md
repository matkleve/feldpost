# features/upload

Upload shell, panel, and resolver-tray UI over **`UploadManagerService`** (`core/upload`).

## Layout

| Subfolder | Responsibility |
| --- | --- |
| `upload-shell/` | Fixed upload trigger, shell composition, `UploadShellUiService` |
| `upload-panel/` | Upload panel + item components, panel services, panel specs |
| `upload-resolver-tray/` | Location resolver tray component, helpers, mocks |
| *(root)* | Cross-cutting `upload-phase.helpers.ts`, `upload-dev-flags.ts` |

## Specs

- **UI system contract:** [upload-panel-system.md](../../../../../../docs/specs/ui/upload/upload-panel-system.md)
- **Ingestion / pipeline (normative IO):** [media-upload-service README](../../../../../../docs/specs/service/media-upload-service/README.md)
- **Component specs:** [upload-panel.md](../../../../../../docs/specs/component/upload/upload-panel.md)
