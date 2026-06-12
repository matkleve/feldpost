# Tabellen-Plan: Legacy Image + Groups Cleanup

Status: Teilweise umgesetzt (P1 + Metadata-Rename), P2 in Arbeit
Datum: 2026-03-27

Update (laufend):

- Upload-Attach/Replace löst Ziel-IDs jetzt früh auf kanonische media_items.id auf und schreibt danach nur noch gegen id.
- Share-Set/Dedup Runtime-Mapping liest primär media_item_id (Legacy-Fallbacks wurden reduziert).

Hinweis:

- App-Code nutzt bereits media_projects.
- In DB-Funktionen/Policies gibt es noch Referenzen auf image_projects und auf image_id-Fallbacks.
- Groups sollen laut Produktentscheidung entfernt werden.

## Gesamtplanung pro Tabelle

| Tabelle / View                     | Ist-Status       | Ziel-Status                         | Geplante Aktion                  | PK/FK/Spalten-Änderung                                        | Reihenfolge |
| ---------------------------------- | ---------------- | ----------------------------------- | -------------------------------- | ------------------------------------------------------------- | ----------- |
| app_texts                          | Aktiv            | Bleibt                              | Keine Änderung                   | Keine                                                         | P0          |
| app_text_translations              | Aktiv            | Bleibt                              | Keine Änderung                   | Keine                                                         | P0          |
| organizations                      | Aktiv            | Bleibt                              | Keine Änderung                   | Keine                                                         | P0          |
| profiles                           | Aktiv            | Bleibt                              | Keine Änderung                   | Keine                                                         | P0          |
| roles                              | Aktiv            | Bleibt                              | Keine Änderung                   | Keine                                                         | P0          |
| user_roles                         | Aktiv            | Bleibt                              | Keine Änderung                   | Keine                                                         | P0          |
| projects                           | Aktiv            | Bleibt                              | Keine Änderung                   | Keine                                                         | P0          |
| media_items                        | Aktiv, Canonical | Bleibt (Canonical)                  | Legacy-Fallback später entfernen | Später source_image_id drop                                   | P3          |
| media_projects                     | Aktiv            | Bleibt (einzige Membership-Tabelle) | Konsolidieren auf diese Tabelle  | Optional unique/index review                                  | P1          |
| project_sections                   | Aktiv            | Bleibt                              | Keine Änderung                   | Keine                                                         | P0          |
| project_section_items              | Aktiv            | Bleibt                              | Keine Änderung                   | Keine                                                         | P0          |
| metadata_keys                      | Aktiv            | Bleibt                              | Keine Änderung                   | Keine                                                         | P0          |
| media_metadata (ex image_metadata) | Aktiv            | Bleibt                              | Spaltenbereinigung umgesetzt     | image_id entfernt; Vertrag/Policies auf media_item_id         | Done        |
| coordinate_corrections             | Aktiv            | Bleibt                              | Legacy-Spalte entfernt           | image_id entfernt; Vertrag auf media_item_id abgeschlossen    | Done        |
| dedup_hashes                       | Aktiv            | Bleibt                              | Legacy-Spalte entfernt           | auf media_item_id-Vertrag umgestellt (DB + Upload-Pipeline)   | Done        |
| share_sets                         | Aktiv            | Bleibt                              | Keine Strukturänderung nötig     | Keine                                                         | P0          |
| share_set_items                    | Aktiv            | Bleibt                              | Spaltenbereinigung umgesetzt     | image_id entfernt; PK/Vertrag auf media_item_id               | Done        |
| image_projects                     | Entfernt         | Entfernt                            | Bereits umgesetzt                | cluster_images auf media_projects umgestellt, dann DROP TABLE | Done        |
| saved_groups                       | Entfernt         | Entfernt                            | Bereits umgesetzt                | App-Queries entfernt, Tabelle gedroppt                        | Done        |
| saved_group_images                 | Entfernt         | Entfernt                            | Bereits umgesetzt                | App-Queries entfernt, Tabelle gedroppt                        | Done        |
| invite_share_events                | Aktiv            | Bleibt                              | Keine Änderung                   | Keine                                                         | P0          |
| qr_invites                         | Aktiv            | Bleibt                              | Keine Änderung                   | Keine                                                         | P0          |
| storage_cleanup_runs               | Aktiv            | Bleibt                              | Keine Änderung                   | Keine                                                         | P0          |
| v_media_backfill_audit (View)      | Aktiv            | Optional später entfernen           | Bis Abschluss Cleanup behalten   | Keine                                                         | P3          |

## Konkrete Arbeitsblöcke

| Block                         | Inhalt                                                                                                        | Ergebnis                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| P1: Legacy Tabellen entfernen | image_projects, saved_groups, saved_group_images                                                              | Erledigt                                                                                |
| P2: Legacy Spalten entfernen  | image_id in coordinate_corrections, dedup_hashes, media_metadata, share_set_items; media_item_id auf NOT NULL | Erledigt (alle vier Tabellen auf media_item_id umgestellt, Legacy image_id entfernt)    |
| P2: Naming Cleanup            | image_metadata -> media_metadata                                                                              | Erledigt (Tabellenname)                                                                 |
| P3: Letzte Übergangsreste     | source_image_id in media_items und optional v_media_backfill_audit                                            | In Arbeit (cluster/viewport + location RPCs haben jetzt media*item_id/media*\* Vertrag) |

## Freigabekriterien vor DROP

| Objekt                               | Muss vorher erledigt sein                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| image_projects drop                  | cluster_images + Policies + Trigger vollständig auf media_projects ohne Fallback |
| saved_groups/saved_group_images drop | Search Resolver und alle UI/Tests ohne saved_groups Queries                      |
| image_id Spalten drop                | Alle Policies/Funktionen ohne image_id Referenz                                  |
| source_image_id drop                 | Keine RPC/App-Fallbacks mehr auf source_image_id                                 |
