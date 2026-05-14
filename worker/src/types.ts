export interface NormalizedListing {
  externalId: string
  source: 'vinted' | 'gumtree'
  title: string
  price: number
  currency: string
  location: string | null
  imageUrl: string | null
  listingUrl: string
  condition: string | null
  description: string | null
  postedAt: string | null
  rawPayload: unknown
}

export interface WatchRow {
  id: string
  workspace_id: string
  name: string
  source: 'vinted' | 'gumtree' | 'both'
  query: string
  region: string | null
  price_min: number | null
  price_max: number | null
  keywords: string[]
  excluded_keywords: string[]
  poll_interval_seconds: number
  discord_channel_id: string | null
  status: string
  last_run_at: string | null
}
