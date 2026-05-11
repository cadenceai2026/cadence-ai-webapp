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

  // Get stored Strava tokens
  const { data: conn, error: connErr } = await supabase
    .from('strava_connections')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (connErr || !conn) {
    return new Response(JSON.stringify({ error: 'No Strava connection found' }), { status: 400, headers: cors })
  }

  // Refresh token if expired
  let accessToken = conn.access_token
  const expired = !conn.expires_at || Date.now() >= new Date(conn.expires_at).getTime()
  if (expired && conn.refresh_token) {
    const rr = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: Deno.env.get('STRAVA_CLIENT_ID'),
        client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
        refresh_token: conn.refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    const rd = await rr.json()
    if (!rr.ok) {
      return new Response(JSON.stringify({ error: 'Strava token refresh failed — please reconnect Strava' }), { status: 401, headers: cors })
    }
    accessToken = rd.access_token
    await supabase.from('strava_connections').update({
      access_token: rd.access_token,
      refresh_token: rd.refresh_token,
      expires_at: new Date(rd.expires_at * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id)
  }

  // Fetch last 60 days of activities from Strava
  const after = Math.floor((Date.now() - 60 * 86400 * 1000) / 1000)
  const actRes = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=60`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!actRes.ok) {
    return new Response(JSON.stringify({ error: 'Strava API error', status: actRes.status }), { status: 400, headers: cors })
  }

  const activities = await actRes.json()
  if (!Array.isArray(activities) || activities.length === 0) {
    return new Response(JSON.stringify({ ok: true, count: 0 }), { headers: cors })
  }

  // Upsert all activities — works because activities(user_id, strava_id) is now UNIQUE
  // and activities.id has a DEFAULT gen_random_uuid()
  const rows = activities.map((a: any) => ({
    user_id: user.id,
    strava_id: String(a.id),
    name: a.name,
    sport_type: a.sport_type || a.type,
    distance: a.distance,
    moving_time: a.moving_time,
    elapsed_time: a.elapsed_time,
    total_elevation_gain: a.total_elevation_gain,
    start_date: a.start_date,
    start_date_local: a.start_date_local,
    average_speed: a.average_speed,
    max_speed: a.max_speed,
    average_heartrate: a.average_heartrate ?? null,
    max_heartrate: a.max_heartrate ?? null,
  }))

  const { error } = await supabase
    .from('activities')
    .upsert(rows, { onConflict: 'user_id,strava_id' })

  if (error) {
    console.error('upsert failed:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors })
  }

  return new Response(JSON.stringify({ ok: true, count: activities.length }), { headers: cors })
})
