import { load } from 'cheerio'
import type { NormalizedListing, WatchRow } from '../types.js'
import type { SourceAdapter } from './interface.js'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const BASE = 'https://www.gumtree.com'

export class RateLimitError extends Error {}

interface RawGumtreeListing {
  title: string
  priceText: string
  location: string
  url: string
  imageUrl: string | null
}

function parsePrice(text: string): number {
  const cleaned = text.trim().toLowerCase()
  if (cleaned === 'free' || cleaned === 'please contact' || cleaned === '') return 0
  return parseFloat(cleaned.replace(/[£,]/g, '')) || 0
}

export function extractStableId(url: string): string {
  return /\/(\d+)$/.exec(url)?.[1] ?? url
}

function normalizeListing(raw: RawGumtreeListing): NormalizedListing {
  return {
    externalId: extractStableId(raw.url),
    source: 'gumtree',
    title: raw.title,
    price: parsePrice(raw.priceText),
    currency: 'GBP',
    location: raw.location || null,
    imageUrl: raw.imageUrl,
    listingUrl: raw.url,
    condition: null,
    description: null,
    postedAt: null,
    rawPayload: raw,
  }
}

function parseListings(html: string): NormalizedListing[] {
  const $ = load(html)
  const results: NormalizedListing[] = []

  $('article[data-q="search-result"]').each((_, el) => {
    const title = $(el).find('[data-q="tile-title"]').text().trim()
    const priceText = $(el).find('[data-q="tile-price"]').text().trim()
    const location = $(el).find('[data-q="tile-location"]').text().trim()

    const anchor = $(el).find('a[data-q="search-result-anchor"]').first()
    const href = anchor.attr('href') ?? ''
    const url = href.startsWith('http') ? href : BASE + href

    // Try data-q first, fall back to any img inside the article
    const img = $(el).find('[data-q="tile-image"], img').first()
    const imageUrl = img.attr('data-src') ?? img.attr('src') ?? null

    if (!title || !url) return

    const raw: RawGumtreeListing = { title, priceText, location, url, imageUrl }
    results.push(normalizeListing(raw))
  })

  return results
}

async function fetchLatest(watch: WatchRow): Promise<NormalizedListing[]> {
  await new Promise(r => setTimeout(r, 2000))

  const url = new URL(`${BASE}/search`)
  url.searchParams.set('q', watch.query)
  url.searchParams.set('search_category', 'all')
  if (watch.region) url.searchParams.set('search_location', watch.region)
  if (watch.price_min != null) url.searchParams.set('min_price', String(watch.price_min))
  if (watch.price_max != null) url.searchParams.set('max_price', String(watch.price_max))
  url.searchParams.set('sort', 'date')

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-GB,en;q=0.9',
    },
  })

  if (!res.ok) throw new RateLimitError(`Gumtree blocked: ${res.status}`)

  const html = await res.text()
  return parseListings(html)
}

function extractStableIdFromRaw(raw: unknown): string {
  const r = raw as RawGumtreeListing
  return extractStableId(r.url)
}

export const gumtreeAdapter: SourceAdapter = {
  fetchLatest,
  extractStableId: extractStableIdFromRaw,
}

export { normalizeListing as _normalizeListing, parseListings as _parseListings, parsePrice as _parsePrice }
