import 'dotenv/config'
import { db } from './db.js'
import { runWatch } from './runner.js'
import { isDue, markRan } from './scheduler.js'
import { log, warn, error as logError } from './logger.js'
import { startHealthServer, recordTick } from './health.js'
import type { WatchRow } from './types.js'

const TICK_INTERVAL_MS = 30_000
const MAX_CONCURRENT = 3
const MAX_CONCURRENT_GUMTREE = 1

async function tick(): Promise<void> {
  const { data: watches, error } = await db
    .from('watches')
    .select('*')
    .in('status', ['active', 'error'])

  if (error) {
    logError('worker', 'Failed to fetch watches', { message: error.message })
    return
  }

  const due = (watches as WatchRow[]).filter(isDue)
  recordTick()

  if (due.length === 0) return

  log('worker', `${due.length} watch(es) due to run`)

  const gumtreeDue = due.filter(w => w.source === 'gumtree' || w.source === 'both')
  const otherDue = due.filter(w => w.source !== 'gumtree' && w.source !== 'both')

  await runBatch(otherDue, MAX_CONCURRENT)
  await runBatch(gumtreeDue, MAX_CONCURRENT_GUMTREE)
}

async function runBatch(watches: WatchRow[], concurrency: number): Promise<void> {
  for (let i = 0; i < watches.length; i += concurrency) {
    const batch = watches.slice(i, i + concurrency)
    await Promise.all(
      batch.map(async watch => {
        markRan(watch.id, watch.poll_interval_seconds)
        try {
          const result = await runWatch(watch)
          log('runner', `${watch.name}: found=${result.found} new=${result.newListings} alerts=${result.alertsSent}` +
            (result.error ? ` error=${result.error}` : ''))
        } catch (err) {
          logError('runner', `Unhandled error in watch ${watch.id}`, { err: String(err) })
        }
      }),
    )
  }
}

async function main(): Promise<void> {
  const { error } = await db.from('watches').select('id').limit(1)
  if (error) {
    logError('worker', 'DB connection failed', { message: error.message })
    process.exit(1)
  }
  log('worker', 'Connected to Supabase — starting poll loop')

  const port = parseInt(process.env.HEALTH_PORT ?? '3001', 10)
  startHealthServer(port)

  tick()
  setInterval(tick, TICK_INTERVAL_MS)
}

main().catch(err => {
  logError('worker', 'Fatal error', { err: String(err) })
  process.exit(1)
})
