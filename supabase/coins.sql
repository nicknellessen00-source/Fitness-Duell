-- FitDuell – FitCoins auf dem Server (einmalig im Supabase SQL Editor ausführen)
-- Kontostand, Shop-Käufe, Anfeuern (Coins an Freunde) und Duell-Einsätze.
-- Beträge, Preise und Limits stehen hier auf dem Server – die App kann sie nicht selbst festlegen.
-- FitCoins haben keinen Geldwert, sind nicht kaufbar und nicht auszahlbar.

-- Buchungen: positiv = gutgeschrieben, negativ = ausgegeben. key verhindert doppelte Buchungen.
create table if not exists public.coin_ledger (
  id         bigserial primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  key        text not null,
  amount     integer not null,
  reason     text not null,
  note       text,
  ref        uuid,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);
create index if not exists coin_ledger_user on public.coin_ledger (user_id, created_at desc);

create table if not exists public.duel_stakes (
  duel_id    uuid not null references public.duels (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  amount     integer not null check (amount between 5 and 200),
  created_at timestamptz not null default now(),
  primary key (duel_id, user_id)
);

create table if not exists public.duel_settlements (
  duel_id    uuid primary key references public.duels (id) on delete cascade,
  winner     uuid,
  pot        integer not null default 0,
  vals       jsonb not null default '{}'::jsonb,
  settled_at timestamptz not null default now()
);

alter table public.coin_ledger enable row level security;
alter table public.duel_stakes enable row level security;
alter table public.duel_settlements enable row level security;

drop policy if exists coin_select on public.coin_ledger;
create policy coin_select on public.coin_ledger for select to authenticated using (user_id = auth.uid());
drop policy if exists stake_select on public.duel_stakes;
create policy stake_select on public.duel_stakes for select to authenticated
  using (exists (select 1 from public.duels d where d.id = duel_id and auth.uid() in (d.challenger, d.opponent)));
drop policy if exists settle_select on public.duel_settlements;
create policy settle_select on public.duel_settlements for select to authenticated
  using (exists (select 1 from public.duels d where d.id = duel_id and auth.uid() in (d.challenger, d.opponent)));
-- Schreiben nur über die Funktionen unten
grant select on public.coin_ledger, public.duel_stakes, public.duel_settlements to authenticated;

-- Hilfsfunktionen -----------------------------------------------------------
create or replace function public._berlin_today() returns date
language sql stable as $$ select (now() at time zone 'Europe/Berlin')::date $$;

create or replace function public._coin_balance(uid uuid) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::integer from public.coin_ledger where user_id = uid
$$;

create or replace function public.my_coins() returns integer
language sql stable security definer set search_path = public as $$
  select public._coin_balance(auth.uid())
$$;

-- Belohnungen gutschreiben ---------------------------------------------------
-- p_items: [{ "key": "training:2026-11-26:abc", "reason": "training", "note": "Laufen" }, ...]
create or replace function public.award_coins(p_items jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  it jsonb; k text; r text; d date; amt integer; used integer; base integer;
  t date := public._berlin_today();
begin
  if me is null then raise exception 'Nicht angemeldet'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 60 then raise exception 'Ungültige Anfrage'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    k := left(coalesce(it->>'key', ''), 120); r := coalesce(it->>'reason', '');
    base := case r when 'training' then 10 when 'steps' then 5 when 'pr' then 15 when 'streak' then 25
                   when 'challenge' then 50 when 'start' then 50 else null end;
    if base is null then continue; end if;                       -- Duell-Gewinne laufen über settle_duel
    if r = 'start' then
      if k <> 'start' then continue; end if;
    else
      if split_part(k, ':', 1) <> r then continue; end if;
      begin d := split_part(k, ':', 2)::date; exception when others then continue; end;
      if d > t or d < t - 31 then continue; end if;
      if r = 'challenge' and extract(isodow from d) <> 1 then continue; end if;
      if r = 'streak' and exists (select 1 from public.coin_ledger where user_id = me and reason = 'streak'
           and split_part(key, ':', 2)::date between d - 6 and d + 6) then continue; end if;
    end if;
    amt := base;
    if r in ('training', 'steps', 'pr') then                     -- zusammen höchstens 60 pro Tag
      select coalesce(sum(amount), 0) into used from public.coin_ledger
        where user_id = me and reason in ('training', 'steps', 'pr') and split_part(key, ':', 2) = split_part(k, ':', 2);
      amt := least(base, 60 - used);
      if amt <= 0 then continue; end if;
    end if;
    insert into public.coin_ledger (user_id, key, amount, reason, note)
      values (me, k, amt, r, left(it->>'note', 80)) on conflict (user_id, key) do nothing;
  end loop;
  return public._coin_balance(me);
end $$;

-- Shop ------------------------------------------------------------------------
create or replace function public.spend_coins(p_item text, p_key text) returns integer
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  price integer := case p_item when 'joker' then 150 when 'shirt-blue' then 80 when 'shirt-orange' then 80
    when 'shirt-pink' then 80 when 'shirt-black' then 120 when 'shirt-gold' then 300
    when 'frame-silver' then 100 when 'frame-lime' then 150 when 'frame-gold' then 250 else null end;
begin
  if me is null then raise exception 'Nicht angemeldet'; end if;
  if price is null then raise exception 'Unbekannter Artikel'; end if;
  if exists (select 1 from public.coin_ledger where user_id = me and key = p_key) then return public._coin_balance(me); end if;
  if public._coin_balance(me) < price then raise exception 'Nicht genug FitCoins'; end if;
  insert into public.coin_ledger (user_id, key, amount, reason, note) values (me, left(p_key, 120), -price, 'buy', p_item);
  return public._coin_balance(me);
end $$;

-- Anfeuern: Coins an einen Freund schicken --------------------------------------
create or replace function public.send_coins(p_to uuid, p_amount integer) returns integer
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid(); sent integer; g text := replace(gen_random_uuid()::text, '-', '');
  my_name text; to_name text;
begin
  if me is null then raise exception 'Nicht angemeldet'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 25 then raise exception 'Zwischen 1 und 25 FitCoins'; end if;
  if not exists (select 1 from public.friendships where user_id = me and friend_id = p_to) then raise exception 'Nur an Freunde'; end if;
  select coalesce(-sum(amount), 0) into sent from public.coin_ledger
    where user_id = me and reason = 'gift_out' and (created_at at time zone 'Europe/Berlin')::date = public._berlin_today();
  if sent + p_amount > 50 then raise exception 'Heute höchstens 50 FitCoins verschenken'; end if;
  if public._coin_balance(me) < p_amount then raise exception 'Nicht genug FitCoins'; end if;
  select name into my_name from public.digests where user_id = me;
  select name into to_name from public.digests where user_id = p_to;
  insert into public.coin_ledger (user_id, key, amount, reason, note, ref) values (me, 'gift:' || g, -p_amount, 'gift_out', to_name, p_to);
  insert into public.coin_ledger (user_id, key, amount, reason, note, ref) values (p_to, 'gift:' || g, p_amount, 'gift_in', my_name, me);
  return public._coin_balance(me);
end $$;

-- Duell-Einsatz ------------------------------------------------------------------
create or replace function public.stake_duel(p_duel uuid, p_amount integer) returns integer
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); d public.duels;
begin
  if me is null then raise exception 'Nicht angemeldet'; end if;
  select * into d from public.duels where id = p_duel;
  if d.id is null or me not in (d.challenger, d.opponent) then raise exception 'Duell nicht gefunden'; end if;
  if d.end_date < public._berlin_today() then raise exception 'Duell ist schon beendet'; end if;
  if p_amount is null or p_amount < 5 or p_amount > 200 then raise exception 'Einsatz zwischen 5 und 200 FitCoins'; end if;
  if exists (select 1 from public.duel_stakes where duel_id = p_duel and user_id = me) then raise exception 'Du hast schon gesetzt'; end if;
  if public._coin_balance(me) < p_amount then raise exception 'Nicht genug FitCoins'; end if;
  insert into public.duel_stakes (duel_id, user_id, amount) values (p_duel, me, p_amount);
  insert into public.coin_ledger (user_id, key, amount, reason, ref) values (me, 'stake:' || p_duel, -p_amount, 'stake', p_duel);
  return public._coin_balance(me);
end $$;

-- Duell-Wert aus dem Digest (gleiche Regeln wie in der App)
create or replace function public._duel_metric(uid uuid, p_type text, p_ex text, p_start date, p_end date) returns numeric
language plpgsql stable security definer set search_path = public as $$
declare dat jsonb; v numeric := 0; a numeric; b numeric;
begin
  select data into dat from public.digests where user_id = uid;
  if dat is null then return 0; end if;
  if p_type = 'loss' then
    select (w->>1)::numeric into a from jsonb_array_elements(coalesce(dat->'weights', '[]')) w
      where (w->>0)::date <= p_start order by (w->>0)::date desc limit 1;
    if a is null then
      select (w->>1)::numeric into a from jsonb_array_elements(coalesce(dat->'weights', '[]')) w
        where (w->>0)::date >= p_start order by (w->>0)::date asc limit 1;
    end if;
    select (w->>1)::numeric into b from jsonb_array_elements(coalesce(dat->'weights', '[]')) w
      where (w->>0)::date <= p_end order by (w->>0)::date desc limit 1;
    if a is null or b is null then return 0; end if;
    return round((a - b) * 10) / 10;
  elsif p_type = 'max' then
    select coalesce(max((e.value->'max'->>p_ex)::numeric), 0) into v from jsonb_each(coalesce(dat->'days', '{}')) e
      where e.key::date between p_start and p_end;
    return round(v);
  else
    select coalesce(sum((e.value->>p_type)::numeric), 0) into v from jsonb_each(coalesce(dat->'days', '{}')) e
      where e.key::date between p_start and p_end;
    return round(v);
  end if;
end $$;

-- Duell abrechnen: Sieger bekommt +40 und den ganzen Topf, bei Gleichstand gibt es die Einsätze zurück
create or replace function public.settle_duel(p_duel uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid(); d public.duels; s public.duel_settlements;
  vc numeric; vo numeric; w uuid; pot integer; st record;
begin
  if me is null then raise exception 'Nicht angemeldet'; end if;
  select * into d from public.duels where id = p_duel;
  if d.id is null or me not in (d.challenger, d.opponent) then raise exception 'Duell nicht gefunden'; end if;
  select * into s from public.duel_settlements where duel_id = p_duel;
  if s.duel_id is not null then return to_jsonb(s); end if;
  if d.end_date >= public._berlin_today() then return null; end if;   -- läuft noch
  vc := public._duel_metric(d.challenger, d.type, d.exercise, d.start_date, d.end_date);
  vo := public._duel_metric(d.opponent, d.type, d.exercise, d.start_date, d.end_date);
  w := case when vc > vo then d.challenger when vo > vc then d.opponent else null end;
  select coalesce(sum(amount), 0) into pot from public.duel_stakes where duel_id = p_duel;
  if w is not null then
    insert into public.coin_ledger (user_id, key, amount, reason, ref) values (w, 'duel:' || p_duel, 40, 'duel', p_duel)
      on conflict (user_id, key) do nothing;
    if pot > 0 then
      insert into public.coin_ledger (user_id, key, amount, reason, ref) values (w, 'pot:' || p_duel, pot, 'pot', p_duel)
        on conflict (user_id, key) do nothing;
    end if;
  else
    for st in select * from public.duel_stakes where duel_id = p_duel loop
      insert into public.coin_ledger (user_id, key, amount, reason, ref) values (st.user_id, 'refund:' || p_duel, st.amount, 'refund', p_duel)
        on conflict (user_id, key) do nothing;
    end loop;
  end if;
  insert into public.duel_settlements (duel_id, winner, pot, vals)
    values (p_duel, w, pot, jsonb_build_object(d.challenger::text, vc, d.opponent::text, vo))
    on conflict (duel_id) do nothing;
  select * into s from public.duel_settlements where duel_id = p_duel;
  return to_jsonb(s);
end $$;

-- Wird ein Duell vor der Abrechnung gelöscht, gibt es die Einsätze zurück
create or replace function public._refund_stakes() returns trigger
language plpgsql security definer set search_path = public as $$
declare st record;
begin
  if not exists (select 1 from public.duel_settlements where duel_id = old.id) then
    for st in select * from public.duel_stakes where duel_id = old.id loop
      insert into public.coin_ledger (user_id, key, amount, reason, ref)
        values (st.user_id, 'refund:' || old.id, st.amount, 'refund', old.id) on conflict (user_id, key) do nothing;
    end loop;
  end if;
  return old;
end $$;
drop trigger if exists duel_refund on public.duels;
create trigger duel_refund before delete on public.duels for each row execute function public._refund_stakes();

-- Rechte ----------------------------------------------------------------------------
revoke all on function public._coin_balance(uuid), public._duel_metric(uuid, text, text, date, date), public._refund_stakes() from public, anon, authenticated;
revoke all on function public.my_coins(), public.award_coins(jsonb), public.spend_coins(text, text),
  public.send_coins(uuid, integer), public.stake_duel(uuid, integer), public.settle_duel(uuid) from public, anon;
grant execute on function public.my_coins(), public.award_coins(jsonb), public.spend_coins(text, text),
  public.send_coins(uuid, integer), public.stake_duel(uuid, integer), public.settle_duel(uuid) to authenticated;

-- Live-Aktualisierung (z. B. wenn ein Freund dich anfeuert)
do $$ begin
  alter publication supabase_realtime add table public.coin_ledger;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.duel_stakes;
exception when duplicate_object then null; when undefined_object then null; end $$;

notify pgrst, 'reload schema';
