import type { NormalizedListing } from './types.js'
import { warn } from './logger.js'

const SOURCE_COLORS: Record<string, number> = {
  vinted: 0x09c4a5,
  gumtree: 0x00c58c,
}

const CURRENCY_SYMBOLS: Record<string, string> = { GBP: '£', EUR: '€', USD: '$' }

export async function sendAlert(
  channelId: string,
  listing: NormalizedListing,
  watchName: string,
): Promise<string | null> {
  const fields = []

  if (listing.price != null) {
    const symbol = CURRENCY_SYMBOLS[listing.currency] ?? listing.currency
    fields.push({ name: 'Price', value: `${symbol}${listing.price}`, inline: true })
  }
  if (listing.location) {
    fields.push({ name: 'Location', value: listing.location, inline: true })
  }
  fields.push({
    name: 'Source',
    value: listing.source.charAt(0).toUpperCase() + listing.source.slice(1),
    inline: true,
  })
  fields.push({ name: 'Watch', value: watchName, inline: true })
  if (listing.condition) {
    fields.push({ name: 'Condition', value: listing.condition, inline: true })
  }
  if (listing.postedAt) {
    const d = new Date(listing.postedAt)
    fields.push({ name: 'Listed', value: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), inline: true })
  }

  const embed: Record<string, unknown> = {
    title: listing.title,
    url: listing.listingUrl,
    color: SOURCE_COLORS[listing.source] ?? 0x5865f2,
    fields,
    footer: { text: `Matched by ${watchName}` },
  }

  if (listing.imageUrl) {
    embed.thumbnail = { url: listing.imageUrl }
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ embeds: [embed] }),
    })

    if (!res.ok) {
      warn('discord', `Failed to send alert to ${channelId}: ${res.status}`)
      return null
    }

    const data = await res.json() as { id?: string }
    return data.id ?? null
  } catch (err) {
    warn('discord', 'Error sending alert', { err: String(err) })
    return null
  }
}
