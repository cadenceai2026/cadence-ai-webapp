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

    // Identify user
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    // Get Strava connection
    const { data: conn, error: connErr } = await supabase
      .from('strava_connections')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: 'No Strava connection found' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    // Refresh access token if expired
    let accessToken = conn.access_token
    if (conn.expires_at && Math.floor(Date.now() / 1000) >= conn.expires_at) {
      const refreshRes = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: Deno.env.get('STRAVA_CLIENT_ID'),
          client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
          refresh_token: conn.refresh_token,
          grant_type: 'refresh_token',
        }),
      })
      const refreshData = await refreshRes.json()
      if (refreshRes.ok) {
        accessToken = refreshData.access_token
        await supabase
          .from('strava_connections')
          .update({
            access_token: refreshData.access_token,
            refresh_token: refreshData.refresh_token,
            expires_at: refreshData.expires_at,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
      }
    }

    // Fetch last 60 days of activities from Strava
    const after = Math.floor((Date.now() - 60 * 86400 * 1000) / 1000)
    const actRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=60`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const activities = await actRes.json()

    if (!actRes.ok) {
      return new Response(JSON.stringify({ error: 'Strava API error', details: activities }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    if (activities.length > 0) {
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

      const { error: upsertErr } = await supabase
        .from('activities')
        .upsert(rows, { onConflict: 'strava_id' })

      if (upsertErr) {
        console.error('Upsert error:', upsertErr)
        return new Response(JSON.stringify({ error: 'DB upsert error', details: upsertErr }), {
          status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
        })
      }
    }

    return new Response(JSON.stringify({ ok: true, count: activities.length }), {
      headers: { ...cors, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('Unexpected error:', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
})
