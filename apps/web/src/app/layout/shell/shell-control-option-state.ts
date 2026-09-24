/** Stable state: hover label. @see docs/specs/ui/shell/shell-control-option.md */
export type HoverLabelState = 'hidden' | 'shown';

const TRANSITIONS: Record<HoverLabelState, readonly HoverLabelState[]> = {
  hidden: ['shown'],
  shown: ['hidden'],
};

/** Rejects unlisted transitions and keeps the current state. */
export function goToHoverLabel(current: HoverLabelState, next: HoverLabelState): HoverLabelState {
  return TRANSITIONS[current].includes(next) ? next : current;
}
