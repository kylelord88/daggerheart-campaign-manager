-- GM-only roll tables scoped to a session (e.g. hazard tables, complication tables).
-- campaign_id is denormalized onto both tables (matching the session_encounters/
-- encounter_combatants pattern) so RLS doesn't need a join through sessions.

create table session_roll_tables (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  dice_label text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table session_roll_table_entries (
  id uuid primary key default gen_random_uuid(),
  roll_table_id uuid not null references session_roll_tables(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  roll_label text not null,
  result_text text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create trigger set_updated_at before update on session_roll_tables
  for each row execute function set_updated_at();

create index on session_roll_tables (session_id);
create index on session_roll_table_entries (roll_table_id);

alter table session_roll_tables enable row level security;
alter table session_roll_table_entries enable row level security;

create policy "gm only" on session_roll_tables for all
  using (is_campaign_member(campaign_id, 'gm'::member_role));

create policy "gm only" on session_roll_table_entries for all
  using (is_campaign_member(campaign_id, 'gm'::member_role));
