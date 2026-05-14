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
