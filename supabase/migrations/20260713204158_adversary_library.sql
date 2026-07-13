-- Reusable adversary templates a GM builds once and pulls into any
-- encounter, instead of re-typing the same stat block every session.
-- GM-only prep material (no is_published/RLS split like the other
-- entities) - stat_block mirrors the shape already used ad hoc on
-- encounter_combatants.extra_trackers (CombatantStatBlock in
-- useSessionExtras.ts), so an adversary picked from the library can be
-- copied straight onto a combatant row unchanged.
create table adversary_library (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  max_hp integer,
  max_stress integer,
  stat_block jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on adversary_library (campaign_id);

alter table adversary_library enable row level security;
create policy "gm can read" on adversary_library for select using (is_campaign_member(campaign_id, 'gm'));
create policy "gm can write" on adversary_library for insert with check (is_campaign_member(campaign_id, 'gm'));
create policy "gm can update" on adversary_library for update using (is_campaign_member(campaign_id, 'gm'));
create policy "gm can delete" on adversary_library for delete using (is_campaign_member(campaign_id, 'gm'));

create trigger set_updated_at before update on adversary_library
  for each row execute function set_updated_at();
