import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    console.log('Authorization header:', authHeader ? 'Present' : 'Missing')

    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(JSON.stringify({ error: 'Unauthorized - No auth header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '')
    
    // Create admin client to verify the JWT
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify the JWT and get user
    console.log('Attempting to verify JWT and get user...')
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token)

    console.log('User:', user ? user.id : 'null', 'Error:', userError?.message || 'none')

    if (userError || !user) {
      console.error('User authentication failed:', userError?.message)
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || roleData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get request body
    const { email, password, fullName, role } = await req.json()

    if (!email || !password || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, password, role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Creating new user:', email)

    // Create the user in auth.users
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || null,
      },
    })

    if (createError) {
      console.error('Error creating user:', createError)
      // Handle duplicate email error specifically
      if (createError.message?.includes('already been registered') || (createError as any).code === 'email_exists') {
        return new Response(JSON.stringify({ error: 'A user with this email address already exists' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      throw createError
    }

    console.log('User created successfully:', newUser.user.id)

    // Note: Profile is automatically created by handle_new_user trigger
    // Note: Subscriber role may be auto-created by handle_new_user_role trigger
    
    // Create or update user role entry (upsert to handle trigger-created roles)
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: newUser.user.id,
        role: role,
      }, { 
        onConflict: 'user_id,role',
        ignoreDuplicates: role === 'subscriber' // If subscriber, just ignore since trigger created it
      })

    if (roleInsertError) {
      console.error('Error creating user role:', roleInsertError)
      // If subscriber role already exists from trigger, that's fine
      if (roleInsertError.code !== '23505') {
        // Try to clean up only for non-duplicate errors
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        throw new Error('Failed to create user role')
      }
    }

    console.log('User setup completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name: fullName || null,
          role: role,
        }
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error creating user:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
