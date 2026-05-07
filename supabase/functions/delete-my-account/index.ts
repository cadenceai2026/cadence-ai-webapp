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

    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }
    const authResult = await supabase.auth.getUser(jwt)
    const user = authResult.data?.user
    const authErr = authResult.error
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    // Delete all user data in order (respecting FK constraints)
    await supabase.from('activities').delete().eq('user_id', user.id)
    await supabase.from('group_members').delete().eq('user_id', user.id)
    await supabase.from('strava_connections').delete().eq('user_id', user.id)
    await supabase.from('profiles').delete().eq('id', user.id)

    // Delete the auth user last
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(user.id)
    if (deleteErr) {
      console.error('Failed to delete auth user:', deleteErr)
      return new Response(JSON.stringify({ error: 'Failed to delete account', details: deleteErr }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('Delete account error:', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
})
