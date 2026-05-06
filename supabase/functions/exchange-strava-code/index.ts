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

    // Identify the calling user via their JWT
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    const { code, redirectUri } = await req.json()
    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing code' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    // Exchange OAuth code for Strava tokens
    const exchangeBody: Record<string, string | number> = {
      client_id: parseInt(Deno.env.get('STRAVA_CLIENT_ID') ?? '0'),
      client_secret: Deno.env.get('STRAVA_CLIENT_SECRET') ?? '',
      code,
      grant_type: 'authorization_code',
    }
    if (redirectUri) exchangeBody.redirect_uri = redirectUri

    console.log('Exchanging code with Strava, client_id:', exchangeBody.client_id)

    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exchangeBody),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) {
      console.error('Strava token error:', tokenData)
      return new Response(JSON.stringify({ error: 'Strava rejected the code', details: tokenData }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    // Save connection to DB
    const { error: dbErr } = await supabase
      .from('strava_connections')
      .upsert({
        user_id: user.id,
        athlete_id: String(tokenData.athlete.id),
        athlete_firstname: tokenData.athlete.firstname,
        athlete_lastname: tokenData.athlete.lastname,
        athlete_profile: tokenData.athlete.profile_medium || tokenData.athlete.profile,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (dbErr) {
      console.error('DB error:', dbErr)
      return new Response(JSON.stringify({ error: 'DB error', details: dbErr }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

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
