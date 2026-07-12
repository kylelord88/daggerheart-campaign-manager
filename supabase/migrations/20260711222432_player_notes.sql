-- Private per-player notes. Deliberately NOT gm-notes-shaped: unlike the
-- location/character/etc *_gm_notes sibling tables (hidden from players,
-- visible to the GM), this is the inverse - each player's own scratch
-- notes, visible only to that player. No GM override policy at all, so
-- even the GM's own row in campaign_members grants no read access to
-- other members' notes.
create table player_notes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled Note',
  content_html text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on player_notes for each row execute function set_updated_at();

create index on player_notes (campaign_id, user_id);

alter table player_notes enable row level security;

create policy "owner only" on player_notes for all
  using (user_id = auth.uid() and is_campaign_member(campaign_id))
  with check (user_id = auth.uid() and is_campaign_member(campaign_id));
