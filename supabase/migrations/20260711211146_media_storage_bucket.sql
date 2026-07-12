-- Public bucket for general content images (location/faction/divinity/quest
-- hero images, character portraits, campaign cover images) — same public
-- read / GM-only write-by-folder pattern as the existing `maps` bucket.
insert into storage.buckets (id, name, public) values ('media', 'media', true);

create policy "gm can upload media" on storage.objects for insert
  with check (bucket_id = 'media' and is_campaign_member((storage.foldername(name))[1]::uuid, 'gm'));

create policy "gm can update media" on storage.objects for update
  using (bucket_id = 'media' and is_campaign_member((storage.foldername(name))[1]::uuid, 'gm'));

create policy "gm can delete media" on storage.objects for delete
  using (bucket_id = 'media' and is_campaign_member((storage.foldername(name))[1]::uuid, 'gm'));
