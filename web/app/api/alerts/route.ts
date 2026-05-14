import { requireWorkspace } from '@/lib/auth'
import { adminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { workspace } = await requireWorkspace()
  const { searchParams } = new URL(request.url)

  const watchId = searchParams.get('watch_id') ?? ''
  const cursor = searchParams.get('cursor') ?? ''
  const limit = Math.min(20, Number(searchParams.get('limit')) || 20)

  const db = adminClient()

  let query = db
    .from('alerts')
    .select('id, sent_at, watch_id, watches(name, source), listing_snapshots(title, price, currency, location, listing_url, image_url, posted_at)')
    .eq('workspace_id', workspace.id)

  if (watchId) {
    query = query.eq('watch_id', watchId)
  }

  if (cursor) {
    query = query.lt('sent_at', cursor)
  }

  const { data: alerts, error } = await query
    .order('sent_at', { ascending: false })
    .limit(limit + 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const hasMore = alerts ? alerts.length > limit : false
  const items = hasMore ? alerts!.slice(0, limit) : (alerts ?? [])
  const nextCursor = items.length > 0 ? items[items.length - 1].sent_at : null

  return NextResponse.json({ alerts: items, nextCursor, hasMore })
}
