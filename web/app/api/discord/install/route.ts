import { requireWorkspace } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  await requireWorkspace()

  const { origin } = new URL(request.url)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin

  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    scope: 'bot applications.commands',
    permissions: '2048', // SEND_MESSAGES only
    redirect_uri: `${appUrl}/api/discord/callback`,
    response_type: 'code',
  })

  return NextResponse.redirect(`https://discord.com/oauth2/authorize?${params}`)
}
