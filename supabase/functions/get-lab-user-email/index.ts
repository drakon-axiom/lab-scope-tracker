import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify the requesting user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user is a SafeBatch admin
    const { data: adminRoleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isSafeBatchAdmin = adminRoleData?.role === 'admin'

    // Check if user is a lab admin for their lab
    const { data: labUserData } = await supabaseAdmin
      .from('lab_users')
      .select('lab_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    const isLabAdmin = labUserData?.role === 'admin'

    // Must be either a SafeBatch admin or a lab admin
    if (!isSafeBatchAdmin && !isLabAdmin) {
      return new Response(JSON.stringify({ error: 'Only admins can view user details' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { userId } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the target user's lab
    const { data: targetLabUser, error: targetError } = await supabaseAdmin
      .from('lab_users')
      .select('lab_id')
      .eq('user_id', userId)
      .single()

    if (targetError || !targetLabUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Lab admins can only see users in their own lab (SafeBatch admins can see all)
    if (!isSafeBatchAdmin && labUserData && targetLabUser.lab_id !== labUserData.lab_id) {
      return new Response(JSON.stringify({ error: 'User not found in your lab' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the user email
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (getUserError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ email: userData.user.email }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error getting lab user email:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
