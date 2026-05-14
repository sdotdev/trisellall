import type { Metadata } from 'next'
import { requireWorkspace } from '@/lib/auth'
import { adminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConfirmForm from '@/components/ConfirmForm'
import ThemeToggle from '@/components/ThemeToggle'

export const metadata: Metadata = {
  title: 'Settings',
}

async function restartTour() {
  'use server'
  const { workspace } = await requireWorkspace()
  await adminClient()
    .from('workspaces')
    .update({ tour_completed_at: null })
    .eq('id', workspace.id)
  redirect('/dashboard/watches')
}

async function updateWorkspaceName(formData: FormData) {
  'use server'
  const { workspace } = await requireWorkspace()
  await adminClient()
    .from('workspaces')
    .update({ name: formData.get('name') as string, updated_at: new Date().toISOString() })
    .eq('id', workspace.id)
  redirect('/dashboard/settings?updated=1')
}

async function disconnectDiscord(formData: FormData) {
  'use server'
  const { workspace } = await requireWorkspace()
  const guildId = formData.get('guild_id') as string
  await adminClient()
    .from('discord_installations')
    .delete()
    .eq('workspace_id', workspace.id)
    .eq('guild_id', guildId)
  redirect('/dashboard/settings?discord=disconnected')
}

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ discord?: string; updated?: string }>
}) {
  const { workspace, user } = await requireWorkspace()
  const params = await searchParams

  const { data: installations } = await adminClient()
    .from('discord_installations')
    .select('guild_id, guild_name, installed_at')
    .eq('workspace_id', workspace.id)
    .order('installed_at', { ascending: false })

  return (
    <div className="flex flex-col gap-8 p-8">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Settings</h1>

      {params.updated === '1' && (
        <div className="max-w-md rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
          Workspace name updated.
        </div>
      )}
      {params.discord === 'connected' && (
        <div className="max-w-md rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
          Discord server connected successfully!
        </div>
      )}
      {params.discord === 'disconnected' && (
        <div className="max-w-md rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Discord server disconnected.
        </div>
      )}
      {params.discord === 'error' && (
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          Failed to connect Discord server. Please try again.
        </div>
      )}

      <section className="flex max-w-md flex-col gap-5">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Workspace</h2>
        <form action={updateWorkspaceName} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Workspace name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={workspace.name}
              required
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
          <button
            type="submit"
            className="self-start rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Save
          </button>
        </form>
      </section>

      <section className="flex max-w-md flex-col gap-4">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Account</h2>
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Signed in as</span>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {user.user_metadata?.full_name ?? user.email}
            </span>
            {user.email && (
              <span className="text-xs text-zinc-400">{user.email}</span>
            )}
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="self-start text-sm text-red-500 underline underline-offset-4 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Sign out
            </button>
          </form>
        </div>
      </section>

      <section className="flex max-w-md flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Discord Servers</h2>
          <Link
            href="/api/discord/install"
            className="rounded-lg border border-[#5865F2] px-3 py-1.5 text-xs font-medium text-[#5865F2] hover:bg-[#5865F2]/10"
          >
            + Add server
          </Link>
        </div>

        {!installations?.length ? (
          <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-5 dark:border-zinc-700">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No Discord servers connected.</p>
            <Link
              href="/api/discord/install"
              className="mt-2 inline-block text-sm font-medium text-[#5865F2] underline underline-offset-4"
            >
              Add your server →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {installations.map((inst) => (
              <div
                key={inst.guild_id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {inst.guild_name}
                  </span>
                  <span className="text-xs text-zinc-400">
                    Connected {new Date(inst.installed_at).toLocaleDateString()}
                  </span>
                </div>
                <ConfirmForm
                  action={disconnectDiscord}
                  message={`Disconnect "${inst.guild_name}"? Alerts to this server will stop working.`}
                >
                  <input type="hidden" name="guild_id" value={inst.guild_id} />
                  <button
                    type="submit"
                    className="text-xs text-red-500 hover:underline dark:text-red-400"
                  >
                    Disconnect
                  </button>
                </ConfirmForm>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="max-w-md">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Onboarding</h2>
        <form action={restartTour}>
          <button
            type="submit"
            className="text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Restart setup tour
          </button>
        </form>
      </section>

      <section className="max-w-md">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Appearance</h2>
        <ThemeToggle />
      </section>
    </div>
  )
}
