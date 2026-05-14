import type { Metadata } from 'next'
import { requireWorkspace } from '@/lib/auth'
import { adminClient } from '@/lib/supabase/admin'
import { getSubscription, isTrialActive } from '@/lib/billing'
import Link from 'next/link'
import { sourceLabel } from '@/components/SourceBadge'

export const metadata: Metadata = {
  title: 'Watches',
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  paused: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  rate_limited: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

function relativeTime(iso: string | null): string | null {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const PAGE_SIZE = 20

export default async function WatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; source?: string; page?: string }>
}) {
  const params = await searchParams
  const { workspace, user } = await requireWorkspace()
  const db = adminClient()

  const query = params.q?.trim() ?? ''
  const statusFilter = params.status ?? ''
  const sourceFilter = params.source ?? ''
  const page = Math.max(1, Number(params.page) || 1)

  let dbQuery = db
    .from('watches')
    .select('id, name, source, status, last_run_at, last_error, query, keywords, price_min, price_max', { count: 'exact' })
    .eq('workspace_id', workspace.id)

  if (query) dbQuery = dbQuery.ilike('name', `%${query}%`)
  if (statusFilter) dbQuery = dbQuery.eq('status', statusFilter)
  if (sourceFilter) dbQuery = dbQuery.eq('source', sourceFilter)

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const { data: watches, count: totalCount } = await dbQuery
    .order('created_at', { ascending: false })
    .range(from, to)

  const watchIds = watches?.map(w => w.id) ?? []
  const alertCounts: Record<string, number> = {}
  if (watchIds.length > 0) {
    const { data: counts } = await db
      .from('alerts')
      .select('watch_id')
      .in('watch_id', watchIds)
    for (const c of counts ?? []) {
      alertCounts[c.watch_id] = (alertCounts[c.watch_id] ?? 0) + 1
    }
  }

  const [alertTotal, latestRun, subData] = await Promise.all([
    db.from('alerts').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
    db.from('watches').select('last_run_at').eq('workspace_id', workspace.id).not('last_run_at', 'is', null).order('last_run_at', { ascending: false }).limit(1).single(),
    getSubscription(workspace.id),
  ])

  const subscription = subData
  const onTrial = subscription ? isTrialActive(subscription) : false
  const isSubscribed = subscription?.status === 'active'

  const activeCount = watches?.filter(w => w.status === 'active').length ?? 0
  const pausedCount = watches?.filter(w => w.status === 'paused').length ?? 0
  const errorCount = watches?.filter(w => w.status === 'error' || w.status === 'rate_limited').length ?? 0
  const lastActivity = relativeTime((latestRun as unknown as { last_run_at: string } | null)?.last_run_at ?? null)
  const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE)

  function qs(overrides: Record<string, string | undefined>) {
    const merged = { q: query || undefined, status: statusFilter || undefined, source: sourceFilter || undefined, page: page > 1 ? String(page) : undefined, ...overrides }
    const entries = Object.entries(merged).filter(([, v]) => v != null) as [string, string][]
    return entries.length ? '?' + new URLSearchParams(entries).toString() : ''
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Watches</h1>
          <p className="text-xs text-zinc-400">
            {isSubscribed ? 'Subscribed' : onTrial ? 'Free trial' : 'No subscription'}
            {' · '}{totalCount ?? 0} watch{totalCount !== 1 ? 'es' : ''} configured
          </p>
        </div>
        <Link
          href="/dashboard/watches/new"
          data-tour="new-watch-btn"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New watch
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Active', value: activeCount, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Paused', value: pausedCount, color: 'text-zinc-600 dark:text-zinc-400' },
          { label: 'Errors', value: errorCount, color: 'text-red-600 dark:text-red-400' },
          { label: 'Total alerts', value: alertTotal?.count ?? 0, color: 'text-zinc-900 dark:text-zinc-50' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs text-zinc-400">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          form="search-form"
          name="q"
          defaultValue={query}
          placeholder="Search watches…"
          className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <select
          form="search-form"
          name="status"
          defaultValue={statusFilter}
          className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="error">Error</option>
          <option value="rate_limited">Rate limited</option>
        </select>
        <select
          form="search-form"
          name="source"
          defaultValue={sourceFilter}
          className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">All sources</option>
          <option value="vinted">Vinted</option>
          <option value="gumtree">Gumtree</option>
          <option value="both">Both</option>
        </select>
        <form id="search-form" action="/dashboard/watches" method="GET">
          <button
            type="submit"
            className="h-9 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Filter
          </button>
        </form>
        {(query || statusFilter || sourceFilter) && (
          <Link
            href="/dashboard/watches"
            className="h-9 rounded-lg border border-zinc-300 px-4 text-sm leading-9 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Clear
          </Link>
        )}
      </div>

      {!watches?.length ? (
        <div className="flex flex-col items-center gap-6 rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <span className="text-4xl">🔍</span>
          {query || statusFilter || sourceFilter ? (
            <>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No watches match your filters.</p>
              <Link
                href="/dashboard/watches"
                className="text-sm font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-50"
              >
                Clear filters
              </Link>
            </>
          ) : (
            <>
              <div className="flex max-w-sm flex-col gap-2">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Get started with your first watch</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  A watch monitors Vinted and Gumtree for listings matching your criteria.
                  When a match is found, you&apos;ll get an alert in your Discord server.
                </p>
              </div>
              <Link
                href="/dashboard/watches/new"
                className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Create your first watch
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {watches.map((watch) => {
              const alertCount = alertCounts[watch.id] ?? 0
              return (
                <Link
                  key={watch.id}
                  href={`/dashboard/watches/${watch.id}`}
                  className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {watch.name[0]?.toUpperCase() ?? 'W'}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">{watch.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[watch.status] ?? ''}`}>
                        {watch.status === 'rate_limited' ? 'rate limited' : watch.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
                      <span className="truncate max-w-48">{watch.query}</span>
                      <span>·</span>
                      <span>{sourceLabel(watch.source)}</span>
                      {watch.price_min != null && <span>· £{watch.price_min}{watch.price_max != null ? ` – £${watch.price_max}` : '+'}</span>}
                      {watch.keywords && (watch.keywords as string[]).length > 0 && (
                        <>
                          <span>·</span>
                          <span>{(watch.keywords as string[]).length} keyword{(watch.keywords as string[]).length !== 1 ? 's' : ''}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <div className="hidden flex-col items-end gap-0.5 sm:flex">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">{alertCount}</span>
                      <span className="text-[10px] text-zinc-400">alerts</span>
                    </div>
                    {watch.last_run_at && (
                      <span className="text-xs text-zinc-400">{relativeTime(watch.last_run_at)}</span>
                    )}
                    {watch.last_error && (
                      <span className="hidden text-xs text-red-500 md:inline" title={watch.last_error}>!</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={qs({ page: String(page - 1) })}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  ← Previous
                </Link>
              )}
              <span className="text-sm text-zinc-500">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={qs({ page: String(page + 1) })}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Next →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
