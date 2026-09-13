import { vi } from 'vitest';

/**
 * A self-extending stub for Supabase's fluent query builder.
 *
 * Hand-rolled stubs spell out one exact chain — `select().in()` resolving to a
 * result — so the day production adds `.order(...)` to that chain, the stub
 * returns undefined and the test dies with "….order is not a function". That
 * is drift with no signal: the mock silently encodes a shape production has
 * already moved past. It happened for `.order`, `.or`, `.eq` and `.rpc`.
 *
 * This stub answers any method with itself, so a chain of any length composes,
 * and is awaitable so `await client.from(..).select(..).eq(..)` resolves to the
 * configured result. Each method is a persistent `vi.fn`, so call assertions
 * (`expect(client.from).toHaveBeenCalledWith('media_items')`) still work.
 *
 * It deliberately does not model PostgREST semantics — it will happily answer a
 * chain that would be invalid against a real database. It exists so that tests
 * about *other* behaviour are not coupled to the exact query shape. A test that
 * asserts on the query itself should assert on the recorded calls.
 */
export interface SupabaseChainResult {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}

const DEFAULT_RESULT: SupabaseChainResult = { data: [], error: null };

export type QueryChain = Record<string, ReturnType<typeof vi.fn>> & PromiseLike<SupabaseChainResult>;

/** Chainable, awaitable query-builder stub resolving to `result`. */
export function createQueryChain(result: SupabaseChainResult = DEFAULT_RESULT): QueryChain {
  const methods = new Map<string, ReturnType<typeof vi.fn>>();

  const chain = new Proxy({} as QueryChain, {
    get(_target, prop) {
      if (prop === 'then') {
        return (
          onFulfilled?: (value: SupabaseChainResult) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) => Promise.resolve(result).then(onFulfilled, onRejected);
      }
      // Vitest/jsdom probe objects with symbols (inspection, iteration); answering
      // those with a mock function makes the stub look like a thenable it isn't.
      if (typeof prop === 'symbol') return undefined;

      const key = String(prop);
      if (!methods.has(key)) {
        methods.set(
          key,
          vi.fn(() => chain),
        );
      }
      return methods.get(key);
    },
    has: () => true,
  });

  return chain;
}

export interface SupabaseClientStubOptions {
  /** Result every query chain resolves to. */
  queryResult?: SupabaseChainResult;
  /** Result `client.rpc(...)` resolves to. */
  rpcResult?: SupabaseChainResult;
  /** Signed URL handed back by the storage stub. */
  signedUrl?: string;
}

/** Supabase client stub: chainable `from`, an `rpc`, and a storage façade. */
export function createSupabaseClientStub(options: SupabaseClientStubOptions = {}) {
  const {
    queryResult = DEFAULT_RESULT,
    rpcResult = { data: 0, error: null },
    signedUrl = 'https://fake.url',
  } = options;

  return {
    // Parameters are declared so call assertions stay typed, e.g.
    // expect(client.from).toHaveBeenCalledWith('media_items').
    from: vi.fn((_table: string) => createQueryChain(queryResult)),
    rpc: vi.fn((_fn: string, _params?: Record<string, unknown>) => createQueryChain(rpcResult)),
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrls: vi.fn().mockResolvedValue({ data: [], error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl }, error: null }),
        upload: vi.fn().mockResolvedValue({ data: { path: 'p' }, error: null }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
  };
}

/**
 * Keep an explicit stub's own methods (the ones tests assert on) while
 * answering anything else with a chain.
 *
 * Per-table stubs spell out one exact chain — `select -> eq -> order` — and
 * break the moment production queries that table slightly differently. Wrapping
 * them keeps the specific spies meaningful and stops the unmodelled path from
 * throwing "…is not a function" in a test that is about something else.
 */
export function withChainFallback<T extends object>(
  stub: T,
  result: SupabaseChainResult = DEFAULT_RESULT,
): T {
  const fallback = createQueryChain(result);
  return new Proxy(stub, {
    get(target, prop, receiver) {
      if (prop in target) return Reflect.get(target, prop, receiver);
      if (typeof prop === 'symbol') return undefined;
      return (fallback as unknown as Record<string, unknown>)[String(prop)];
    },
    has: () => true,
  });
}
