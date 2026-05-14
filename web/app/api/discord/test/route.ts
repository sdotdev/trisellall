import { requireWorkspace } from '@/lib/auth'
import { sendDiscordMessage } from '@/lib/discord'
import { adminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { workspace } = await requireWorkspace()
  const { channel_id } = await request.json() as { channel_id: string }

  if (!channel_id) {
    return NextResponse.json({ error: 'channel_id required' }, { status: 400 })
  }

  // Verify the channel belongs to a guild connected to this workspace
  const { data: installations } = await adminClient()
    .from('discord_installations')
    .select('guild_id')
    .eq('workspace_id', workspace.id)

  if (!installations?.length) {
    return NextResponse.json({ error: 'No Discord server connected' }, { status: 403 })
  }

  const ok = await sendDiscordMessage(channel_id, {
    content: '✅ Test alert from your watch monitor — everything is connected!',
  })

  if (!ok) {
    return NextResponse.json({ error: 'Failed to send message. Check bot permissions.' }, { status: 502 })
  }

  return NextResponse.json({ sent: true })
}
