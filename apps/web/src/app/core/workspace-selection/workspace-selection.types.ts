/** Modifier keys from a grid tile primary click (open hit area). */
export interface MediaItemPointerModifiers {
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
}

/** Result of applying pointer modifiers against the visible grid order. */
export type GridPointerSelectionResult = 'open-item' | 'selection-changed';
