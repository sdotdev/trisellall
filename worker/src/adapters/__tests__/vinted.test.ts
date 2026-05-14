import { describe, it, expect } from 'vitest'
import { _normalizeListing, vintedAdapter } from '../vinted.js'

const mockItem = {
  id: 12345,
  title: 'Nike Air Max 90',
  price: '49.00',
  currency: 'GBP',
  photo: { url: 'https://images.vinted.net/photo.jpg' },
  url: 'https://www.vinted.co.uk/items/12345',
  status: 'Good condition',
  city: 'London',
  created_at_ts: 1700000000,
}

describe('vinted normalizeListing', () => {
  it('maps all fields correctly', () => {
    const listing = _normalizeListing(mockItem)
    expect(listing.externalId).toBe('12345')
    expect(listing.source).toBe('vinted')
    expect(listing.title).toBe('Nike Air Max 90')
    expect(listing.price).toBe(49)
    expect(listing.currency).toBe('GBP')
    expect(listing.location).toBe('London')
    expect(listing.imageUrl).toBe('https://images.vinted.net/photo.jpg')
    expect(listing.listingUrl).toBe('https://www.vinted.co.uk/items/12345')
    expect(listing.condition).toBe('Good condition')
    expect(listing.postedAt).toBe(new Date(1700000000 * 1000).toISOString())
  })

  it('parses price string to number', () => {
    const listing = _normalizeListing({ ...mockItem, price: '149.99' })
    expect(listing.price).toBe(149.99)
  })

  it('returns null imageUrl when photo is missing', () => {
    const listing = _normalizeListing({ ...mockItem, photo: undefined })
    expect(listing.imageUrl).toBeNull()
  })

  it('returns null postedAt when timestamp is missing', () => {
    const listing = _normalizeListing({ ...mockItem, created_at_ts: undefined })
    expect(listing.postedAt).toBeNull()
  })

  it('defaults currency to GBP when missing', () => {
    const listing = _normalizeListing({ ...mockItem, currency: undefined })
    expect(listing.currency).toBe('GBP')
  })
})

describe('vintedAdapter.extractStableId', () => {
  it('returns string ID from raw item', () => {
    expect(vintedAdapter.extractStableId(mockItem)).toBe('12345')
  })
})
