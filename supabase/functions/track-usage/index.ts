import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, itemCount } = await req.json();

    if (!userId || !itemCount) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Tracking usage for user ${userId}: ${itemCount} items`);

    // Get current month's usage record
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const { data: existingUsage, error: fetchError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .gte('period_start', currentMonth.toISOString())
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching usage:', fetchError);
      throw fetchError;
    }

    if (existingUsage) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('usage_tracking')
        .update({
          items_sent_this_month: existingUsage.items_sent_this_month + itemCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUsage.id);

      if (updateError) {
        console.error('Error updating usage:', updateError);
        throw updateError;
      }

      console.log(`Updated usage for user ${userId}: ${existingUsage.items_sent_this_month + itemCount} total items`);
    } else {
      // Create new record for current month
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const { error: insertError } = await supabase
        .from('usage_tracking')
        .insert({
          user_id: userId,
          items_sent_this_month: itemCount,
          period_start: currentMonth.toISOString(),
          period_end: nextMonth.toISOString(),
        });

      if (insertError) {
        console.error('Error inserting usage:', insertError);
        throw insertError;
      }

      console.log(`Created new usage record for user ${userId}: ${itemCount} items`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in track-usage function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
