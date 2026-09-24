import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { WidgetsService } from './widgets.service';

describe('WidgetsService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [WidgetsService] });
  });

  it('returns the same catalog twice', () => {
    const service = TestBed.inject(WidgetsService);
    expect(service.entries()).toBe(service.entries());
    expect(service.find('boats')?.id).toBe('boats');
    expect(service.find('nope')).toBeNull();
  });
});
