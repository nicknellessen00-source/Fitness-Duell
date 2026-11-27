-- FitDuell – Sport-Herausforderungen zwischen Freunden (einmalig im Supabase SQL Editor ausführen)
-- Voraussetzung: schema.sql und coins.sql sind eingespielt.
-- Ablauf: einladen (mit Nachricht, Termin, Ort, Einsatz) → annehmen/ablehnen → Ergebnis eintragen → Gegenseite bestätigt.
-- Einsätze werden beim Einladen bzw. Annehmen abgebucht und treuhänderisch gehalten:
-- Sieger bekommt beide Einsätze; bei Unentschieden, Absage, Ablehnung oder Widerspruch gibt es sie zurück.

create table if not exists public.matches (
  id          uuid primary key default gen_random_uuid(),
  challenger  uuid not null references auth.users (id) on delete cascade,
  opponent    uuid not null references auth.users (id) on delete cascade,
  sport       text not null check (char_length(sport) between 1 and 40),
  message     text check (char_length(message) <= 280),
  play_at     timestamptz,
  place       text check (char_length(place) <= 80),
  stake       integer not null default 0 check (stake between 0 and 200),
  status      text not null default 'open'
              check (status in ('open', 'accepted', 'declined', 'cancelled', 'reported', 'done', 'disputed')),
  winner      uuid,
  score       text check (char_length(score) <= 40),
  reported_by uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (challenger <> opponent)
);
create index if not exists matches_challenger on public.matches (challenger, created_at desc);
create index if not exists matches_opponent on public.matches (opponent, created_at desc);

create table if not exists public.match_messages (
  id         bigserial primary key,
  match_id   uuid not null references public.matches (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  text       text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists match_messages_match on public.match_messages (match_id, created_at);

alter table public.matches enable row level security;
alter table public.match_messages enable row level security;

drop policy if exists match_select on public.matches;
create policy match_select on public.matches for select to authenticated using (auth.uid() in (challenger, opponent));
drop policy if exists match_msg_select on public.match_messages;
create policy match_msg_select on public.match_messages for select to authenticated
  using (exists (select 1 from public.matches m where m.id = match_id and auth.uid() in (m.challenger, m.opponent)));
-- Schreiben nur über die Funktionen unten
grant select on public.matches, public.match_messages to authenticated;

-- Hilfsfunktionen ---------------------------------------------------------------------------
create or replace function public._match_get(p_match uuid) returns public.matches
language plpgsql stable security definer set search_path = public as $$
declare m public.matches;
begin
  select * into m from public.matches where id = p_match;
  if m.id is null or auth.uid() not in (m.challenger, m.opponent) then raise exception 'Herausforderung nicht gefunden'; end if;
  return m;
end $$;

-- Einsätze zurückgeben (wer schon bezahlt hat: Herausforderer ab Einladung, Gegner ab Annahme)
create or replace function public._match_refund(m public.matches) returns void
language plpgsql security definer set search_path = public as $$
begin
  if m.stake <= 0 then return; end if;
  insert into public.coin_ledger (user_id, key, amount, reason, ref)
    values (m.challenger, 'mrefund:' || m.id || ':c', m.stake, 'refund', m.id) on conflict (user_id, key) do nothing;
  if m.status in ('accepted', 'reported') then
    insert into public.coin_ledger (user_id, key, amount, reason, ref)
      values (m.opponent, 'mrefund:' || m.id || ':o', m.stake, 'refund', m.id) on conflict (user_id, key) do nothing;
  end if;
end $$;

create or replace function public._match_say(p_match uuid, p_text text) returns void
language sql security definer set search_path = public as $$
  insert into public.match_messages (match_id, user_id, text)
  select p_match, auth.uid(), left(trim(p_text), 500) where coalesce(trim(p_text), '') <> ''
$$;

-- Einladen -------------------------------------------------------------------------------------
create or replace function public.create_match(p_to uuid, p_sport text, p_message text, p_play_at timestamptz, p_place text, p_stake integer)
returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); mid uuid; st integer := coalesce(p_stake, 0);
begin
  if me is null then raise exception 'Nicht angemeldet'; end if;
  if not exists (select 1 from public.friendships where user_id = me and friend_id = p_to) then raise exception 'Nur Freunde herausfordern'; end if;
  if coalesce(trim(p_sport), '') = '' then raise exception 'Bitte eine Sportart wählen'; end if;
  if st < 0 or st > 200 then raise exception 'Einsatz zwischen 0 und 200 FitCoins'; end if;
  if (select count(*) from public.matches where challenger = me and status = 'open') >= 10 then raise exception 'Höchstens 10 offene Einladungen'; end if;
  if st > 0 and public._coin_balance(me) < st then raise exception 'Nicht genug FitCoins'; end if;
  insert into public.matches (challenger, opponent, sport, message, play_at, place, stake)
    values (me, p_to, left(trim(p_sport), 40), nullif(left(trim(coalesce(p_message, '')), 280), ''), p_play_at, nullif(left(trim(coalesce(p_place, '')), 80), ''), st)
    returning id into mid;
  if st > 0 then
    insert into public.coin_ledger (user_id, key, amount, reason, ref, note) values (me, 'mstake:' || mid || ':c', -st, 'stake', mid, left(p_sport, 40));
  end if;
  perform public._match_say(mid, p_message);
  return mid;
end $$;

-- Annehmen oder ablehnen (nur der Eingeladene) ---------------------------------------------------
create or replace function public.respond_match(p_match uuid, p_accept boolean, p_message text) returns text
language plpgsql security definer set search_path = public as $$
declare m public.matches := public._match_get(p_match); me uuid := auth.uid();
begin
  if me <> m.opponent then raise exception 'Nur die eingeladene Person kann antworten'; end if;
  if m.status <> 'open' then raise exception 'Die Einladung ist nicht mehr offen'; end if;
  if p_accept then
    if m.stake > 0 then
      if public._coin_balance(me) < m.stake then raise exception 'Nicht genug FitCoins für den Einsatz'; end if;
      insert into public.coin_ledger (user_id, key, amount, reason, ref, note) values (me, 'mstake:' || m.id || ':o', -m.stake, 'stake', m.id, m.sport);
    end if;
    update public.matches set status = 'accepted', updated_at = now() where id = m.id;
  else
    perform public._match_refund(m);
    update public.matches set status = 'declined', updated_at = now() where id = m.id;
  end if;
  perform public._match_say(m.id, p_message);
  return case when p_accept then 'accepted' else 'declined' end;
end $$;

-- Absagen (beide, solange noch kein Ergebnis eingetragen ist) ---------------------------------------
create or replace function public.cancel_match(p_match uuid, p_message text) returns text
language plpgsql security definer set search_path = public as $$
declare m public.matches := public._match_get(p_match);
begin
  if m.status not in ('open', 'accepted') then raise exception 'Kann nicht mehr abgesagt werden'; end if;
  perform public._match_refund(m);
  update public.matches set status = 'cancelled', updated_at = now() where id = m.id;
  perform public._match_say(m.id, p_message);
  return 'cancelled';
end $$;

-- Ergebnis eintragen (winner = null bedeutet unentschieden) ------------------------------------------
create or replace function public.report_match(p_match uuid, p_winner uuid, p_score text) returns text
language plpgsql security definer set search_path = public as $$
declare m public.matches := public._match_get(p_match);
begin
  if m.status <> 'accepted' then raise exception 'Erst nach der Zusage kann ein Ergebnis eingetragen werden'; end if;
  if p_winner is not null and p_winner not in (m.challenger, m.opponent) then raise exception 'Ungültiger Sieger'; end if;
  update public.matches set status = 'reported', winner = p_winner, score = nullif(left(trim(coalesce(p_score, '')), 40), ''),
    reported_by = auth.uid(), updated_at = now() where id = m.id;
  return 'reported';
end $$;

-- Ergebnis bestätigen oder widersprechen (nur die Gegenseite) -----------------------------------------
create or replace function public.confirm_match(p_match uuid, p_ok boolean, p_message text) returns text
language plpgsql security definer set search_path = public as $$
declare m public.matches := public._match_get(p_match);
begin
  if m.status <> 'reported' then raise exception 'Es gibt kein Ergebnis zum Bestätigen'; end if;
  if auth.uid() = m.reported_by then raise exception 'Die andere Person muss das Ergebnis bestätigen'; end if;
  if p_ok then
    if m.stake > 0 then
      if m.winner is null then
        perform public._match_refund(m);
      else
        insert into public.coin_ledger (user_id, key, amount, reason, ref, note)
          values (m.winner, 'mpot:' || m.id, m.stake * 2, 'pot', m.id, m.sport) on conflict (user_id, key) do nothing;
      end if;
    end if;
    update public.matches set status = 'done', updated_at = now() where id = m.id;
  else
    perform public._match_refund(m);
    update public.matches set status = 'disputed', updated_at = now() where id = m.id;
  end if;
  perform public._match_say(m.id, p_message);
  return case when p_ok then 'done' else 'disputed' end;
end $$;

-- Nachricht schreiben ---------------------------------------------------------------------------------
create or replace function public.post_match_message(p_match uuid, p_text text) returns void
language plpgsql security definer set search_path = public as $$
declare m public.matches := public._match_get(p_match);
begin
  if coalesce(trim(p_text), '') = '' then raise exception 'Leere Nachricht'; end if;
  if (select count(*) from public.match_messages where user_id = auth.uid() and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'Bitte kurz warten'; end if;
  perform public._match_say(m.id, p_text);
end $$;

-- Wird eine Herausforderung gelöscht (z. B. Konto gelöscht), gibt es offene Einsätze zurück
create or replace function public._match_before_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status in ('open', 'accepted', 'reported') then perform public._match_refund(old); end if;
  return old;
end $$;
drop trigger if exists match_refund on public.matches;
create trigger match_refund before delete on public.matches for each row execute function public._match_before_delete();

-- Rechte ------------------------------------------------------------------------------------------------
revoke all on function public._match_get(uuid), public._match_refund(public.matches), public._match_say(uuid, text),
  public._match_before_delete() from public, anon, authenticated;
revoke all on function public.create_match(uuid, text, text, timestamptz, text, integer), public.respond_match(uuid, boolean, text),
  public.cancel_match(uuid, text), public.report_match(uuid, uuid, text), public.confirm_match(uuid, boolean, text),
  public.post_match_message(uuid, text) from public, anon;
grant execute on function public.create_match(uuid, text, text, timestamptz, text, integer), public.respond_match(uuid, boolean, text),
  public.cancel_match(uuid, text), public.report_match(uuid, uuid, text), public.confirm_match(uuid, boolean, text),
  public.post_match_message(uuid, text) to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.match_messages;
exception when duplicate_object then null; when undefined_object then null; end $$;

notify pgrst, 'reload schema';
