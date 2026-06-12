# Metadata Property Picker

> **Parent:** [metadata-section.md](metadata-section.md)

## What It Is

Projects-dropdown-style property name picker: search on top, list rows with type icon + name chip, create row when search has no exact `(keyName, valueType)` match.

## API

| Input | Type | Notes |
| --- | --- | --- |
| `definitions` | `MetadataKeyDefinitionView[]` | Org catalog |
| `excludedKeyIds` | `ReadonlySet<string>` | Keys **must** be `id:${metadataKeyId}` only |
| `valueType` | `MetadataComposeValueType` | Draft type filter for create row |
| `keyName` | `string` | Display / search seed |
| `metadataKeyId` | `string \| null` | When existing picked |
| `open` | `boolean` | |

| Output | Notes |
| --- | --- |
| `definitionSelected` | Locks to existing property |
| `draftNameChange` | Search typing → new property mode |

## Exclusion

Picker filters definitions where `excludedKeyIds.has('id:' + def.id)`.

## Acceptance Criteria

- [ ] Uses `app-dropdown-shell` + `app-standard-dropdown`.
- [ ] Create row label uses i18n with `{name}` and `{type}` placeholders.
- [ ] No confirmation dialog when creating from search.
