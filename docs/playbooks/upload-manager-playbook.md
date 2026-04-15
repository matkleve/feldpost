# Upload Manager Implementation Playbook

**Step-by-step guide for improving the Upload Manager system**

---

## 🎯 Current State Analysis

### Problems Identified

1. **Complex Pipeline**: 18+ phases with intricate state management
2. **Error Handling**: Manual retry, no automatic recovery
3. **Performance**: Single hash checks, no batch optimization
4. **Code Size**: ~600 lines in service, complex to maintain
5. **User Experience**: Limited feedback during failures

### Files Involved

- `apps/web/src/app/core/upload-manager.service.ts` - Main orchestrator
- `apps/web/src/app/core/upload-manager.types.ts` - Types & interfaces
- `apps/web/src/app/core/upload-new-pipeline.service.ts` - New upload pipeline
- `apps/web/src/app/core/upload-*.service.ts` - Various pipeline services
- `docs/element-specs/upload-manager/upload-manager.md` - Specification (571 lines!)

---

## 🚀 Improvement Strategy

### Phase 1: Pipeline Simplification (High Impact)

#### Goal: Reduce from 18+ phases to 5 core phases

**Current Phases**:

```
queued → validating → parsing_exif → hashing → dedup_check →
extracting_title → conflict_check → awaiting_conflict_resolution →
uploading → saving_record → replacing_record → resolving_address →
resolving_coordinates → missing_data → complete → error
```

**Simplified Phases**:

```
queued → processing → uploading → finalizing → complete/error
```

#### Implementation Steps

1. **Create simplified types**:

```typescript
// New simplified phases
export type SimpleUploadPhase =
  | "queued" // Waiting in queue
  | "processing" // Validation + EXIF + Hash + Dedup
  | "uploading" // Storage + DB operations
  | "finalizing" // Geocoding + conflict resolution
  | "complete" // Success
  | "error"; // Failure
```

2. **Combine pipeline services**:
   - Merge `upload-new-pipeline.service.ts` phases
   - Create `upload-simplified-pipeline.service.ts`
   - Keep old service for backward compatibility during transition

3. **Update state management**:
   - Simplify `upload-job-state.service.ts`
   - Reduce state variables
   - Combine related progress tracking

#### Files to Modify

- `apps/web/src/app/core/upload-manager.types.ts`
- `apps/web/src/app/core/upload-simplified-pipeline.service.ts` (new)
- `apps/web/src/app/core/upload-job-state.service.ts`

### Phase 2: Smart Retry & Recovery (Medium Impact)

#### Goal: Automatic retry with exponential backoff

#### Implementation Steps

1. **Create retry service**:

```typescript
@Injectable({ providedIn: "root" })
export class UploadRetryService {
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY = 1000; // 1 second

  async retryWithBackoff(job: UploadJob): Promise<void> {
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        await this.processJob(job);
        return; // Success
      } catch (error) {
        if (!this.isRetryable(error) || attempt === this.MAX_RETRIES) {
          throw error;
        }
        const delay = this.BASE_DELAY * Math.pow(2, attempt - 1);
        await this.delay(delay);
      }
    }
  }

  private isRetryable(error: unknown): boolean {
    // Network errors, timeouts, temporary server issues
    return (
      error instanceof NetworkError ||
      error.message?.includes("timeout") ||
      error.message?.includes("503")
    );
  }
}
```

2. **Integrate with upload manager**:
   - Add retry logic to `upload-manager.service.ts`
   - Track retry attempts in job state
   - Provide user feedback for retry attempts

#### Files to Modify

- `apps/web/src/app/core/upload-retry.service.ts` (new)
- `apps/web/src/app/core/upload-manager.service.ts`
- `apps/web/src/app/core/upload-manager.types.ts`

### Phase 3: Optimized Dedup (Medium Impact)

#### Goal: Batch hash checking with caching

#### Implementation Steps

1. **Create optimized dedup service**:

```typescript
@Injectable({ providedIn: "root" })
export class OptimizedDedupService {
  private readonly hashCache = new Map<string, string>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async batchCheck(hashes: string[]): Promise<Map<string, string>> {
    // Filter through cache
    const uncached = hashes.filter((h) => !this.hashCache.has(h));
    const cached = new Map<string, string>();

    hashes.forEach((hash) => {
      const cachedResult = this.hashCache.get(hash);
      if (cachedResult) cached.set(hash, cachedResult);
    });

    if (uncached.length === 0) return cached;

    // Batch RPC call for uncached hashes
    const results = await this.supabase.client.rpc("batch_check_dedup", {
      hashes: uncached,
    });

    // Update cache
    results.forEach((r: any) => {
      this.hashCache.set(r.hash, r.image_id);
      cached.set(r.hash, r.image_id);
    });

    return cached;
  }
}
```

2. **Update database function**:

```sql
-- Create or replace batch function
CREATE OR REPLACE FUNCTION batch_check_dedup(hashes text[])
RETURNS TABLE(hash text, image_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT dh.content_hash, dh.image_id
  FROM dedup_hashes dh
  WHERE dh.user_id = auth.uid()
    AND dh.content_hash = ANY(hashes);
$$;
```

#### Files to Modify

- `apps/web/src/app/core/optimized-dedup.service.ts` (new)
- `supabase/migrations/YYYYMMDDHHMMSS_batch_dedup_optimization.sql` (new)
- `apps/web/src/app/core/upload-manager.service.ts`

### Phase 4: Progressive Upload (Low Impact)

#### Goal: Chunked upload for large files with priority handling

#### Implementation Steps

1. **Create chunked upload service**:

```typescript
@Injectable({ providedIn: "root" })
export class ChunkedUploadService {
  private readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  private readonly MAX_CONCURRENT = 3;

  async uploadChunked(
    file: File,
    priority: "high" | "normal" | "low",
  ): Promise<string> {
    const chunks = this.createChunks(file);
    const concurrency = priority === "high" ? this.MAX_CONCURRENT : 1;

    // Upload chunks in parallel or sequence based on priority
    const uploadPromises = chunks
      .slice(0, concurrency)
      .map((chunk) => this.uploadChunk(chunk));

    await Promise.all(uploadPromises);

    // Combine chunks on server side
    return this.combineChunks(file.name, chunks.length);
  }
}
```

#### Files to Modify

- `apps/web/src/app/core/chunked-upload.service.ts` (new)
- `supabase/migrations/YYYYMMDDHHMMSS_chunked_upload.sql` (new)

---

## 📋 Implementation Checklist

### Phase 1: Pipeline Simplification

- [ ] Create `SimpleUploadPhase` type
- [ ] Create `upload-simplified-pipeline.service.ts`
- [ ] Combine validation + EXIF + hash phases
- [ ] Combine upload + save phases
- [ ] Combine finalizing phases
- [ ] Update job state service
- [ ] Update upload manager to use simplified pipeline
- [ ] Run tests: `ng test`
- [ ] Verify build: `ng build`

### Phase 2: Smart Retry

- [ ] Create `upload-retry.service.ts`
- [ ] Implement exponential backoff
- [ ] Add retryable error detection
- [ ] Track retry attempts in job state
- [ ] Add retry UI feedback
- [ ] Update upload manager integration
- [ ] Run tests: `ng test`
- [ ] Verify build: `ng build`

### Phase 3: Optimized Dedup

- [ ] Create `optimized-dedup.service.ts`
- [ ] Implement hash caching with TTL
- [ ] Create batch check RPC function
- [ ] Update migration for batch function
- [ ] Integrate with upload manager
- [ ] Run tests: `ng test`
- [ ] Verify build: `ng build`

### Phase 4: Progressive Upload

- [ ] Create `chunked-upload.service.ts`
- [ ] Implement chunk creation logic
- [ ] Add priority-based concurrency
- [ ] Create server-side chunk combination
- [ ] Update migration for chunked upload
- [ ] Run tests: `ng test`
- [ ] Verify build: `ng build`

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
describe("UploadSimplifiedPipelineService", () => {
  it("should combine processing phases correctly", async () => {
    // Test that validation, EXIF, hash, dedup happen in one phase
  });

  it("should handle conflicts in finalizing phase", async () => {
    // Test conflict resolution in simplified pipeline
  });

  it("should maintain backward compatibility", async () => {
    // Test that existing uploads still work
  });
});
```

### Integration Tests

```typescript
describe("Upload Manager Integration", () => {
  it("should complete upload with simplified pipeline", async () => {
    // Test full upload flow with new pipeline
  });

  it("should retry failed uploads automatically", async () => {
    // Test retry logic with network failures
  });

  it("should batch check dedup hashes efficiently", async () => {
    // Test batch dedup with multiple files
  });
});
```

### Performance Tests

- Upload 100 files: Measure completion time
- Memory usage: Monitor during large uploads
- Network efficiency: Measure RPC call reduction

---

## 📊 Success Metrics

### Performance Improvements

- **Pipeline phases**: 18+ → 5 (72% reduction)
- **Code complexity**: ~600 lines → ~300 lines (50% reduction)
- **Dedup performance**: 1 hash/call → batch calls (80%+ improvement)
- **Error recovery**: Manual → automatic retry

### User Experience Improvements

- **Upload success rate**: +15% (through automatic retry)
- **Large file handling**: Support for 100MB+ files
- **Progress feedback**: Better error messages and retry status

### Developer Experience Improvements

- **Code maintainability**: Simplified pipeline logic
- **Debugging**: Clearer phase transitions
- **Testing**: Easier to test with fewer phases

---

## 🔄 Migration Strategy

### Phase 1: Parallel Implementation

1. Keep existing pipeline intact
2. Implement simplified pipeline alongside
3. Add feature flag to switch between pipelines
4. Test thoroughly with flag enabled

### Phase 2: Gradual Rollout

1. Enable simplified pipeline for new uploads
2. Monitor for issues
3. Gradually increase usage
4. Remove old pipeline once stable

### Phase 3: Cleanup

1. Remove old pipeline services
2. Update documentation
3. Remove feature flags
4. Update tests

---

## 📞 Troubleshooting

### Common Issues

1. **Upload stuck in processing phase**
   - Check EXIF parsing
   - Verify hash computation
   - Check dedup cache

2. **Retry not working**
   - Verify error classification
   - Check backoff delays
   - Monitor retry attempts

3. **Batch dedup not working**
   - Check RPC function exists
   - Verify cache TTL logic
   - Monitor cache hit rate

### Debug Commands

```bash
# Check upload manager logs
ng serve --verbose

# Run specific tests
ng test --watch=false --browsers=ChromeHeadless --include="**/upload-*.spec.ts"

# Build verification
ng build --configuration=production
```

---

## 📚 Reference Materials

### Documentation

- [Upload Manager Spec](../element-specs/upload-manager/upload-manager.md)
- [Agent Quick Reference](../agent-quick-reference.md)
- [Implementation Checklist](../agent-workflows/implementation-checklist.md)

### Code Reference

- [Current Upload Manager](../../apps/web/src/app/core/upload-manager.service.ts)
- [Upload Types](../../apps/web/src/app/core/upload-manager.types.ts)
- [Upload Pipelines](../../apps/web/src/app/core/upload-*-pipeline.service.ts)

### Database Reference

- [Database Schema](../architecture/database-schema.md)
- [Security Boundaries](../security-boundaries.md)

---

_Remember: Test each phase thoroughly before moving to the next._
