import { TestBed } from '@angular/core/testing';
import { SupabaseService } from '../../supabase/supabase.service';
import { SupabaseStorageAdapter } from './supabase-storage.adapter';

describe('SupabaseStorageAdapter', () => {
  let adapter: SupabaseStorageAdapter;
  let createSignedUrls: ReturnType<typeof vi.fn>;
  let createSignedUrl: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createSignedUrls = vi.fn();
    createSignedUrl = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        SupabaseStorageAdapter,
        {
          provide: SupabaseService,
          useValue: {
            client: {
              storage: {
                from: (bucket: string) => ({
                  createSignedUrls: createSignedUrls.mockImplementation(() =>
                    bucket === 'media'
                      ? Promise.resolve({
                          data: [{ path: 'a.jpg', signedUrl: null, error: 'not found' }],
                          error: null,
                        })
                      : Promise.resolve({ data: null, error: { message: 'batch failed' } }),
                  ),
                  createSignedUrl: createSignedUrl.mockImplementation(() =>
                    bucket === 'media'
                      ? Promise.resolve({ data: null, error: { message: 'not found' } })
                      : Promise.resolve({
                          data: { signedUrl: 'https://signed.example/a.jpg' },
                          error: null,
                        }),
                  ),
                }),
              },
            },
          },
        },
      ],
    });

    adapter = TestBed.inject(SupabaseStorageAdapter);
  });

  it('falls back per path to images when media batch omits signedUrl', async () => {
    const map = await adapter.createSignedUrlsWithFallback(['a.jpg'], 3600);

    expect(createSignedUrls).toHaveBeenCalledTimes(1);
    expect(createSignedUrl).toHaveBeenCalled();
    expect(map.get('a.jpg')).toBe('https://signed.example/a.jpg');
  });
});
