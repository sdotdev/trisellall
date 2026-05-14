import { describe, it, expect } from 'vitest'
import { matchesWatch } from '../matcher.js'
import type { NormalizedListing, WatchRow } from '../types.js'

function makeListing(overrides: Partial<NormalizedListing> = {}): NormalizedListing {
  return {
    externalId: '1',
    source: 'vinted',
    title: 'Nike Air Max 90 White',
    price: 50,
    currency: 'GBP',
    location: 'London',
    imageUrl: null,
    listingUrl: 'https://example.com/1',
    condition: null,
    description: null,
    postedAt: null,
    rawPayload: {},
    ...overrides,
  }
}

function makeWatch(overrides: Partial<WatchRow> = {}): WatchRow {
  return {
    id: 'w1',
    workspace_id: 'ws1',
    name: 'Test watch',
    source: 'vinted',
    query: 'nike',
    region: null,
    price_min: null,
    price_max: null,
    keywords: [],
    excluded_keywords: [],
    poll_interval_seconds: 300,
    discord_channel_id: null,
    status: 'active',
    last_run_at: null,
    ...overrides,
  }
}

describe('matchesWatch', () => {
  it('passes when no filters set', () => {
    expect(matchesWatch(makeListing(), makeWatch())).toBe(true)
  })

  it('passes when title contains a keyword', () => {
    expect(matchesWatch(makeListing(), makeWatch({ keywords: ['nike'] }))).toBe(true)
  })

  it('passes keyword match case-insensitively', () => {
    expect(matchesWatch(makeListing(), makeWatch({ keywords: ['NIKE'] }))).toBe(true)
  })

  it('fails when title contains none of the keywords', () => {
    expect(matchesWatch(makeListing(), makeWatch({ keywords: ['adidas', 'puma'] }))).toBe(false)
  })

  it('fails when title contains an excluded keyword', () => {
    expect(matchesWatch(makeListing({ title: 'Nike Air Max 90 fake' }), makeWatch({ excluded_keywords: ['fake'] }))).toBe(false)
  })

  it('passes when excluded keyword is not in title', () => {
    expect(matchesWatch(makeListing(), makeWatch({ excluded_keywords: ['fake'] }))).toBe(true)
  })

  it('passes when price is within range', () => {
    expect(matchesWatch(makeListing({ price: 50 }), makeWatch({ price_min: 10, price_max: 100 }))).toBe(true)
  })

  it('fails when price is below min', () => {
    expect(matchesWatch(makeListing({ price: 5 }), makeWatch({ price_min: 10 }))).toBe(false)
  })

  it('fails when price is above max', () => {
    expect(matchesWatch(makeListing({ price: 200 }), makeWatch({ price_max: 100 }))).toBe(false)
  })

  it('passes when price equals boundary values', () => {
    expect(matchesWatch(makeListing({ price: 10 }), makeWatch({ price_min: 10, price_max: 100 }))).toBe(true)
    expect(matchesWatch(makeListing({ price: 100 }), makeWatch({ price_min: 10, price_max: 100 }))).toBe(true)
  })
})
