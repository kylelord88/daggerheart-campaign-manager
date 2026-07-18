-- Global "active" clock: a single countdown per campaign can be turned on so
-- it shows as a floating widget on every page for every member.
--
-- Requirements enforced here (not just in the UI):
--   * is_active flag, default off.
--   * At most ONE active clock per campaign — a partial unique index.
--   * Activation is race-safe: a SECURITY DEFINER RPC deactivates any other
--     active clock and activates the target in ONE transaction, so the unique
--     index can never be transiently violated by two separate statements.
--   * Visibility: an ACTIVE clock is visible to every campaign member
--     regardless of whether its parent session is published (option b —
--     matches Kyle's "turned on = everyone sees it" mental model). Inactive
--     clocks keep the original parent-session visibility rule.

alter table session_countdowns add column is_active boolean not null default false;

-- Only one active clock per campaign.
create unique index session_countdowns_one_active_per_campaign
  on session_countdowns (campaign_id) where is_active;

-- Replace the select policy: active clocks are visible to all members; others
-- follow the parent session's visibility (published, or GM sees everything).
drop policy "visible if parent session is" on session_countdowns;
create policy "visible if active or parent session is" on session_countdowns for select using (
  (is_active and is_campaign_member(campaign_id))
  or exists (
    select 1 from sessions s where s.id = session_countdowns.session_id
    and (is_campaign_member(s.campaign_id, 'gm') or (is_campaign_member(s.campaign_id) and s.is_published))
  )
);

-- Race-safe activation. SECURITY DEFINER so the two-statement flip runs as one
-- privileged transaction, but it still checks GM membership first so a player
-- calling it directly is rejected (RLS write policies are GM-only anyway; this
-- keeps the RPC honest on its own).
create or replace function set_countdown_active(p_clock_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_id uuid;
begin
  select campaign_id into v_campaign_id from session_countdowns where id = p_clock_id;
  if v_campaign_id is null then
    raise exception 'countdown not found';
  end if;
  if not is_campaign_member(v_campaign_id, 'gm') then
    raise exception 'only the GM can change the active clock';
  end if;

  if p_active then
    -- Deactivate any other active clock first, then activate this one — same
    -- transaction, so the partial unique index is never violated.
    update session_countdowns
      set is_active = false
      where campaign_id = v_campaign_id and is_active and id <> p_clock_id;
    update session_countdowns set is_active = true where id = p_clock_id;
  else
    update session_countdowns set is_active = false where id = p_clock_id;
  end if;
end;
$$;

grant execute on function set_countdown_active(uuid, boolean) to authenticated;

-- (session_countdowns is already in the supabase_realtime publication from the
-- prior migration, so is_active changes broadcast to all clients as-is.)
