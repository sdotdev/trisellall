export type WatchSource = 'vinted' | 'gumtree' | 'both'
export type WatchStatus = 'active' | 'paused' | 'error' | 'rate_limited'

export interface Watch {
  id: string
  workspaceId: string
  name: string
  source: WatchSource
  query: string
  region: string | null
  categories: string[]
  brands: string[]
  priceMin: number | null
  priceMax: number | null
  condition: string[]
  keywords: string[]
  excludedKeywords: string[]
  pollIntervalSeconds: number
  discordChannelId: string | null
  status: WatchStatus
  lastRunAt: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export type CreateWatchInput = Omit<Watch, 'id' | 'status' | 'lastRunAt' | 'lastError' | 'createdAt' | 'updatedAt'>
