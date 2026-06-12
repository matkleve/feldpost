-- Audit: App-Codepfade, die noch image-Referenzen enthalten
select 
  "artifact_type",
  "file_oder_symbol",
  "status_short",
  "nächster_schritt"
from (
  values 
    ('App Component', 'photo-load.service.ts', 'DONE', 'Dual-read signierung media->images live'),
    (''Component', 'zip-export.service.ts', 'DONE', 'Dual-read export signierung media->images live'),
    ('App Service', 'upload.service.ts', 'DONE', 'Dual-read upload signierung media->images live'),
    ('RPC/Function', 'bulk_update_image_addresses()', 'DONE', 'umgeschrieben auf media_items'),
    ('RPC/Function', 'cluster_images()', 'DONE', 'umgeschrieben auf media_items'),
    ('RPC/Function', 'create_or_reuse_share_set()', 'DONE', 'umgeschrieben auf media_items'),
    ('RPC/Function', 'enforce_image_project_same_org()', 'DONE', 'umgeschrieben auf media_items'),
    ('RPC/Function', 'get_unresolved_images()', 'DONE', 'umgeschrieben auf media_items'),
    ('RPC/Function', 'list_orphaned_storage_paths()', 'DONE', 'umgeschrieben auf media bucket'),
    ('RPC/Function', 'resolve_image_location()', 'DONE', 'umgeschrieben auf media_items'),
    ('RPC/Function', 'viewport_markers()', 'DONE', 'umgeschrieben auf media_items'),
    ('Database', 'public.images table', 'DONE', 'gelöscht'),
    ('Database', 'image_id columns (dependent tables)', 'DEFERRED', 'können nach Verifikation entfernt werden'),
    ('Spec', 'docs/element-specs/media-management.md', 'PENDING', 'mit media_items-Semantik aktualisieren'),
    ('Spec', 'docs/element-specs/image-clustering.md', 'PENDING', 'mit media_items-Semantik aktualisieren'),
    ('Spec', 'docs/element-specs/image-sharing.md', 'PENDING', 'mit media_items.source_image_id Archiv-Hinweis'),
    ('Spec', 'docs/design/constitution.md', 'REVIEW', 'optional: Legacy-Drop erwähnen'),
    ('Playbook', 'docs/playbooks/media-bucket-cutover-and-images-drop.md', 'DONE', 'Status aktualisiert auf executed'),
    ('Documentation', 'docs/glossary.md', 'PENDING', 'media_items als Canonical Source dokumentieren'),
    ('Documentation', 'docs/database-schema.md', 'PENDING', 'images.* Referenzen entfernen'),
    ('Documentation', 'docs/architecture.md', 'PENDING', 'media_items als neue Zentrale dokumentieren'),
    ('Test', 'apps/web/src/app/core/photo-load.service.spec.ts', 'DONE', 'Deterministische Tests'),
    ('Smoke Test', 'Map cluster endpoint', 'PENDING', 'Runtime-Verifikation: viewport_markers()'),
    ('Smoke Test', 'Address resolution endpoint', 'PENDING', 'Runtime-Verifikation: resolve_image_location()'),
    ('Smoke Test', 'Share set creation', 'PENDING', 'Runtime-Verifikation: create_or_reuse_share_set()')
) as audit(artifact_type, file_oder_symbol, status_short, nächster_schritt)
order by artifact_type, "file_oder_symbol";
