import { TestBed } from '@angular/core/testing';
import { GeocodingService } from './geocoding/geocoding.service';
import { SupabaseService } from './supabase/supabase.service';

function nominatimResponse(overrides: Record<string, unknown> = {}) {
  return {
    display_name: 'Burgstrasse 7, 8001 Zurich, Switzerland',
    address: {
      road: 'Burgstrasse',
      house_number: '7',
      city: 'Zurich',
      city_district: 'Altstadt',
      country: 'Switzerland',
      country_code: 'ch',
      postcode: '8001',
      ...overrides,
    },
  };
}

describe('GeocodingService resilience', () => {
  let service: GeocodingService;
  let invokeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    invokeSpy = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        GeocodingService,
        {
          provide: SupabaseService,
          useValue: {
            client: {
              functions: { invoke: invokeSpy },
              auth: {
                getSession: vi.fn().mockResolvedValue({
                  data: {
                    session: {
                      access_token: 'test-token',
                    },
                  },
                }),
              },
            },
          },
        },
      ],
    });

    service = TestBed.inject(GeocodingService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retries when edge function returns retryable 502 and eventually succeeds', async () => {
    const retryableError = {
      name: 'FunctionsHttpError',
      message: 'Edge function returned status 502',
      status: 502,
      context: new Response(
        JSON.stringify({
          error: 'Nominatim request failed',
          failureType: 'upstream_http',
          status: 503,
        }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    };

    invokeSpy
      .mockResolvedValueOnce({ data: null, error: retryableError })
      .mockResolvedValueOnce({ data: nominatimResponse(), error: null });

    const result = await service.reverse(47.3769, 8.5417);

    expect(result).not.toBeNull();
    expect(invokeSpy).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retryable 400 and logs structured details', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const nonRetryableError = {
      name: 'FunctionsHttpError',
      message: 'Edge function returned status 400',
      status: 400,
      code: 'BAD_REQUEST',
      context: new Response(
        JSON.stringify({ error: 'lat and lng are required numbers for reverse' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    };

    invokeSpy.mockResolvedValueOnce({ data: null, error: nonRetryableError });

    const result = await service.reverse(47.3, 8.5);

    expect(result).toBeNull();
    expect(invokeSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      '[Geocoding] geocode request failed',
      expect.objectContaining({
        operation: 'reverse',
        status: 400,
        code: 'BAD_REQUEST',
      }),
    );
  });

  it('opens auth cooldown after 401 so subsequent calls fail soft without extra network calls', async () => {
    const unauthorizedError = {
      name: 'FunctionsHttpError',
      message: 'Edge Function returned a non-2xx status code',
      status: 401,
      context: new Response(JSON.stringify({ code: 401, message: 'Invalid JWT' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };

    invokeSpy.mockResolvedValueOnce({ data: null, error: unauthorizedError });

    const first = await service.reverse(48.2, 16.37);
    const second = await service.reverse(48.21, 16.38);

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(invokeSpy).toHaveBeenCalledTimes(1);
  });
});

