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
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: authData, error: authErr } = await supabase.auth.getUser(jwt)
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }
    const user = authData.user

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

    // Refresh access token if expired or expiry unknown
    let accessToken = conn.access_token
    const tokenExpired = !conn.expires_at || Date.now() >= new Date(conn.expires_at).getTime()
    if (tokenExpired && conn.refresh_token) {
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
            expires_at: new Date(refreshData.expires_at * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
      } else {
        console.error('Token refresh failed:', JSON.stringify(refreshData))
        return new Response(JSON.stringify({ error: 'Strava token refresh failed — please reconnect Strava', details: refreshData }), {
          status: 401, headers: { ...cors, 'Content-Type': 'application/json' }
        })
      }
    }

    // Fetch last 60 days of activities from Strava
    const after = Math.floor((Date.now() - 60 * 86400 * 1000) / 1000)
    const stravaUrl = `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=60`

    let actRes = await fetch(stravaUrl, { headers: { Authorization: `Bearer ${accessToken}` } })

    // If Strava rejects the token even though we thought it was valid, try refreshing and retry once
    if (actRes.status === 401 && conn.refresh_token) {
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
      if (rr.ok) {
        const rd = await rr.json()
        accessToken = rd.access_token
        await supabase.from('strava_connections').update({
          access_token: rd.access_token,
          refresh_token: rd.refresh_token,
          expires_at: new Date(rd.expires_at * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('user_id', user.id)
        actRes = await fetch(stravaUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
      }
    }

    const activities = await actRes.json()

    if (!actRes.ok) {
      console.error('Strava activities error:', actRes.status, JSON.stringify(activities))
      return new Response(JSON.stringify({ error: 'Strava API error', details: activities }), {
        status: actRes.status === 401 ? 401 : 400,
        headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    if (!Array.isArray(activities) || activities.length === 0) {
      return new Response(JSON.stringify({ ok: true, count: 0 }), {
        headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

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

    // Attempt 1: bulk upsert with composite unique key (user_id, strava_id)
    const { error: e1 } = await supabase
      .from('activities')
      .upsert(rows, { onConflict: 'user_id,strava_id' })

    if (!e1) {
      return new Response(JSON.stringify({ ok: true, count: activities.length, method: 'upsert-composite' }), {
        headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }
    console.log('upsert composite failed:', e1.message)

    // Attempt 2: bulk upsert on strava_id alone (globally unique per Strava)
    const { error: e2 } = await supabase
      .from('activities')
      .upsert(rows, { onConflict: 'strava_id' })

    if (!e2) {
      return new Response(JSON.stringify({ ok: true, count: activities.length, method: 'upsert-strava_id' }), {
        headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }
    console.log('upsert strava_id failed:', e2.message)

    // Attempt 3: delete this user's existing activities then reinsert.
    // Strava is the source of truth for the last 60 days, so this is safe.
    const { error: delErr } = await supabase
      .from('activities')
      .delete()
      .eq('user_id', user.id)

    if (delErr) {
      console.error('delete failed:', delErr.message)
      return new Response(JSON.stringify({
        error: 'Could not write activities to DB',
        e1: e1.message, e2: e2.message, del: delErr.message,
      }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const { error: e3 } = await supabase
      .from('activities')
      .insert(rows)

    if (e3) {
      console.error('insert after delete failed:', e3.message)
      return new Response(JSON.stringify({
        error: 'Insert failed after delete',
        e1: e1.message, e2: e2.message, e3: e3.message,
      }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ ok: true, count: activities.length, method: 'delete-reinsert' }), {
      headers: { ...cors, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('Unexpected error:', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
})
