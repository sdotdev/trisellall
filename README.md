# Watchr

Monitor Vinted and Gumtree for listings that match your saved searches. When a match appears, a Discord bot posts it to your chosen server and channel.

Built for resellers who need to move fast. Trainers, phones, consoles, streetwear — competitive categories where being first matters.

---

## What it does

You define a **watch**: a query with optional filters (price range, condition, brand, keywords). The worker polls Vinted and Gumtree on a short interval, normalises what it finds into a shared listing shape, deduplicates, and fires a Discord alert for anything new that matches.

Everything is managed from a Next.js dashboard. You log in with Discord, connect a server, subscribe, and create watches. That is the whole flow.

---

## Architecture

The system is split into two independent pieces:

**Dashboard** (`/web`) — a Next.js App Router application. Handles authentication, billing, watch management, and the alerts feed. Uses Supabase for the database and Supabase Auth for sessions. Stripe handles subscriptions via Checkout and webhooks.

**Worker** — a separate always-on process that runs on Oracle Free Tier. It owns polling, matching, deduplication, and Discord alert dispatch. It never serves HTTP traffic from the dashboard. This separation means a slow database query in the UI cannot stall the scan loop, and a misbehaving adapter cannot crash the dashboard.

Both communicate through Postgres. The worker reads active watches, writes matches, and updates watch health status. The dashboard reads and displays that state.

---

## Source adapters

Vinted and Gumtree both implement the same interface:

```ts
validateWatchConfig()
buildQuery()
fetchLatest()
normalizeListing()
extractStableId()
```

Neither adapter's internals reach the dashboard or the alert dispatcher. The downstream pipeline only ever sees the normalised listing shape. This makes it straightforward to add a third source without touching anything outside its own adapter file.

---

## Stack

| Layer | Choice |
|---|---|
| Dashboard | Next.js App Router |
| Database | Supabase Postgres |
| Auth | Supabase Auth (Discord OAuth) |
| Row isolation | Postgres RLS |
| Billing | Stripe subscriptions |
| Alerts | Discord bot |
| Worker host | Oracle Free Tier |

---

## Data model

The key entities are: **User**, **Workspace**, **Watch**, **Listing**, **Alert**, and **SeenItem** (the dedupe marker).

A user can own multiple workspaces. A workspace can have multiple watches, each targeting Vinted, Gumtree, or both. When the worker finds a match, it writes an alert row and a seen-item row. The seen-item prevents the same external listing ID from being alerted again.

Subscription state lives in Postgres and is the authoritative source. The browser never decides whether a user is active — that comes from a server-side check against the `subscriptions` table.

---

## Billing model

Monthly subscription via Stripe. Unpaid users can sign in and see the billing page but cannot create active watches. If a subscription lapses, the worker pauses scanning for that workspace and data stays read-only until payment resumes.

The dashboard handles six webhook events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`.

---

## Discord integration

Discord does two jobs here:

1. **Authentication** — users log in via Discord OAuth. Their Discord identity links to their app user record.
2. **Alerts** — the bot posts new matches into a channel the user picks. Each alert includes the title, price, source, location, watch name, and a link to the listing.

The bot also supports slash commands: `/setup`, `/status`, `/pause`, `/resume`, and `/test`.

---

## Running locally

Prerequisites: Node 20+, a Supabase project, a Stripe account (test mode is fine), a Discord application with a bot token.

```bash
cd web
cp .env.example .env.local
# fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
# STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
# DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN
npm install
npm run dev
```

The worker is a separate process. See `/worker` for its own setup.

---

## MVP definition of done

- User can log in with Discord
- User can subscribe monthly with Stripe
- User can create a watch from the dashboard
- User can connect a Discord channel to receive alerts
- Worker scans Vinted and Gumtree on a schedule
- Matching listings are stored and deduplicated
- Discord bot sends the alert to the right channel
- Dashboard shows watch status and recent alerts
