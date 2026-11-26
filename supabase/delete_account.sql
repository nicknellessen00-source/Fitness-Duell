-- FitDuell: Konto in der App löschen (Pflicht für App Store und Google Play)
-- Einmal im Supabase SQL Editor ausführen. Die Funktion löscht nur das Konto der angemeldeten Person
-- samt Digest, Freundschaften, Duellen und Schritt-Daten.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Nicht angemeldet';
  end if;
  delete from public.duels where challenger = me or opponent = me;
  delete from public.friendships where user_id = me or friend_id = me;
  if to_regclass('public.health_steps') is not null then
    execute 'delete from public.health_steps where user_id = $1' using me;
  end if;
  if to_regclass('public.step_tokens') is not null then
    execute 'delete from public.step_tokens where user_id = $1' using me;
  end if;
  delete from public.digests where user_id = me;
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
