-- FitDuell – Schritte aus Apple Health per iPhone-Kurzbefehl (einmalig im SQL-Editor ausführen)
-- Der Kurzbefehl schickt die Tagesschritte mit einem persönlichen Schlüssel an import_steps();
-- die App holt sie beim nächsten Öffnen ab.

create extension if not exists pgcrypto;

create table if not exists public.health_steps (
  user_id    uuid not null references auth.users (id) on delete cascade,
  day        date not null,
  steps      integer not null check (steps between 0 and 200000),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table if not exists public.step_tokens (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  token      text unique not null,
  created_at timestamptz not null default now()
);

alter table public.health_steps enable row level security;
alter table public.step_tokens enable row level security;  -- kein direkter Zugriff, nur über die Funktionen

drop policy if exists health_select on public.health_steps;
create policy health_select on public.health_steps for select to authenticated using (user_id = auth.uid());
grant select on public.health_steps to authenticated;

-- Persönlichen Schlüssel erzeugen (ersetzt einen alten)
create or replace function public.create_step_token() returns text
language plpgsql security definer set search_path = public, extensions as $$
declare t text := replace(gen_random_uuid()::text, '-', '') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  insert into public.step_tokens (user_id, token) values (auth.uid(), t)
    on conflict (user_id) do update set token = excluded.token, created_at = now();
  return t;
end $$;

-- Wird vom Kurzbefehl aufgerufen (ohne Anmeldung, nur mit Schlüssel)
create or replace function public.import_steps(p_token text, p_steps numeric, p_day date default null) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid; d date := coalesce(p_day, (now() at time zone 'Europe/Berlin')::date); n integer := round(coalesce(p_steps, 0));
begin
  -- tolerant gegenüber Leerzeichen, Zeilenumbrüchen, Bindestrichen und Großschreibung beim Einfügen
  select user_id into uid from public.step_tokens where token = lower(regexp_replace(coalesce(p_token, ''), '[^0-9a-fA-F]', '', 'g'));
  if uid is null then raise exception 'Ungültiger Schlüssel'; end if;
  if n < 0 or n > 200000 then raise exception 'Unplausible Schrittzahl'; end if;
  if d > (now() at time zone 'Europe/Berlin')::date + 1 or d < (now() at time zone 'Europe/Berlin')::date - 31 then raise exception 'Datum außerhalb des erlaubten Zeitraums'; end if;
  insert into public.health_steps (user_id, day, steps) values (uid, d, n)
    on conflict (user_id, day) do update set steps = excluded.steps, updated_at = now();
  return 'OK: ' || n || ' Schritte am ' || to_char(d, 'DD.MM.YYYY');
end $$;

revoke all on function public.create_step_token() from public, anon;
revoke all on function public.import_steps(text, numeric, date) from public;
grant execute on function public.create_step_token() to authenticated;
grant execute on function public.import_steps(text, numeric, date) to anon, authenticated;

notify pgrst, 'reload schema';
