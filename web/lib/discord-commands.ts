const COMMANDS = [
  {
    name: 'status',
    description: 'Show your subscription status and active watch count',
  },
  {
    name: 'pause',
    description: 'Pause all active watches for this server',
  },
  {
    name: 'resume',
    description: 'Resume all paused watches for this server',
  },
  {
    name: 'test',
    description: 'Send a test alert to the configured channel',
  },
]

export async function registerGuildCommands(guildId: string): Promise<void> {
  const appId = process.env.DISCORD_CLIENT_ID
  const botToken = process.env.DISCORD_BOT_TOKEN

  if (!appId || !botToken) return

  await fetch(`https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(COMMANDS),
  })
}
