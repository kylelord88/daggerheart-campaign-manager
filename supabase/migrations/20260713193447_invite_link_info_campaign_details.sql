-- Join page shows the campaign's hero image + description (same copy as the
-- Dashboard hero), so the public invite-info lookup needs those fields too.
drop function get_invite_link_info(uuid);

create function get_invite_link_info(p_link_id uuid)
returns table (
  campaign_name text,
  campaign_slug text,
  campaign_description text,
  campaign_cover_image_url text,
  role member_role,
  valid boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select c.name, c.slug, c.description, c.cover_image_url, l.role, (l.revoked_at is null)
  from campaign_invite_links l
  join campaigns c on c.id = l.campaign_id
  where l.id = p_link_id;
$$;
