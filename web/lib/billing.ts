import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type SubscriptionRow = {
  status: string
  stripe_customer_id?: string | null
  trial_ends_at: string | null
  current_period_end: string | null
}

export async function getSubscription(workspaceId: string): Promise<SubscriptionRow | null> {
  const { data } = await adminClient()
    .from('subscriptions')
    .select('status, stripe_customer_id, trial_ends_at, current_period_end')
    .eq('workspace_id', workspaceId)
    .single()
  return data ?? null
}

export function isTrialActive(sub: SubscriptionRow): boolean {
  if (sub.status !== 'trialing') return false
  if (!sub.trial_ends_at) return false
  return new Date(sub.trial_ends_at) > new Date()
}

export async function isSubscriptionActive(workspaceId: string): Promise<boolean> {
  const sub = await getSubscription(workspaceId)
  if (!sub) return false
  if (sub.status === 'active') return true
  if (isTrialActive(sub)) return true
  return false
}

// Returns whether this workspace can create a new watch.
// Active subscribers: unlimited. Trial: max 1 watch. Otherwise: blocked.
export async function canCreateWatch(workspaceId: string): Promise<{ allowed: boolean; reason?: string }> {
  const sub = await getSubscription(workspaceId)
  if (!sub) return { allowed: false, reason: 'no_subscription' }

  if (sub.status === 'active') return { allowed: true }

  if (isTrialActive(sub)) {
    const { count } = await adminClient()
      .from('watches')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
    const watchCount = count ?? 0
    if (watchCount >= 1) {
      return { allowed: false, reason: 'trial_limit' }
    }
    return { allowed: true }
  }

  return { allowed: false, reason: 'inactive' }
}
