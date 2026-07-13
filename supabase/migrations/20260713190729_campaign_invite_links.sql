-- Shareable invite links: a GM generates a link (grants a fixed role) that
-- any number of people can use to join, as an alternative to per-email
-- invites in campaign_invites. Redemption never downgrades an existing
-- membership (e.g. re-clicking a player link while already GM on that
-- campaign).

create table campaign_invite_links (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  role member_role not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index on campaign_invite_links (campaign_id);

alter table campaign_invite_links enable row level security;
create policy "gm can read" on campaign_invite_links for select using (is_campaign_member(campaign_id, 'gm'));
create policy "gm can write" on campaign_invite_links for insert with check (is_campaign_member(campaign_id, 'gm'));
create policy "gm can update" on campaign_invite_links for update using (is_campaign_member(campaign_id, 'gm'));
create policy "gm can delete" on campaign_invite_links for delete using (is_campaign_member(campaign_id, 'gm'));

create function create_campaign_invite_link(p_campaign_id uuid, p_role member_role)
returns campaign_invite_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row campaign_invite_links;
begin
  if not is_campaign_member(p_campaign_id, 'gm') then
    raise exception 'not authorized';
  end if;

  insert into campaign_invite_links (campaign_id, role, created_by)
  values (p_campaign_id, p_role, auth.uid())
  returning * into v_row;

  return v_row;
end;
$$;

create function get_campaign_invite_links(p_campaign_id uuid)
returns table (id uuid, role member_role, created_at timestamptz, revoked_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, l.role, l.created_at, l.revoked_at
  from campaign_invite_links l
  where l.campaign_id = p_campaign_id
    and is_campaign_member(p_campaign_id, 'gm')
  order by l.created_at desc;
$$;

create function revoke_campaign_invite_link(p_link_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_id uuid;
begin
  select campaign_id into v_campaign_id from campaign_invite_links where id = p_link_id;
  if v_campaign_id is null or not is_campaign_member(v_campaign_id, 'gm') then
    raise exception 'not authorized';
  end if;
  update campaign_invite_links set revoked_at = now() where id = p_link_id;
end;
$$;

-- Public (callable signed-out): lets a visitor see what campaign/role a
-- link grants before they sign in, without exposing the links table itself.
create function get_invite_link_info(p_link_id uuid)
returns table (campaign_name text, campaign_slug text, role member_role, valid boolean)
language sql
stable
security definer
set search_path = public
as $$
  select c.name, c.slug, l.role, (l.revoked_at is null)
  from campaign_invite_links l
  join campaigns c on c.id = l.campaign_id
  where l.id = p_link_id;
$$;

-- Authenticated user redeems a link to join the campaign.
create function redeem_campaign_invite_link(p_link_id uuid)
returns table (campaign_slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_id uuid;
  v_role member_role;
  v_revoked timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select campaign_id, role, revoked_at into v_campaign_id, v_role, v_revoked
  from campaign_invite_links where id = p_link_id;

  if v_campaign_id is null then
    raise exception 'invite link not found';
  end if;
  if v_revoked is not null then
    raise exception 'invite link revoked';
  end if;

  insert into campaign_members (campaign_id, user_id, role)
  values (v_campaign_id, auth.uid(), v_role)
  on conflict (campaign_id, user_id) do nothing;

  return query select slug from campaigns where id = v_campaign_id;
end;
$$;
