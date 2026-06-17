import { TwoStepConfirmGroup } from '../../../shared/ui/button/destructive-confirm.interaction';

type UploadDestructiveAction = 'remove_from_project' | 'delete_media' | 'open_in_media';

describe('Upload panel destructive two-step contract', () => {
  let group: TwoStepConfirmGroup<UploadDestructiveAction>;

  beforeEach(() => {
    group = new TwoStepConfirmGroup(document.createElement('div'));
  });

  afterEach(() => {
    group.destroy();
  });

  it('arms delete_media on first click and confirms on second', () => {
    const onConfirm = vi.fn();

    group.handleClick('delete_media', onConfirm);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(group.isArmed('delete_media')).toBe(true);

    group.handleClick('delete_media', onConfirm);
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(group.isArmed('delete_media')).toBe(false);
  });

  it('switches armed action when a different destructive item is clicked', () => {
    const onDelete = vi.fn();
    const onRemove = vi.fn();

    group.handleClick('delete_media', onDelete);
    group.handleClick('remove_from_project', onRemove);

    expect(group.isArmed('delete_media')).toBe(false);
    expect(group.isArmed('remove_from_project')).toBe(true);
    expect(onDelete).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('auto-disarms after the revert timeout', () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();

    group.handleClick('delete_media', onConfirm);
    expect(group.isArmed('delete_media')).toBe(true);

    vi.advanceTimersByTime(5000);
    expect(group.isArmed('delete_media')).toBe(false);
    expect(onConfirm).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
