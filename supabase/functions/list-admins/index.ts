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
    console.log('list-admins: Authorization header:', authHeader ? 'Present' : 'Missing')

    if (!authHeader) {
      console.error('list-admins: No authorization header provided')
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
    console.log('list-admins: Attempting to verify JWT and get user...')
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token)

    console.log('list-admins: User:', user ? user.id : 'null', 'Error:', userError?.message || 'none')

    if (userError || !user) {
      console.error('list-admins: User authentication failed:', userError?.message)
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user has admin role (using admin client since we already have it)
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || roleData?.role !== 'admin') {
      console.error('list-admins: User is not an admin')
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get all users
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      throw listError
    }

    // Get admin user roles only
    const { data: adminRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role, created_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: false })

    if (rolesError) {
      throw rolesError
    }

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, username')

    if (profilesError) {
      throw profilesError
    }

    // Combine data - only admins
    const admins = adminRoles.map((ur) => {
      const authUser = authUsers.users.find((u) => u.id === ur.user_id)
      const profile = profiles.find((p) => p.id === ur.user_id)

      return {
        id: ur.user_id,
        email: authUser?.email || 'Unknown',
        username: profile?.username || null,
        created_at: authUser?.created_at || '',
      }
    })

    console.log('list-admins: Returning', admins.length, 'admins')

    return new Response(JSON.stringify({ admins }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('list-admins: Error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
