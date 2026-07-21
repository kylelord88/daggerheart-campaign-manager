-- Selective player-sharing for Sources: the feature is GM-only end to end by
-- design (see 20260721130000_gm_source_images.sql), but Kyle wants a narrow,
-- opt-in exception - reveal one specific image to the table (e.g. "here's the
-- symbol for that army") without opening the whole library.
--
-- Named `is_shared`, not `is_published` (the name used for this same on/off
-- shape on locations/characters/quests/factions/divinities), because the
-- semantics differ: is_published there means "this record's own page is
-- visible to players." An image never gets its own player-visible page - the
-- standalone Sources library page (SourcesPage.tsx) stays GM-only regardless
-- of this flag. A shared image only becomes visible through wherever it's
-- attached (an entity's Sources tab, a session's Sources tab). is_shared says
-- that honestly; is_published would imply something untrue here.
alter table gm_source_images add column is_shared boolean not null default false;

-- Every existing GM-only policy on all three tables (gm_source_images,
-- source_attachments, session_sources) is left completely untouched -
-- Postgres OR's multiple permissive policies for the same command together,
-- so these new SELECT policies are purely additive: they can only grant a
-- regular campaign member read access they didn't have before, never take
-- away the GM's existing full access. Insert/update/delete remain GM-only
-- everywhere - players can view a shared image, never create/edit/delete/
-- reshare one.

create policy "members can read shared" on gm_source_images for select
  using (is_campaign_member(campaign_id) and is_shared = true);

create policy "members can read shared attachments" on source_attachments for select
  using (
    is_campaign_member(campaign_id)
    and exists (
      select 1 from gm_source_images g
      where g.id = source_attachments.source_id and g.is_shared = true
    )
  );

create policy "members can read shared session sources" on session_sources for select
  using (
    is_campaign_member(campaign_id)
    and exists (
      select 1 from gm_source_images g
      where g.id = session_sources.source_id and g.is_shared = true
    )
  );

-- Storage bucket: this is the policy that actually gates the image bytes.
-- createSignedUrl() only succeeds if this SELECT policy passes, so this is
-- the real enforcement point for "can a player even get a URL for this
-- file" - everything above just controls whether the row (and its path) is
-- visible to query in the first place. Existing gm-only bucket policies
-- (select/insert/update/delete, keyed off the {campaign_id}/... folder path)
-- are left unchanged; this adds one more permissive SELECT for members,
-- keyed off gm_source_images.image_path + is_shared instead of the folder.
create policy "members can read shared gm-sources" on storage.objects for select
  using (
    bucket_id = 'gm-sources' and exists (
      select 1 from gm_source_images g
      where g.image_path = storage.objects.name
        and g.is_shared = true
        and is_campaign_member(g.campaign_id)
    )
  );
