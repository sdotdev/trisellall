'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import SourceBadge from './SourceBadge'

interface Alert {
  id: string
  sent_at: string
  watch_id: string
  watches: { name: string; source: string } | { name: string; source: string }[]
  listing_snapshots: Record<string, unknown> | Record<string, unknown>[]
}

const sourcePlaceholder: Record<string, string> = {
  vinted: 'bg-teal-100 text-teal-500',
  gumtree: 'bg-emerald-100 text-emerald-500',
}

export default function LoadMoreAlerts({
  initialAlerts,
  watchId,
}: {
  initialAlerts: Alert[]
  watchId?: string
}) {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | null>(
    initialAlerts.length > 0 ? initialAlerts[initialAlerts.length - 1].sent_at : null
  )

  async function loadMore() {
    setLoading(true)
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    if (watchId) params.set('watch_id', watchId)

    const res = await fetch(`/api/alerts?${params.toString()}`)
    const data = await res.json()

    if (data.alerts) {
      setAlerts(prev => [...prev, ...data.alerts])
      setCursor(data.nextCursor)
      setHasMore(data.hasMore)
    }
    setLoading(false)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (alerts.length === 0) return null

  return (
    <>
      <div className="flex flex-col gap-2">
        {alerts.map((alert) => {
          const snap = Array.isArray(alert.listing_snapshots) ? alert.listing_snapshots[0] : alert.listing_snapshots
          const watch = Array.isArray(alert.watches) ? alert.watches[0] : alert.watches
          const source = watch?.source ?? 'vinted'
          const alertDate = formatDate(alert.sent_at)

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
                  <div className={`flex h-full w-full items-center justify-center text-xs font-bold ${sourcePlaceholder[source] ?? 'bg-zinc-200 text-zinc-400'}`}>
                    {source[0]?.toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {(snap?.title as string) ?? 'Unknown listing'}
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
                  {watch?.source && <SourceBadge source={watch.source} />}
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

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-lg border border-zinc-300 px-6 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {loading ? 'Loading…' : 'Load more alerts'}
          </button>
        </div>
      )}
    </>
  )
}
