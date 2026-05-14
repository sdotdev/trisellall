import { requireWorkspace } from '@/lib/auth'
import { adminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import OnboardingTour from '@/components/OnboardingTour'

async function markTourDone(workspaceId: string) {
  'use server'
  await adminClient()
    .from('workspaces')
    .update({ tour_completed_at: new Date().toISOString() })
    .eq('id', workspaceId)
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace } = await requireWorkspace()
  const db = adminClient()

  const [{ count: watchCount }] = await Promise.all([
    db.from('watches').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
  ])

  const tourDone = workspace.tour_completed_at != null
  const markDone = markTourDone.bind(null, workspace.id)

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <aside className="flex w-56 flex-col gap-1 border-r border-zinc-200 bg-white px-3 py-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 px-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Menu
          </span>
        </div>

        {[
          { href: '/dashboard/watches', label: 'Watches' },
          { href: '/dashboard/alerts', label: 'Alerts' },
          { href: '/dashboard/billing', label: 'Billing' },
          { href: '/dashboard/settings', label: 'Settings' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            {label}
          </Link>
        ))}

        <div className="mt-auto flex items-center gap-2 px-2 pt-4">
          {user.user_metadata?.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.user_metadata.avatar_url}
              alt="Avatar"
              className="h-7 w-7 rounded-full"
            />
          )}
          <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {user.user_metadata?.full_name ?? user.email}
          </span>
        </div>
      </aside>

      <main className="flex flex-1 flex-col">{children}</main>
      <OnboardingTour
        tourDone={tourDone}
        watchCount={watchCount ?? 0}
        workspaceId={workspace.id}
        markTourDone={markDone}
      />
    </div>
  )
}
