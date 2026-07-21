-- Migration : thème d'interface par room.
--
-- À exécuter dans le SQL Editor si vous avez déjà créé vos tables avec une
-- version antérieure de schema.sql. Sur une base neuve, schema.sql contient
-- déjà cette colonne — cette migration est alors inutile (mais sans danger,
-- elle est idempotente).

alter table public.rooms
  add column if not exists theme text not null default 'normal';

-- Le check est ajouté séparément : `add column if not exists` ne permet pas de
-- le déclarer conditionnellement.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'rooms_theme_check'
  ) then
    alter table public.rooms
      add constraint rooms_theme_check check (theme in ('normal', 'birthday'));
  end if;
end $$;
