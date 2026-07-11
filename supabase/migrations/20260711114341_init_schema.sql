-- Daggerheart Campaign Manager: initial normalized schema.
-- Replaces the legacy single-campaign `codex_entries` / `shattered_lands`
-- jsonb-blob tables with a proper multi-campaign relational schema.

create extension if not exists "pgcrypto";

-- ===== ENUMS =====
create type member_role as enum ('gm','player');
create type character_kind as enum ('npc','pc');
create type vitality_status as enum ('alive','dead','unknown','missing');
create type relationship_type as enum ('family','faction_hierarchy','ally','enemy','rival','mentor','romantic','associate','other');
create type quest_type as enum ('main','side','personal');
create type quest_status as enum ('active','complete','failed','abandoned');
create type location_type as enum ('settlement','landmark','dungeon','wilderness','building','other');
create type battle_type as enum ('battle','siege','skirmish','raid','naval','other');
create type battlefield_type as enum ('land','naval','aerial','urban','other');

-- ===== shared trigger for updated_at =====
create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ===== IDENTITY / TENANCY =====
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  cover_image_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on campaigns for each row execute function set_updated_at();

create table campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null,
  display_name text,
  created_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);

-- ===== REGIONS (forward-declared before locations/factions cross-reference) =====
create table regions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  slug text not null,
  name text not null,
  controlled_by_faction_id uuid, -- fk added after factions exists
  summary text,
  content_html text,
  hero_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, slug)
);
create trigger set_updated_at before update on regions for each row execute function set_updated_at();

create table region_gm_notes (
  region_id uuid primary key references regions(id) on delete cascade,
  gm_notes text
);

-- ===== LOCATIONS =====
create table locations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  region_id uuid references regions(id) on delete set null,
  slug text not null,
  name text not null,
  type location_type,
  tags text[] not null default '{}',
  controlled_by_faction_id uuid, -- fk added after factions exists
  atmosphere text,
  short_blurb text,
  content_html text,
  hero_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, slug)
);
create trigger set_updated_at before update on locations for each row execute function set_updated_at();

create table location_gm_notes (
  location_id uuid primary key references locations(id) on delete cascade,
  secrets text,
  dangers text,
  gm_notes text
);

-- ===== FACTIONS =====
create table factions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  slug text not null,
  name text not null,
  type text,
  tags text[] not null default '{}',
  hq_location_id uuid references locations(id) on delete set null,
  goal text,
  resources text,
  content_html text,
  hero_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, slug)
);
create trigger set_updated_at before update on factions for each row execute function set_updated_at();

create table faction_gm_notes (
  faction_id uuid primary key references factions(id) on delete cascade,
  secrets text,
  gm_notes text
);

create table faction_relations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  faction_id uuid not null references factions(id) on delete cascade,
  other_faction_id uuid not null references factions(id) on delete cascade,
  standing text,
  notes text,
  check (faction_id <> other_faction_id)
);

-- backfill the forward-referenced faction FKs now that factions exists
alter table regions add constraint regions_controlled_by_faction_id_fkey
  foreign key (controlled_by_faction_id) references factions(id) on delete set null;
alter table locations add constraint locations_controlled_by_faction_id_fkey
  foreign key (controlled_by_faction_id) references factions(id) on delete set null;

-- ===== DIVINITIES =====
create table divinities (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  slug text not null,
  name text not null,
  domain text,
  realm text,
  dogma text,
  worshippers text,
  content_html text,
  hero_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, slug)
);
create trigger set_updated_at before update on divinities for each row execute function set_updated_at();

create table divinity_gm_notes (
  divinity_id uuid primary key references divinities(id) on delete cascade,
  secret text
);

-- ===== CHARACTERS (unified NPC + PC) =====
create table characters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  slug text not null,
  name text not null,
  kind character_kind not null,
  player_user_id uuid references auth.users(id) on delete set null,
  demiplane_url text,
  role_or_title text,
  tags text[] not null default '{}',
  faction_id uuid references factions(id) on delete set null,
  faction_rank text,
  home_location_id uuid references locations(id) on delete set null,
  attitude text,
  vitality vitality_status not null default 'alive',
  appearance text,
  personality text,
  portrait_url text,
  content_html text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, slug)
);
create trigger set_updated_at before update on characters for each row execute function set_updated_at();

create table character_gm_notes (
  character_id uuid primary key references characters(id) on delete cascade,
  secrets text,
  gm_notes text,
  stat_block jsonb
);

create table character_relationships (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  character_id uuid not null references characters(id) on delete cascade,
  related_character_id uuid not null references characters(id) on delete cascade,
  relationship_type relationship_type not null,
  label text,
  is_directional boolean not null default true,
  is_gm_only boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  check (character_id <> related_character_id)
);

-- ===== QUESTS =====
create table quests (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  slug text not null,
  name text not null,
  quest_type quest_type not null,
  status quest_status not null default 'active',
  assigned_player_id uuid references auth.users(id) on delete set null,
  giver_character_id uuid references characters(id) on delete set null,
  location_id uuid references locations(id) on delete set null,
  hook text,
  objective text,
  reward text,
  progress text,
  tags text[] not null default '{}',
  content_html text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, slug)
);
create trigger set_updated_at before update on quests for each row execute function set_updated_at();

create table quest_gm_notes (
  quest_id uuid primary key references quests(id) on delete cascade,
  complications text,
  gm_notes text
);

-- ===== SESSIONS (GM notes) =====
create table sessions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  slug text not null,
  session_number int,
  session_date date,
  name text,
  location_id uuid references locations(id) on delete set null,
  tags text[] not null default '{}',
  is_published boolean not null default false,
  summary_html text,
  highlights text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, slug)
);
create trigger set_updated_at before update on sessions for each row execute function set_updated_at();

create table session_gm_notes (
  session_id uuid primary key references sessions(id) on delete cascade,
  prep_notes_html text,
  cliffhanger text,
  quest_progress_notes text
);

create table session_npcs (
  session_id uuid not null references sessions(id) on delete cascade,
  character_id uuid not null references characters(id) on delete cascade,
  primary key (session_id, character_id)
);

-- ===== LIVE ENCOUNTER TRACKER =====
create table session_encounters (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text,
  is_active boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on session_encounters for each row execute function set_updated_at();

create table encounter_combatants (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references session_encounters(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  character_id uuid references characters(id) on delete set null,
  display_name text not null,
  is_adversary boolean not null default true,
  max_hp int,
  current_hp int,
  max_stress int,
  current_stress int,
  extra_trackers jsonb not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on encounter_combatants for each row execute function set_updated_at();

-- ===== CONFLICTS / STORY ARCS / BATTLES =====
create table story_arcs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  slug text not null,
  name text not null,
  summary text,
  content_html text,
  hero_image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, slug)
);
create trigger set_updated_at before update on story_arcs for each row execute function set_updated_at();

create table story_arc_gm_notes (
  story_arc_id uuid primary key references story_arcs(id) on delete cascade,
  gm_notes text
);

create table conflict_viewpoints (
  id uuid primary key default gen_random_uuid(),
  story_arc_id uuid not null references story_arcs(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  viewpoint_label text not null,
  region_id uuid references regions(id) on delete set null,
  faction_id uuid references factions(id) on delete set null,
  content_html text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on conflict_viewpoints for each row execute function set_updated_at();

-- ===== MAP (battles references maps, so maps comes before battles) =====
create table maps (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  image_url text not null,
  width_px int not null,
  height_px int not null,
  is_primary boolean not null default false,
  parent_region_id uuid references regions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on maps for each row execute function set_updated_at();

create table battles (
  id uuid primary key default gen_random_uuid(),
  story_arc_id uuid not null references story_arcs(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  slug text not null,
  name text not null,
  battle_type battle_type,
  battlefield_type battlefield_type,
  start_date text,
  end_date text,
  result text,
  location_id uuid references locations(id) on delete set null,
  map_id uuid references maps(id) on delete set null,
  content_html text,
  hero_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, slug)
);
create trigger set_updated_at before update on battles for each row execute function set_updated_at();

create table battle_sides (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references battles(id) on delete cascade,
  side_label text not null,
  sort_order int not null default 0
);

create table battle_participants (
  id uuid primary key default gen_random_uuid(),
  battle_side_id uuid not null references battle_sides(id) on delete cascade,
  faction_id uuid references factions(id) on delete set null,
  participant_label text not null,
  strength_count int,
  sort_order int not null default 0
);

create table map_pins (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references maps(id) on delete cascade,
  x numeric not null,
  y numeric not null,
  icon text,
  location_id uuid references locations(id) on delete cascade,
  region_id uuid references regions(id) on delete cascade,
  battle_id uuid references battles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(location_id, region_id, battle_id) = 1)
);

create table map_regions (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references maps(id) on delete cascade,
  region_id uuid not null references regions(id) on delete cascade,
  points jsonb not null,
  stroke_color text not null default '#f2c14e',
  fill_color text not null default '#f2c14e',
  fill_opacity numeric not null default 0.15,
  created_at timestamptz not null default now()
);

-- ===== MISC / COMMUNITY CONTENT =====
create table misc_categories (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  slug text not null,
  name text not null,
  icon text,
  unique (campaign_id, slug)
);

create table misc_entries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  category_id uuid not null references misc_categories(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  slug text not null,
  name text not null,
  tags text[] not null default '{}',
  summary text,
  content_html text,
  hero_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, slug)
);
create trigger set_updated_at before update on misc_entries for each row execute function set_updated_at();

-- ===== INDEXES (campaign_id is the hot filter on every content table) =====
create index on campaign_members (campaign_id);
create index on campaign_members (user_id);
create index on regions (campaign_id);
create index on locations (campaign_id);
create index on factions (campaign_id);
create index on divinities (campaign_id);
create index on characters (campaign_id);
create index on character_relationships (campaign_id);
create index on quests (campaign_id);
create index on quests (assigned_player_id);
create index on sessions (campaign_id);
create index on session_encounters (campaign_id);
create index on encounter_combatants (campaign_id);
create index on encounter_combatants (encounter_id);
create index on story_arcs (campaign_id);
create index on conflict_viewpoints (story_arc_id);
create index on battles (campaign_id);
create index on battles (story_arc_id);
create index on maps (campaign_id);
create index on map_pins (map_id);
create index on map_regions (map_id);
create index on misc_entries (campaign_id);
create index on misc_entries (category_id);
