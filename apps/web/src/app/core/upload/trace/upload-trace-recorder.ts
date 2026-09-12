/**
 * Observation buffer for the upload pipeline trace harness.
 *
 * The recorder is passive: the harness feeds it what the real pipeline did (phase changes,
 * search objects, group states, stub geocoder calls, Supabase calls) and the renderer turns
 * the buffer into a report. It contains no pipeline logic of its own, so it cannot make the
 * trace say something the pipeline did not do.
 *
 * @see docs/playbooks/upload-pipeline-trace.md
 */

import type { UploadJob, UploadPhase } from '../upload-manager.types';
import type { UploadGroupResolutionState, UploadSearchObject } from '../address-resolution/upload-address-resolution.types';

export type TraceStep =
  | 'intake'
  | 'search-object'
  | 'group'
  | 'phase'
  | 'geocode'
  | 'supabase-rpc'
  | 'storage'
  | 'table-write'
  | 'tray'
  | 'terminal';

export interface TraceEvent {
  seq: number;
  step: TraceStep;
  /** Scenario id (`S01`) when the event belongs to one file; absent for batch-level events. */
  scenario?: string;
  label: string;
  detail?: Record<string, unknown>;
}

export interface TraceGeocodeCall {
  seq: number;
  method: 'searchStructuredForward' | 'searchStructuredForwardBias' | 'reverse';
  params: Record<string, unknown>;
  hitCount: number;
  topLabel?: string;
  topScore?: number;
}

export interface TraceSupabaseCall {
  seq: number;
  kind: 'rpc' | 'select' | 'insert' | 'update' | 'delete' | 'storage-upload' | 'storage-remove';
  name: string;
  payload?: Record<string, unknown>;
}

export class UploadTraceRecorder {
  private seq = 0;
  private readonly eventLog: TraceEvent[] = [];
  private readonly geocodeLog: TraceGeocodeCall[] = [];
  private readonly supabaseLog: TraceSupabaseCall[] = [];
  private readonly searchObjects = new Map<string, UploadSearchObject>();
  private readonly groupStates = new Map<string, UploadGroupResolutionState>();
  /** relativePath → scenario id, so pipeline-generated job ids can be labelled. */
  private readonly scenarioByPath = new Map<string, string>();
  private readonly scenarioByJobId = new Map<string, string>();

  registerScenario(relativePath: string, scenarioId: string): void {
    this.scenarioByPath.set(relativePath, scenarioId);
  }

  /** Bind a pipeline job id to its scenario via the job's immutable relativePath. */
  bindJob(job: UploadJob): string | undefined {
    const path = job.relativePath ?? job.file.name;
    const scenario = this.scenarioByPath.get(path);
    if (scenario) {
      this.scenarioByJobId.set(job.id, scenario);
    }
    return scenario;
  }

  scenarioFor(jobId: string): string | undefined {
    return this.scenarioByJobId.get(jobId);
  }

  record(step: TraceStep, label: string, detail?: Record<string, unknown>, jobId?: string): void {
    this.seq += 1;
    this.eventLog.push({
      seq: this.seq,
      step,
      scenario: jobId ? this.scenarioByJobId.get(jobId) : undefined,
      label,
      detail,
    });
  }

  recordPhase(jobId: string, from: UploadPhase, to: UploadPhase, statusLabel?: string): void {
    this.record('phase', `${from} → ${to}`, statusLabel ? { statusLabel } : undefined, jobId);
  }

  recordSearchObject(jobId: string, so: UploadSearchObject): void {
    const scenario = this.scenarioByJobId.get(jobId);
    if (scenario) {
      this.searchObjects.set(scenario, so);
    }
    this.record('search-object', 'search object built', { groupingKey: so.groupingKey }, jobId);
  }

  recordGroupState(state: UploadGroupResolutionState): void {
    this.groupStates.set(state.groupingKey, state);
  }

  recordGeocode(call: Omit<TraceGeocodeCall, 'seq'>): void {
    this.seq += 1;
    this.geocodeLog.push({ seq: this.seq, ...call });
    this.eventLog.push({
      seq: this.seq,
      step: 'geocode',
      label: `${call.method} → ${call.hitCount} hit(s)`,
      detail: { ...call.params, topLabel: call.topLabel, topScore: call.topScore },
    });
  }

  recordSupabase(call: Omit<TraceSupabaseCall, 'seq'>): void {
    this.seq += 1;
    this.supabaseLog.push({ seq: this.seq, ...call });
    const step: TraceStep =
      call.kind === 'rpc'
        ? 'supabase-rpc'
        : call.kind.startsWith('storage')
          ? 'storage'
          : 'table-write';
    this.eventLog.push({ seq: this.seq, step, label: `${call.kind} ${call.name}`, detail: call.payload });
  }

  events(): readonly TraceEvent[] {
    return this.eventLog;
  }

  eventsForScenario(scenarioId: string): readonly TraceEvent[] {
    return this.eventLog.filter((event) => event.scenario === scenarioId);
  }

  searchObjectFor(scenarioId: string): UploadSearchObject | undefined {
    return this.searchObjects.get(scenarioId);
  }

  allSearchObjects(): ReadonlyMap<string, UploadSearchObject> {
    return this.searchObjects;
  }

  groups(): readonly UploadGroupResolutionState[] {
    return [...this.groupStates.values()];
  }

  geocodeCalls(): readonly TraceGeocodeCall[] {
    return this.geocodeLog;
  }

  supabaseCalls(): readonly TraceSupabaseCall[] {
    return this.supabaseLog;
  }

  /** Count of Supabase calls per name — the "how often did we hit the server" answer. */
  supabaseCallCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const call of this.supabaseLog) {
      const key = `${call.kind} ${call.name}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }
}
