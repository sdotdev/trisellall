import type { Metadata } from 'next'
import { requireWorkspace } from '@/lib/auth'
import { canCreateWatch } from '@/lib/billing'
import { fetchGuildChannels } from '@/lib/discord'
import { adminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'New Watch',
}

async function createWatch(formData: FormData) {
  'use server'
  const { workspace } = await requireWorkspace()

  const { allowed } = await canCreateWatch(workspace.id)
  if (!allowed) redirect('/dashboard/billing')

  const keywords = (formData.get('keywords') as string)
    .split(',').map(k => k.trim()).filter(Boolean)
  const excludedKeywords = (formData.get('excluded_keywords') as string)
    .split(',').map(k => k.trim()).filter(Boolean)

  const db = adminClient()
  const { data: watch, error } = await db
    .from('watches')
    .insert({
      workspace_id: workspace.id,
      name: formData.get('name') as string,
      source: formData.get('source') as string,
      query: formData.get('query') as string,
      region: (formData.get('region') as string) || null,
      price_min: formData.get('price_min') ? Number(formData.get('price_min')) : null,
      price_max: formData.get('price_max') ? Number(formData.get('price_max')) : null,
      keywords,
      excluded_keywords: excludedKeywords,
      poll_interval_seconds: Number(formData.get('poll_interval_seconds') ?? 60),
      discord_channel_id: (formData.get('discord_channel_id') as string) || null,
      status: 'active',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createWatch] insert failed:', error.message)
    redirect('/dashboard/watches')
  }
  redirect(`/dashboard/watches/${watch!.id}`)
}

export default async function NewWatchPage() {
  const { workspace } = await requireWorkspace()
  const { allowed, reason } = await canCreateWatch(workspace.id)
  const db = adminClient()

  const { data: installations } = await db
    .from('discord_installations')
    .select('guild_id, guild_name')
    .eq('workspace_id', workspace.id)

  const channelOptions: { value: string; label: string }[] = []
  for (const inst of installations ?? []) {
    const channels = await fetchGuildChannels(inst.guild_id)
    for (const ch of channels) {
      channelOptions.push({ value: ch.id, label: `${inst.guild_name} — #${ch.name}` })
    }
  }

  if (!allowed) {
    const isTrial = reason === 'trial_limit'
    return (
      <div className="flex flex-col gap-6 p-8">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">New Watch</h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-5 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
            {isTrial
              ? 'Your free trial includes 1 watch. Subscribe to create more.'
              : 'An active subscription is required to create watches.'}
          </p>
          <Link
            href="/dashboard/billing"
            className="mt-3 inline-block text-sm font-medium text-amber-900 underline underline-offset-4 dark:text-amber-300"
          >
            {isTrial ? 'Upgrade to unlock unlimited watches →' : 'Subscribe to get started →'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">New Watch</h1>

      <form action={createWatch} className="flex max-w-xl flex-col gap-5">
        <Field label="Watch name" name="name" placeholder="e.g. Nike Air Max 90" required data-tour="watch-name" />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Source</label>
          <select
            name="source"
            defaultValue="both"
            data-tour="watch-source"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="both">Vinted + Gumtree</option>
            <option value="vinted">Vinted only</option>
            <option value="gumtree">Gumtree only</option>
          </select>
        </div>
        <Field label="Search query" name="query" placeholder="e.g. Nike Air Max 90 size 10" required data-tour="watch-query" />
        <Field label="Region" name="region" placeholder="e.g. London" />
        <div className="flex gap-3">
          <Field label="Min price (£)" name="price_min" type="number" placeholder="0" />
          <Field label="Max price (£)" name="price_max" type="number" placeholder="500" />
        </div>
        <Field label="Keywords (comma-separated)" name="keywords" placeholder="e.g. rare, og, vnds" />
        <Field label="Excluded keywords (comma-separated)" name="excluded_keywords" placeholder="e.g. fake, replica" />
        <div className="flex flex-col gap-1.5" data-tour="discord-section">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Discord alert channel</label>
          {channelOptions.length === 0 ? (
            <p className="text-xs text-zinc-400">
              No Discord servers connected.{' '}
              <a href="/dashboard/settings" className="underline hover:text-zinc-600">Connect one in Settings</a>.
            </p>
          ) : (
            <select
              name="discord_channel_id"
              data-tour="discord-channel"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">— No alerts —</option>
              {channelOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Poll interval</label>
          <select
            name="poll_interval_seconds"
            defaultValue="60"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="30">Every 30 seconds</option>
            <option value="60">Every minute</option>
            <option value="300">Every 5 minutes</option>
            <option value="600">Every 10 minutes</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            data-tour="watch-submit"
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Create watch
          </button>
          <Link
            href="/dashboard/watches"
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

function Field({
  label, name, placeholder, required, type = 'text', 'data-tour': dataTour,
}: {
  label: string
  name: string
  placeholder?: string
  required?: boolean
  type?: string
  'data-tour'?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        data-tour={dataTour}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-600"
      />
    </div>
  )
}
