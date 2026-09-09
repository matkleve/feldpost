import { TestBed } from '@angular/core/testing';
import { UploadConflictService } from './upload-conflict.service';
import { AuthService } from '../../auth/auth.service';
import { SupabaseService } from '../../supabase/supabase.service';

function configureConflictService(args: {
  userId: string | null;
  rpc: ReturnType<typeof vi.fn>;
  from?: ReturnType<typeof vi.fn>;
}): UploadConflictService {
  TestBed.configureTestingModule({
    providers: [
      UploadConflictService,
      { provide: AuthService, useValue: { user: () => (args.userId ? { id: args.userId } : null) } },
      { provide: SupabaseService, useValue: { client: { rpc: args.rpc, from: args.from ?? vi.fn() } } },
    ],
  });
  return TestBed.inject(UploadConflictService);
}

/**
 * @see docs/audits/upload-process-analysis-2026-09-08/08-data-security.md § 5 (UP-01)
 * find_photoless_conflicts derives its tenant from public.user_org_id() server-side
 * (supabase/migrations/20260909180814_fix_find_photoless_conflicts_org_scope.sql).
 * The client MUST NOT send an organization id — a client-supplied p_org_id was the
 * cross-tenant read this fix closes; sending it again would silently reopen it if the
 * function signature is ever widened to accept it.
 */
describe('UploadConflictService', () => {
  it('calls find_photoless_conflicts without an organization id or a profile lookup', async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const fromMock = vi.fn();
    const service = configureConflictService({ userId: 'user-1', rpc: rpcMock, from: fromMock });

    await service.findConflict({ lat: 48.2, lng: 16.37 }, undefined);

    expect(rpcMock).toHaveBeenCalledWith('find_photoless_conflicts', {
      p_lat: 48.2,
      p_lng: 16.37,
      p_address: null,
    });
    const [, calledArgs] = rpcMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(calledArgs).not.toHaveProperty('p_org_id');
    // No org lookup: nothing to derive p_org_id from any more.
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('returns null without calling the RPC when there is no authenticated user', async () => {
    const rpcMock = vi.fn();
    const service = configureConflictService({ userId: null, rpc: rpcMock });

    const result = await service.findConflict(undefined, 'Fuchsthalergasse 4');

    expect(result).toBeNull();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('maps the first candidate row to a ConflictCandidate', async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'media-42',
          address_label: 'Fuchsthalergasse 4, Wien',
          latitude: 48.198,
          longitude: 16.335,
          distance_m: 12.4,
        },
      ],
      error: null,
    });
    const service = configureConflictService({ userId: 'user-1', rpc: rpcMock });

    const result = await service.findConflict(
      { lat: 48.198, lng: 16.335 },
      'Fuchsthalergasse 4, Wien',
    );

    expect(result).toEqual({
      mediaId: 'media-42',
      addressLabel: 'Fuchsthalergasse 4, Wien',
      latitude: 48.198,
      longitude: 16.335,
      distanceMeters: 12.4,
    });
  });
});
