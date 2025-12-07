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
      console.error('User authentication failed:', userError?.message)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user is a lab admin for their lab
    const { data: labUserData, error: labUserError } = await supabaseAdmin
      .from('lab_users')
      .select('lab_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (labUserError || !labUserData) {
      console.error('Lab user not found:', labUserError?.message)
      return new Response(JSON.stringify({ error: 'Not a lab user' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Only lab admins can delete users
    if (labUserData.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only lab admins can delete users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { labUserId, userId } = await req.json()

    if (!labUserId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify the lab user belongs to the admin's lab
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('lab_users')
      .select('lab_id, user_id')
      .eq('id', labUserId)
      .single()

    if (targetError || !targetUser) {
      return new Response(JSON.stringify({ error: 'Lab user not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (targetUser.lab_id !== labUserData.lab_id) {
      return new Response(JSON.stringify({ error: 'Cannot delete users from other labs' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Prevent self-deletion
    if (targetUser.user_id === user.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete yourself' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Deleting lab user:', labUserId, 'auth user:', userId)

    // Delete the lab_users entry first
    const { error: deleteLabUserError } = await supabaseAdmin
      .from('lab_users')
      .delete()
      .eq('id', labUserId)

    if (deleteLabUserError) {
      console.error('Error deleting lab_users entry:', deleteLabUserError.message)
      throw deleteLabUserError
    }

    // Delete user_roles entry
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)

    // Delete the auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError.message)
      // Log but don't fail - the lab_users entry is already deleted
    }

    console.log('Lab user deleted successfully')

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error deleting lab user:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
