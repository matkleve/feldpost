import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { SignedUrlCacheAdapter } from './signed-url-cache.adapter';
import { SupabaseStorageAdapter } from './supabase-storage.adapter';

describe('SignedUrlCacheAdapter batchSign', () => {
  it('does not sign non-image storage_path when thumbnail_path is missing', async () => {
    const createSignedUrlWithFallback = vi.fn();
    const createSignedUrlsWithFallback = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        SignedUrlCacheAdapter,
        {
          provide: SupabaseStorageAdapter,
          useValue: { createSignedUrlWithFallback, createSignedUrlsWithFallback },
        },
      ],
    });

    const adapter = TestBed.inject(SignedUrlCacheAdapter);
    const results = await adapter.batchSign(
      [{ id: 'pdf-1', storagePath: 'org/user/report.pdf', thumbnailPath: null }],
      'thumb',
    );

    expect(createSignedUrlWithFallback).not.toHaveBeenCalled();
    expect(createSignedUrlsWithFallback).not.toHaveBeenCalled();
    expect(results.get('pdf-1')?.url).toBeNull();
    expect(adapter.getLoadState('pdf-1', 'thumb')()).toBe('error');
  });

  it('still signs image storage_path when thumbnail_path is missing', async () => {
    const createSignedUrlWithFallback = vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://signed.example/photo.jpg' },
      error: null,
    });
    const createSignedUrlsWithFallback = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        SignedUrlCacheAdapter,
        {
          provide: SupabaseStorageAdapter,
          useValue: { createSignedUrlWithFallback, createSignedUrlsWithFallback },
        },
      ],
    });

    const adapter = TestBed.inject(SignedUrlCacheAdapter);
    const results = await adapter.batchSign(
      [{ id: 'img-1', storagePath: 'org/user/photo.jpg', thumbnailPath: null }],
      'thumb',
    );

    expect(createSignedUrlWithFallback).toHaveBeenCalledOnce();
    expect(results.get('img-1')?.url).toBe('https://signed.example/photo.jpg');
  });
});
