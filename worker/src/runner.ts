import { db } from './db.js'
import { vintedAdapter } from './adapters/vinted.js'
import { gumtreeAdapter } from './adapters/gumtree.js'
import { matchesWatch } from './matcher.js'
import { sendAlert } from './discord.js'
import type { WatchRow, NormalizedListing } from './types.js'
import type { SourceAdapter } from './adapters/interface.js'

export interface RunResult {
  found: number
  newListings: number
  alertsSent: number
  error?: string
}

async function fetchListings(watch: WatchRow): Promise<NormalizedListing[]> {
  if (watch.source === 'both') {
    const vinted = await vintedAdapter.fetchLatest(watch)
    const gumtree = await gumtreeAdapter.fetchLatest(watch)
    return [...vinted, ...gumtree]
  }
  const adapter: SourceAdapter = watch.source === 'vinted' ? vintedAdapter : gumtreeAdapter
  return adapter.fetchLatest(watch)
}

export async function runWatch(watch: WatchRow): Promise<RunResult> {
  const runRow = await db
    .from('worker_runs')
    .insert({ watch_id: watch.id, status: 'running', listings_found: 0, alerts_sent: 0 })
    .select('id')
    .single()

  const runId = runRow.data?.id

  let listings: NormalizedListing[] = []
  try {
    listings = await fetchListings(watch)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await db.from('watches').update({ status: 'error', last_error: msg, last_run_at: new Date().toISOString() }).eq('id', watch.id)
    if (runId) await db.from('worker_runs').update({ status: 'error', error_message: msg, finished_at: new Date().toISOString() }).eq('id', runId)
    return { found: 0, newListings: 0, alertsSent: 0, error: msg }
  }

  if (listings.length === 0) {
    await db.from('watches').update({ last_run_at: new Date().toISOString(), status: 'active', last_error: null }).eq('id', watch.id)
    if (runId) await db.from('worker_runs').update({ status: 'success', listings_found: 0, finished_at: new Date().toISOString() }).eq('id', runId)
    return { found: 0, newListings: 0, alertsSent: 0 }
  }

  // Batch dedup check against seen_listings (workspace-level)
  const externalIds = listings.map(l => l.externalId)
  const { data: seen } = await db
    .from('seen_listings')
    .select('external_id, source')
    .eq('workspace_id', watch.workspace_id)
    .in('external_id', externalIds)

  const seenKeys = new Set((seen ?? []).map(r => `${r.source}:${r.external_id}`))
  const newListings = listings.filter(l => !seenKeys.has(`${l.source}:${l.externalId}`))

  // First run: seed seen_listings without alerting so we only alert on genuinely new items going forward
  const isFirstRun = watch.last_run_at === null
  if (isFirstRun && newListings.length > 0) {
    console.log(`[worker] First run for "${watch.name}" — seeding ${newListings.length} listings, no alerts sent`)
  }

  let alertsSent = 0
  const ALERT_CAP = 10

  for (const listing of newListings) {
    // Mark as seen immediately to avoid race conditions with concurrent runs
    await db.from('seen_listings').upsert({
      workspace_id: watch.workspace_id,
      source: listing.source,
      external_id: listing.externalId,
      first_seen_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id,source,external_id' })

    // Store snapshot
    const { data: snapshot } = await db
      .from('listing_snapshots')
      .insert({
        source: listing.source,
        external_id: listing.externalId,
        title: listing.title,
        price: listing.price,
        currency: listing.currency,
        location: listing.location,
        image_url: listing.imageUrl,
        listing_url: listing.listingUrl,
        condition: listing.condition,
        description: listing.description,
        posted_at: listing.postedAt,
        raw_payload: listing.rawPayload,
      })
      .select('id')
      .single()

    // Skip alerting on first run, if cap reached, or no match
    if (isFirstRun || alertsSent >= ALERT_CAP) continue
    if (!matchesWatch(listing, watch)) continue
    if (!watch.discord_channel_id || !snapshot?.id) continue

    const messageId = await sendAlert(watch.discord_channel_id, listing, watch.name)

    await db.from('alerts').insert({
      workspace_id: watch.workspace_id,
      watch_id: watch.id,
      listing_snapshot_id: snapshot.id,
      discord_message_id: messageId,
      sent_at: new Date().toISOString(),
    })

    alertsSent++
    // Respect Discord's rate limit: 5 messages per 5 seconds per channel
    if (alertsSent < ALERT_CAP) await new Promise(r => setTimeout(r, 1500))
  }

  const now = new Date().toISOString()
  await db.from('watches').update({ last_run_at: now, status: 'active', last_error: null }).eq('id', watch.id)
  if (runId) {
    await db.from('worker_runs').update({
      status: 'success',
      listings_found: listings.length,
      alerts_sent: alertsSent,
      finished_at: now,
    }).eq('id', runId)
  }

  return { found: listings.length, newListings: newListings.length, alertsSent }
}
