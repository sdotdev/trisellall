import { describe, it, expect } from 'vitest'
import { _normalizeListing, _parseListings, _parsePrice, extractStableId, gumtreeAdapter } from '../gumtree.js'

function makeArticle(opts: {
  title?: string
  price?: string
  location?: string
  url?: string
  imgSrc?: string
  imgDataSrc?: string
}) {
  return `
    <article data-q="search-result">
      <div data-q="tile-title">${opts.title ?? 'Test item'}</div>
      <div data-q="tile-price">${opts.price ?? '£50'}</div>
      <div data-q="tile-location">${opts.location ?? 'Manchester'}</div>
      <a data-q="search-result-anchor" href="${opts.url ?? '/p/item/1234567890'}"></a>
      <img data-q="tile-image"
        ${opts.imgDataSrc ? `data-src="${opts.imgDataSrc}"` : ''}
        ${opts.imgSrc ? `src="${opts.imgSrc}"` : ''}
      />
    </article>
  `
}

describe('parsePrice', () => {
  it('parses normal price', () => expect(_parsePrice('£49')).toBe(49))
  it('parses price with comma', () => expect(_parsePrice('£1,200')).toBe(1200))
  it('returns 0 for Free', () => expect(_parsePrice('Free')).toBe(0))
  it('returns 0 for Please contact', () => expect(_parsePrice('Please contact')).toBe(0))
  it('returns 0 for empty string', () => expect(_parsePrice('')).toBe(0))
})

describe('extractStableId', () => {
  it('extracts numeric ID from URL path', () => {
    expect(extractStableId('/p/sofas/blue-sofa/1234567890')).toBe('1234567890')
  })
  it('handles full URL', () => {
    expect(extractStableId('https://www.gumtree.com/p/item/9876543210')).toBe('9876543210')
  })
  it('falls back to full URL when no numeric ID', () => {
    expect(extractStableId('/p/item/slug-only')).toBe('/p/item/slug-only')
  })
})

describe('parseListings', () => {
  it('parses a basic listing', () => {
    const html = makeArticle({ title: 'Blue sofa', price: '£250', url: '/p/sofas/blue/1111111111' })
    const listings = _parseListings(html)
    expect(listings).toHaveLength(1)
    expect(listings[0].title).toBe('Blue sofa')
    expect(listings[0].price).toBe(250)
    expect(listings[0].externalId).toBe('1111111111')
    expect(listings[0].source).toBe('gumtree')
    expect(listings[0].currency).toBe('GBP')
  })

  it('prefers data-src over src for lazy-loaded images', () => {
    const html = makeArticle({ imgDataSrc: 'https://cdn.gumtree.com/lazy.jpg', imgSrc: 'https://cdn.gumtree.com/placeholder.gif' })
    const listings = _parseListings(html)
    expect(listings[0].imageUrl).toBe('https://cdn.gumtree.com/lazy.jpg')
  })

  it('falls back to src when no data-src', () => {
    const html = makeArticle({ imgSrc: 'https://cdn.gumtree.com/real.jpg' })
    const listings = _parseListings(html)
    expect(listings[0].imageUrl).toBe('https://cdn.gumtree.com/real.jpg')
  })

  it('skips articles with no title', () => {
    const html = makeArticle({ title: '' })
    expect(_parseListings(html)).toHaveLength(0)
  })

  it('parses multiple listings', () => {
    const html = makeArticle({ title: 'Item A', url: '/p/a/1111' }) + makeArticle({ title: 'Item B', url: '/p/b/2222' })
    expect(_parseListings(html)).toHaveLength(2)
  })

  it('sets null for condition, description, postedAt', () => {
    const listings = _parseListings(makeArticle({}))
    expect(listings[0].condition).toBeNull()
    expect(listings[0].description).toBeNull()
    expect(listings[0].postedAt).toBeNull()
  })
})

describe('gumtreeAdapter.extractStableId', () => {
  it('extracts ID from raw payload url', () => {
    const raw = { title: 'x', priceText: '£10', location: '', url: '/p/item/9999999999', imageUrl: null }
    expect(gumtreeAdapter.extractStableId(raw)).toBe('9999999999')
  })
})
