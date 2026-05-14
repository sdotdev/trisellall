import type { Metadata } from 'next'
import { requireWorkspace } from '@/lib/auth'
import { adminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import LoadMoreAlerts from '@/components/LoadMoreAlerts'

export const metadata: Metadata = {
  title: 'Alerts',
}

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ watch_id?: string }>
}) {
  const params = await searchParams
  const { workspace } = await requireWorkspace()
  const db = adminClient()

  const watchIdFilter = params.watch_id ?? ''

  let initialQuery = db
    .from('alerts')
    .select('id, sent_at, watch_id, watches(name, source), listing_snapshots(title, price, currency, location, listing_url, image_url, posted_at)')
    .eq('workspace_id', workspace.id)

  if (watchIdFilter) {
    initialQuery = initialQuery.eq('watch_id', watchIdFilter)
  }

  const { data: initialAlerts } = await initialQuery
    .order('sent_at', { ascending: false })
    .limit(20)

  const [{ count: totalCount }, { data: watches }] = await Promise.all([
    db.from('alerts').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
    db.from('watches').select('id, name').eq('workspace_id', workspace.id).order('name'),
  ])

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Alerts {totalCount != null ? <span className="ml-2 text-sm font-normal text-zinc-400">({totalCount} total)</span> : null}
      </h1>

      <div className="flex flex-wrap items-center gap-2">
        <select
          form="alerts-filter"
          name="watch_id"
          defaultValue={watchIdFilter}
          className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">All watches</option>
          {watches?.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <form id="alerts-filter" action="/dashboard/alerts" method="GET">
          <button
            type="submit"
            className="h-9 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Filter
          </button>
        </form>
        {watchIdFilter && (
          <Link
            href="/dashboard/alerts"
            className="h-9 rounded-lg border border-zinc-300 px-4 text-sm leading-9 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Clear
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <span>Source:</span>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">Vinted</span>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Gumtree</span>
      </div>

      {!initialAlerts?.length ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <span className="text-3xl">📨</span>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {watchIdFilter ? 'No alerts for this watch yet.' : 'No alerts yet. Create a watch to start receiving alerts.'}
          </p>
          <Link
            href={watchIdFilter ? '/dashboard/alerts' : '/dashboard/watches/new'}
            className="text-sm font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-50"
          >
            {watchIdFilter ? 'Clear filter' : 'Create your first watch'}
          </Link>
        </div>
      ) : (
        <LoadMoreAlerts initialAlerts={initialAlerts} watchId={watchIdFilter} />
      )}
    </div>
  )
}
