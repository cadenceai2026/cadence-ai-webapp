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

    const { user_id } = await req.json();
    if (!user_id) throw new Error('user_id required');

    // 1. Get user profile
    const { data: userProfile } = await supabaseClient
      .from('game_profiles')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (!userProfile) throw new Error('User profile not found');

    // 2. Anti-frustration: if lost 2 times, assign an easy bot
    let opponentId;
    let isBotMatch = false;

    if (userProfile.loss_streak >= 2) {
      isBotMatch = true;
      // Find or create an easy bot (omitted bot creation for brevity, assuming bots exist in DB)
      const { data: easyBots } = await supabaseClient
        .from('game_profiles')
        .select('user_id')
        .eq('is_bot', true)
        .lt('bot_pace_km_per_day', 2.0)
        .limit(1);
        
      if (easyBots && easyBots.length > 0) {
        opponentId = easyBots[0].user_id;
      }
    }

    // 3. Normal matchmaking: find similar league user
    if (!opponentId) {
      const { data: candidates } = await supabaseClient
        .from('game_profiles')
        .select('user_id')
        .eq('league', userProfile.league)
        .eq('is_bot', false)
        .neq('user_id', user_id)
        .limit(10);
        
      if (candidates && candidates.length > 0) {
        opponentId = candidates[Math.floor(Math.random() * candidates.length)].user_id;
      } else {
        // Fallback to bot if no users
        isBotMatch = true;
        const { data: bots } = await supabaseClient.from('game_profiles').select('user_id').eq('is_bot', true).limit(1);
        opponentId = bots?.[0]?.user_id;
      }
    }

    if (!opponentId) throw new Error('Could not find opponent');

    // 4. Create battle
    const now = new Date();
    const weekNumber = Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 86400000));
    
    const { data: battle } = await supabaseClient.from('battles').insert({
      challenger_id: user_id,
      opponent_id: opponentId,
      challenger_km: userProfile.weekly_km || 0,
      opponent_km: 0,
      status: 'active',
      battle_type: 'weekly_km',
      title: 'Weekly Match',
      week_number: weekNumber,
      is_bot_match: isBotMatch
    }).select().single();

    return new Response(JSON.stringify({ success: true, battle }), {
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
