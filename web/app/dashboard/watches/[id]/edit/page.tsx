import type { Metadata } from 'next'
import { requireWorkspace } from '@/lib/auth'
import { fetchGuildChannels } from '@/lib/discord'
import { adminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Edit Watch',
}

async function updateWatch(watchId: string, formData: FormData) {
  'use server'
  const keywords = (formData.get('keywords') as string)
    .split(',').map(k => k.trim()).filter(Boolean)
  const excludedKeywords = (formData.get('excluded_keywords') as string)
    .split(',').map(k => k.trim()).filter(Boolean)

  await adminClient()
    .from('watches')
    .update({
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
      updated_at: new Date().toISOString(),
    })
    .eq('id', watchId)

  redirect(`/dashboard/watches/${watchId}`)
}

export default async function EditWatchPage({ params }: { params: Promise<{ id: string }> }) {
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

  const updateWithId = updateWatch.bind(null, id)

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Edit Watch</h1>

      <form action={updateWithId} className="flex max-w-xl flex-col gap-5">
        <Field label="Watch name" name="name" defaultValue={watch.name} required />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Source</label>
          <select
            name="source"
            defaultValue={watch.source}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="both">Vinted + Gumtree</option>
            <option value="vinted">Vinted only</option>
            <option value="gumtree">Gumtree only</option>
          </select>
        </div>
        <Field label="Search query" name="query" defaultValue={watch.query} required />
        <Field label="Region" name="region" defaultValue={watch.region ?? ''} />
        <div className="flex gap-3">
          <Field label="Min price (£)" name="price_min" type="number" defaultValue={watch.price_min ?? ''} />
          <Field label="Max price (£)" name="price_max" type="number" defaultValue={watch.price_max ?? ''} />
        </div>
        <Field label="Keywords (comma-separated)" name="keywords" defaultValue={watch.keywords?.join(', ') ?? ''} />
        <Field label="Excluded keywords (comma-separated)" name="excluded_keywords" defaultValue={watch.excluded_keywords?.join(', ') ?? ''} />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Discord alert channel</label>
          {channelOptions.length === 0 ? (
            <p className="text-xs text-zinc-400">
              No Discord servers connected.{' '}
              <a href="/dashboard/settings" className="underline hover:text-zinc-600">Connect one in Settings</a>.
            </p>
          ) : (
            <select
              name="discord_channel_id"
              defaultValue={watch.discord_channel_id ?? ''}
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
            defaultValue={String(watch.poll_interval_seconds)}
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
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Save changes
          </button>
          <Link
            href={`/dashboard/watches/${id}`}
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
  label, name, defaultValue, required, type = 'text',
}: {
  label: string
  name: string
  defaultValue?: string | number
  required?: boolean
  type?: string
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
        defaultValue={defaultValue}
        required={required}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-600"
      />
    </div>
  )
}
