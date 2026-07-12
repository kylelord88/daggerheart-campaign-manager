-- Lets a player set the Demiplane link on their own PC without opening general
-- self-UPDATE on characters (which also holds fields like faction_id/vitality
-- that shouldn't be player-editable). Same narrow-RPC pattern as
-- set_my_display_name. GM retains editing this via the normal GM edit flow,
-- which already goes through the existing "gm can update" policy.
create or replace function set_my_character_demiplane_url(p_character_id uuid, p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update characters
  set demiplane_url = nullif(trim(p_url), '')
  where id = p_character_id
    and player_user_id = auth.uid();
end;
$$;

grant execute on function set_my_character_demiplane_url(uuid, text) to authenticated;
