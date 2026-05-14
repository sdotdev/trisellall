import type { Metadata } from 'next'
import { requireWorkspace } from '@/lib/auth'
import { adminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import TestAlertButton from './TestAlertButton'

export const metadata: Metadata = {
  title: 'Watch',
}

async function pauseWatch(watchId: string) {
  'use server'
  await adminClient().from('watches').update({ status: 'paused' }).eq('id', watchId)
  redirect(`/dashboard/watches/${watchId}`)
}

async function resumeWatch(watchId: string) {
  'use server'
  await adminClient().from('watches').update({ status: 'active' }).eq('id', watchId)
  redirect(`/dashboard/watches/${watchId}`)
}

async function deleteWatch(watchId: string) {
  'use server'
  await adminClient().from('watches').delete().eq('id', watchId)
  redirect('/dashboard/watches')
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  paused: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  rate_limited: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

export default async function WatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { workspace } = await requireWorkspace()
  const db = adminClient()

  const { data: watch } = await db
    .from('watches')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspace.id)
    .single()

  if (!watch) notFound()

  const [{ data: alerts }, { data: runs }] = await Promise.all([
    db.from('alerts')
      .select('id, sent_at, listing_snapshots(title, price, currency, location, listing_url, image_url, posted_at)')
      .eq('watch_id', id)
      .order('sent_at', { ascending: false })
      .limit(20),
    db.from('worker_runs')
      .select('id, started_at, status, listings_found, alerts_sent, error_message')
      .eq('watch_id', id)
      .order('started_at', { ascending: false })
      .limit(10),
  ])

  const pauseWithId = pauseWatch.bind(null, id)
  const resumeWithId = resumeWatch.bind(null, id)
  const deleteWithId = deleteWatch.bind(null, id)

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{watch.name}</h1>
          <p className="text-sm text-zinc-400">{watch.query} · {watch.source}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[watch.status] ?? ''}`}>
            {watch.status}
          </span>
          {watch.discord_channel_id && (
            <TestAlertButton channelId={watch.discord_channel_id} />
          )}
          <Link
            href={`/dashboard/watches/${id}/edit`}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Edit
          </Link>
          <form action={watch.status === 'active' ? pauseWithId : resumeWithId}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              {watch.status === 'active' ? 'Pause' : 'Resume'}
            </button>
          </form>
          <form action={deleteWithId}>
            <button
              type="submit"
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      {watch.last_error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          Last error: {watch.last_error}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Recent alerts ({alerts?.length ?? 0})
        </h2>
        {!alerts?.length ? (
          <p className="text-sm text-zinc-400">No alerts yet — the worker will send matches here.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {alerts.map((alert) => {
              const snap = Array.isArray(alert.listing_snapshots)
                ? alert.listing_snapshots[0]
                : alert.listing_snapshots
              const listedDate = snap?.posted_at
                ? new Date(snap.posted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : null
              return (
                <div
                  key={alert.id}
                  className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                >
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
                      <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">—</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {snap?.title ?? 'Unknown listing'}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
                      {snap?.location && <span>{snap.location}</span>}
                      {listedDate && <span>Listed {listedDate}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {snap?.price != null && (
                      <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">£{snap.price}</span>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-400">
                        {new Date(alert.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
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

      {/* Worker run history */}
      {runs && runs.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Worker runs
          </h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Time</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Status</th>
                  <th className="px-4 py-2 text-right font-medium text-zinc-500">Found</th>
                  <th className="px-4 py-2 text-right font-medium text-zinc-500">Alerts</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {runs.map(run => (
                  <tr key={run.id} className="bg-white dark:bg-zinc-900">
                    <td className="px-4 py-2 text-zinc-500">
                      {new Date(run.started_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${
                        run.status === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        run.status === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-600 dark:text-zinc-400">{run.listings_found}</td>
                    <td className="px-4 py-2 text-right text-zinc-600 dark:text-zinc-400">{run.alerts_sent}</td>
                    <td className="max-w-xs truncate px-4 py-2 text-red-500 dark:text-red-400">{run.error_message ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
