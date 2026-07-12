-- Add a GM-controlled publish toggle to every entity type that doesn't already have one
-- (sessions already has is_published). Defaults to true so nothing currently visible to
-- players suddenly disappears.

alter table locations add column is_published boolean not null default true;
alter table factions add column is_published boolean not null default true;
alter table divinities add column is_published boolean not null default true;
alter table characters add column is_published boolean not null default true;
alter table quests add column is_published boolean not null default true;

drop policy "members can read" on locations;
create policy "gm reads everything, players read published" on locations for select
  using (is_campaign_member(campaign_id, 'gm'::member_role) or (is_campaign_member(campaign_id) and is_published));

drop policy "members can read" on factions;
create policy "gm reads everything, players read published" on factions for select
  using (is_campaign_member(campaign_id, 'gm'::member_role) or (is_campaign_member(campaign_id) and is_published));

drop policy "members can read" on divinities;
create policy "gm reads everything, players read published" on divinities for select
  using (is_campaign_member(campaign_id, 'gm'::member_role) or (is_campaign_member(campaign_id) and is_published));

drop policy "members can read" on characters;
create policy "gm reads everything, players read published" on characters for select
  using (is_campaign_member(campaign_id, 'gm'::member_role) or (is_campaign_member(campaign_id) and is_published));

drop policy "members can read" on quests;
create policy "gm reads everything, players read published" on quests for select
  using (is_campaign_member(campaign_id, 'gm'::member_role) or (is_campaign_member(campaign_id) and is_published));
