# Segmented Switch

The `app-segmented-switch` provides a stylised, accessible radio-group alternative.

## Variation Axes

| Axis          | Value             | Behavior                                                                                                                     |
| :------------ | :---------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| **Sizing**    | `fit` _(default)_ | Container wraps its contents. Buttons are sized to their natural content width or forced to be perfect squares if icon-only. |
| **Sizing**    | `fill`            | Container expands to 100% of its parent. All buttons stretch equally (`flex: 1 1 0`) to distribute available space evenly.   |
| **Item Type** | `text-only`       | Button renders standard padding and label text.                                                                              |
| **Item Type** | `icon-only`       | Button enforces strict `width === height` (perfect square) and hides any text.                                               |
| **Item Type** | `icon-with-text`  | Button renders standard padding with the icon leading and label trailing.                                                    |

## Pseudo-HTML / Structural Examples

### Sizing: Fit (Mixed Item Types)

```html
<app-segmented-switch sizing="fit">
  <app-segment type="icon-only" icon="upload" />
  <app-segment type="text-only" label="Hochgeladen" />
  <app-segment type="icon-with-text" icon="warning" label="Issues" />
</app-segmented-switch>
```

### Sizing: Fill (Equal Stretching)

```html
<app-segmented-switch sizing="fill">
  <app-segment type="text-only" label="Uploading" />
  <app-segment type="text-only" label="Uploaded" />
  <app-segment type="text-only" label="Issues" />
</app-segmented-switch>
```
