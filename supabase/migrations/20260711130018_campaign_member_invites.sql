-- GM-facing member management: invite a player by email, whether or not
-- they've signed up yet. `auth.users` isn't exposed to PostgREST (and
-- shouldn't be queried directly from the client), so this adds a handful of
-- security-definer functions that read/join it safely on the server.

create table campaign_invites (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  email text not null,
  role member_role not null,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (campaign_id, email)
);
create index on campaign_invites (campaign_id);
create index on campaign_invites (email);

alter table campaign_invites enable row level security;
create policy "gm can read" on campaign_invites for select using (is_campaign_member(campaign_id, 'gm'));
create policy "gm can write" on campaign_invites for insert with check (is_campaign_member(campaign_id, 'gm'));
create policy "gm can update" on campaign_invites for update using (is_campaign_member(campaign_id, 'gm'));
create policy "gm can delete" on campaign_invites for delete using (is_campaign_member(campaign_id, 'gm'));

-- Adds a member immediately if the email already has an account, otherwise
-- queues an invite that resolves the moment that email signs up (see trigger
-- below). Callable by any GM of the target campaign; not a general-purpose
-- "look up any user by email" hole since it only ever inserts/updates rows
-- scoped to a campaign the caller GMs.
create function invite_campaign_member(p_campaign_id uuid, p_email text, p_role member_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if not is_campaign_member(p_campaign_id, 'gm') then
    raise exception 'not authorized';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email) limit 1;

  if v_user_id is not null then
    insert into campaign_members (campaign_id, user_id, role)
    values (p_campaign_id, v_user_id, p_role)
    on conflict (campaign_id, user_id) do update set role = excluded.role;
  else
    insert into campaign_invites (campaign_id, email, role, invited_by)
    values (p_campaign_id, lower(p_email), p_role, auth.uid())
    on conflict (campaign_id, email) do update set role = excluded.role, accepted_at = null;
  end if;
end;
$$;

-- Resolves any pending invites the moment a matching email signs up.
create function handle_new_user_invites()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into campaign_members (campaign_id, user_id, role)
  select campaign_id, new.id, role from campaign_invites
  where lower(email) = lower(new.email) and accepted_at is null
  on conflict (campaign_id, user_id) do nothing;

  update campaign_invites set accepted_at = now()
  where lower(email) = lower(new.email) and accepted_at is null;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user_invites();

-- Member roster with emails, for the GM Members screen (and so any member
-- can see who else is in the campaign).
create function get_campaign_members(p_campaign_id uuid)
returns table (id uuid, user_id uuid, email text, role member_role, display_name text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select cm.id, cm.user_id, u.email, cm.role, cm.display_name, cm.created_at
  from campaign_members cm
  join auth.users u on u.id = cm.user_id
  where cm.campaign_id = p_campaign_id
    and is_campaign_member(p_campaign_id)
  order by cm.role, u.email;
$$;

-- Pending (not-yet-accepted) invites, GM-only.
create function get_campaign_invites(p_campaign_id uuid)
returns table (id uuid, email text, role member_role, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select ci.id, ci.email, ci.role, ci.created_at
  from campaign_invites ci
  where ci.campaign_id = p_campaign_id
    and is_campaign_member(p_campaign_id, 'gm')
    and ci.accepted_at is null
  order by ci.created_at desc;
$$;
