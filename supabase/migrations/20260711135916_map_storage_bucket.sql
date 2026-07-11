-- Public bucket for map images. Public reads (no RLS check, served straight
-- from the public URL) since map art isn't sensitive and the maps/locations
-- rows themselves are already gated by campaign membership - obscure-URL is
-- an acceptable tradeoff here, same as hero images elsewhere in the app.
-- Uploads are still restricted to campaign GMs via the folder convention
-- `{campaign_id}/{filename}`.
insert into storage.buckets (id, name, public) values ('maps', 'maps', true);

create policy "gm can upload maps" on storage.objects for insert
  with check (bucket_id = 'maps' and is_campaign_member((storage.foldername(name))[1]::uuid, 'gm'));

create policy "gm can update maps" on storage.objects for update
  using (bucket_id = 'maps' and is_campaign_member((storage.foldername(name))[1]::uuid, 'gm'));

create policy "gm can delete maps" on storage.objects for delete
  using (bucket_id = 'maps' and is_campaign_member((storage.foldername(name))[1]::uuid, 'gm'));
