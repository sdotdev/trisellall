'use client'

import { useState } from 'react'

export default function TestAlertButton({ channelId }: { channelId: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')

  async function send() {
    setState('sending')
    const res = await fetch('/api/discord/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel_id: channelId }),
    })
    setState(res.ok ? 'ok' : 'err')
    setTimeout(() => setState('idle'), 3000)
  }

  return (
    <button
      onClick={send}
      disabled={state === 'sending'}
      className="rounded-lg border border-[#5865F2] px-3 py-1.5 text-sm font-medium text-[#5865F2] hover:bg-[#5865F2]/10 disabled:opacity-50"
    >
      {state === 'sending' ? 'Sending…' : state === 'ok' ? '✓ Sent!' : state === 'err' ? 'Failed' : 'Test alert'}
    </button>
  )
}
