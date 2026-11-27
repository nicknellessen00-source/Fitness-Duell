-- FitDuell – neue Shop-Artikel für die Trainingsfigur (Hosen, Schuhe, Stirnbänder)
-- Einmalig im Supabase SQL Editor ausführen. Voraussetzung: coins.sql ist eingespielt.
create or replace function public.spend_coins(p_item text, p_key text) returns integer
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  price integer := case p_item when 'joker' then 150 when 'shirt-blue' then 80 when 'shirt-orange' then 80
    when 'shirt-pink' then 80 when 'shirt-black' then 120 when 'shirt-gold' then 300
    when 'shorts-black' then 60 when 'shorts-red' then 80 when 'shorts-lime' then 120
    when 'shoes-black' then 60 when 'shoes-orange' then 90 when 'shoes-gold' then 250
    when 'band-red' then 70 when 'band-lime' then 100 when 'band-gold' then 200
    when 'frame-silver' then 100 when 'frame-lime' then 150 when 'frame-gold' then 250 else null end;
begin
  if me is null then raise exception 'Nicht angemeldet'; end if;
  if price is null then raise exception 'Unbekannter Artikel'; end if;
  if exists (select 1 from public.coin_ledger where user_id = me and key = p_key) then return public._coin_balance(me); end if;
  if public._coin_balance(me) < price then raise exception 'Nicht genug FitCoins'; end if;
  insert into public.coin_ledger (user_id, key, amount, reason, note) values (me, left(p_key, 120), -price, 'buy', p_item);
  return public._coin_balance(me);
end $$;

notify pgrst, 'reload schema';
