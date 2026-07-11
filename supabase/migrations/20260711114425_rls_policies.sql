-- Row Level Security: campaign_members is the single source of truth for
-- who can see/write what. GM-only *fields* live on sibling `*_gm_notes`
-- tables (their own stricter policy), since RLS can't hide one column on an
-- otherwise-visible row.

create function is_campaign_member(p_campaign_id uuid, p_role member_role default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from campaign_members
    where campaign_id = p_campaign_id
      and user_id = auth.uid()
      and (p_role is null or role = p_role)
  )
$$;

-- ===== CAMPAIGNS / MEMBERSHIP =====
alter table campaigns enable row level security;
create policy "members can read" on campaigns for select using (is_campaign_member(id));
create policy "authenticated users can create campaigns" on campaigns for insert with check (created_by = auth.uid());
create policy "gm can update" on campaigns for update using (is_campaign_member(id, 'gm'));
create policy "gm can delete" on campaigns for delete using (is_campaign_member(id, 'gm'));

alter table campaign_members enable row level security;
create policy "members can read roster" on campaign_members for select using (is_campaign_member(campaign_id));
create policy "creator or gm can manage members" on campaign_members for insert with check (
  exists (select 1 from campaigns c where c.id = campaign_id and c.created_by = auth.uid())
  or is_campaign_member(campaign_id, 'gm')
);
create policy "creator or gm can update members" on campaign_members for update using (
  exists (select 1 from campaigns c where c.id = campaign_id and c.created_by = auth.uid())
  or is_campaign_member(campaign_id, 'gm')
);
create policy "creator or gm can remove members" on campaign_members for delete using (
  exists (select 1 from campaigns c where c.id = campaign_id and c.created_by = auth.uid())
  or is_campaign_member(campaign_id, 'gm')
);

-- ===== GENERIC "campaign-scoped content, GM writes" PATTERN =====
-- regions, locations, factions, divinities, characters, quests, story_arcs,
-- conflict_viewpoints, maps, misc_categories, faction_relations,
-- character_relationships, battles all follow this shape.
do $$
declare
  t text;
begin
  foreach t in array array[
    'regions','locations','factions','divinities','characters','quests',
    'story_arcs','conflict_viewpoints','maps','misc_categories',
    'faction_relations','character_relationships','battles'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format($f$create policy "members can read" on %I for select using (is_campaign_member(campaign_id))$f$, t);
    execute format($f$create policy "gm can write" on %I for insert with check (is_campaign_member(campaign_id, 'gm'))$f$, t);
    execute format($f$create policy "gm can update" on %I for update using (is_campaign_member(campaign_id, 'gm'))$f$, t);
    execute format($f$create policy "gm can delete" on %I for delete using (is_campaign_member(campaign_id, 'gm'))$f$, t);
  end loop;
end $$;

-- ===== GM-ONLY SIDE TABLES (fields embedded in an otherwise player-visible row) =====
alter table region_gm_notes enable row level security;
create policy "gm only" on region_gm_notes for all using (
  is_campaign_member((select campaign_id from regions where id = region_gm_notes.region_id), 'gm'));

alter table location_gm_notes enable row level security;
create policy "gm only" on location_gm_notes for all using (
  is_campaign_member((select campaign_id from locations where id = location_gm_notes.location_id), 'gm'));

alter table faction_gm_notes enable row level security;
create policy "gm only" on faction_gm_notes for all using (
  is_campaign_member((select campaign_id from factions where id = faction_gm_notes.faction_id), 'gm'));

alter table divinity_gm_notes enable row level security;
create policy "gm only" on divinity_gm_notes for all using (
  is_campaign_member((select campaign_id from divinities where id = divinity_gm_notes.divinity_id), 'gm'));

alter table character_gm_notes enable row level security;
create policy "gm only" on character_gm_notes for all using (
  is_campaign_member((select campaign_id from characters where id = character_gm_notes.character_id), 'gm'));

alter table quest_gm_notes enable row level security;
create policy "gm only" on quest_gm_notes for all using (
  is_campaign_member((select campaign_id from quests where id = quest_gm_notes.quest_id), 'gm'));

alter table story_arc_gm_notes enable row level security;
create policy "gm only" on story_arc_gm_notes for all using (
  is_campaign_member((select campaign_id from story_arcs where id = story_arc_gm_notes.story_arc_id), 'gm'));

-- ===== SESSIONS: whole-row publish gate, not a sibling-table split =====
alter table sessions enable row level security;
create policy "gm reads everything, players read published" on sessions for select using (
  is_campaign_member(campaign_id, 'gm') or (is_campaign_member(campaign_id) and is_published)
);
create policy "gm can write" on sessions for insert with check (is_campaign_member(campaign_id, 'gm'));
create policy "gm can update" on sessions for update using (is_campaign_member(campaign_id, 'gm'));
create policy "gm can delete" on sessions for delete using (is_campaign_member(campaign_id, 'gm'));

alter table session_gm_notes enable row level security;
create policy "gm only" on session_gm_notes for all using (
  is_campaign_member((select campaign_id from sessions where id = session_gm_notes.session_id), 'gm'));

alter table session_npcs enable row level security;
create policy "visible if parent session is" on session_npcs for select using (
  exists (
    select 1 from sessions s where s.id = session_npcs.session_id
    and (is_campaign_member(s.campaign_id, 'gm') or (is_campaign_member(s.campaign_id) and s.is_published))
  )
);
create policy "gm can write" on session_npcs for insert with check (
  exists (select 1 from sessions s where s.id = session_npcs.session_id and is_campaign_member(s.campaign_id, 'gm'))
);
create policy "gm can delete" on session_npcs for delete using (
  exists (select 1 from sessions s where s.id = session_npcs.session_id and is_campaign_member(s.campaign_id, 'gm'))
);

-- ===== LIVE ENCOUNTER TRACKER: GM-only end to end (Phase 5) =====
alter table session_encounters enable row level security;
create policy "gm only" on session_encounters for all using (is_campaign_member(campaign_id, 'gm'));

alter table encounter_combatants enable row level security;
create policy "gm only" on encounter_combatants for all using (is_campaign_member(campaign_id, 'gm'));

-- ===== BATTLE SUB-TABLES (no direct campaign_id; resolve via battles) =====
alter table battle_sides enable row level security;
create policy "members can read" on battle_sides for select using (
  is_campaign_member((select campaign_id from battles where id = battle_sides.battle_id)));
create policy "gm can write" on battle_sides for insert with check (
  is_campaign_member((select campaign_id from battles where id = battle_sides.battle_id), 'gm'));
create policy "gm can update" on battle_sides for update using (
  is_campaign_member((select campaign_id from battles where id = battle_sides.battle_id), 'gm'));
create policy "gm can delete" on battle_sides for delete using (
  is_campaign_member((select campaign_id from battles where id = battle_sides.battle_id), 'gm'));

alter table battle_participants enable row level security;
create policy "members can read" on battle_participants for select using (
  is_campaign_member((select b.campaign_id from battles b join battle_sides bs on bs.battle_id = b.id where bs.id = battle_participants.battle_side_id)));
create policy "gm can write" on battle_participants for insert with check (
  is_campaign_member((select b.campaign_id from battles b join battle_sides bs on bs.battle_id = b.id where bs.id = battle_participants.battle_side_id), 'gm'));
create policy "gm can update" on battle_participants for update using (
  is_campaign_member((select b.campaign_id from battles b join battle_sides bs on bs.battle_id = b.id where bs.id = battle_participants.battle_side_id), 'gm'));
create policy "gm can delete" on battle_participants for delete using (
  is_campaign_member((select b.campaign_id from battles b join battle_sides bs on bs.battle_id = b.id where bs.id = battle_participants.battle_side_id), 'gm'));

-- ===== MAP SUB-TABLES (no direct campaign_id; resolve via maps) =====
alter table map_pins enable row level security;
create policy "members can read" on map_pins for select using (
  is_campaign_member((select campaign_id from maps where id = map_pins.map_id)));
create policy "gm can write" on map_pins for insert with check (
  is_campaign_member((select campaign_id from maps where id = map_pins.map_id), 'gm'));
create policy "gm can update" on map_pins for update using (
  is_campaign_member((select campaign_id from maps where id = map_pins.map_id), 'gm'));
create policy "gm can delete" on map_pins for delete using (
  is_campaign_member((select campaign_id from maps where id = map_pins.map_id), 'gm'));

alter table map_regions enable row level security;
create policy "members can read" on map_regions for select using (
  is_campaign_member((select campaign_id from maps where id = map_regions.map_id)));
create policy "gm can write" on map_regions for insert with check (
  is_campaign_member((select campaign_id from maps where id = map_regions.map_id), 'gm'));
create policy "gm can update" on map_regions for update using (
  is_campaign_member((select campaign_id from maps where id = map_regions.map_id), 'gm'));
create policy "gm can delete" on map_regions for delete using (
  is_campaign_member((select campaign_id from maps where id = map_regions.map_id), 'gm'));

-- ===== MISC / COMMUNITY CONTENT: any member can contribute =====
alter table misc_entries enable row level security;
create policy "members can read" on misc_entries for select using (is_campaign_member(campaign_id));
create policy "members can contribute" on misc_entries for insert with check (is_campaign_member(campaign_id));
create policy "author or gm can update" on misc_entries for update using (
  created_by = auth.uid() or is_campaign_member(campaign_id, 'gm'));
create policy "author or gm can delete" on misc_entries for delete using (
  created_by = auth.uid() or is_campaign_member(campaign_id, 'gm'));
