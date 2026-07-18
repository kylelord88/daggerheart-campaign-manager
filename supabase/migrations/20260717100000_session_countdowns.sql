-- Session Clocks / Countdown trackers (e.g. Kyle's homebrew travel countdown:
-- a counter stepped down/up by duality-roll outcomes at the table).
--
-- Unlike Encounters/Roll Tables (GM-only end to end), clocks are
-- PLAYER-VISIBLE but GM-EDITABLE: players can watch the clock tick live,
-- only the GM can create/step/edit/delete. Visibility follows the parent
-- session (same pattern as session_npcs) so clocks on unpublished prep
-- sessions stay hidden from players at the RLS level, not just in the UI.

create table session_countdowns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  value int not null default 0 check (value >= 0),
  start_value int not null default 0,
  note text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on session_countdowns
  for each row execute function set_updated_at();

create index on session_countdowns (session_id);

alter table session_countdowns enable row level security;

create policy "visible if parent session is" on session_countdowns for select using (
  exists (
    select 1 from sessions s where s.id = session_countdowns.session_id
    and (is_campaign_member(s.campaign_id, 'gm') or (is_campaign_member(s.campaign_id) and s.is_published))
  )
);
create policy "gm can write" on session_countdowns for insert with check (is_campaign_member(campaign_id, 'gm'));
create policy "gm can update" on session_countdowns for update using (is_campaign_member(campaign_id, 'gm'));
create policy "gm can delete" on session_countdowns for delete using (is_campaign_member(campaign_id, 'gm'));

-- Live updates at the table: when the GM steps a clock, players' screens
-- update without a reload. postgres_changes respects RLS, and players hold
-- select on visible rows, so they receive the events. (The supabase_realtime
-- publication exists on this project but had no tables in it until now.)
alter publication supabase_realtime add table public.session_countdowns;
