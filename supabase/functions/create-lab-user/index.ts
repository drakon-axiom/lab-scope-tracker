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
      console.error('User is not an admin:', user.id)
      return new Response(JSON.stringify({ error: 'Only admins can create users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, password, role, labId } = await req.json()

    // Lab admins can only create users for their own lab
    // SafeBatch admins can create users for any lab
    if (!isSafeBatchAdmin && labUserData && labId !== labUserData.lab_id) {
      return new Response(JSON.stringify({ error: 'Cannot create users for other labs' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!email || !password || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate password length
    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate role
    const validRoles = ['member', 'manager', 'admin']
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Creating new lab user:', email, 'with role:', role, 'for lab:', labId)

    // Create the auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      console.error('Error creating auth user:', createError.message)
      if (createError.message.includes('already been registered')) {
        return new Response(JSON.stringify({ error: 'Email already exists' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      throw createError
    }

    // Create the lab_users entry
    const { error: labUserInsertError } = await supabaseAdmin
      .from('lab_users')
      .insert({
        user_id: newUser.user.id,
        lab_id: labId,
        role,
        is_active: true,
        created_by: user.id,
      })

    if (labUserInsertError) {
      console.error('Error creating lab_users entry:', labUserInsertError.message)
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      throw labUserInsertError
    }

    // Create a user_roles entry with 'lab' role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'lab',
      })

    if (roleInsertError) {
      console.error('Error creating user_roles entry:', roleInsertError.message)
      // Continue anyway, this is not critical
    }

    console.log('Lab user created successfully:', newUser.user.id)

    return new Response(JSON.stringify({ 
      success: true, 
      userId: newUser.user.id,
      email: newUser.user.email 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error creating lab user:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
