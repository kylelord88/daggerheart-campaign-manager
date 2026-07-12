-- Minimal per-user profile, separate from campaign_members (which already has a
-- display_name column per membership row - this just tracks whether the
-- first-login onboarding flow has been completed, globally per user.
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on profiles
  for each row execute function set_updated_at();

alter table profiles enable row level security;

create policy "self only" on profiles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Existing users (before this feature existed) shouldn't be interrupted by a
-- surprise "first login" prompt - only genuinely new signups from here on see it.
insert into profiles (user_id, onboarded)
select id, true from auth.users
on conflict (user_id) do nothing;

-- campaign_members.display_name already exists but there was never a way to set
-- it (RLS only allowed GM/creator to update a member row). SECURITY DEFINER so a
-- player can set their own display name without being granted general UPDATE on
-- campaign_members, which would also expose the `role` column to self-editing.
create or replace function set_my_display_name(p_display_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update campaign_members
  set display_name = nullif(trim(p_display_name), '')
  where user_id = auth.uid();
end;
$$;

grant execute on function set_my_display_name(text) to authenticated;
