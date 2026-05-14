import { requireWorkspace } from '@/lib/auth'
import { fetchGuild } from '@/lib/discord'
import { registerGuildCommands } from '@/lib/discord-commands'
import { adminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const guildId = searchParams.get('guild_id')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin

  if (!code || !guildId) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?discord=error`)
  }

  const { workspace } = await requireWorkspace()

  // Exchange code for access token (required by Discord OAuth2, but we only need guild_id)
  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${appUrl}/api/discord/callback`,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?discord=error`)
  }

  const guild = await fetchGuild(guildId)
  const guildName = guild?.name ?? 'Unknown Server'

  await adminClient().from('discord_installations').upsert({
    workspace_id: workspace.id,
    guild_id: guildId,
    guild_name: guildName,
    installed_at: new Date().toISOString(),
  }, { onConflict: 'workspace_id,guild_id' })

  await registerGuildCommands(guildId)

  return NextResponse.redirect(`${appUrl}/dashboard/settings?discord=connected`)
}
