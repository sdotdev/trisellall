import type { Metadata } from 'next'
import { requireWorkspace } from '@/lib/auth'
import { adminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import Image from 'next/image'
import SourceBadge from '@/components/SourceBadge'

export const metadata: Metadata = {
  title: 'Alerts',
}

const sourcePlaceholder: Record<string, string> = {
  vinted: 'bg-teal-100 text-teal-500',
  gumtree: 'bg-emerald-100 text-emerald-500',
}

const PER_PAGE = 8

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; watch_id?: string }>
}) {
  const params = await searchParams
  const { workspace } = await requireWorkspace()
  const db = adminClient()

  const page = Math.max(1, Number(params.page) || 1)
  const watchIdFilter = params.watch_id ?? ''

  let query = db
    .from('alerts')
    .select('id, sent_at, watch_id, watches(name, source), listing_snapshots(title, price, currency, location, listing_url, image_url, posted_at, source)', { count: 'exact' })
    .eq('workspace_id', workspace.id)

  if (watchIdFilter) {
    query = query.eq('watch_id', watchIdFilter)
  }

  const from = (page - 1) * PER_PAGE
  const { data: alerts, count: totalCount } = await query
    .order('sent_at', { ascending: false })
    .range(from, from + PER_PAGE - 1)

  const totalPages = Math.ceil((totalCount ?? 0) / PER_PAGE)

  const { data: watches } = await db
    .from('watches')
    .select('id, name')
    .eq('workspace_id', workspace.id)
    .order('name')

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

      {!alerts?.length ? (
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
        <>
          <div className="flex flex-col gap-2">
            {alerts.map((alert) => {
              const snap = Array.isArray(alert.listing_snapshots) ? alert.listing_snapshots[0] : alert.listing_snapshots
              const listingSource = (snap as Record<string, unknown> | null)?.source as string ?? ''
              const watchData = Array.isArray(alert.watches) ? alert.watches[0] : alert.watches as Record<string, string> | null
              const watchName = watchData?.name ?? ''
              const alertDate = alert.sent_at
                ? new Date(alert.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : null

              return (
                <div
                  key={alert.id}
                  className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    {snap?.image_url ? (
                      <Image
                        src={snap.image_url as string}
                        alt={(snap.title as string) ?? ''}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className={`flex h-full w-full items-center justify-center text-xs font-bold ${sourcePlaceholder[listingSource] ?? 'bg-zinc-200 text-zinc-400'}`}>
                        {listingSource[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {(snap?.title as string) ?? 'Unknown listing'}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {watchName && (
                        <Link
                          href={`/dashboard/watches/${alert.watch_id}`}
                          className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
                        >
                          {watchName}
                        </Link>
                      )}
                      {listingSource && <SourceBadge source={listingSource} />}
                      {(snap?.location as string) && (
                        <span className="text-xs text-zinc-400">{snap.location as string}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {(snap?.price as number) != null && (
                      <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                        £{snap.price as number}
                      </span>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-400">{alertDate}</span>
                      {(snap?.listing_url as string) && (
                        <a
                          href={snap.listing_url as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          View →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              {page > 1 ? (
                <Link
                  href={`/dashboard/alerts?page=${page - 1}${watchIdFilter ? `&watch_id=${watchIdFilter}` : ''}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  aria-label="Previous page"
                >
                  ←
                </Link>
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-zinc-300 dark:text-zinc-700" aria-hidden="true">←</span>
              )}
              <span className="text-xs text-zinc-500">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={`/dashboard/alerts?page=${page + 1}${watchIdFilter ? `&watch_id=${watchIdFilter}` : ''}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  aria-label="Next page"
                >
                  →
                </Link>
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-zinc-300 dark:text-zinc-700" aria-hidden="true">→</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
