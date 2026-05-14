import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createClient } from './supabase/server'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const getUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export async function requireUser() {
  const user = await getUser()
  if (!user) redirect('/login')
  return user
}

export const getUserWorkspace = cache(async (userId: string) => {
  const admin = serviceClient()
  const { data: workspace } = await admin
    .from('workspaces')
    .select('*')
    .eq('owner_id', userId)
    .single()
  return workspace
})

export async function requireWorkspace() {
  const user = await requireUser()
  const workspace = await getUserWorkspace(user.id)
  if (!workspace) redirect('/login')
  return { user, workspace }
}
