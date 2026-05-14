import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import nacl from 'tweetnacl'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Interaction types
const PING = 1
const APPLICATION_COMMAND = 2

// Response types
const PONG = 1
const CHANNEL_MESSAGE_WITH_SOURCE = 4

function adminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function verifySignature(request: Request, body: string): Promise<boolean> {
  const publicKey = process.env.DISCORD_PUBLIC_KEY
  if (!publicKey) return false

  const signature = request.headers.get('x-signature-ed25519')
  const timestamp = request.headers.get('x-signature-timestamp')
  if (!signature || !timestamp) return false

  try {
    const isValid = nacl.sign.detached.verify(
      Buffer.from(timestamp + body),
      Buffer.from(signature, 'hex'),
      Buffer.from(publicKey, 'hex')
    )
    return isValid
  } catch {
    return false
  }
}

function reply(content: string) {
  return NextResponse.json({ type: CHANNEL_MESSAGE_WITH_SOURCE, data: { content } })
}

export async function POST(request: Request) {
  const body = await request.text()

  const valid = await verifySignature(request, body)
  if (!valid) {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  const interaction = JSON.parse(body) as {
    type: number
    data?: { name: string }
    guild_id?: string
  }

  if (interaction.type === PING) {
    return NextResponse.json({ type: PONG })
  }

  if (interaction.type !== APPLICATION_COMMAND) {
    return new NextResponse('Unknown interaction type', { status: 400 })
  }

  const commandName = interaction.data?.name
  const guildId = interaction.guild_id

  if (!guildId) {
    return reply('This command only works inside a Discord server.')
  }

  const db = adminClient()

  // Look up workspace via guild installation
  const { data: installation } = await db
    .from('discord_installations')
    .select('workspace_id')
    .eq('guild_id', guildId)
    .single()

  if (!installation) {
    return reply('This server is not connected to a workspace. Visit the dashboard to connect.')
  }

  const workspaceId = installation.workspace_id

  switch (commandName) {
    case 'status': {
      const { data: sub } = await db
        .from('subscriptions')
        .select('status')
        .eq('workspace_id', workspaceId)
        .single()

      const { count } = await db
        .from('watches')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')

      const subStatus = sub?.status ?? 'unknown'
      const watchCount = count ?? 0
      return reply(`📊 **Status**\nSubscription: ${subStatus}\nActive watches: ${watchCount}`)
    }

    case 'pause': {
      await db
        .from('watches')
        .update({ status: 'paused' })
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
      return reply('⏸️ All watches paused.')
    }

    case 'resume': {
      await db
        .from('watches')
        .update({ status: 'active' })
        .eq('workspace_id', workspaceId)
        .eq('status', 'paused')
      return reply('▶️ All watches resumed.')
    }

    case 'test': {
      const { data: installation2 } = await db
        .from('discord_installations')
        .select('channel_id')
        .eq('guild_id', guildId)
        .single()

      const channelId = installation2?.channel_id
      if (!channelId) {
        return reply('No default channel set. Edit a watch in the dashboard to select a channel.')
      }

      await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: '✅ Test alert — bot is working!' }),
      })
      return reply('✅ Test alert sent!')
    }

    default:
      return reply('Unknown command.')
  }
}
