import { requireWorkspace } from '@/lib/auth'
import { adminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import Image from 'next/image'

const sourceBadge: Record<string, string> = {
  vinted: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  gumtree: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  both: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

const sourcePlaceholder: Record<string, string> = {
  vinted: 'bg-teal-100 text-teal-500',
  gumtree: 'bg-emerald-100 text-emerald-500',
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AlertsPage() {
  const { workspace } = await requireWorkspace()

  const { data: alerts } = await adminClient()
    .from('alerts')
    .select('id, sent_at, watch_id, watches(name, source), listing_snapshots(title, price, currency, location, listing_url, image_url, posted_at)')
    .eq('workspace_id', workspace.id)
    .order('sent_at', { ascending: false })
    .limit(50)

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Alerts {alerts?.length ? <span className="ml-2 text-sm font-normal text-zinc-400">({alerts.length})</span> : null}
      </h1>

      {!alerts?.length ? (
        <p className="text-sm text-zinc-400">No alerts yet. Create a watch to start receiving alerts.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {alerts.map((alert) => {
            const snap = Array.isArray(alert.listing_snapshots) ? alert.listing_snapshots[0] : alert.listing_snapshots
            const watch = Array.isArray(alert.watches) ? alert.watches[0] : alert.watches
            const source = watch?.source ?? 'vinted'
            const listedDate = formatDate(snap?.posted_at)
            const alertDate = formatDate(alert.sent_at)

            return (
              <div
                key={alert.id}
                className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                {/* Thumbnail */}
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  {snap?.image_url ? (
                    <Image
                      src={snap.image_url}
                      alt={snap.title ?? ''}
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className={`flex h-full w-full items-center justify-center text-xs font-bold ${sourcePlaceholder[source] ?? 'bg-zinc-200 text-zinc-400'}`}>
                      {source[0]?.toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Main content */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {snap?.title ?? 'Unknown listing'}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {watch?.name && (
                      <Link
                        href={`/dashboard/watches/${alert.watch_id}`}
                        className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
                      >
                        {watch.name}
                      </Link>
                    )}
                    {watch?.source && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sourceBadge[watch.source] ?? ''}`}>
                        {watch.source}
                      </span>
                    )}
                    {snap?.location && (
                      <span className="text-xs text-zinc-400">{snap.location}</span>
                    )}
                    {listedDate && (
                      <span className="text-xs text-zinc-400">Listed {listedDate}</span>
                    )}
                  </div>
                </div>

                {/* Right: price + actions */}
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {snap?.price != null && (
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                      £{snap.price}
                    </span>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400">{alertDate}</span>
                    {snap?.listing_url && (
                      <a
                        href={snap.listing_url}
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
      )}
    </div>
  )
}
