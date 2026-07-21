-- A session points at Source library images it wants on hand during play (a
-- glance-reference while describing a location, NPC, etc). Pure REFERENCE
-- join (no snapshot) exactly like session_environments — sources have no
-- live per-session state to track, so the tab always reads the current
-- library entry. GM-only end to end, same as gm_source_images itself: NO
-- player-read policy.
create table session_sources (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  source_id uuid references gm_source_images(id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on session_sources (session_id);

alter table session_sources enable row level security;
create policy "gm can read" on session_sources for select using (is_campaign_member(campaign_id, 'gm'));
create policy "gm can write" on session_sources for insert with check (is_campaign_member(campaign_id, 'gm'));
create policy "gm can update" on session_sources for update using (is_campaign_member(campaign_id, 'gm'));
create policy "gm can delete" on session_sources for delete using (is_campaign_member(campaign_id, 'gm'));

create trigger set_updated_at before update on session_sources
  for each row execute function set_updated_at();
