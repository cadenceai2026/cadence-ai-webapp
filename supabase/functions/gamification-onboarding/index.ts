import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    // Get calling user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error('Invalid token');

    // 1. Create Game Profile if not exists
    await supabaseClient.from('game_profiles').upsert(
      { user_id: user.id, level: 1, total_xp: 0, league: 'bronze', total_km: 0, weekly_km: 0 },
      { onConflict: 'user_id' }
    );

    // 2. Create a "Bot" rival
    const botId = crypto.randomUUID();
    const botPace = 2.5 + Math.random() * 2; // 2.5 - 4.5 km per day
    
    // Create bot auth user
    await supabaseClient.auth.admin.createUser({
      id: botId,
      email: `bot_${botId}@cadence.ai`,
      password: crypto.randomUUID(),
      user_metadata: { display_name: 'Alex (Rival)' },
      email_confirm: true
    });

    // Create bot profile
    await supabaseClient.from('profiles').insert({
      id: botId,
      display_name: 'Alex (Rival)',
    });

    // Create bot game profile
    await supabaseClient.from('game_profiles').insert({
      user_id: botId,
      level: 1,
      league: 'bronze',
      is_bot: true,
      bot_pace_km_per_day: botPace
    });

    // 3. Create First Battle
    const now = new Date();
    const weekNumber = Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 86400000));
    
    const { data: battle } = await supabaseClient.from('battles').insert({
      challenger_id: user.id,
      opponent_id: botId,
      challenger_km: 0,
      opponent_km: 0,
      status: 'active',
      battle_type: 'weekly_km',
      title: 'First Battle',
      week_number: weekNumber,
      is_bot_match: true
    }).select().single();

    // 4. Create First Challenge
    const { data: challenge } = await supabaseClient.from('challenges').insert({
      user_id: user.id,
      type: 'daily',
      title: 'Complete your first run',
      description: 'Run any distance to unlock your streak and gain bonus XP.',
      target_count: 1,
      xp_reward: 150,
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    }).select().single();

    return new Response(JSON.stringify({ battle, challenge, rival_id: botId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
