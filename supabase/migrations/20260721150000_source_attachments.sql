-- Generic "attach a Source library image to an entity" mechanic — separate
-- from session_sources (which is the session-specific attach mechanic and is
-- untouched here). Lets the GM pin a reference image directly to a Location,
-- Character, Quest, Faction, or Divinity via Source Type -> specific item.
--
-- One join table for all five entity types rather than five near-identical
-- tables. entity_id is polymorphic across those tables, so no FK is possible
-- on it (same tradeoff accepted elsewhere in the schema, e.g. some
-- encounter_combatants references); entity_table is constrained to the five
-- known table names as a lightweight safety net against typos.
--
-- GM-only end to end, same bar as gm_source_images/session_sources: NO
-- player-read policy at all.
create table source_attachments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  source_id uuid not null references gm_source_images(id) on delete cascade,
  entity_table text not null check (entity_table in ('locations', 'characters', 'quests', 'factions', 'divinities')),
  entity_id uuid not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, entity_table, entity_id)
);
-- "what's attached to this entity" (entity's Sources tab)
create index on source_attachments (campaign_id, entity_table, entity_id);
-- "what's this image attached to" (chips on the Sources library card)
create index on source_attachments (source_id);

alter table source_attachments enable row level security;
create policy "gm can read" on source_attachments for select using (is_campaign_member(campaign_id, 'gm'));
create policy "gm can write" on source_attachments for insert with check (is_campaign_member(campaign_id, 'gm'));
create policy "gm can update" on source_attachments for update using (is_campaign_member(campaign_id, 'gm'));
create policy "gm can delete" on source_attachments for delete using (is_campaign_member(campaign_id, 'gm'));

create trigger set_updated_at before update on source_attachments
  for each row execute function set_updated_at();
