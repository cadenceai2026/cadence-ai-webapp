import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  if (!jwt) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt)
  if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })

  const { code } = await req.json()
  if (!code) return new Response(JSON.stringify({ error: 'Missing code' }), { status: 400, headers: cors })

  // Exchange OAuth code for Strava tokens
  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: parseInt(Deno.env.get('STRAVA_CLIENT_ID') ?? '0'),
      client_secret: Deno.env.get('STRAVA_CLIENT_SECRET') ?? '',
      code,
      grant_type: 'authorization_code',
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenRes.ok) {
    return new Response(JSON.stringify({ error: 'Strava rejected the code', details: tokenData }), { status: 400, headers: cors })
  }

  const athlete = tokenData.athlete ?? {}

  // Upsert the connection — works because strava_connections.user_id is now UNIQUE
  const { error: dbErr } = await supabase.from('strava_connections').upsert({
    user_id: user.id,
    athlete_id: athlete.id ? String(athlete.id) : null,
    athlete_firstname: athlete.firstname ?? '',
    athlete_lastname: athlete.lastname ?? '',
    athlete_profile: athlete.profile_medium ?? athlete.profile ?? '',
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token ?? null,
    expires_at: tokenData.expires_at ? new Date(tokenData.expires_at * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (dbErr) {
    console.error('DB error:', dbErr.message)
    return new Response(JSON.stringify({ error: dbErr.message }), { status: 500, headers: cors })
  }

  return new Response(JSON.stringify({ ok: true }), { headers: cors })
})
