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

    if (activities.length === 0) {
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

    // Try bulk upsert with composite unique key (user_id, strava_id)
    const { error: upsertErr } = await supabase
      .from('activities')
      .upsert(rows, { onConflict: 'user_id,strava_id' })

    if (!upsertErr) {
      return new Response(JSON.stringify({ ok: true, count: activities.length }), {
        headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    // Fallback: fetch existing strava_ids for this user, insert only new ones
    console.log('Upsert fallback (no unique constraint):', upsertErr.message)

    const { data: existing } = await supabase
      .from('activities')
      .select('strava_id')
      .eq('user_id', user.id)

    const existingIds = new Set((existing || []).map((r: any) => String(r.strava_id)))
    const newRows = rows.filter(r => !existingIds.has(r.strava_id))

    if (newRows.length > 0) {
      const { error: insertErr } = await supabase
        .from('activities')
        .insert(newRows)

      if (insertErr) {
        console.error('Insert error:', insertErr)
        return new Response(JSON.stringify({ error: 'DB insert error', details: insertErr }), {
          status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
        })
      }
    }

    // Update existing activities in bulk via upsert on user_id+strava_id
    const updateRows = rows.filter(r => existingIds.has(r.strava_id))
    for (const row of updateRows) {
      await supabase
        .from('activities')
        .update(row)
        .eq('user_id', user.id)
        .eq('strava_id', row.strava_id)
    }

    return new Response(JSON.stringify({ ok: true, count: activities.length, inserted: newRows.length }), {
      headers: { ...cors, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('Unexpected error:', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
})
