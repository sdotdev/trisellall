import type { WatchRow } from './types.js'

const nextRunAt = new Map<string, number>()

export function isDue(watch: WatchRow): boolean {
  const next = nextRunAt.get(watch.id)
  return next === undefined || Date.now() >= next
}

export function markRan(watchId: string, intervalSeconds: number): void {
  nextRunAt.set(watchId, Date.now() + intervalSeconds * 1000)
}
