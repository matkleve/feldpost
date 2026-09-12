/**
 * The real-vs-mock legend the harness prints at the end of every trace.
 *
 * It lives next to the harness on purpose: a trace that cannot be read without this table is
 * a trace that misleads, so the table ships with the output rather than only in the docs.
 *
 * @see docs/playbooks/upload-pipeline-trace.md § Real vs mock
 */

export const REAL_VS_MOCK_LEGEND = `
REAL — production code, unmodified, exactly what the browser runs
  · UploadManagerService.submitWebkitFolder → batch + job creation, folder address hints
  · UploadAddressResolutionOrchestrator.classifyBatch → Search Object build, grouping, trays
  · resolveLayersForJob / buildSearchObjectFromRelativePath → token classification, layer packages
  · AT geo assets (at-bundeslaender.json, at-gemeinden-bev.json, at-plz.json) — the shipped files
  · evaluateLocalResolution / classifySearchObjectCompleteness → branch A/B/C, metadata_only
  · classifySearchHits → auto / ambiguous / failed, EXIF-assist radius, score thresholds
  · content-hash (photo_v1 / binary_v1), in-flight dedup registry, dedup skip + issue routing
  · UploadQueueService concurrency, UploadJobStateService phase FSM, terminality guard
  · new / attach / replace pipelines, persistUploadFile (storage key + media_items columns)
  · DEFAULT_UPLOAD_LOCATION_CONFIG tuning values (radii, thresholds, tolerances)

MOCK — substituted here; a real run can diverge at exactly these points
  · File bytes: a single repeated byte, not a real JPEG. No decodable image, no thumbnail.
  · EXIF: injected per scenario at UploadService.parseExif. exifr never runs.
  · Photon / Nominatim: a 12-row stub gazetteer with fixed importance values.
    Real geocoding does fuzzy matching and ranking; a path that auto-resolves here can land
    in a tray against the real service, and the reverse.
  · Supabase: in-memory. No RLS, no triggers, no constraints, no PostGIS, no
    address_dedupe_key uniqueness — any of those can reject a write that succeeds here.
  · get_location_by_address_components always misses, so every group reaches the geocoder.
    In production an existing locations row short-circuits the geocode.
  · list_project_locations returns nothing, so there is no project centroid and Branch B
    (street + centroid bias) is never taken.
  · Storage: upload/remove are acknowledged without transferring bytes. No 180s timeout,
    no partial-upload rollback under real latency.
  · Org search tuning comes from defaults, not from the organisation's saved settings.
  · Thumbnail and document-preview generation are not exercised.
  · Timing: one process, no network latency, so concurrency and race ordering differ.

NOT COVERED — needs a browser or a live stack
  · HEIC conversion (heic2any), drag-and-drop and File System Access folder pickers
  · Upload panel rendering, tray interaction, lane switching
  · Anything RLS-dependent: org scoping is asserted by the database, not by this run
`;
