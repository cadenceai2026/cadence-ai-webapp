import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    // Verify the calling user via their own JWT
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    )
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    // Admin client for DB operations (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { code } = await req.json()
    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing code' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    // Exchange OAuth code for Strava tokens
    console.log('Exchanging code for user:', user.id)
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
    console.log('Strava response status:', tokenRes.status)

    if (!tokenRes.ok) {
      console.error('Strava token error:', JSON.stringify(tokenData))
      return new Response(JSON.stringify({ error: 'Strava rejected the code', details: tokenData }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    const athlete = tokenData.athlete ?? {}

    // Save connection — use select then insert/update to avoid needing a
    // UNIQUE constraint on user_id (upsert with onConflict requires one)
    const record: Record<string, unknown> = {
      athlete_firstname: athlete.firstname ?? '',
      athlete_lastname: athlete.lastname ?? '',
      athlete_profile: athlete.profile_medium ?? athlete.profile ?? '',
      access_token: tokenData.access_token,
      updated_at: new Date().toISOString(),
    }
    if (tokenData.refresh_token) record.refresh_token = tokenData.refresh_token
    if (tokenData.expires_at)    record.expires_at    = tokenData.expires_at
    if (athlete.id)              record.athlete_id    = String(athlete.id)

    const { data: existing } = await supabase
      .from('strava_connections')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    let dbErr
    if (existing) {
      const { error } = await supabase
        .from('strava_connections')
        .update(record)
        .eq('user_id', user.id)
      dbErr = error
    } else {
      const { error } = await supabase
        .from('strava_connections')
        .insert({ ...record, user_id: user.id })
      dbErr = error
    }

    if (dbErr) {
      const errDetail = `code=${dbErr.code} msg=${dbErr.message} hint=${dbErr.hint ?? ''} detail=${dbErr.details ?? ''}`
      console.error('DB write failed:', errDetail)
      return new Response(JSON.stringify({ error: `DB error: ${errDetail}` }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    console.log('Strava connected for user:', user.id)
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('Unexpected error:', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
})
