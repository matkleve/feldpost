-- Media bucket cutover / images-drop readiness checks
-- Usage example:
--   npx supabase db query --linked -f scripts/validate-media-cutover-readiness.sql -o table

-- -----------------------------------------------------------------------------
-- 1) Bucket presence and privacy
-- -----------------------------------------------------------------------------
select id, public, file_size_limit
from storage.buckets
where id in ('images', 'media')
order by id;

-- -----------------------------------------------------------------------------
-- 2) Storage policies for media bucket
-- -----------------------------------------------------------------------------
select
  p.polname as policyname,
  case p.polcmd
    when 'r' then 'SELECT'
    when 'a' then 'INSERT'
    when 'w' then 'UPDATE'
    when 'd' then 'DELETE'
    when '*' then 'ALL'
    else p.polcmd::text
  end as cmd
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'storage'
  and c.relname = 'objects'
  and p.polname like 'media:%'
order by p.polname;

-- -----------------------------------------------------------------------------
-- 3) Object counts per bucket (for move progress)
-- -----------------------------------------------------------------------------
select bucket_id, count(*) as object_count
from storage.objects
where bucket_id in ('images', 'media')
group by bucket_id
order by bucket_id;

-- -----------------------------------------------------------------------------
-- 4) media_items without object in media bucket (hard failure)
-- -----------------------------------------------------------------------------
select count(*) as media_items_without_media_object
from public.media_items m
left join storage.objects o
  on o.bucket_id = 'media'
 and o.name = m.storage_path
where o.id is null;

-- -----------------------------------------------------------------------------
-- 5) media_items not yet copied to media but still in images (fallback relying)
-- -----------------------------------------------------------------------------
select count(*) as media_items_still_served_from_images
from public.media_items m
left join storage.objects om
  on om.bucket_id = 'media'
 and om.name = m.storage_path
join storage.objects oi
  on oi.bucket_id = 'images'
 and oi.name = m.storage_path
where om.id is null;

-- -----------------------------------------------------------------------------
-- 6) orphan objects in media bucket (no media_items row)
-- -----------------------------------------------------------------------------
select count(*) as media_bucket_orphan_objects
from storage.objects o
left join public.media_items m
  on m.storage_path = o.name
where o.bucket_id = 'media'
  and m.id is null;

-- -----------------------------------------------------------------------------
-- 7) orphan objects in images bucket (post-cutover cleanup target)
-- -----------------------------------------------------------------------------
select count(*) as images_bucket_orphan_objects
from storage.objects o
left join public.media_items m
  on m.storage_path = o.name
where o.bucket_id = 'images'
  and m.id is null;

-- -----------------------------------------------------------------------------
-- 8) Remaining FK dependencies to public.images (must be 0 before drop)
-- -----------------------------------------------------------------------------
with images_rel as (
  select to_regclass('public.images') as rel
)
select count(*) as fk_dependencies_to_images
from pg_constraint con, images_rel ir
where ir.rel is not null
  and con.contype = 'f'
  and confrelid = ir.rel;

-- -----------------------------------------------------------------------------
-- 9) Remaining views/functions referencing public.images
-- -----------------------------------------------------------------------------
select count(*) as views_referencing_images
from pg_views
where definition ilike '%public.images%';

select count(*) as functions_referencing_images
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.prokind = 'f'
  and pg_get_functiondef(p.oid) ilike '%public.images%';

select count(*) as policies_referencing_images
from pg_policies
where schemaname = 'public'
  and (
    coalesce(qual, '') ilike '%public.images%'
    or coalesce(with_check, '') ilike '%public.images%'
  );

-- -----------------------------------------------------------------------------
-- 10) Final drop gate status
-- -----------------------------------------------------------------------------
with checks as (
  select
    (select count(*)
     from public.media_items m
     left join storage.objects o
       on o.bucket_id = 'media'
      and o.name = m.storage_path
     where o.id is null) as c_media_items_without_media_object,

    (select count(*)
     from pg_constraint con
     where to_regclass('public.images') is not null
       and con.contype = 'f'
       and confrelid = to_regclass('public.images')) as c_fk_dependencies,

    (select count(*)
     from pg_views
     where definition ilike '%public.images%') as c_views_ref_images,

    (select count(*)
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
      where p.prokind = 'f'
        and pg_get_functiondef(p.oid) ilike '%public.images%') as c_functions_ref_images,

    (select count(*)
     from pg_policies
     where schemaname = 'public'
       and (
         coalesce(qual, '') ilike '%public.images%'
         or coalesce(with_check, '') ilike '%public.images%'
       )) as c_policies_ref_images
)
select *,
  case when c_media_items_without_media_object = 0
         and c_fk_dependencies = 0
         and c_views_ref_images = 0
         and c_functions_ref_images = 0
         and c_policies_ref_images = 0
       then 'READY_TO_DROP_IMAGES'
       else 'NOT_READY'
  end as drop_status
from checks;
