-- Allow Italian in i18n source and translation language checks.

alter table public.app_texts
  drop constraint if exists app_texts_source_lang_check;

alter table public.app_texts
  add constraint app_texts_source_lang_check
  check (source_lang in ('en', 'de', 'it'));

alter table public.app_text_translations
  drop constraint if exists app_text_translations_lang_check;

alter table public.app_text_translations
  add constraint app_text_translations_lang_check
  check (lang in ('en', 'de', 'it'));
