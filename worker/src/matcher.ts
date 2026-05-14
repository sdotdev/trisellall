import type { NormalizedListing, WatchRow } from './types.js'

export function matchesWatch(listing: NormalizedListing, watch: WatchRow): boolean {
  const title = listing.title.toLowerCase()

  if (watch.keywords.length > 0) {
    const hasKeyword = watch.keywords.some(kw => title.includes(kw.toLowerCase()))
    if (!hasKeyword) return false
  }

  for (const excluded of watch.excluded_keywords) {
    if (title.includes(excluded.toLowerCase())) return false
  }

  if (watch.price_min != null && listing.price < watch.price_min) return false
  if (watch.price_max != null && listing.price > watch.price_max) return false

  return true
}
