import { requireWorkspace } from '@/lib/auth'
import { adminClient } from '@/lib/supabase/admin'
import OnboardingTour from '@/components/OnboardingTour'
import { ToastProvider } from '@/components/Toast'
import NavLink from './NavLink'

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
      <aside className="flex w-56 shrink-0 flex-col gap-1 border-r border-zinc-200 bg-white px-3 py-6 dark:border-zinc-800 dark:bg-zinc-900 max-md:hidden">
        <div className="mb-4 px-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            ResaleWatch
          </span>
        </div>

        {[
          { href: '/dashboard/watches', label: 'Watches' },
          { href: '/dashboard/alerts', label: 'Alerts' },
          { href: '/dashboard/billing', label: 'Billing' },
          { href: '/dashboard/settings', label: 'Settings' },
        ].map(({ href, label }) => (
          <NavLink key={href} href={href} label={label} />
        ))}

        <div className="my-2 border-t border-zinc-200 px-2 dark:border-zinc-800" />

        <a
          href="https://discord.com/oauth2/authorize?client_id=1504170895269302386&permissions=139586816064&integration_type=0&scope=bot"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          Discord Bot
        </a>

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

      <main className="flex flex-1 flex-col">
        <MobileNav />
        <ToastProvider>
          {children}
        </ToastProvider>
      </main>
      <OnboardingTour
        tourDone={tourDone}
        watchCount={watchCount ?? 0}
        workspaceId={workspace.id}
        markTourDone={markDone}
      />
    </div>
  )
}

function MobileNav() {
  return (
    <nav className="flex items-center gap-1 border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900 md:hidden">
      {[
        { href: '/dashboard/watches', label: 'Watches' },
        { href: '/dashboard/alerts', label: 'Alerts' },
        { href: '/dashboard/billing', label: 'Billing' },
        { href: '/dashboard/settings', label: 'Settings' },
      ].map(({ href, label }) => (
        <NavLink key={href} href={href} label={label} mobile />
      ))}
      <a
        href="https://discord.com/oauth2/authorize?client_id=1504170895269302386&permissions=139586816064&integration_type=0&scope=bot"
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
      >
        Discord Bot
      </a>
    </nav>
  )
}
