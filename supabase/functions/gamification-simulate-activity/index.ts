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

    // This should be triggered by cron, verify simple auth or IP (omitted for brevity)
    
    // 1. Get all active bot matches
    const { data: activeBattles, error: battlesErr } = await supabaseClient
      .from('battles')
      .select('*')
      .eq('status', 'active')
      .eq('is_bot_match', true);

    if (battlesErr || !activeBattles) throw new Error('Failed to fetch active bot matches');

    let updatedCount = 0;

    for (const battle of activeBattles) {
      // Find which side is the bot. Usually opponent if created via our script.
      const isOpponentBot = true; // simplifying for now
      const botId = battle.opponent_id;
      
      const { data: botProfile } = await supabaseClient
        .from('game_profiles')
        .select('bot_pace_km_per_day')
        .eq('user_id', botId)
        .single();
        
      if (!botProfile) continue;

      // Simulate partial day activity (e.g. cron runs every 4 hours -> add 1/6th of daily pace)
      // Since this is demo, let's just add a small random chunk to simulate a run
      const kmToAdd = (botProfile.bot_pace_km_per_day || 3) * (0.1 + Math.random() * 0.3);
      
      const newKm = parseFloat(battle.opponent_km) + kmToAdd;
      
      await supabaseClient
        .from('battles')
        .update({ opponent_km: newKm.toFixed(2) })
        .eq('id', battle.id);
        
      updatedCount++;
    }

    return new Response(JSON.stringify({ success: true, updatedCount }), {
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
