-- Daggerheart "Environments": stat blocks for scenes/locations/situations,
-- the sibling of the Adversary Library but for the place a scene happens in.
-- A GM builds a reusable, GM-only library (like adversary_library) and can
-- attach entries to a specific session's prep.
--
-- environment_library mirrors adversary_library's GM-only setup (per-campaign,
-- 4 GM-only policies via is_campaign_member(campaign_id,'gm'), is_homebrew
-- split for a Library/Homebrew tab). Unlike adversaries, tier/type/difficulty
-- are real columns (they drive the header + tier grouping and are stable across
-- every environment), while the free-form rulebook content lives in stat_block.
--
-- stat_block jsonb shape (kept EXACTLY in sync with the app + data import):
--   {
--     "description": string,
--     "impulses": string[],
--     "potential_adversaries": string[],
--     "features": [
--       { "name": string, "kind": "passive"|"action"|"reaction",
--         "text": string, "question": string, "fear": boolean }
--     ]
--   (kind = structural label only; fear = true when the feature costs Fear.)
--   }
create table environment_library (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  tier int not null,
  env_type text not null, -- Exploration | Social | Traversal | Event
  difficulty int,          -- nullable: some environments are "Special"
  difficulty_note text,    -- nullable, e.g. "Special (see Relative Strength)"
  stat_block jsonb not null default '{}'::jsonb,
  is_homebrew boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on environment_library (campaign_id, tier);

alter table environment_library enable row level security;
create policy "gm can read" on environment_library for select using (is_campaign_member(campaign_id, 'gm'));
create policy "gm can write" on environment_library for insert with check (is_campaign_member(campaign_id, 'gm'));
create policy "gm can update" on environment_library for update using (is_campaign_member(campaign_id, 'gm'));
create policy "gm can delete" on environment_library for delete using (is_campaign_member(campaign_id, 'gm'));

create trigger set_updated_at before update on environment_library
  for each row execute function set_updated_at();

-- A session points at library environments it's using this session. This is a
-- pure REFERENCE join (no snapshot): environments have no live per-session
-- state to track, so the tab always reads the current library entry. GM-only
-- like the encounters/roll-tables prep tools, gated on the parent campaign.
create table session_environments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  environment_id uuid references environment_library(id) on delete cascade,
  sort_order int not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on session_environments (session_id);

alter table session_environments enable row level security;
create policy "gm can read" on session_environments for select using (is_campaign_member(campaign_id, 'gm'));
create policy "gm can write" on session_environments for insert with check (is_campaign_member(campaign_id, 'gm'));
create policy "gm can update" on session_environments for update using (is_campaign_member(campaign_id, 'gm'));
create policy "gm can delete" on session_environments for delete using (is_campaign_member(campaign_id, 'gm'));

create trigger set_updated_at before update on session_environments
  for each row execute function set_updated_at();
