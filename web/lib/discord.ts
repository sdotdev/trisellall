import type { NormalizedListing } from './types'

export interface DiscordEmbed {
  title: string
  url?: string
  color: number
  fields: { name: string; value: string; inline?: boolean }[]
  thumbnail?: { url: string }
  footer?: { text: string }
}

export interface DiscordMessage {
  content?: string
  embeds?: DiscordEmbed[]
}

const SOURCE_COLORS: Record<string, number> = {
  vinted: 0x09c4a5,   // Vinted teal
  gumtree: 0x00c58c,  // Gumtree green
}

export function formatAlertEmbed(listing: NormalizedListing, watchName: string): DiscordMessage {
  const fields: DiscordEmbed['fields'] = []

  if (listing.price != null) {
    fields.push({ name: 'Price', value: `${listing.currency ?? '£'}${listing.price}`, inline: true })
  }
  if (listing.location) {
    fields.push({ name: 'Location', value: listing.location, inline: true })
  }
  fields.push({ name: 'Source', value: listing.source.charAt(0).toUpperCase() + listing.source.slice(1), inline: true })
  fields.push({ name: 'Watch', value: watchName, inline: true })
  if (listing.condition) {
    fields.push({ name: 'Condition', value: listing.condition, inline: true })
  }

  const embed: DiscordEmbed = {
    title: listing.title,
    url: listing.listingUrl,
    color: SOURCE_COLORS[listing.source] ?? 0x5865f2,
    fields,
    footer: { text: `Matched by ${watchName}` },
  }

  if (listing.imageUrl) {
    embed.thumbnail = { url: listing.imageUrl }
  }

  return { embeds: [embed] }
}

export async function sendDiscordMessage(channelId: string, message: DiscordMessage): Promise<boolean> {
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })
  return res.ok
}

export async function fetchGuild(guildId: string): Promise<{ id: string; name: string } | null> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
  })
  if (!res.ok) return null
  const data = await res.json() as { id: string; name: string }
  return { id: data.id, name: data.name }
}

export async function fetchGuildChannels(guildId: string): Promise<{ id: string; name: string }[]> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
  })
  if (!res.ok) return []
  const channels = await res.json() as { id: string; name: string; type: number }[]
  // type 0 = GUILD_TEXT
  return channels.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name }))
}
