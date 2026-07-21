-- "Sources": a GM-only reference image library — visual prep material (portrait
-- refs, location refs, whatever) that players must never see. Mirrors
-- environment_library's GM-only shape exactly: per-campaign, 4 GM-only
-- policies via is_campaign_member(campaign_id, 'gm'), NO player-read policy
-- at all. Unlike the media/maps hero-image buckets, this is not "obscure URL
-- is fine" — it needs a genuinely private bucket (see below), so image_path
-- stores the storage object path, not a public URL; the app resolves a
-- short-lived signed URL client-side whenever it renders one.
create table gm_source_images (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  description text,
  image_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on gm_source_images (campaign_id);

alter table gm_source_images enable row level security;
create policy "gm can read" on gm_source_images for select using (is_campaign_member(campaign_id, 'gm'));
create policy "gm can write" on gm_source_images for insert with check (is_campaign_member(campaign_id, 'gm'));
create policy "gm can update" on gm_source_images for update using (is_campaign_member(campaign_id, 'gm'));
create policy "gm can delete" on gm_source_images for delete using (is_campaign_member(campaign_id, 'gm'));

create trigger set_updated_at before update on gm_source_images
  for each row execute function set_updated_at();

-- Private bucket (public: false) — unlike `media`/`maps`, these images are
-- meant to be inaccessible to players, not just unlisted, so reads need an
-- actual RLS check (a public bucket would serve the file to anyone with the
-- URL, no auth involved, which defeats the point of this feature). Folder
-- convention `{campaign_id}/{filename}`, same as `media`/`maps`.
insert into storage.buckets (id, name, public) values ('gm-sources', 'gm-sources', false);

create policy "gm can read gm-sources" on storage.objects for select
  using (bucket_id = 'gm-sources' and is_campaign_member((storage.foldername(name))[1]::uuid, 'gm'));

create policy "gm can upload gm-sources" on storage.objects for insert
  with check (bucket_id = 'gm-sources' and is_campaign_member((storage.foldername(name))[1]::uuid, 'gm'));

create policy "gm can update gm-sources" on storage.objects for update
  using (bucket_id = 'gm-sources' and is_campaign_member((storage.foldername(name))[1]::uuid, 'gm'));

create policy "gm can delete gm-sources" on storage.objects for delete
  using (bucket_id = 'gm-sources' and is_campaign_member((storage.foldername(name))[1]::uuid, 'gm'));
