-- Invite-link signups now collect email/password/display name up front
-- (supabase.auth.signUp with the invite link id + desired display name
-- stashed in user metadata) instead of the fragile "remember the pending
-- invite in localStorage across a magic-link email click" approach, which
-- broke whenever the confirmation link was opened on a different device/
-- browser than the one that started the signup. This trigger reads that
-- metadata the moment the auth.users row is inserted (signup time, not
-- confirmation time) and finishes the job server-side: join the campaign,
-- carry over the display name, and skip onboarding since we already
-- collected everything we'd have asked for there.
create function handle_new_user_invite_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link_id uuid;
  v_display_name text;
  v_campaign_id uuid;
  v_role member_role;
  v_revoked timestamptz;
begin
  begin
    v_link_id := (new.raw_user_meta_data->>'invite_link_id')::uuid;
  exception when invalid_text_representation then
    v_link_id := null;
  end;

  if v_link_id is null then
    return new;
  end if;

  select campaign_id, role, revoked_at into v_campaign_id, v_role, v_revoked
  from campaign_invite_links where id = v_link_id;

  if v_campaign_id is null or v_revoked is not null then
    return new;
  end if;

  v_display_name := nullif(trim(new.raw_user_meta_data->>'display_name'), '');

  insert into campaign_members (campaign_id, user_id, role, display_name)
  values (v_campaign_id, new.id, v_role, v_display_name)
  on conflict (campaign_id, user_id) do nothing;

  insert into profiles (user_id, onboarded)
  values (new.id, true)
  on conflict (user_id) do update set onboarded = true;

  return new;
end;
$$;

create trigger on_auth_user_created_invite_link
  after insert on auth.users
  for each row execute function handle_new_user_invite_link();
