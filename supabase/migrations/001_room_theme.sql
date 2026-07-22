-- Migration : thème d'interface par room.
--
-- À exécuter dans le SQL Editor si vos tables ont été créées avec une version
-- antérieure de schema.sql. Idempotente : la relancer ne casse rien.

alter table public.rooms
  add column if not exists theme text not null default 'normal';

alter table public.rooms
  drop constraint if exists rooms_theme_check;

alter table public.rooms
  add constraint rooms_theme_check check (theme in ('normal', 'birthday'));

-- PostgREST garde un cache des colonnes : sans ce signal, il continuerait à
-- répondre PGRST204 sur `theme` pendant plusieurs minutes après la migration.
notify pgrst, 'reload schema';
