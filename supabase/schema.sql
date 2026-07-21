-- Karomy — schéma Supabase
-- À coller dans le SQL Editor de votre projet Supabase (une seule fois).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.rooms (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name         text not null default 'Karaoké',
  is_playing   boolean not null default false,
  current_id   uuid,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.queue_items (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms(id) on delete cascade,
  video_id   text not null,
  title      text not null,
  channel    text not null default '',
  thumbnail  text not null default '',
  singer     text not null default 'Anonyme',
  status     text not null default 'queued' check (status in ('queued', 'playing', 'done')),
  sort_order double precision not null default extract(epoch from now()),
  created_at timestamptz not null default now()
);

create index if not exists queue_items_room_idx on public.queue_items (room_id, status, sort_order);
create index if not exists rooms_code_idx on public.rooms (code);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Karomy n'a pas de comptes : n'importe qui connaissant le code d'une room
-- peut lire et écrire dedans. On ouvre donc les deux tables à la clé `anon`.
-- Les rooms sont éphémères et ne contiennent aucune donnée personnelle
-- (juste un pseudo choisi sur place), le risque est volontairement accepté.

alter table public.rooms enable row level security;
alter table public.queue_items enable row level security;

drop policy if exists "rooms open" on public.rooms;
create policy "rooms open" on public.rooms
  for all using (true) with check (true);

drop policy if exists "queue open" on public.queue_items;
create policy "queue open" on public.queue_items
  for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.queue_items;

-- ---------------------------------------------------------------------------
-- Ménage : supprime les rooms inactives depuis plus de 24h.
-- Optionnel — à brancher sur pg_cron si vous voulez l'automatiser.
-- ---------------------------------------------------------------------------

create or replace function public.purge_stale_rooms()
returns void language sql security definer as $$
  delete from public.rooms where last_seen_at < now() - interval '24 hours';
$$;
