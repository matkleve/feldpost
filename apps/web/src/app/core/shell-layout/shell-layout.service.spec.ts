import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ShellLayoutService } from './shell-layout.service';

describe('ShellLayoutService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('ignores an unknown id and does not open the workspace upload tab', () => {
    const service = TestBed.inject(ShellLayoutService);
    service.setOpen('workspace-upload', true);
    expect(service.openPanels()).toEqual([]);
    service.open('upload');
    expect(service.openPanels().map((panel) => panel.id)).toEqual(['upload']);
    expect(service.isOpen('upload')).toBe(true);
  });
});
