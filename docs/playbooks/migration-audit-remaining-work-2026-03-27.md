# Migration Audit: Verbleibende Arbeiten nach `public.images`-Abbau

Status: Phase 4 - Cleanup & Documentation
Datum: 2026-03-27

## Completed (✓)

| Komponente                                | Details                                        | Status       |
| ----------------------------------------- | ---------------------------------------------- | ------------ |
| `photo-load.service.ts`                   | Dual-read signierung (media → images fallback) | ✓ LIVE       |
| `zip-export.service.ts`                   | Dual-read export signierung                    | ✓ LIVE       |
| `upload.service.ts`                       | Dual-read upload signierung                    | ✓ LIVE       |
| `bulk_update_image_addresses()`           | RPC umgeschrieben auf `media_items`            | ✓ DEPLOYED   |
| `cluster_images()`                        | RPC umgeschrieben auf `media_items`            | ✓ DEPLOYED   |
| `create_or_reuse_share_set()`             | RPC umgeschrieben auf `media_items`            | ✓ DEPLOYED   |
| `enforce_image_project_same_org()`        | Trigger umgeschrieben auf `media_items`        | ✓ DEPLOYED   |
| `get_unresolved_images()`                 | RPC umgeschrieben auf `media_items`            | ✓ DEPLOYED   |
| `list_orphaned_storage_paths()`           | RPC umgeschrieben auf `media` bucket           | ✓ DEPLOYED   |
| `resolve_image_location()`                | RPC umgeschrieben auf `media_items`            | ✓ DEPLOYED   |
| `viewport_markers()`                      | RPC umgeschrieben auf `media_items`            | ✓ DEPLOYED   |
| `public.images` table                     | Gelöscht nach Drop-Readiness-Gate              | ✓ DROPPED    |
| `photo-load.service.spec.ts`              | Deterministische Tests über Fake-Image-Mock    | ✓ GREEN      |
| `media-bucket-cutover-and-images-drop.md` | Playbook mit finalen Snapshots aktualisiert    | ✓ DOCUMENTED |

---

## Pending (⧗) – HIGH PRIORITY SPECS

| Spec / Dokumentation                     | Fokus                                                                          | Action        |
| ---------------------------------------- | ------------------------------------------------------------------------------ | ------------- |
| `docs/element-specs/media-management.md` | Update RPC signatures für `media_items`-basierte Queries                       | Review + Edit |
| `docs/element-specs/image-clustering.md` | Cluster-Geometrie bleibt gleich, aber Datenquelle ist jetzt `media_items`      | Review + Edit |
| `docs/element-specs/image-sharing.md`    | Share-Set-Logik bleibt stabil; Hinweis auf `source_image_id` als Legacy-Archiv | Review + Edit |

---

## Pending (⧗) – DOCUMENTATION

| Dokumentation                 | Fokus                                                                                           | Priorität |
| ----------------------------- | ----------------------------------------------------------------------------------------------- | --------- |
| `docs/glossary.md`            | `media_items` als Canonical Source für alle Media dokumentieren                                 | MEDIUM    |
| `docs/database-schema.md`     | Entfernen Sie alle `public.images.*` Referenzen; Fokus auf `public.media_items`                 | MEDIUM    |
| `docs/architecture.md`        | Media-Management-Flow: `media_items` ← `storage.media` bucket (mit Fallback `images` read-only) | MEDIUM    |
| `docs/design/constitution.md` | Optional: Erwähnen Sie Legacy-Drop in Migrations-Notizen                                        | LOW       |

---

## Deferred (◐) – POST-VERIFICATION

| Task                                                       | Bedingung                                                            | Timing                   |
| ---------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------ |
| Entfernen aller `image_id`-Spalten aus abhängiger Tabellen | Alle RLS-Policies + Queries bestätigt auf `media_item_id` umgestellt | Nach Runtime-Smoke-Tests |
| Entfernen von `source_image_id` aus `media_items`          | Keine Legacy-Image-ID-Lookups mehr in App/RPC                        | Nach Runtime-Smoke-Tests |

---

## Runtime Smoke Tests (⧗) – RECOMMENDED

| Test                  | Endpoint                            | Verifizierung                                                                |
| --------------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| Map Cluster Rendering | `viewport_markers()` RPC            | Cluster-Geometrie rendert; `image_id` korrekt (COALESCE source_image_id)     |
| Address Resolution    | `resolve_image_location()` RPC      | Lat/Lng + Address-Felder werden aktualisiert; `location_status` = 'resolved' |
| Share Set Creation    | `create_or_reuse_share_set()` RPC   | Share-Token generiert; Items korrekt beigefügt                               |
| Photo Signing & Load  | `photo-load.service.getSignedUrl()` | Fotos laden aus `media` bucket (oder fallback `images`)                      |

---

## Next Steps

**Unmittelbar (heute):**

1. [ ] Die 3 Element-Specs aktualisieren (nur Datenquellen-Hinweise)
2. [ ] `glossary.md`, `database-schema.md` aktualisieren

**Nach Smoke-Tests (morgen/nächster Tag):** 3. [ ] Fallback für alte `images` Bucket-Lesevorgänge entfernen (wenn Daten vollständig gecovered) 4. [ ] Optionale Column-Drops (Phase 4) durchführen

**Dokumentation (laufend):** 5. [ ] Dieses Audit-Dokument aktiv halten
