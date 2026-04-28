# grouping dropdown.drag and state machine.supplement

> Parent: [`grouping-dropdown.md`](./grouping-dropdown.md)

## Cross-Section Drag Interaction (CDK DragDrop)

Both sections share a `cdkDropListGroup`. Each section is a `cdkDropList` connected to the other via `[cdkDropListConnectedTo]`. Dragging an item across the divider transfers it between lists.

### Single-Item Drag

```mermaid
sequenceDiagram
    participant U as User
    participant DD as GroupingDropdown
    participant CDK as @angular/cdk DragDrop
    participant WVS as WorkspaceViewService
    participant WP as WorkspacePane Content

    U->>DD: mousedown on drag handle (≡, right side)
    DD->>CDK: cdkDragStarted
    U->>DD: drag row across divider (Active → Available)
    DD->>CDK: cdkDragMoved (preview crosses divider)
    U->>DD: mouseup (drop into Available section)
    CDK->>DD: cdkDropListDropped(event)
    DD->>DD: transferArrayItem(active → available)
    DD->>WVS: groupingsChanged([City, Material] → [City])
    WVS->>WVS: re-group media item list
    WVS->>WP: emit grouped sections
    WP->>WP: re-render headings + thumbnail grid
```

### Multi-Select Drag

```mermaid
sequenceDiagram
    participant U as User
    participant DD as GroupingDropdown
    participant CDK as @angular/cdk DragDrop
    participant WVS as WorkspaceViewService

    U->>DD: Ctrl+Click "City" row (selects)
    DD->>DD: selectedRows.add('city')
    U->>DD: Ctrl+Click "Country" row (selects)
    DD->>DD: selectedRows.add('country')
    Note over DD: 2 rows highlighted with selected state

    U->>DD: mousedown on drag handle of any selected row
    DD->>CDK: cdkDragStarted (custom preview shows 2 items)
    U->>DD: drag selection across divider
    U->>DD: mouseup (drop)
    CDK->>DD: cdkDropListDropped(event)
    DD->>DD: transferArrayItem for each selected row
    DD->>DD: selectedRows.clear()
    DD->>WVS: groupingsChanged(updated list)
    WVS->>WVS: re-group media item list
```

## Grouping Dropdown — State Machine

```mermaid
stateDiagram-v2
    [*] --> Empty

    state Empty {
        [*]: No active groupings\nAll properties in Available section\nToolbar dot hidden
    }

    state SingleGrouping {
        [*]: One property in Active section\nRemaining in Available\nToolbar dot visible (clay)
    }

    state MultiGrouping {
        [*]: 2+ properties in Active section\nDrag handles visible on hover\nToolbar dot visible (clay)
    }

    state DragWithinActive {
        [*]: User dragging within Active section\nDrop preview shows new position\nReorders grouping priority
    }

    state DragCrossSection {
        [*]: User dragging across divider\nPreview crosses boundary\nActivates or deactivates property
    }

    state MultiSelected {
        [*]: 2+ rows have selected state (Ctrl+Click)\nDrag moves entire selection
    }

    Empty --> SingleGrouping: click available property
    Empty --> SingleGrouping: drag available row ↑ past divider
    SingleGrouping --> MultiGrouping: click / drag another property up
    MultiGrouping --> MultiGrouping: click / drag another property up
    MultiGrouping --> DragWithinActive: drag handle within Active
    DragWithinActive --> MultiGrouping: drop (reorder applied)
    SingleGrouping --> DragCrossSection: drag active row ↓ past divider
    MultiGrouping --> DragCrossSection: drag active row ↓ past divider
    DragCrossSection --> Empty: drop in Available (was last active)
    DragCrossSection --> SingleGrouping: drop in Available (leaves 1)
    DragCrossSection --> MultiGrouping: drop in Available (leaves 2+)
    DragCrossSection --> SingleGrouping: drop in Active (was available, now 1)
    DragCrossSection --> MultiGrouping: drop in Active (was available, now 2+)

    Empty --> MultiSelected: Ctrl+Click rows
    SingleGrouping --> MultiSelected: Ctrl+Click rows
    MultiGrouping --> MultiSelected: Ctrl+Click rows
    MultiSelected --> DragCrossSection: drag selected group
    MultiSelected --> Empty: click without Ctrl (clears)
    MultiSelected --> SingleGrouping: click without Ctrl (clears)
    MultiSelected --> MultiGrouping: click without Ctrl (clears)
```

## Grouping Row States

```mermaid
stateDiagram-v2
    state "Available Row — Idle" as AvailIdle {
        [*]: text-secondary\nMedia icon + Label\nDrag handle hidden
    }
    state "Available Row — Hover" as AvailHover {
        [*]: bg clay 8%\nDrag handle visible (right)\ncursor pointer
    }
    state "Active Row — Idle" as ActiveIdle {
        [*]: text-primary\nMedia icon + Label\nDrag handle hidden
    }
    state "Active Row — Hover" as ActiveHover {
        [*]: bg clay 8%\nDrag handle visible (right, opacity 1)\ncursor grab on handle
    }
    state "Row — Dragging" as Dragging {
        [*]: elevated shadow\nopacity 0.8\ncursor grabbing\nplaceholder shown in source list
    }
    state "Row — Selected" as Selected {
        [*]: bg clay 14% persistent\nborder-left 2px clay\npart of multi-select group
    }
    state "Selected + Hover" as SelectedHover {
        [*]: bg clay 18%\nDrag handle visible (right)\ncursor grab
    }

    AvailIdle --> AvailHover: mouseenter
    AvailHover --> AvailIdle: mouseleave
    AvailHover --> ActiveIdle: click to activate
    AvailHover --> Dragging: mousedown on drag handle
    Dragging --> ActiveIdle: drop in Active section
    Dragging --> AvailIdle: drop in Available section

    ActiveIdle --> ActiveHover: mouseenter
    ActiveHover --> ActiveIdle: mouseleave
    ActiveHover --> Dragging: mousedown on drag handle

    AvailIdle --> Selected: Ctrl+Click
    ActiveIdle --> Selected: Ctrl+Click
    Selected --> AvailIdle: Ctrl+Click (deselect) / click without Ctrl
    Selected --> ActiveIdle: Ctrl+Click (deselect) / click without Ctrl
    Selected --> SelectedHover: mouseenter
    SelectedHover --> Selected: mouseleave
    SelectedHover --> Dragging: mousedown on drag handle (drags all selected)
```

## Row Layout

```
┌─────────────────────────────────────┐
│  [icon]   Property Name        [≡]  │
│  media    label           drag handle│
│  (leading)               (trailing)  │
└─────────────────────────────────────┘

  • Media icon: always visible, property-type icon (calendar, location_on, etc.)
  • Label: always visible, property name
  • Drag handle (≡): trailing, visible on hover only (Quiet Actions)
  • No × button anywhere
```

