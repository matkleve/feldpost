# Upload Panel - 3-Dot Menu Audit

## 1. State Table
Here is an overview of what currently renders versus what *should* render based on the new rules.

| Lane / State | Currently renders | Should render |
| - | - | - |
| **Uploading** (Any phase, no issue) | (none or empty) | `Stop uploading` |
| **Uploaded** (No project) | `Click on map`, `Enter address`, `Add to project`, `Details oeffnen`, `Download`, `Prioritize`, `Remove from list` | `Change GPT`*, `Change Address`*, `Add to project`, `Details oeffnen`, `Download`, `Prioritize`, `Remove from list`|
| **Uploaded** (In project) | `Click on map`, `Enter address`, `Open project`, `Add to project`, `Details oeffnen`, `Download`, `Prioritize`, `Remove from list` | `Change GPT`*, `Change Address`*, `Open project`, `Details oeffnen`, `Download`, `Prioritize`, `Remove from list` |
| **Issue — duplicate** | `Open existing media`, `Upload anyway`, `Remove from list` | `Open existing media`, `Upload anyway`, `Remove from list` |
| **Issue — missing GPS** | (empty except Remove from list) | `Change GPT`*, `Change Address`*, `Remove from list` |
| **Failed** (Error) | (empty) | `Retry` (if we have it, otherwise just `Remove from list`) |

*Note: Per requirements, "Click on map" and "Enter address" are changing to "Change GPT" / "Change Address". "Add to project" is removed if already project-bound, otherwise available.*
*"Remove from list" is the destructive bottom item in all states. If State is Uploading, it says "Stop uploading" instead.*

## 2. All Possible Options & Rules

1. `open_in_media` (Details oeffnen) - Only on `Uploaded`.
2. `open_existing_media` - Only on `duplicate_photo` issue.
3. `upload_anyway` - Only on `duplicate_photo` issue.
4. `open_project` - Only on `Uploaded` if it belongs to a project (requires `showOpenProject()`).
5. `add_to_project` - Only on `Uploaded` if we can add it to a project.
6. `change_location_map` - Becomes "Change GPT". Available on `Uploaded` OR `missing_data` (Issue).
7. `change_location_address` - Becomes "Change Address". Available on `Uploaded` OR `missing_data` (Issue).
8. `download` - Only on `Uploaded`.
9. `toggle_priority` - Only on `Uploaded`.
10. **(Divider)**
11. `dismiss` - ALWAYS PRESENT at the bottom.
     - Label: "Stop uploading" (State == Uploading)
     - Label: "Remove from list" (State == Uploaded or Issues)

## 3. Dropdown Header removal
- `<div class="upload-item-context-menu__section-label" role="presentation">` is being removed.
- `map-context-menu__header option-menu-header` is already removed.

## 4. CSS Audit (Pending next step)