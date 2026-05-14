import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  const supabaseResponse = NextResponse.redirect(`${origin}${next}`)

  // Auth client — writes session cookies onto the redirect response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('[auth/callback] exchangeCodeForSession failed:', exchangeError.message)
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error('[auth/callback] getUser returned null after exchange')
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  // Service-role client — bypasses RLS for user/workspace bootstrapping
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error: upsertUserError } = await admin.from('users').upsert({
    id: user.id,
    discord_id: user.user_metadata.provider_id ?? user.user_metadata.sub ?? user.id,
    email: user.email,
    username: user.user_metadata.full_name ?? user.user_metadata.name ?? 'User',
    avatar_url: user.user_metadata.avatar_url ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })

  if (upsertUserError) {
    console.error('[auth/callback] users upsert failed:', upsertUserError.message)
  }

  const { data: existingWorkspace, error: wsSelectError } = await admin
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (wsSelectError && wsSelectError.code !== 'PGRST116') {
    console.error('[auth/callback] workspace select failed:', wsSelectError.message)
  }

  if (!existingWorkspace) {
    const username = user.user_metadata.full_name ?? user.user_metadata.name ?? 'User'

    const { data: newWorkspace, error: wsInsertError } = await admin
      .from('workspaces')
      .insert({ owner_id: user.id, name: `${username}'s Workspace` })
      .select('id')
      .single()

    if (wsInsertError) {
      console.error('[auth/callback] workspace insert failed:', wsInsertError.message)
    }

    if (newWorkspace) {
      const { error: memberError } = await admin.from('workspace_members').insert({
        workspace_id: newWorkspace.id,
        user_id: user.id,
        role: 'owner',
      })
      if (memberError) console.error('[auth/callback] workspace_members insert failed:', memberError.message)

      const trialAvailable = process.env.TRIAL_AVAILABLE === 'true'
      const trialEndsAt = trialAvailable
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null

      const { error: subError } = await admin.from('subscriptions').insert({
        workspace_id: newWorkspace.id,
        status: trialAvailable ? 'trialing' : 'unpaid',
        trial_ends_at: trialEndsAt,
      })
      if (subError) console.error('[auth/callback] subscriptions insert failed:', subError.message)
    }
  }

  return supabaseResponse
}
