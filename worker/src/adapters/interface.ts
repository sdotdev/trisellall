import type { NormalizedListing, WatchRow } from '../types.js'

export interface SourceAdapter {
  fetchLatest(watch: WatchRow): Promise<NormalizedListing[]>
  extractStableId(raw: unknown): string
}
