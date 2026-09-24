import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FeatureFlagsQueryAdapter } from './adapters/feature-flags-query.adapter';
import { FeatureFlagsStorageAdapter } from './adapters/feature-flags-storage.adapter';
import { FeatureFlagsService } from './feature-flags.service';

describe('FeatureFlagsService', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    TestBed.configureTestingModule({
      providers: [
        FeatureFlagsService,
        {
          provide: FeatureFlagsQueryAdapter,
          useValue: { read: () => 'shellGridLayout' },
        },
        {
          provide: FeatureFlagsStorageAdapter,
          useValue: {
            read: () => 'false',
            write: (name: string, value: boolean) => storage.set(name, String(value)),
          },
        },
      ],
    });
  });

  it('reads the same signal value twice and persists the query override', () => {
    const service = TestBed.inject(FeatureFlagsService);
    expect(service.shellGridLayout()).toBe(true);
    expect(service.shellGridLayout()).toBe(true);
    expect(storage.get('shellGridLayout')).toBe('true');
  });
});
