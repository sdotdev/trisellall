import { requireWorkspace } from '@/lib/auth'
import { getSubscription } from '@/lib/billing'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

function adminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: Request) {
  const { origin } = new URL(request.url)

  const { workspace } = await requireWorkspace()
  const sub = await getSubscription(workspace.id)

  if (sub?.status === 'active') {
    return NextResponse.redirect(`${origin}/dashboard/billing`, { status: 303 })
  }

  const db = adminClient()

  let customerId = sub?.stripe_customer_id as string | undefined

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { workspace_id: workspace.id },
    })
    customerId = customer.id
    await db
      .from('subscriptions')
      .update({ stripe_customer_id: customerId })
      .eq('workspace_id', workspace.id)
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'gbp',
          recurring: { interval: 'month' },
          product_data: {
            name: 'MVP Monitor',
            description: 'Unlimited watches on Vinted and Gumtree with Discord alerts',
          },
          unit_amount: 900, // £9.00
        },
      },
    ],
    success_url: `${origin}/dashboard/billing?success=true`,
    cancel_url: `${origin}/dashboard/billing`,
    metadata: { workspace_id: workspace.id },
  })

  return NextResponse.redirect(session.url!, { status: 303 })
}
