// Sends a real "you've been invited" email (via Supabase Auth's admin API,
// routed through the project's configured Resend SMTP) when a GM adds a
// player who doesn't have an account yet. Runs server-side only, since
// admin.inviteUserByEmail requires the service_role key, which must never
// reach the browser. SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
// are auto-injected into every Edge Function by the platform.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  try {
    const { campaignId, email, role } = await req.json()
    if (!campaignId || !email || !role) {
      return json({ error: 'campaignId, email, and role are required' }, 400)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Scoped to the caller's own session - respects RLS, used only to verify
    // they're actually a GM of this campaign before doing anything privileged.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: isGm, error: roleError } = await userClient.rpc('is_campaign_member', {
      p_campaign_id: campaignId,
      p_role: 'gm',
    })
    if (roleError || !isGm) return json({ error: 'Not authorized' }, 403)

    // Only this client ever sees the service role key, and it never leaves this function.
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // invite_campaign_member re-checks is_campaign_member(...,'gm') internally
    // against auth.uid() - that's null under the service role, so this must go
    // through userClient (whose JWT auth.uid() resolves to the caller we just
    // verified above) even though the function itself runs as security definer.
    const { error: membershipError } = await userClient.rpc('invite_campaign_member', {
      p_campaign_id: campaignId,
      p_email: email,
      p_role: role,
    })
    if (membershipError) return json({ error: membershipError.message }, 500)

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://kylelord88.github.io/daggerheart-campaign-manager/'
    const { error: adminInviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: siteUrl,
    })

    if (!adminInviteError) return json({ emailSent: true })

    // Already has an account: membership above still applied, nothing more to do.
    if (/already.*(registered|exists)/i.test(adminInviteError.message)) {
      return json({ emailSent: false, reason: 'already_has_account' })
    }

    return json({ emailSent: false, error: adminInviteError.message })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
