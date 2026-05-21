# Metadata Type Picker

> **Parent:** [metadata-section.md](metadata-section.md)

## What It Is

Icon-only outline trigger for compose-time property type (text / number / date). No chevron.

## API

| Input | Type | Notes |
| --- | --- | --- |
| `valueType` | `MetadataComposeValueType` | Current type |
| `disabled` | `boolean` | |
| `locked` | `boolean` | When existing property picked |
| `open` | `boolean` | Panel open state |

| Output | Notes |
| --- | --- |
| `valueTypeChange` | Emits new compose type |
| `openChange` | Panel exclusivity with property picker |

## Visual Behavior Contract

| Behavior | Geometry owner | State owner | Visual owner | Same element? |
| --- | --- | --- | --- | --- |
| Trigger button | `button.metadata-type-picker__trigger` | `open` input | `metadata-type-picker.component.scss` | yes |
| Type icon | `.material-icons` in trigger | `valueType` | icon map (`tag` / `numbers` / `event`) | yes |

## Acceptance Criteria

- [ ] Single bordered icon button; no chevron.
- [ ] Menu: Text, Number, Date only (MVP).
- [ ] When `locked`, trigger disabled.
