import { requireWorkspace } from '@/lib/auth'
import { fetchGuildChannels } from '@/lib/discord'
import { adminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const guildId = searchParams.get('guild_id')

  if (!guildId) {
    return NextResponse.json({ error: 'guild_id required' }, { status: 400 })
  }

  const { workspace } = await requireWorkspace()

  const { data: installation } = await adminClient()
    .from('discord_installations')
    .select('guild_id')
    .eq('workspace_id', workspace.id)
    .eq('guild_id', guildId)
    .single()

  if (!installation) {
    return NextResponse.json({ error: 'Guild not connected to this workspace' }, { status: 403 })
  }

  const channels = await fetchGuildChannels(guildId)
  return NextResponse.json(channels)
}
