import { requireWorkspace } from '@/lib/auth'
import { adminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

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

export default async function WatchesPage() {
  const { workspace } = await requireWorkspace()
  const db = adminClient()

  const [{ data: watches }, { count: alertCount }, { data: latestRun }] = await Promise.all([
    db.from('watches').select('id, name, source, status, last_run_at, last_error, query').eq('workspace_id', workspace.id).order('created_at', { ascending: false }),
    db.from('alerts').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
    db.from('watches').select('last_run_at').eq('workspace_id', workspace.id).not('last_run_at', 'is', null).order('last_run_at', { ascending: false }).limit(1).single(),
  ])

  const activeCount = watches?.filter(w => w.status === 'active').length ?? 0
  const lastActivity = relativeTime((latestRun as { last_run_at: string } | null)?.last_run_at ?? null)

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Watches</h1>
        <Link
          href="/dashboard/watches/new"
          data-tour="new-watch-btn"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New watch
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active watches', value: activeCount },
          { label: 'Total alerts', value: alertCount ?? 0 },
          { label: 'Last activity', value: lastActivity ?? '—' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs text-zinc-400">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</p>
          </div>
        ))}
      </div>

      {!watches?.length ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No watches yet</p>
          <Link
            href="/dashboard/watches/new"
            className="text-sm font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-50"
          >
            Create your first watch
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {watches.map((watch) => (
            <Link
              key={watch.id}
              href={`/dashboard/watches/${watch.id}`}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <div className="flex flex-col gap-1">
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{watch.name}</span>
                <span className="text-xs text-zinc-400">{watch.query} · {watch.source}</span>
                {watch.last_error && (
                  <span className="text-xs text-red-500 dark:text-red-400">{watch.last_error}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {watch.last_run_at && (
                  <span className="text-xs text-zinc-400">{relativeTime(watch.last_run_at)}</span>
                )}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[watch.status] ?? ''}`}>
                  {watch.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
