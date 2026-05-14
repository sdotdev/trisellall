import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

function adminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function syncSubscription(
  db: ReturnType<typeof adminClient>,
  stripeSubscriptionId: string,
  status: string,
  currentPeriodEnd: number | null
) {
  await db
    .from('subscriptions')
    .update({
      status,
      current_period_end: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', stripeSubscriptionId)
}

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const db = adminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription') break

      const workspaceId = session.metadata?.workspace_id
      if (!workspaceId) break

      await db
        .from('subscriptions')
        .update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', workspaceId)
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      // In Stripe v22, current_period_end is on the subscription item, not the subscription
      const periodEnd = sub.items.data[0]?.current_period_end ?? null
      await syncSubscription(db, sub.id, sub.status, periodEnd)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await syncSubscription(db, sub.id, 'canceled', null)

      // Pause all watches for this workspace
      const { data: subscription } = await db
        .from('subscriptions')
        .select('workspace_id')
        .eq('stripe_subscription_id', sub.id)
        .single()

      if (subscription) {
        await db
          .from('watches')
          .update({ status: 'paused' })
          .eq('workspace_id', subscription.workspace_id)
          .eq('status', 'active')
      }
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      // In Stripe v22, subscription is accessed via parent.subscription_details
      const subId = invoice.parent?.subscription_details?.subscription
      const resolvedId = typeof subId === 'string' ? subId : subId?.id
      if (resolvedId) await syncSubscription(db, resolvedId, 'active', null)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subId = invoice.parent?.subscription_details?.subscription
      const resolvedId = typeof subId === 'string' ? subId : subId?.id
      if (resolvedId) await syncSubscription(db, resolvedId, 'past_due', null)
      break
    }
  }

  return NextResponse.json({ received: true })
}
