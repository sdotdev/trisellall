import { CookieJar } from 'tough-cookie'
import type { NormalizedListing, WatchRow } from '../types.js'
import type { SourceAdapter } from './interface.js'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const BASE = 'https://www.vinted.co.uk'

export class RateLimitError extends Error {}

// One cookie jar per process lifetime — mimics Vintrack's per-client cookie jar
const jar = new CookieJar()
let warmed = false

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': UA,
  'Accept-Language': 'en-GB,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Upgrade-Insecure-Requests': '1',
}

async function storeCookies(res: Response, url: string): Promise<void> {
  // res.headers.getSetCookie() returns all Set-Cookie values as array (Node 18+)
  const cookies: string[] = (res.headers as unknown as { getSetCookie?(): string[] }).getSetCookie?.() ?? []
  for (const c of cookies) {
    await jar.setCookie(c, url).catch(() => {/* ignore invalid cookies */})
  }
}

async function cookieHeader(url: string): Promise<string> {
  return jar.getCookieString(url)
}

async function warmUp(): Promise<void> {
  // Load homepage and read body — same as Vintrack's WarmUpRegion
  const res = await fetch(BASE, {
    headers: { ...BROWSER_HEADERS, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    redirect: 'follow',
  })
  await storeCookies(res, BASE)
  // Consume 64KB of body — Vinted sets some cookies only after response is read
  const reader = res.body?.getReader()
  if (reader) {
    let read = 0
    while (read < 65536) {
      const { done, value } = await reader.read()
      if (done) break
      read += value?.length ?? 0
    }
    reader.cancel()
  }
  warmed = true
  console.debug('[vinted] warmed up, cookies:', (await cookieHeader(BASE)).slice(0, 100))
}

interface VintedItem {
  id: number | string
  title: string
  price: string | { amount: string; currency_code?: string }
  currency?: string
  photo?: { url?: string }
  url: string
  status?: string
  city?: string
  created_at_ts?: number
}

export function normalizeListing(item: VintedItem): NormalizedListing {
  return {
    externalId: String(item.id),
    source: 'vinted',
    title: item.title,
    price: typeof item.price === 'object' ? parseFloat(item.price.amount) : parseFloat(item.price),
    currency: (typeof item.price === 'object' ? item.price.currency_code : item.currency) ?? 'GBP',
    location: item.city ?? null,
    imageUrl: item.photo?.url ?? null,
    listingUrl: item.url,
    condition: item.status ?? null,
    description: null,
    postedAt: item.created_at_ts ? new Date(item.created_at_ts * 1000).toISOString() : null,
    rawPayload: item,
  }
}

async function fetchLatest(watch: WatchRow): Promise<NormalizedListing[]> {
  if (!warmed) await warmUp()

  const url = new URL(`${BASE}/api/v2/catalog/items`)
  url.searchParams.set('search_text', watch.query)
  url.searchParams.set('order', 'newest_first')
  url.searchParams.set('per_page', '20')
  if (watch.price_min != null) url.searchParams.set('price_from', String(watch.price_min))
  if (watch.price_max != null) url.searchParams.set('price_to', String(watch.price_max))

  const doFetch = async () => {
    const cookies = await cookieHeader(BASE)
    return fetch(url.toString(), {
      headers: {
        'User-Agent': UA,
        Cookie: cookies,
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-GB,en;q=0.9',
        Referer: `${BASE}/catalog?search_text=${encodeURIComponent(watch.query)}`,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
    })
  }

  let res = await doFetch()
  await storeCookies(res, BASE)

  if (res.status === 401) {
    // Re-warm and retry once
    warmed = false
    await warmUp()
    res = await doFetch()
    await storeCookies(res, BASE)
  }

  if (res.status === 429) throw new RateLimitError('Vinted rate limited')
  if (!res.ok) throw new Error(`Vinted fetch failed: ${res.status}`)

  const data = await res.json() as { items?: VintedItem[] }
  return (data.items ?? []).map(normalizeListing)
}

function extractStableId(raw: unknown): string {
  return String((raw as VintedItem).id)
}

export const vintedAdapter: SourceAdapter = { fetchLatest, extractStableId }

// Exported for unit tests
export { normalizeListing as _normalizeListing }
