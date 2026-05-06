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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Identify the calling user
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

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

    // Save connection — use upsert with only guaranteed columns first,
    // then try to add extra columns if they exist
    const record: Record<string, unknown> = {
      user_id: user.id,
      athlete_firstname: athlete.firstname ?? '',
      athlete_lastname: athlete.lastname ?? '',
      athlete_profile: athlete.profile_medium ?? athlete.profile ?? '',
      access_token: tokenData.access_token,
    }

    // Add optional columns if they exist in the response
    if (tokenData.refresh_token) record.refresh_token = tokenData.refresh_token
    if (tokenData.expires_at)    record.expires_at    = tokenData.expires_at
    if (athlete.id)              record.athlete_id    = String(athlete.id)
    record.updated_at = new Date().toISOString()

    const { error: dbErr } = await supabase
      .from('strava_connections')
      .upsert(record, { onConflict: 'user_id' })

    if (dbErr) {
      // Retry preserving token refresh fields (critical for sync to work after token expiry)
      console.error('Full upsert failed, retrying without optional fields:', dbErr.message)
      const retryRecord: Record<string, unknown> = {
        user_id: user.id,
        athlete_firstname: athlete.firstname ?? '',
        athlete_lastname: athlete.lastname ?? '',
        athlete_profile: athlete.profile_medium ?? athlete.profile ?? '',
        access_token: tokenData.access_token,
        updated_at: new Date().toISOString(),
      }
      // Always include token refresh fields so sync can refresh expired tokens
      if (tokenData.refresh_token) retryRecord.refresh_token = tokenData.refresh_token
      if (tokenData.expires_at) retryRecord.expires_at = tokenData.expires_at

      const { error: retryErr } = await supabase
        .from('strava_connections')
        .upsert(retryRecord, { onConflict: 'user_id' })

      if (retryErr) {
        console.error('Core upsert also failed:', retryErr.message)
        return new Response(JSON.stringify({ error: 'DB error', details: retryErr }), {
          status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
        })
      }
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
