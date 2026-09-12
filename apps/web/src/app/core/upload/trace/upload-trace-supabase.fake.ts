/**
 * In-memory Supabase stand-in for the upload pipeline trace harness.
 *
 * It answers the queries the upload pipeline actually makes and records every one of them, so
 * the trace can show the server-side payloads (storage key, `media_items` columns,
 * `resolve_media_location` parameters) without a Supabase project.
 *
 * NOT reproduced: Row-Level Security, triggers, constraints, `address_dedupe_key` uniqueness,
 * PostGIS. Every one of those can reject a write that succeeds here.
 *
 * @see docs/playbooks/upload-pipeline-trace.md § Real vs mock
 */

import type { UploadTraceRecorder } from './upload-trace-recorder';

const TRACE_ORG_ID = 'org-trace-0001';
const MEDIA_ID_PAD = 4;
export const TRACE_USER_ID = 'user-trace-0001';

interface FakeResult {
  data: unknown;
  error: unknown;
}

type Payload = Record<string, unknown>;

interface DedupRegistryEntry {
  mediaItemId: string;
  registeredByUserId: string;
}

/** Mirrors the org-scoped `dedup_hashes` index the real RPC reads. */
export class TraceDedupRegistry {
  private readonly byHash = new Map<string, DedupRegistryEntry>();

  register(hash: string, entry: DedupRegistryEntry): void {
    if (!this.byHash.has(hash)) {
      this.byHash.set(hash, entry);
    }
  }

  lookup(hash: string): DedupRegistryEntry | undefined {
    return this.byHash.get(hash);
  }

  size(): number {
    return this.byHash.size;
  }
}

interface ChainState {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  payload?: Payload;
}

function buildChain(
  state: ChainState,
  resolve: (state: ChainState) => FakeResult,
  onSettle: (state: ChainState) => void,
): Record<string, unknown> {
  const settle = (): FakeResult => {
    onSettle(state);
    return resolve(state);
  };
  const chain: Record<string, unknown> = {};
  const pass = (): Record<string, unknown> => chain;
  chain['select'] = pass;
  chain['eq'] = pass;
  chain['in'] = pass;
  chain['order'] = pass;
  chain['limit'] = pass;
  chain['insert'] = (payload: Payload): Record<string, unknown> => {
    state.operation = 'insert';
    state.payload = Array.isArray(payload) ? (payload[0] as Payload) : payload;
    return chain;
  };
  chain['update'] = (payload: Payload): Record<string, unknown> => {
    state.operation = 'update';
    state.payload = payload;
    return chain;
  };
  chain['upsert'] = (payload: Payload): Record<string, unknown> => {
    state.operation = 'upsert';
    state.payload = payload;
    return chain;
  };
  chain['delete'] = (): Record<string, unknown> => {
    state.operation = 'delete';
    return chain;
  };
  chain['single'] = (): Promise<FakeResult> => Promise.resolve(settle());
  chain['maybeSingle'] = (): Promise<FakeResult> => Promise.resolve(settle());
  chain['then'] = (
    onFulfilled?: (value: FakeResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ): Promise<unknown> => Promise.resolve(settle()).then(onFulfilled, onRejected);
  return chain;
}

export interface TraceSupabaseFake {
  client: Record<string, unknown>;
  dedupRegistry: TraceDedupRegistry;
  insertedMediaIds: string[];
}

type TableResolver = (state: ChainState) => FakeResult;

function createTableResolver(
  dedupRegistry: TraceDedupRegistry,
  insertedMediaIds: string[],
): TableResolver {
  return (state) => {
    if (state.table === 'profiles') {
      return { data: { organization_id: TRACE_ORG_ID }, error: null };
    }
    if (state.table === 'media_items' && state.operation === 'insert') {
      const id = `media-${String(insertedMediaIds.length + 1).padStart(MEDIA_ID_PAD, '0')}`;
      insertedMediaIds.push(id);
      return { data: { id }, error: null };
    }
    if (state.table === 'dedup_hashes' && state.operation === 'insert') {
      const hash = String(state.payload?.['content_hash'] ?? '');
      const mediaItemId = String(state.payload?.['media_item_id'] ?? '');
      if (hash) {
        dedupRegistry.register(hash, { mediaItemId, registeredByUserId: TRACE_USER_ID });
      }
      return { data: null, error: null };
    }
    return { data: null, error: null };
  };
}

function createTableRecorder(recorder: UploadTraceRecorder): (state: ChainState) => void {
  return (state) => {
    // The profile lookup is plumbing for the storage key, not a pipeline decision.
    if (state.table === 'profiles') {
      return;
    }
    recorder.recordSupabase({
      kind: state.operation === 'upsert' ? 'insert' : state.operation,
      name: state.table,
      payload: state.payload,
    });
  };
}

function createRpcHandlers(
  dedupRegistry: TraceDedupRegistry,
): Record<string, (params: Payload) => FakeResult> {
  return {
    check_dedup_hashes: (params): FakeResult => {
      const hashes = (params['hashes'] as string[] | undefined) ?? [];
      const hit = hashes.map((hash) => dedupRegistry.lookup(hash)).find(Boolean);
      return {
        data: hit
          ? [{ media_item_id: hit.mediaItemId, registered_by_user_id: hit.registeredByUserId }]
          : [],
        error: null,
      };
    },
    // Miss on purpose: no pre-existing `locations` row, so every group reaches the geocoder.
    get_location_by_address_components: () => ({ data: null, error: null }),
    find_photoless_conflicts: () => ({ data: [], error: null }),
    list_project_locations: () => ({ data: [], error: null }),
    list_locations_for_media: () => ({ data: [], error: null }),
  };
}

function createStorageFake(recorder: UploadTraceRecorder): Record<string, unknown> {
  return {
    from: (bucket: string): Record<string, unknown> => ({
      upload: (path: string): Promise<FakeResult> => {
        recorder.recordSupabase({ kind: 'storage-upload', name: `${bucket}/${path}` });
        return Promise.resolve({ data: { path }, error: null });
      },
      remove: (paths: string[]): Promise<FakeResult> => {
        recorder.recordSupabase({ kind: 'storage-remove', name: `${bucket}/${paths.join(',')}` });
        return Promise.resolve({ data: null, error: null });
      },
      createSignedUrl: (path: string): Promise<FakeResult> =>
        Promise.resolve({ data: { signedUrl: `https://stub.invalid/${path}` }, error: null }),
      download: (): Promise<FakeResult> =>
        Promise.resolve({ data: null, error: 'stub: no download' }),
    }),
  };
}

/** Builds the fake client; every call is pushed into the recorder. */
export function buildTraceSupabaseFake(recorder: UploadTraceRecorder): TraceSupabaseFake {
  const dedupRegistry = new TraceDedupRegistry();
  const insertedMediaIds: string[] = [];
  const resolveTable = createTableResolver(dedupRegistry, insertedMediaIds);
  const recordTable = createTableRecorder(recorder);
  const rpcHandlers = createRpcHandlers(dedupRegistry);

  const client: Record<string, unknown> = {
    storage: createStorageFake(recorder),
    from: (table: string): Record<string, unknown> =>
      buildChain({ table, operation: 'select' }, resolveTable, recordTable),
    rpc: (name: string, params: Payload = {}): Promise<FakeResult> => {
      recorder.recordSupabase({ kind: 'rpc', name, payload: params });
      const handler = rpcHandlers[name];
      return Promise.resolve(handler ? handler(params) : { data: null, error: null });
    },
  };

  return { client, dedupRegistry, insertedMediaIds };
}
