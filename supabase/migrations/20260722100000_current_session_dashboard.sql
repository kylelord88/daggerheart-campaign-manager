-- "Current Session" dashboard feature: the GM marks one session per campaign
-- as the one in progress, then reveals specific characters/locations
-- attached to it so players see them live on the dashboard.
--
-- Follows the Active Clock pattern (session_countdowns.is_active, see
-- 20260718090000_session_countdowns_active.sql) as closely as possible:
--   * is_current flag, default off.
--   * At most ONE current session per campaign — a partial unique index.
--   * Flipping it is race-safe: a SECURITY DEFINER RPC unsets any other
--     current session and sets the target in ONE transaction.
--   * A current session is visible to every campaign member regardless of
--     is_published (mirrors "an active clock is visible regardless of
--     publish") — a live session may not have its recap written up yet.
--
-- Per-attachment reveal is a narrower opt-in than is_published, closer to
-- gm_source_images.is_shared: session_npcs/session_locations rows are only
-- player-visible once individually marked revealed, and only while their
-- parent session is the current one.

alter table sessions add column is_current boolean not null default false;

create unique index sessions_one_current_per_campaign
  on sessions (campaign_id) where is_current;

drop policy "gm reads everything, players read published" on sessions;
create policy "gm reads everything, players read published or current" on sessions for select using (
  is_campaign_member(campaign_id, 'gm') or (is_campaign_member(campaign_id) and (is_published or is_current))
);

-- Race-safe: unsetting any other current session and setting the target
-- happens in one transaction, so the partial unique index is never
-- transiently violated. p_session_id = null just clears the current session.
create or replace function set_current_session(p_campaign_id uuid, p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_campaign_member(p_campaign_id, 'gm') then
    raise exception 'only the GM can change the current session';
  end if;
  if p_session_id is not null and not exists (
    select 1 from sessions where id = p_session_id and campaign_id = p_campaign_id
  ) then
    raise exception 'session not found in this campaign';
  end if;

  update sessions set is_current = false
    where campaign_id = p_campaign_id and is_current and (p_session_id is null or id <> p_session_id);
  if p_session_id is not null then
    update sessions set is_current = true where id = p_session_id;
  end if;
end;
$$;

grant execute on function set_current_session(uuid, uuid) to authenticated;

-- ===== session_npcs: per-attachment reveal toggle =====
alter table session_npcs add column revealed boolean not null default false;

-- session_npcs previously had no update policy (it was a plain attach/detach
-- join with no editable fields) - added now so the GM can flip `revealed`.
create policy "gm can update" on session_npcs for update using (
  exists (select 1 from sessions s where s.id = session_npcs.session_id and is_campaign_member(s.campaign_id, 'gm'))
);

-- Additive to the existing "visible if parent session is" policy above (GM
-- always sees everything through that one) - this is the new player-facing
-- path: a revealed row on the campaign's current session, regardless of
-- that session's publish state.
create policy "members see revealed on current session" on session_npcs for select using (
  revealed and exists (
    select 1 from sessions s where s.id = session_npcs.session_id and s.is_current and is_campaign_member(s.campaign_id)
  )
);

-- ===== session_locations: new join table, mirrors session_npcs's shape =====
create table session_locations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  revealed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_id, location_id)
);

alter table session_locations enable row level security;

create policy "visible if parent session is" on session_locations for select using (
  exists (
    select 1 from sessions s where s.id = session_locations.session_id
    and (is_campaign_member(s.campaign_id, 'gm') or (is_campaign_member(s.campaign_id) and s.is_published))
  )
);
create policy "members see revealed on current session" on session_locations for select using (
  revealed and exists (
    select 1 from sessions s where s.id = session_locations.session_id and s.is_current and is_campaign_member(s.campaign_id)
  )
);
create policy "gm can write" on session_locations for insert with check (
  exists (select 1 from sessions s where s.id = session_locations.session_id and is_campaign_member(s.campaign_id, 'gm'))
);
create policy "gm can update" on session_locations for update using (
  exists (select 1 from sessions s where s.id = session_locations.session_id and is_campaign_member(s.campaign_id, 'gm'))
);
create policy "gm can delete" on session_locations for delete using (
  exists (select 1 from sessions s where s.id = session_locations.session_id and is_campaign_member(s.campaign_id, 'gm'))
);

-- Live updates: a player's dashboard should update the instant the GM
-- changes the current session or reveals/hides an attachment.
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.session_npcs;
alter publication supabase_realtime add table public.session_locations;
