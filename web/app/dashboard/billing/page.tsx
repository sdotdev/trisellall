import { requireWorkspace } from '@/lib/auth'
import { getSubscription, isTrialActive } from '@/lib/billing'

const statusLabel: Record<string, string> = {
  active: 'Active',
  trialing: 'Free trial',
  past_due: 'Payment overdue',
  canceled: 'Canceled',
  unpaid: 'No subscription',
}

const statusColors: Record<string, string> = {
  active: 'text-emerald-600 dark:text-emerald-400',
  trialing: 'text-blue-600 dark:text-blue-400',
  past_due: 'text-amber-600 dark:text-amber-400',
  canceled: 'text-red-600 dark:text-red-400',
  unpaid: 'text-zinc-500 dark:text-zinc-400',
}

function trialDaysLeft(trialEndsAt: string): number {
  const ms = new Date(trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { workspace } = await requireWorkspace()
  const params = await searchParams
  const subscription = await getSubscription(workspace.id)

  const status = subscription?.status ?? 'unpaid'
  const isActive = status === 'active'
  const onTrial = subscription ? isTrialActive(subscription) : false
  const daysLeft = onTrial && subscription?.trial_ends_at ? trialDaysLeft(subscription.trial_ends_at) : null
  const needsSubscription = !isActive && !onTrial

  return (
    <div className="flex flex-col gap-8 p-8">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Billing</h1>

      {params.success === 'true' && (
        <div className="max-w-md rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
          Subscription activated — you&apos;re all set!
        </div>
      )}
      {params.error === 'config' && (
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          Billing is not configured yet. Set <code>STRIPE_PRICE_ID</code> in your environment.
        </div>
      )}

      <div className="flex max-w-md flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-400">Plan</span>
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            MVP Monitor — £9/mo
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-400">Status</span>
          <span className={`text-sm font-semibold ${statusColors[status] ?? ''}`}>
            {statusLabel[status] ?? status}
          </span>
        </div>

        {onTrial && daysLeft !== null && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/30">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              {daysLeft} day{daysLeft !== 1 ? 's' : ''} left in your free trial
            </p>
            <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
              Trial includes 1 watch. Subscribe to unlock unlimited watches.
            </p>
          </div>
        )}

        {isActive && subscription?.current_period_end && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-widest text-zinc-400">Renews</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {new Date(subscription.current_period_end).toLocaleDateString()}
            </span>
          </div>
        )}

        {needsSubscription && (
          <form action="/api/billing/checkout" method="POST">
            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Subscribe — £9/mo
            </button>
          </form>
        )}

        {onTrial && (
          <form action="/api/billing/checkout" method="POST">
            <button
              type="submit"
              className="w-full rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Upgrade now — £9/mo
            </button>
          </form>
        )}

        {isActive && (
          <p className="text-xs text-zinc-400">
            Subscription management coming soon.
          </p>
        )}
      </div>
    </div>
  )
}
